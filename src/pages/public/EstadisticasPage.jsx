import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, ZAxis, Cell, LabelList
} from 'recharts'
import { usePublicData } from '../../hooks/usePublicData'
import FiltrosBar from '../../components/public/FiltrosBar'
import AniversarioBadge from '../../components/public/AniversarioBadge'
import EquipoRecordCard from '../../components/public/EquipoRecordCard'

const BASIC_COLS = [
  { key: 'partidos', label: 'PJ', desc: 'Partidos jugados' },
  { key: 'titularidades', label: 'TIT', desc: 'Partidos que ha sido titular' },
  { key: 'min',      label: 'MIN', desc: 'Minutos' },
  { key: 'pts',      label: 'PTS', desc: 'Puntos' },
  { key: 'rt',       label: 'RT',  desc: 'Rebotes totales' },
  { key: 'as_',      label: 'AS',  desc: 'Asistencias' },
  { key: 'rec',      label: 'REC', desc: 'Recuperaciones' },
  { key: 'tap',      label: 'TAP', desc: 'Tapones' },
  { key: 'per',      label: 'PÉR', desc: 'Pérdidas' },
  { key: 'fp',       label: 'FP',  desc: 'Faltas personales' },
  { key: 'plus_minus', label: '+/-', desc: 'Diferencial' },
  { key: 'val',      label: 'VAL', desc: 'Valoración ACB' },
  { key: 't2',       label: 'T2',  desc: 'Tiros de 2' },
  { key: 't3',       label: 'T3',  desc: 'Tiros de 3' },
  { key: 'tl',       label: 'TL',  desc: 'Tiros libres' },
]

const ADV_COLS = [
  { key: 'ts_pct',   label: 'TS%',     desc: 'True Shooting %',        fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'efg_pct',  label: 'eFG%',    desc: 'Effective FG%',          fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'usg_pct',  label: 'USG%',    desc: 'Usage Rate',             fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'per',      label: 'PER',     desc: 'Player Efficiency Rating', fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'bpm',      label: 'BPM',     desc: 'Box Plus/Minus',         fmt: v => v != null ? (v>0?'+':'')+v : '—', type: 'pm' },
  { key: 'ws',       label: 'WS',      desc: 'Win Shares',             fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'ows',      label: 'OWS',     desc: 'Offensive Win Shares (parte ofensiva de las Win Shares)', fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'dws',      label: 'DWS',     desc: 'Defensive Win Shares (parte defensiva de las Win Shares)', fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'ws40',     label: 'WS/40',   desc: 'Win Shares por 40 min',  fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'ortg',     label: 'ORTG',    desc: 'Offensive Rating',       fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'drtg',     label: 'DRTG',    desc: 'Defensive Rating',       fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'net_rating',label:'NRTG',    desc: 'Net Rating',             fmt: v => v != null ? (v>0?'+':'')+v : '—', type: 'pm' },
  { key: 'ast_pct',  label: 'AST%',    desc: 'Assist Percentage',      fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'reb_pct',  label: 'REB%',    desc: 'Rebound Percentage',     fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'oreb_pct', label: 'OREB%',   desc: 'Offensive Rebound %',    fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'dreb_pct', label: 'DREB%',   desc: 'Defensive Rebound %',    fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'tov_pct',  label: 'TOV%',    desc: 'Turnover %',             fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'ast_to',   label: 'AST/TO',  desc: 'Asistencias/Pérdidas',   fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'pf40',     label: 'FP/40',   desc: 'Faltas personales por 40 min', fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'epm',      label: 'EPM',     desc: 'Estimated Plus/Minus',   fmt: v => v != null ? (v>0?'+':'')+v : '—', type: 'pm' },
  { key: 'raptor',   label: 'RAPTOR',  desc: 'RAPTOR (aprox.)',        fmt: v => v != null ? (v>0?'+':'')+v : '—', type: 'pm' },
  { key: 'lebron',   label: 'LEBRON',  desc: 'LEBRON (aprox.)',        fmt: v => v != null ? (v>0?'+':'')+v : '—', type: 'pm' },
  { key: 'tendencia_val', label: 'TEND', desc: 'Tendencia VAL (últ.5)', fmt: v => v != null ? v : '—', type: 'rating' },
  { key: 'win_pct_titular',  label: 'V% TIT', desc: '% de victorias en los partidos que fue titular',  fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'win_pct_suplente', label: 'V% SUP', desc: '% de victorias en los partidos que fue suplente', fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'aportacion_equipo_pct', label: 'APORT%', desc: '% de la producción total del equipo (PTS+REB+AST+ROB+TAP) que pone este jugador', fmt: v => v != null ? v+'%' : '—', type: 'pct' },
  { key: 'minutos_equipo_pct',    label: 'MIN%',   desc: '% de los minutos totales del equipo que juega este jugador', fmt: v => v != null ? v+'%' : '—', type: 'pct' },
]

const COLORS = ['#4E9E47','#9DC41A','#60A5FA','#F59E0B','#A78BFA','#F87171','#34D399','#FB923C']

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function rnd(v, d=1) { return v != null ? Math.round(v*10**d)/10**d : null }
function fmtVal(v) { if (v == null) return '—'; return rnd(v) }

// Añade un pequeño indicativo al nombre mostrado en leyendas/ejes de las
// gráficas cuando el jugador ya no pertenece a la plantilla actual.
function displayNombre(jugador, label) {
  return jugador && jugador.activo === false ? `${label} ⚠️` : label
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--gris-800)', border: '1px solid var(--gris-700)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--gris-400)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{ background: 'var(--gris-800)', border: '1px solid var(--gris-700)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--blanco)', fontWeight: 700, marginBottom: 4 }}>{p.nombre}</div>
      <div style={{ color: 'var(--gris-400)' }}>USG%: <span style={{ color: 'var(--lima)', fontWeight: 700 }}>{p.x}%</span></div>
      <div style={{ color: 'var(--gris-400)' }}>TS%: <span style={{ color: 'var(--lima)', fontWeight: 700 }}>{p.y}%</span></div>
      <div style={{ color: 'var(--gris-400)' }}>VAL: <span style={{ color: 'var(--lima)', fontWeight: 700 }}>{p.z}</span></div>
    </div>
  )
}

const STAT_OPTS = [
  {v:'pts',l:'Puntos'},{v:'rt',l:'Rebotes'},{v:'as_',l:'Asistencias'},
  {v:'rec',l:'Recuperaciones'},{v:'tap',l:'Tapones'},{v:'val',l:'Valoración'},
  {v:'plus_minus',l:'+/-'},{v:'per',l:'Pérdidas'},{v:'min',l:'Minutos'},
]

export default function EstadisticasPage() {
  const data = usePublicData()
  const [tab, setTab] = useState('basicas')
  const [warnMsg, setWarnMsg] = useState(null)
  const [sortCol, setSortCol] = useState('pts')
  const [sortDir, setSortDir] = useState(1)
  const [chartMetric, setChartMetric] = useState('pts')
  const [chartMetric2, setChartMetric2] = useState('val')
  const [todasMetricas, setTodasMetricas] = useState(false)
  const [evoMetrics, setEvoMetrics] = useState(['val']) // métricas elegidas en modo "todos"

  const { promediosPorJugador, jugadoresSeleccionados, partidosFiltrados, loading } = data
  const temporadaActual = data.temporadas?.find(t => String(t.id) === String(data.temporadaId))
  const temporadaNombre = temporadaActual?.nombre

  const rows = useMemo(() => {
    return jugadoresSeleccionados
      .map(jid => promediosPorJugador[jid])
      .filter(Boolean)
      .map(d => ({
        ...d,
        t2: `${rnd(d.stats.t2_anotados,1)}/${rnd(d.stats.t2_intentos,1)}`,
        t3: `${rnd(d.stats.t3_anotados,1)}/${rnd(d.stats.t3_intentos,1)}`,
        tl: `${rnd(d.stats.tl_anotados,1)}/${rnd(d.stats.tl_intentos,1)}`,
        min:        rnd(d.stats.min),
        pts:        rnd(d.stats.pts),
        rt:         rnd(d.stats.rt),
        as_:        rnd(d.stats.as_),
        rec:        rnd(d.stats.rec),
        tap:        rnd(d.stats.tap),
        per:        rnd(d.stats.per),
        fp:         rnd(d.stats.fp),
        plus_minus: rnd(d.stats.plus_minus),
        val:        rnd(d.stats.val),
      }))
      .sort((a, b) => {
        const va = tab === 'basicas' ? (a[sortCol] ?? -999) : (a.advanced?.[sortCol] ?? -999)
        const vb = tab === 'basicas' ? (b[sortCol] ?? -999) : (b.advanced?.[sortCol] ?? -999)
        return sortDir * (vb - va)
      })
  }, [promediosPorJugador, jugadoresSeleccionados, sortCol, sortDir, tab])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
  }

  const toggleEvoMetric = (v) => {
    setEvoMetrics(prev => {
      if (prev.includes(v)) {
        // No dejar la lista vacía: siempre al menos una métrica visible
        const next = prev.filter(m => m !== v)
        return next.length > 0 ? next : prev
      }
      return [...prev, v]
    })
  }

  // Datos para gráficas de evolución (todos los partidos en orden cronológico).
  // Guardamos el stat completo de cada jugador por partido, así una misma
  // gráfica sirve para cualquier métrica sin tener que recalcular nada.
  const chartData = useMemo(() => {
    if (jugadoresSeleccionados.length === 0) return []
    const partidosOrdenados = [...partidosFiltrados].sort((a,b) => a.fecha.localeCompare(b.fecha))
    return partidosOrdenados.map(p => {
      const punto = { fecha: p.fecha.slice(5), rival: p.rival, partido: `vs ${p.rival}` }
      jugadoresSeleccionados.forEach(jid => {
        const d = promediosPorJugador[jid]
        if (!d) return
        const stat = d.statsHistoricas.find(s => s.partido_id === p.id)
        if (stat) {
          const nombre = d.jugador?.nombre?.split(' ')[0] || String(jid)
          punto[nombre] = stat
        }
      })
      return punto
    }).filter(p => Object.keys(p).length > 3)
  }, [partidosFiltrados, jugadoresSeleccionados, promediosPorJugador])

  // Promedio combinado con TODOS los apartados (modo "todasMetricas")
  const promedioTodosData = useMemo(() => {
    return STAT_OPTS.map(o => {
      const punto = { metric: o.l }
      jugadoresSeleccionados.forEach(jid => {
        const d = promediosPorJugador[jid]
        if (!d) return
        const nombre = d.jugador?.nombre?.split(' ')[0] || String(jid)
        punto[nombre] = rnd(d.stats[o.v]) ?? 0
      })
      return punto
    })
  }, [jugadoresSeleccionados, promediosPorJugador])

  // Radar comparativo: se construye a partir de `rows` (los jugadores que
  // realmente tienen datos en el rango filtrado), no de jugadoresSeleccionados
  // en crudo, para que no "desaparezca" si alguno de los seleccionados no
  // tiene estadísticas con el filtro actual.
  // Usamos jugador.id como key interna (siempre única) en vez del primer
  // nombre, para que dos jugadores con el mismo nombre no se pisen entre sí.
  const radarData = useMemo(() => {
    let metrics = todasMetricas
      ? [...new Set(['pts','rt','as_','rec','tap','val'])]
      : [...new Set([chartMetric, chartMetric2])]

    if (!todasMetricas && metrics.length < 3) {
      const tercero = metrics.includes('min') ? 'val' : 'min'
      metrics = [...metrics, tercero]
    }

    const labelMap = { pts:'PTS', rt:'REB', as_:'AST', rec:'REC', tap:'TAP', val:'VAL', plus_minus:'+/-', per:'PÉR', min:'MIN' }
    return metrics.map(key => {
      const label = todasMetricas
        ? labelMap[key]
        : (STAT_OPTS.find(o => o.v === key)?.l || labelMap[key] || key.toUpperCase())
      const punto = { metric: label }
      rows.forEach(r => {
        punto[r.jugador.id] = rnd(r.stats[key]) || 0
      })
      return punto
    })
  }, [rows, todasMetricas, chartMetric, chartMetric2])
  // Nombre a mostrar en leyenda/tooltip del radar; añade el dorsal si dos
  // jugadores seleccionados comparten el primer nombre, para distinguirlos.
  const primerosNombresRadar = rows.map(r => r.jugador.nombre.split(' ')[0])
  const radarDisplayName = (r, i) => {
    const base = primerosNombresRadar[i]
    const repetido = primerosNombresRadar.filter(n => n === base).length > 1
    const label = repetido ? `${base} #${r.jugador.dorsal}` : base
    return displayNombre(r.jugador, label)
  }

  // Scatter "chulo": Eficiencia (TS%) vs Volumen (USG%), tamaño = Valoración
  const scatterData = useMemo(() => {
    return rows.map(r => ({
      nombre: displayNombre(r.jugador, r.jugador.nombre.split(' ')[0]),
      x: r.advanced?.usg_pct ?? 0,
      y: r.advanced?.ts_pct ?? 0,
      z: Math.max(r.val ?? 1, 1),
    }))
  }, [rows])

  // Helper: gráfica de evolución por partido para una métrica concreta
  function renderEvolucion(metric, key, tituloExtra) {
    const label = STAT_OPTS.find(o => o.v === metric)?.l || metric.toUpperCase()
    return (
      <div className="chart-card" style={{ gridColumn: '1 / -1' }} key={key}>
        <h3>Evolución por partido — {label}{tituloExtra ? ` (${tituloExtra})` : ''}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top:5, right:20, left:0, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
            <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:11 }} />
            <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
            <Legend wrapperStyle={{ fontSize:12, color:'var(--gris-300)' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--gris-600)" />
            {jugadoresSeleccionados.map((jid, i) => {
              const d = promediosPorJugador[jid]
              if (!d) return null
              const nombre = d.jugador?.nombre?.split(' ')[0] || String(jid)
              return (
                <Line key={jid} type="monotone"
                  dataKey={(row) => row[nombre]?.[metric] ?? null}
                  name={displayNombre(d.jugador, nombre)}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }}
                  connectNulls />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Helper: gráfica de promedio (barras) para una métrica concreta
  function renderPromedio(metric, color, key) {
    const label = STAT_OPTS.find(o => o.v === metric)?.l || metric.toUpperCase()
    return (
      <div className="chart-card" key={key}>
        <h3>Promedio — {label}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={rows.map(r => ({
              nombre: displayNombre(r.jugador, r.jugador.nombre.split(' ')[0]),
              valor: r[metric] ?? r.stats?.[metric] ?? 0
            }))}
            margin={{ top:5, right:10, left:0, bottom:30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
            <XAxis dataKey="nombre" tick={{ fill:'var(--gris-500)', fontSize:11 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--gris-700)', opacity: 0.3 }} />
            <Bar dataKey="valor" name={label} fill={color} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  const compNombre = (id) => {
    if (id === 'todas') return null
    const map = { ACB:'acb', BCL:'bcl', 'Copa del Rey':'copa', Supercopa:'super', Intercontinental:'inter' }
    const comp = data.competiciones.find(c => String(c.id) === id)
    return comp ? { nombre: comp.nombre, cls: map[comp.nombre]||'acb' } : null
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Estadísticas</h2>
          <p>
            {data.partidosFiltrados.length} partidos
            {data.mes !== 'todos' && ` · ${['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][Number(data.mes)]}`}
            {data.compId !== 'todas' && ` · ${data.competiciones.find(c=>String(c.id)===data.compId)?.nombre}`}
          </p>
        </div>
        <AniversarioBadge temporadaNombre={temporadaNombre} />
      </div>

      <FiltrosBar {...data} extra={<EquipoRecordCard temporada={temporadaActual} />} />

      {/* Tabs — solo si hay datos */}
      {rows.length === 0 ? (
        <div className="empty-state card">
          <p>No hay estadísticas con los filtros seleccionados.</p>
          <p style={{ fontSize:13, color:'var(--gris-500)', marginTop:8 }}>Prueba cambiando la competición, el mes o el rango de fechas.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs">
            {[
              { id: 'basicas', label: 'Básicas' },
              { id: 'avanzadas', label: 'Avanzadas' },
              { id: 'graficas', label: 'Gráficas' },
              { id: 'ayuda', label: '? Ayuda métricas' },
            ].map(t => (
              <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TABLA BÁSICAS ── */}
          {tab === 'basicas' && (
            <>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--verde)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Estadísticas básicas por partido</span> — promedios de cada jugador a lo largo de la temporada, de un rango de fechas, una competición o un mes en concreto. Ordena por cualquier columna haciendo clic en su cabecera. Pulsa <span style={{ color: 'var(--verde)' }}>Ver</span> para ir al perfil completo del jugador.
              </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Jugador</th>
                    {BASIC_COLS.map(c => (
                      <th key={c.key} className={`num${sortCol===c.key?' sorted':''}`} onClick={() => handleSort(c.key)}
                        title={c.desc}>
                        {c.label} {sortCol===c.key ? (sortDir===-1?'↓':'↑') : ''}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.jugador.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--verde)', fontSize:13 }}>#{r.jugador.dorsal}</span>
                          <div>
                            <div style={{ fontWeight:600, color:'var(--blanco)' }}>{r.jugador.nombre}</div>
                            <div style={{ fontSize:11, color:'var(--gris-500)' }}>{r.jugador.posicion}</div>
                          </div>
                          {!r.jugador.activo && (
                            <span
                              className="warn-tooltip"
                              onClick={() => setWarnMsg(`Este jugador ya no pertenece a la plantilla de la temporada ${temporadaNombre || 'actual'}.`)}
                            >
                              ⚠️
                              <span className="warn-tooltip-box">
                                Este jugador ya no pertenece a la plantilla de la temporada {temporadaNombre || 'actual'}.
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num">{r.partidos}</td>
                      <td className="num">{r.titularidades}</td>
                      <td className="num">{r.min}</td>
                      <td className="num highlight">{r.pts}</td>
                      <td className="num">{r.rt}</td>
                      <td className="num">{r.as_}</td>
                      <td className="num">{r.rec}</td>
                      <td className="num">{r.tap}</td>
                      <td className="num">{r.per}</td>
                      <td className="num">{r.fp}</td>
                      <td className={`num ${r.plus_minus>0?'pos':r.plus_minus<0?'neg':''}`}>
                        {r.plus_minus!=null?(r.plus_minus>0?'+':'')+r.plus_minus:'—'}
                      </td>
                      <td className="num lima">{r.val}</td>
                      <td className="num">{r.t2}</td>
                      <td className="num">{r.t3}</td>
                      <td className="num">{r.tl}</td>
                      <td><Link to={`/${slugify(r.jugador.nombre)}`} className="btn btn-ghost btn-sm">Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* ── TABLA AVANZADAS ── */}
          {tab === 'avanzadas' && (
            <>
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--lima)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Métricas avanzadas</span> — estadísticas derivadas que van más allá del box score tradicional. Miden eficiencia de tiro, impacto ofensivo y defensivo, uso de posesiones y contribución global al equipo. Para entender qué significa cada métrica, consulta la pestaña <span style={{ color: 'var(--lima)' }}>? Ayuda métricas</span>.
              </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="col-sticky" style={{ minWidth: 160 }}>Jugador</th>
                    {ADV_COLS.map(c => (
                      <th key={c.key} className={`num${sortCol===c.key?' sorted':''}`} onClick={() => handleSort(c.key)} title={c.desc}>
                        {c.label} {sortCol===c.key ? (sortDir===-1?'↓':'↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.jugador.id}>
                      <td className="col-sticky">
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--verde)', fontSize:13 }}>#{r.jugador.dorsal}</span>
                          <span style={{ fontWeight:600, color:'var(--blanco)' }}>{r.jugador.nombre}</span>
                          {!r.jugador.activo && (
                            <span
                              className="warn-tooltip"
                              onClick={() => setWarnMsg(`Este jugador ya no pertenece a la plantilla de la temporada ${temporadaNombre || 'actual'}.`)}
                            >
                              ⚠️
                              <span className="warn-tooltip-box">
                                Este jugador ya no pertenece a la plantilla de la temporada {temporadaNombre || 'actual'}.
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      {ADV_COLS.map(c => {
                        const v = r.advanced?.[c.key]
                        const fmt = c.fmt(v)
                        const cls = c.type==='pm' ? (v>0?'pos':v<0?'neg':'') : c.type==='pct'?'lima':''
                        return <td key={c.key} className={`num ${cls}`}>{fmt}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* ── GRÁFICAS ── */}
          {tab === 'graficas' && (
            <>
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid #60A5FA', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Visualización de datos</span> — elige dos métricas para comparar su evolución partido a partido y sus promedios. Activa <span style={{ color: '#60A5FA' }}>Evaluar todos los apartados</span> para ver una visión global de todas las estadísticas a la vez.
              </div>
              {jugadoresSeleccionados.some(jid => promediosPorJugador[jid]?.jugador?.activo === false) && (
                <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(230, 80, 60, 0.1)', border: '1px solid rgba(230, 80, 60, 0.3)', borderRadius: 'var(--radius)', fontSize: 12.5, color: '#e8917f' }}>
                  ⚠️ = jugador que ya no pertenece a la plantilla actual.
                </div>
              )}
              {/* Controles de métrica */}
              <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
                <label style={{
                  display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                  background:'var(--gris-800)', border:'1px solid var(--gris-700)',
                  borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13,
                  color:'var(--gris-300)', fontWeight:600,
                }}>
                  <input
                    type="checkbox"
                    checked={todasMetricas}
                    onChange={e => setTodasMetricas(e.target.checked)}
                    style={{ width:16, height:16, accentColor:'var(--verde)', cursor:'pointer' }}
                  />
                  Evaluar todos los apartados
                </label>

                {!todasMetricas && (
                  <>
                    <div className="filter-group">
                      <label>Métrica gráfica 1</label>
                      <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}>
                        {STAT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Métrica gráfica 2</label>
                      <select value={chartMetric2} onChange={e => setChartMetric2(e.target.value)}>
                        {STAT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Selector múltiple de métricas de evolución — solo en modo "todos" */}
              {todasMetricas && (
                <div style={{ marginBottom:24 }}>
                  <label style={{ display:'block', fontSize:12, color:'var(--gris-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.6px' }}>
                    Evolución a mostrar (elige una o varias)
                  </label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {STAT_OPTS.map(o => (
                      <button
                        key={o.v}
                        type="button"
                        className={`jugador-chip${evoMetrics.includes(o.v) ? ' selected' : ''}`}
                        onClick={() => toggleEvoMetric(o.v)}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="charts-grid">
                {todasMetricas ? (
                  <>
                    {/* Una gráfica de evolución por cada métrica marcada */}
                    {evoMetrics.map(m => renderEvolucion(m, `evo-${m}`))}

                    {/* Promedio combinado — todos los apartados en una sola gráfica */}
                    <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                      <h3>Promedio — todos los apartados</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={promedioTodosData} margin={{ top:5, right:20, left:0, bottom:5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                          <XAxis dataKey="metric" tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                          <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                          <Legend wrapperStyle={{ fontSize:12, color:'var(--gris-300)' }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--gris-700)', opacity: 0.3 }} />
                          {jugadoresSeleccionados.map((jid, i) => {
                            const d = promediosPorJugador[jid]
                            if (!d) return null
                            const nombre = d.jugador?.nombre?.split(' ')[0] || String(jid)
                            return <Bar key={jid} dataKey={nombre} name={displayNombre(d.jugador, nombre)} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <>
                    {renderEvolucion(chartMetric, 'evo-1')}
                    {renderEvolucion(chartMetric2, 'evo-2')}
                    {renderPromedio(chartMetric, 'var(--verde)', 'prom-1')}
                    {renderPromedio(chartMetric2, 'var(--lima)', 'prom-2')}
                  </>
                )}

                {/* Gráfico nuevo: Eficiencia vs Volumen */}
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                  <h3>
                    Eficiencia vs Volumen{' '}
                    <span style={{ fontSize:12, color:'var(--gris-500)', fontWeight:400 }}>
                      (USG% vs TS%, tamaño = Valoración)
                    </span>
                  </h3>
                  <ResponsiveContainer width="100%" height={340}>
                    <ScatterChart margin={{ top:20, right:30, left:0, bottom:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                      <XAxis type="number" dataKey="x" name="USG%" unit="%" tick={{ fill:'var(--gris-500)', fontSize:11 }}
                        label={{ value:'USG% (volumen de uso)', position:'insideBottom', offset:-10, fill:'var(--gris-500)', fontSize:12 }} />
                      <YAxis type="number" dataKey="y" name="TS%" unit="%" tick={{ fill:'var(--gris-500)', fontSize:11 }}
                        label={{ value:'TS% (eficiencia)', angle:-90, position:'insideLeft', fill:'var(--gris-500)', fontSize:12 }} />
                      <ZAxis type="number" dataKey="z" range={[100, 500]} name="VAL" />
                      <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray:'3 3' }} />
                      <Scatter data={scatterData}>
                        {scatterData.map((p, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        <LabelList dataKey="nombre" position="top" style={{ fontSize:11, fill:'var(--gris-300)' }} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar comparativo — al final, basado en `rows` para no desaparecer
                    si algún jugador seleccionado no tiene datos con el filtro actual */}
                {rows.length >= 2 ? (
                  <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Radar comparativo</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--gris-700)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill:'var(--gris-400)', fontSize:11 }} />
                        {rows.map((r, i) => (
                          <Radar key={r.jugador.id} name={radarDisplayName(r, i)} dataKey={r.jugador.id}
                            stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15}
                            strokeWidth={2} />
                        ))}
                        <Legend wrapperStyle={{ fontSize:12, color:'var(--gris-300)' }} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Radar comparativo</h3>
                    <p style={{ fontSize:13, color:'var(--gris-500)' }}>
                      Selecciona al menos 2 jugadores con estadísticas en el rango filtrado para comparar.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {/* ── AYUDA MÉTRICAS ── */}
          {tab === 'ayuda' && (
            <>
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--gris-600)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Glosario de métricas</span> — descripción detallada de cada estadística avanzada: qué mide, cómo se calcula y cómo interpretarla. Las métricas de impacto (EPM, RAPTOR, LEBRON) son <span style={{ color: 'var(--gris-300)' }}>aproximaciones basadas en box score</span>, ya que las versiones reales requieren datos de tracking de cámara que no están disponibles públicamente en la ACB.
              </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { grupo: 'Eficiencia de tiro', items: [
                  { label: 'TS% — True Shooting %', formula: 'PTS / (2 × (FGA + 0.44 × FTA))', desc: 'Mide la eficiencia real de tiro teniendo en cuenta los triples (valen más) y los tiros libres. Es la métrica más completa para evaluar la eficiencia anotadora. Un jugador de élite supera el 58%.' },
                  { label: 'eFG% — Effective FG%', formula: '(FGM + 0.5 × 3PM) / FGA', desc: 'Como el FG% normal pero ponderando que un triple vale 1.5 veces más que un doble. Ignora los tiros libres. Útil para comparar tiradores.' },
                ]},
                { grupo: 'Uso y creación', items: [
                  { label: 'USG% — Usage Rate', formula: '100 × (FGA + 0.44×FTA + TOV) × (TmMin/5) / (Min × (TmFGA + 0.44×TmFTA + TmTOV))', desc: 'Porcentaje de posesiones del equipo que termina un jugador mientras está en pista. Un base creador suele tener 25-30%, un rol player 10-15%.' },
                  { label: 'AST% — Assist Percentage', formula: '100 × AST / ((Min/(TmMin/5)) × TmFGM − FGM)', desc: 'Porcentaje estimado de canastas del equipo que asiste el jugador mientras está en pista.' },
                  { label: 'AST/TO — Ratio Asistencias/Pérdidas', formula: 'AST / TOV', desc: 'Cuántas asistencias da por cada pérdida. Un ratio superior a 2 es bueno; superior a 3 es excelente. Si no tiene pérdidas se muestra directamente el número de asistencias.' },
                  { label: 'TOV% — Turnover Percentage', formula: '100 × TOV / (FGA + 0.44×FTA + TOV)', desc: 'Porcentaje de posesiones individuales que acaban en pérdida. Por debajo del 12% es bueno.' },
                ]},
                { grupo: 'Rebote', items: [
                  { label: 'REB% — Rebound Percentage', formula: '100 × (REB × TmMin/5) / (Min × (TmREB + OppREB))', desc: 'Porcentaje de rebotes disponibles que captura el jugador mientras está en pista.' },
                  { label: 'OREB% — Offensive Rebound %', formula: 'Igual que REB% pero solo rebotes ofensivos', desc: 'Indica qué tan activo es el jugador en la búsqueda de segundas opciones ofensivas.' },
                  { label: 'DREB% — Defensive Rebound %', formula: 'Igual que REB% pero solo rebotes defensivos', desc: 'Un pívot de élite suele estar entre 20-30%.' },
                ]},
                { grupo: 'Faltas y disciplina', items: [
                  { label: 'FP/40 — Faltas personales por 40 min', formula: 'FP / Minutos × 40', desc: 'Ritmo de faltas normalizado a 40 minutos, para comparar jugadores con distinto tiempo de juego. Un valor alto puede indicar un defensor agresivo o con problemas de disciplina; en pívots interiores suele ser algo más alto que en exteriores.' },
                ]},
                { grupo: 'Peso en el equipo', items: [
                  { label: 'APORT% — % Aportación al equipo', formula: '100 × (PTS+REB+AST+ROB+TAP jugador) / (PTS+REB+AST+ROB+TAP equipo)', desc: 'Qué parte de la producción total del equipo (puntos, rebotes, asistencias, robos y tapones sumados) pone este jugador. Usa los totales reales del equipo en los partidos que jugó. Cuanto más alto, más peso tiene en el juego del equipo.' },
                  { label: 'MIN% — % Minutos del equipo', formula: '100 × Minutos jugador / Minutos totales del equipo', desc: 'Qué parte de los minutos totales disponibles (los de los 5 jugadores en pista sumados) se lleva este jugador. Indica cuánta confianza/rol tiene dentro de la rotación.' },
                ]},
                { grupo: 'Ratings y eficiencia global', items: [
                  { label: 'PER — Player Efficiency Rating', formula: 'Fórmula Hollinger completa normalizada a media 15', desc: 'La métrica histórica de Hollinger. Intenta resumir toda la contribución de un jugador en un solo número. Media de liga = 15. Por encima de 20 es All-Star, por encima de 25 es MVP.' },
                  { label: 'ORTG — Offensive Rating', formula: 'Puntos producidos individuales / posesiones × 100', desc: 'Puntos que produce el jugador por cada 100 posesiones individuales. La media de liga está en torno a 105.' },
                  { label: 'DRTG — Defensive Rating', formula: 'Estimación basada en stops individuales (robos, tapones, rebotes defensivos)', desc: 'Puntos que permite el jugador por cada 100 posesiones mientras está en pista. Cuanto más bajo, mejor defensor.' },
                  { label: 'NRTG — Net Rating', formula: 'ORTG − DRTG', desc: 'Diferencia entre rating ofensivo y defensivo. El indicador más claro del impacto neto del jugador. Por encima de +5 es excelente.' },
                  { label: 'BPM — Box Plus/Minus', formula: 'Coeficientes Myers aplicados a stats por 36 min', desc: 'Estima cuántos puntos por cada 100 posesiones aporta el jugador por encima de un jugador de liga media. 0 = jugador promedio, +5 = All-Star, +8 = MVP.' },
                ]},
                { grupo: 'Win Shares', items: [
                  { label: 'WS — Win Shares', formula: 'Basado en puntos producidos y stops individuales (Oliver)', desc: 'Estimación de victorias que ha aportado el jugador al equipo. Un buen titular suele aportar 5-8 WS por temporada.' },
                  { label: 'OWS — Offensive Win Shares', formula: 'Parte ofensiva de las WS, basada en puntos producidos por encima del margen de posesión', desc: 'Cuánto de esas victorias aportadas viene de la anotación y creación de juego del jugador.' },
                  { label: 'DWS — Defensive Win Shares', formula: 'Parte defensiva de las WS, basada en robos, tapones y rebotes defensivos', desc: 'Cuánto de esas victorias aportadas viene de la contribución defensiva del jugador (robos, tapones, rebotes defensivos), en vez de la anotación.' },
                  { label: 'WS/40 — Win Shares por 40 min', formula: 'WS / Minutos × 40', desc: 'WS normalizado a 40 minutos para comparar jugadores con distinto tiempo de juego. Media de liga ≈ 0.100. Por encima de 0.200 es excelente.' },
                ]},
                { grupo: 'Métricas de impacto (aproximadas)', items: [
                  { label: 'EPM — Estimated Plus/Minus', formula: 'Coeficientes públicos dunksandthrees.com aplicados a stats por posesión', desc: 'Aproximación al RPM/RAPM usando solo box score. Divide en OEPM (ofensivo) y DEPM (defensivo). Las métricas reales requieren datos de tracking que no tenemos.' },
                  { label: 'RAPTOR (aprox.)', formula: 'Combinación de BPM con ajuste de eficiencia y rol (FiveThirtyEight adaptado)', desc: 'Aproximación a la métrica de FiveThirtyEight. El RAPTOR real usa datos de cámara de seguimiento; esta versión es una estimación box-score. Divide en ORAPTOR y DRAPTOR.' },
                  { label: 'LEBRON (aprox.)', formula: '0.55×BPM + 0.35×EPM + 0.10×PER_ajustado', desc: 'Aproximación a la métrica de BBall-Index. El LEBRON real combina RAPM con arquetipos de rol; esta versión pondera las tres principales métricas de impacto disponibles.' },
                ]},
                { grupo: 'Métricas de seguimiento', items: [
                  { label: 'TEND — Tendencia VAL', formula: 'Media de valoración ACB de los últimos 5 partidos', desc: 'Indica si el jugador está en buena o mala racha reciente. Si la tendencia supera la media de temporada, el jugador está en forma.' },
                  { label: 'DD / TD — Dobles-dobles / Triples-dobles', formula: 'Partidos con ≥10 en 2 ó 3 categorías (PTS, REB, AST, REC, TAP)', desc: 'Contador acumulado de actuaciones destacadas en la temporada.' },
                  { label: 'V% TIT / V% SUP — % Victorias como titular / suplente', formula: 'Partidos ganados jugando de titular (o de suplente) / total de partidos en ese rol × 100', desc: 'Compara si el equipo gana más cuando este jugador sale de inicio o cuando entra desde el banquillo. Dato exacto, cruza cada partido con su resultado real.' },
                ]},
              ].map(grupo => (
                <div key={grupo.grupo} className="card">
                  <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--verde)', marginBottom:16 }}>{grupo.grupo}</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {grupo.items.map(item => (
                      <div key={item.label} style={{ borderLeft:'3px solid var(--gris-700)', paddingLeft:16 }}>
                        <div style={{ fontWeight:700, color:'var(--blanco)', marginBottom:4 }}>{item.label}</div>
                        <div style={{ fontFamily:'var(--font-mono,monospace)', fontSize:11, color:'var(--lima)', background:'var(--negro)', padding:'4px 8px', borderRadius:4, marginBottom:6, display:'inline-block' }}>{item.formula}</div>
                        <div style={{ fontSize:13, color:'var(--gris-400)', lineHeight:1.5 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </>
      )}

      {warnMsg && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWarnMsg(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 15 }}>⚠️ Aviso</h3>
              <button className="btn-close" onClick={() => setWarnMsg(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>{warnMsg}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}