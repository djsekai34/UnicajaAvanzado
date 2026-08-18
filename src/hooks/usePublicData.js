import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { calcAllAdvanced, calcTeamTotals } from '../lib/advanced'

export function usePublicData() {
  const [temporadas, setTemporadas]     = useState([])
  const [competiciones, setCompeticiones] = useState([])
  const [jugadores, setJugadores]       = useState([])
  const [partidos, setPartidos]         = useState([])
  const [allStats, setAllStats]         = useState([])
  const [loading, setLoading]           = useState(true)

  // Filtros
  const [temporadaId, setTemporadaId]   = useState('')
  const [compId, setCompId]             = useState('todas')
  const [jugadoresIds, setJugadoresIds] = useState([])
  const [mes, setMes]                   = useState('todos')
  const [fechaDesde, setFechaDesde]     = useState('')
  const [fechaHasta, setFechaHasta]     = useState('')

  // Cargar datos base
  useEffect(() => {
    async function load() {
      const [{ data: temps }, { data: comps }] = await Promise.all([
        supabase.from('temporadas').select('*').order('id', { ascending: false }),
        supabase.from('competiciones').select('*').order('id'),
      ])
      setTemporadas(temps || [])
      setCompeticiones(comps || [])
      const activa = temps?.find(t => t.activa) || temps?.[0]
      if (activa) setTemporadaId(String(activa.id))
    }
    load()
  }, [])

  // Cargar jugadores y partidos cuando cambia temporada
  useEffect(() => {
    if (!temporadaId) return
    async function load() {
      setLoading(true)
      const [{ data: jugs }, { data: parts }] = await Promise.all([
        supabase.from('jugadores').select('*').eq('temporada_id', temporadaId).order('dorsal'),
        supabase.from('partidos')
          .select('*, competiciones(nombre)')
          .eq('temporada_id', temporadaId)
          .order('fecha'),
      ])
      setJugadores(jugs || [])
      setPartidos(parts || [])

      if (parts && parts.length > 0) {
        const partidoIds = parts.map(p => p.id)
        const { data: stats } = await supabase
          .from('stats')
          .select('*')
          .in('partido_id', partidoIds)
        setAllStats(stats || [])
      } else {
        setAllStats([])
      }
      setLoading(false)
    }
    load()
  }, [temporadaId])

  // Partidos filtrados
  const partidosFiltrados = useMemo(() => {
    return partidos.filter(p => {
      if (compId !== 'todas' && String(p.competicion_id) !== compId) return false
      if (mes !== 'todos') {
        const m = new Date(p.fecha).getMonth() + 1
        if (String(m) !== mes) return false
      }
      if (fechaDesde && p.fecha < fechaDesde) return false
      if (fechaHasta && p.fecha > fechaHasta) return false
      return true
    })
  }, [partidos, compId, mes, fechaDesde, fechaHasta])

  const partidoIds = useMemo(() => new Set(partidosFiltrados.map(p => p.id)), [partidosFiltrados])

  // Stats filtradas
  const statsFiltradas = useMemo(() => {
    return allStats.filter(s => partidoIds.has(s.partido_id))
  }, [allStats, partidoIds])

  // Total de minutos jugados por el equipo en todo el rango filtrado (suma
  // real de los minutos de TODOS los jugadores en TODOS los partidos, no
  // una media) — se usa para calcular el % de minutos del equipo de cada
  // jugador sobre el total real de la temporada.
  const minTotalEquipoTemporada = useMemo(
    () => statsFiltradas.reduce((a, s) => a + (s.min || 0), 0),
    [statsFiltradas]
  )

  // Promedios por jugador en el rango filtrado
  const promediosPorJugador = useMemo(() => {
    const result = {}
    const jugMap = {}
    jugadores.forEach(j => { jugMap[j.id] = j })

    // Agrupar stats por jugador
    const byJugador = {}
    statsFiltradas.forEach(s => {
      if (!byJugador[s.jugador_id]) byJugador[s.jugador_id] = []
      byJugador[s.jugador_id].push(s)
    })

    Object.entries(byJugador).forEach(([jid, stats]) => {
      const n = stats.length
      if (n === 0) return
      const sum = key => stats.reduce((a, s) => a + (s[key] || 0), 0)
      const avg = key => sum(key) / n

      // Totales de equipo por partido (media de todos los partidos del jugador)
      const teamTotals = {}
      const jugPartidos = [...new Set(stats.map(s => s.partido_id))]
      jugPartidos.forEach(pid => {
        const partidoStats = allStats.filter(s => s.partido_id === pid)
        const tot = calcTeamTotals(partidoStats)
        Object.keys(tot).forEach(k => {
          teamTotals[k] = (teamTotals[k] || 0) + tot[k]
        })
      })
      const teamAvg = {}
      Object.keys(teamTotals).forEach(k => {
        teamAvg[k] = teamTotals[k] / jugPartidos.length
      })

      const avgStats = {
        min: avg('min'), pts: avg('pts'),
        t2_anotados: avg('t2_anotados'), t2_intentos: avg('t2_intentos'),
        t3_anotados: avg('t3_anotados'), t3_intentos: avg('t3_intentos'),
        tl_anotados: avg('tl_anotados'), tl_intentos: avg('tl_intentos'),
        ro: avg('ro'), rd: avg('rd'), rt: avg('rt'),
        as_: avg('as_'), per: avg('per'), rec: avg('rec'),
        tap: avg('tap'), tr: avg('tr'), mat: avg('mat'),
        fp: avg('fp'), fr: avg('fr'), plus_minus: avg('plus_minus'), val: avg('val'),
      }

      // Partido rival más reciente para DRTG
      const ultimoPartidoId = stats[stats.length - 1]?.partido_id
      const ultimoPartido = partidos.find(p => p.id === ultimoPartidoId)
      const puntosRival = ultimoPartido?.puntos_rival

      const advanced = calcAllAdvanced(avgStats, teamAvg, puntosRival, stats, partidos, minTotalEquipoTemporada)

      result[jid] = {
        jugador: jugMap[jid],
        partidos: n,
        titularidades: stats.filter(s => s.titular).length,
        stats: avgStats,
        statsHistoricas: stats,
        advanced,
      }
    })

    // Jugadores SIN stats en el rango filtrado: se incluyen igualmente con
    // todo a 0, en vez de desaparecer de las tablas.
    const camposEnCero = [
      'min','pts','t2_anotados','t2_intentos','t3_anotados','t3_intentos',
      'tl_anotados','tl_intentos','ro','rd','rt','as_','per','rec','tap',
      'tr','mat','fp','fr','plus_minus','val',
    ]
    jugadores.forEach(j => {
      if (result[j.id]) return
      result[j.id] = {
        jugador: j,
        partidos: 0,
        titularidades: 0,
        stats: Object.fromEntries(camposEnCero.map(k => [k, 0])),
        statsHistoricas: [],
        advanced: {},
      }
    })
    return result
  }, [statsFiltradas, jugadores, partidos, allStats, minTotalEquipoTemporada])

  // Toggle selección jugador
  const toggleJugador = (id) => {
    setJugadoresIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

const jugadoresConStats = Object.keys(promediosPorJugador).map(Number)

const jugadoresSeleccionados = jugadoresIds.length > 0
  ? jugadoresIds.filter(id => jugadoresConStats.includes(id))
  : jugadoresConStats

  return {
    // Data
    temporadas, competiciones, jugadores, partidosFiltrados,
    promediosPorJugador, statsFiltradas, loading,
    // Filtros
    temporadaId, setTemporadaId,
    compId, setCompId,
    mes, setMes,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
    jugadoresIds, toggleJugador,
    jugadoresSeleccionados,
  }
}
