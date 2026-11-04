import { useMemo, useRef, useState } from 'react'
import { usePublicData } from '../../hooks/usePublicData'
import { sumarMinutos } from '../../lib/avanzadas'
import FiltrosBar from '../../components/public/Filtros'
import AniversarioBadge from '../../components/public/Aniversario'
import EquipoRecordCard from '../../components/public/EquipoRecordTarjeta'
import CapturaBoton from '../../components/public/CapturaBoton'

function rnd(v, d = 1) { return v != null ? Math.round(v * 10 ** d) / 10 ** d : null }

// Un "quinteto" aquí es el cinco inicial de un partido: se guarda quién fue
// titular, no quién estaba en pista en cada momento, así que no se pueden
// calcular quintetos "reales" de pista. Los partidos sin exactamente 5
// titulares marcados se ignoran para no inventar datos.

// ── Categorías de la pizarra ──
// Hay dos tipos:
//  · "titular": cincos iniciales REALES (los cinco titulares de un partido).
//  · "ideal": el mejor jugador de cada posición según una métrica, sin que
//    hayan tenido que jugar juntos. Un jugador con posición secundaria
//    puede cubrir cualquiera de sus dos posiciones.
const CATEGORIAS = [
  { id: 'usado', tipo: 'titular', label: 'Mayor titularidad',  metrica: 'Partidos juntos', valor: q => q.partidos, fmt: v => v,          minimo: false },
  { id: 'win',   tipo: 'titular', label: 'Mejor balance',  metrica: '% victorias',     valor: q => q.winPct,   fmt: v => (v == null ? '—' : v + '%'), minimo: true },
  { id: 'i-val', tipo: 'ideal', label: 'Mejor Valoración', metrica: 'VAL conjunta',    nombre: 'valoración',     panelId: 'val', jug: d => d.stats.val,        agg: a => a.val, eq: q => q.val, fmt: v => rnd(v) },
  { id: 'i-ef',  tipo: 'ideal', label: 'Mas Eficiente', metrica: 'TS% conjunto',    nombre: 'eficiencia (TS%)', panelId: 'ef',  jug: d => d.advanced?.ts_pct, agg: a => a.ts,  eq: q => q.ts,  fmt: v => v + '%' },
  { id: 'i-pts', tipo: 'ideal', label: 'Mas Anotador',  metrica: 'Puntos de los 5', nombre: 'anotación',      panelId: 'pts', jug: d => d.stats.pts,        agg: a => a.pts, eq: q => q.pts, fmt: v => rnd(v) },
  { id: 'i-min', tipo: 'ideal', label: 'Mas Minutaje',    metrica: 'Min. de los 5',   nombre: 'minutos',        panelId: 'min', jug: d => d.stats.min,        agg: a => a.min, eq: q => q.min, fmt: v => rnd(v) },
  // Defensivo: DRTG, menos es mejor (hace falta guardar los puntos del rival)
  { id: 'i-def', tipo: 'ideal', label: 'Más Defensivo', metrica: 'DRTG medio de los 5', nombre: 'defensa (DRTG, menos es mejor)', panelId: 'def', menorMejor: true, jug: d => d.advanced?.drtg, agg: a => a.drtg, eq: () => null, fmt: v => rnd(v) },
]

// Posición en la cancha (en % del ancho/alto de la pizarra). La canasta
// está arriba. Si hay dos jugadores con la misma posición, el segundo usa
// su posición secundaria o el primer hueco libre.
const HUECOS = {
  'Base':      { x: 50, y: 76 },
  'Escolta':   { x: 82, y: 58 },
  'Alero':     { x: 18, y: 58 },
  'Ala-Pívot': { x: 66, y: 30 },
  'Pívot':     { x: 34, y: 30 },
}
const ORDEN_HUECOS = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot']

function colocarJugadores(jugadores) {
  const libres = new Set(ORDEN_HUECOS)
  const resultado = []
  const pendientes = []
  // 1ª pasada: posición principal
  jugadores.forEach(j => {
    if (HUECOS[j.posicion] && libres.has(j.posicion)) {
      libres.delete(j.posicion)
      resultado.push({ j, hueco: HUECOS[j.posicion] })
    } else pendientes.push(j)
  })
  // 2ª pasada: posición secundaria; si no, el primer hueco libre
  pendientes.forEach(j => {
    let pos = HUECOS[j.posicion_secundaria] && libres.has(j.posicion_secundaria) ? j.posicion_secundaria : null
    if (!pos) pos = ORDEN_HUECOS.find(p => libres.has(p))
    libres.delete(pos)
    resultado.push({ j, hueco: HUECOS[pos] })
  })
  return resultado
}

// Monta el quinteto ideal: para cada posición, el mejor jugador según `getM`
// (media por partido), probando todas las combinaciones válidas para que cada
// jugador solo ocupe un hueco y respetando posición principal y secundaria.
// Solo cuentan jugadores con un mínimo de partidos (hasta 3) para que alguien
// con un solo partidazo no se cuele.
function armarIdeal(promedios, getM, menorMejor = false) {
  const todos = Object.values(promedios).filter(d => d.partidos > 0 && d.jugador)
  const maxP = todos.reduce((m, d) => Math.max(m, d.partidos), 0)
  const minPartidos = Math.max(1, Math.min(3, maxP))
  const signo = menorMejor ? -1 : 1
  const cands = todos.filter(d => d.partidos >= minPartidos && getM(d) != null)
  if (cands.length === 0) return null

  const elegiblePara = slot => cands.filter(d => d.jugador.posicion === slot || d.jugador.posicion_secundaria === slot)
  const usados = new Set()
  const actual = {}
  let mejor = { llenos: -1, total: -Infinity, asign: {} }
  const rec = (i, llenos, total) => {
    if (i === ORDEN_HUECOS.length) {
      if (llenos > mejor.llenos || (llenos === mejor.llenos && total > mejor.total)) mejor = { llenos, total, asign: { ...actual } }
      return
    }
    const slot = ORDEN_HUECOS[i]
    for (const d of elegiblePara(slot)) {
      const id = d.jugador.id
      if (usados.has(id)) continue
      usados.add(id); actual[slot] = d
      rec(i + 1, llenos + 1, total + signo * getM(d))
      usados.delete(id); delete actual[slot]
    }
    rec(i + 1, llenos, total)
  }
  rec(0, 0, 0)

  const items = []
  const sinCubrir = []
  ORDEN_HUECOS.forEach(slot => {
    const d = mejor.asign[slot]
    if (d) items.push({ slot, d, valor: getM(d), secundaria: d.jugador.posicion !== slot, fuera: false })
    else sinCubrir.push(slot)
  })
  // Hueco sin ningún jugador elegible: se cubre con el mejor libre
  const yaElegidos = new Set(items.map(it => it.d.jugador.id))
  const resto = cands.filter(d => !yaElegidos.has(d.jugador.id)).sort((x, y) => signo * (getM(y) - getM(x)))
  sinCubrir.forEach(slot => {
    const d = resto.shift()
    if (d) items.push({ slot, d, valor: getM(d), secundaria: false, fuera: true })
  })
  items.sort((x, y) => ORDEN_HUECOS.indexOf(x.slot) - ORDEN_HUECOS.indexOf(y.slot))

  const suma = f => items.reduce((acc, it) => acc + (f(it.d) || 0), 0)
  const pts = suma(d => d.stats.pts)
  const denom = 2 * (suma(d => d.stats.t2_intentos + d.stats.t3_intentos) + 0.44 * suma(d => d.stats.tl_intentos))
  const agg = {
    val: suma(d => d.stats.val),
    pts,
    min: suma(d => d.stats.min),
    ts: denom > 0 ? rnd((pts / denom) * 100) : null,
    drtg: items.length ? rnd(items.reduce((acc, it) => acc + (it.d.advanced?.drtg ?? 0), 0) / items.length) : null,
  }
  return { items, agg, minPartidos, candidatos: cands.length }
}

// Líneas de media pista (vista cenital, canasta arriba)
function Cancha() {
  const l = { stroke: 'rgba(255,255,255,.55)', strokeWidth: 2.5, fill: 'none' }
  return (
    <svg viewBox="0 0 500 470" preserveAspectRatio="none" className="pizarra-cancha" aria-hidden="true">
      <rect x="0" y="0" width="500" height="470" fill="#102a17" />
      <rect x="170" y="0" width="160" height="190" fill="rgba(78,158,71,.22)" />
      <rect x="2" y="2" width="496" height="466" {...l} />
      <rect x="170" y="2" width="160" height="188" {...l} />
      <path d="M190 190 A60 60 0 0 1 310 190" {...l} />
      <path d="M190 190 A60 60 0 0 0 310 190" {...l} strokeDasharray="7 7" />
      <path d="M30 2 L30 140 A237 237 0 0 0 470 140 L470 2" {...l} />
      <path d="M210 52 A40 40 0 0 0 290 52" {...l} />
      <line x1="220" y1="40" x2="280" y2="40" stroke="rgba(255,255,255,.8)" strokeWidth="4" />
      <circle cx="250" cy="52" r="9" stroke="#F59E0B" strokeWidth="3" fill="none" />
      <path d="M190 468 A60 60 0 0 1 310 468" {...l} />
    </svg>
  )
}

export default function QuintetosPage() {
  const data = usePublicData()
  const { jugadores, statsFiltradas, partidosFiltrados, promediosPorJugador, loading } = data
  const temporadaActual = data.temporadas?.find(t => String(t.id) === String(data.temporadaId))
  const temporadaNombre = temporadaActual?.nombre

  const [cat, setCat] = useState('usado')
  const [selKey, setSelKey] = useState(null)
  const [verTodos, setVerTodos] = useState(false)
  const pizarraRef = useRef(null)

  const quintetos = useMemo(() => {
    const jugPorId = {}
    jugadores.forEach(j => { jugPorId[j.id] = j })
    const partPorId = {}
    partidosFiltrados.forEach(p => { partPorId[p.id] = p })

    // Titulares de cada partido
    const porPartido = {}
    statsFiltradas.forEach(s => {
      if (!s.titular || !partPorId[s.partido_id]) return
      ;(porPartido[s.partido_id] ||= []).push(s)
    })

    const grupos = {}
    Object.entries(porPartido).forEach(([pid, filas]) => {
      if (filas.length !== 5) return
      if (filas.some(f => !jugPorId[f.jugador_id])) return
      const ids = filas.map(f => f.jugador_id).sort((a, b) => a - b)
      const key = ids.join('-')
      ;(grupos[key] ||= { key, ids, partidos: [] }).partidos.push({ partido: partPorId[pid], filas })
    })

    return Object.values(grupos).map(g => {
      const n = g.partidos.length
      let val = 0, pts = 0, fga = 0, fta = 0, minTotal = 0
      let victorias = 0, jugados = 0, margen = 0
      const aporte = {}
      g.partidos.forEach(({ partido, filas }) => {
        minTotal += sumarMinutos(filas.map(f => f.min))
        filas.forEach(f => {
          const a = (aporte[f.jugador_id] ||= { val: 0, pts: 0 })
          a.val += f.val || 0
          a.pts += f.pts || 0
          val += f.val || 0
          pts += f.pts || 0
          fga += (f.t2_intentos || 0) + (f.t3_intentos || 0)
          fta += f.tl_intentos || 0
        })
        if (partido.puntos_unicaja != null && partido.puntos_rival != null) {
          jugados++
          if (partido.puntos_unicaja > partido.puntos_rival) victorias++
          margen += partido.puntos_unicaja - partido.puntos_rival
        }
      })
      const denom = 2 * (fga + 0.44 * fta)
      return {
        key: g.key,
        jugadores: g.ids.map(id => jugPorId[id]),
        partidos: n,
        victorias,
        derrotas: jugados - victorias,
        jugados,
        winPct: jugados > 0 ? rnd((victorias / jugados) * 100) : null,
        margen: jugados > 0 ? rnd(margen / jugados) : null,
        val: val / n,
        pts: pts / n,
        min: minTotal / n,
        ts: denom > 0 ? rnd((pts / denom) * 100) : null,
        aportes: g.ids.map(id => ({ jugador: jugPorId[id], val: aporte[id].val / n, pts: aporte[id].pts / n })),
      }
    })
  }, [jugadores, statsFiltradas, partidosFiltrados])



  const categoria = CATEGORIAS.find(c => c.id === cat)
  const esIdeal = categoria.tipo === 'ideal'

  // ── Cincos iniciales reales ──
  const ranking = useMemo(() => {
    if (esIdeal) return []
    const maxUsos = quintetos.reduce((m, q) => Math.max(m, q.partidos), 0)
    // Para las categorías de rendimiento se exige un mínimo de partidos
    // juntos, para que un quinteto que solo salió una vez con un partidazo
    // no gane siempre. Si ninguno llega, se baja a 1.
    const minimo = categoria.minimo ? (maxUsos >= 3 ? 2 : 1) : 1
    return quintetos
      // En «Mejor balance» los quintetos sin marcador registrado no se
      // descartan: salen al final con «—» en vez de hacer desaparecer la lista.
      .filter(q => q.partidos >= minimo && (categoria.valor(q) != null || categoria.id === 'win'))
      .sort((a, b) =>
        ((categoria.valor(b) ?? -1) - (categoria.valor(a) ?? -1)) ||
        (b.partidos - a.partidos) ||
        ((b.winPct ?? 0) - (a.winPct ?? 0))
      )
      .map(q => ({ q, minimo }))
  }, [quintetos, categoria, esIdeal])

  const minimoUsado = ranking[0]?.minimo ?? 1
  const lista = ranking.map(r => r.q)
  const activo = esIdeal ? null : (lista.find(q => q.key === selKey) || lista[0])
  const visibles = verTodos ? lista : lista.slice(0, 5)

  // ── Quinteto ideal por posiciones ──
  const ideal = useMemo(
    () => (esIdeal ? armarIdeal(promediosPorJugador, categoria.jug, !!categoria.menorMejor) : null),
    [esIdeal, promediosPorJugador, categoria]
  )

  const elegirCategoria = (id) => { setCat(id); setSelKey(null); setVerTodos(false) }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  // Fichas que se pintan en la pizarra (en ideal, cada una en el hueco que
  // le ha tocado, no necesariamente su posición principal)
  const fichas = esIdeal
    ? (ideal?.items || []).map(it => ({ j: it.d.jugador, hueco: HUECOS[it.slot], pos: it.slot }))
    : (activo ? colocarJugadores(activo.jugadores).map(({ j, hueco }) => ({ j, hueco, pos: j.posicion })) : [])

  // Casillas de datos bajo la pizarra
  let panel = null
  if (esIdeal && ideal) {
    const partidosMedia = rnd(ideal.items.reduce((a, it) => a + it.d.partidos, 0) / ideal.items.length)
    panel = {
      destacado: { val: categoria.fmt(categoria.agg(ideal.agg)), lbl: categoria.metrica },
      otros: [
        { id: 'val', val: rnd(ideal.agg.val), lbl: 'VAL conjunta' },
        { id: 'pts', val: rnd(ideal.agg.pts), lbl: 'Puntos de los 5' },
        { id: 'min', val: rnd(ideal.agg.min), lbl: 'Min. de los 5' },
        { id: 'ef', val: ideal.agg.ts != null ? ideal.agg.ts + '%' : '—', lbl: 'TS%' },
        { id: 'def', val: ideal.agg.drtg != null ? rnd(ideal.agg.drtg) : '—', lbl: 'DRTG medio' },
        { id: null, val: partidosMedia, lbl: 'Partidos (media)' },
      ].filter(st => st.id !== categoria.panelId),
    }
  } else if (activo) {
    panel = {
      destacado: { val: categoria.fmt(categoria.valor(activo)), lbl: categoria.metrica },
      otros: [
        { id: 'usado', val: activo.partidos, lbl: 'Partidos' },
        { id: null, val: `${activo.victorias}-${activo.derrotas}`, lbl: 'V-D' },
        { id: 'win', val: activo.winPct != null ? activo.winPct + '%' : '—', lbl: '% Victorias' },
        { id: null, val: rnd(activo.val), lbl: 'VAL conjunta' },
        { id: null, val: rnd(activo.pts), lbl: 'Puntos de los 5' },
        { id: null, val: rnd(activo.min), lbl: 'Min. de los 5' },
        { id: null, val: activo.ts != null ? activo.ts + '%' : '—', lbl: 'TS%' },
        { id: null, val: activo.margen != null ? (activo.margen > 0 ? '+' : '') + activo.margen : '—', lbl: 'Margen medio' },
      ].filter(st => st.id !== cat),
    }
  }

  const dif = (a, b, d = 1) => (a != null && b != null ? rnd(a - b, d) : null)
  const unir = nombres => nombres.length > 1 ? nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1] : nombres[0]

  // ── Explicación: cinco inicial real ──
  let explicacion = null
  if (activo) {
    const idx = lista.indexOf(activo) + 1
    const n = lista.length
    const valor = categoria.valor(activo)
    const media = fn => {
      const v = lista.map(fn).filter(x => x != null)
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
    }
    const primero = lista[0]
    const totalConCinco = quintetos.reduce((a, q) => a + q.partidos, 0)
    const jugadosGlobal = quintetos.reduce((a, q) => a + q.jugados, 0)
    const victGlobal = quintetos.reduce((a, q) => a + q.victorias, 0)
    const winGlobal = jugadosGlobal > 0 ? rnd((victGlobal / jugadosGlobal) * 100) : null

    const lista5 = unir(activo.jugadores.map(j => j.nombre.split(' ')[0]))

    const posicion = valor == null
      ? `${lista5} aún no tienen resultado registrado en «${categoria.label}».`
      : idx === 1
      ? `${lista5} lideran la categoría «${categoria.label}» entre ${n} quinteto${n > 1 ? 's' : ''}.`
      : `${lista5} ocupan el puesto ${idx} de ${n} en «${categoria.label}»${primero ? `, a ${Math.abs(dif(categoria.valor(primero), valor, 1) ?? 0)} del primero` : ''}.`

    let motivo = ''
    if (cat === 'usado') motivo = `Han saltado juntos de inicio en ${activo.partidos} de los ${totalConCinco} partidos con cinco titulares registrados (${rnd((activo.partidos / totalConCinco) * 100)}%).`
    else if (cat === 'win' && activo.winPct == null) motivo = 'Ninguno de los partidos de este quinteto tiene guardado el marcador de los dos equipos (puntos de Unicaja y del rival), así que no se puede calcular el % de victorias. Se rellena en el admin, en Partidos.'
    else if (cat === 'win') motivo = `Con este cinco inicial el equipo gana ${activo.victorias} de ${activo.jugados} partidos (${activo.winPct}%)${winGlobal != null ? `, frente al ${winGlobal}% global con el resto de quintetos` : ''}.`

    const resultado = activo.jugados > 0
      ? `Balance con este inicio: ${activo.victorias}-${activo.derrotas}${activo.margen != null ? `, con un margen medio de ${activo.margen > 0 ? '+' : ''}${activo.margen} puntos` : ''}.`
      : null

    const porVal = [...activo.aportes].sort((a, b) => b.val - a.val)[0]
    const porPts = [...activo.aportes].sort((a, b) => b.pts - a.pts)[0]
    const clave = `Más peso en la valoración: ${porVal.jugador.nombre} (${rnd(porVal.val)} de VAL por partido en estos encuentros). Máximo anotador: ${porPts.jugador.nombre} (${rnd(porPts.pts)} pts).`

    const avisos = []
    if (activo.partidos < 3) avisos.push(`Muestra pequeña: solo ${activo.partidos} partido${activo.partidos > 1 ? 's' : ''} juntos, así que conviene leerlo con cautela.`)
    if (categoria.minimo) avisos.push(`Para esta categoría se exige un mínimo de ${minimoUsado} partido${minimoUsado > 1 ? 's' : ''} juntos.`)

    const filasComp = [
      { l: 'VAL conjunta', v: rnd(activo.val), m: rnd(media(q => q.val)) },
      { l: 'Puntos de los 5', v: rnd(activo.pts), m: rnd(media(q => q.pts)) },
      { l: 'Min. de los 5', v: rnd(activo.min), m: rnd(media(q => q.min)) },
      { l: 'TS%', v: activo.ts, m: rnd(media(q => q.ts)), u: '%' },
      { l: '% victorias', v: activo.winPct, m: rnd(media(q => q.winPct)), u: '%' },
    ]
    explicacion = { posicion, motivo, resultado, clave, avisos, filasComp }
  }

  // ── Explicación: quinteto ideal ──
  let explicacionIdeal = null
  if (esIdeal && ideal) {
    const aggVal = categoria.agg(ideal.agg)
    const nombres = unir(ideal.items.map(it => it.d.jugador.nombre.split(' ')[0]))
    const mejorReal = categoria.menorMejor ? null : quintetos
      .filter(q => categoria.eq(q) != null)
      .sort((a, b) => categoria.eq(b) - categoria.eq(a))[0]

    const principal = `${nombres} forman el quinteto ideal en ${categoria.nombre}: el mejor jugador de cada posición, sin que hayan tenido que jugar juntos.`
    const motivo = `Entre los cinco suman ${categoria.fmt(aggVal)} (${categoria.metrica}${categoria.menorMejor ? '; cuanto menor, mejor defensa' : ''}). Solo se han tenido en cuenta jugadores con al menos ${ideal.minPartidos} partido${ideal.minPartidos > 1 ? 's' : ''} (${ideal.candidatos} candidato${ideal.candidatos > 1 ? 's' : ''}).`
    let comparacion = null
    if (mejorReal) {
      const d = dif(aggVal, categoria.eq(mejorReal))
      comparacion = `El mejor cinco inicial real en esta métrica (${unir(mejorReal.jugadores.map(j => j.nombre.split(' ')[0]))}) logra ${categoria.fmt(categoria.eq(mejorReal))}; el ideal ${d >= 0 ? 'lo supera en' : 'queda a'} ${Math.abs(d)}${categoria.id === 'i-ef' ? ' puntos porcentuales' : ''}.`
    }
    const avisos = []
    ideal.items.forEach(it => {
      const nom = it.d.jugador.nombre
      if (it.fuera) avisos.push(`${nom} cubre ${it.slot} aunque no es su posición: no había ningún jugador elegible de ${it.slot}, así que entra el mejor libre.`)
      else if (it.secundaria) avisos.push(`${nom} ocupa ${it.slot}, su posición secundaria (la principal es ${it.d.jugador.posicion}).`)
    })
    avisos.push('No es un cinco que haya jugado junto: se arma con los mejores promedios individuales de cada posición.')
    explicacionIdeal = { principal, motivo, comparacion, avisos }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Quintetos</h2>
          <p>Cincos iniciales e ideales de la temporada, en la pizarra</p>
        </div>
        <AniversarioBadge temporadaNombre={temporadaNombre} />
      </div>

      <FiltrosBar {...data} extra={<EquipoRecordCard temporada={temporadaActual} />} />

      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--verde)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
        <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Quintetos</span> — «Mayor titularidad» y «Mejor balance» son cincos iniciales reales: los cinco titulares de un partido. El resto de pestañas (valoración, eficiencia, anotación, minutaje y defensa) montan un quinteto ideal con el mejor jugador de cada posición según esa métrica, aunque nunca hayan jugado juntos; quien tenga posición secundaria puede cubrir cualquiera de las dos.
      </div>

      <div className="tabs">
        {CATEGORIAS.map(c => (
          <button
            key={c.id}
            type="button"
            className={`tab-btn${cat === c.id ? ' active' : ''}`}
            onClick={() => elegirCategoria(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {(esIdeal ? !ideal : lista.length === 0) ? (
        <div className="empty-state card">
          <p>{esIdeal ? 'Aún no hay jugadores con partidos con los filtros seleccionados.' : 'Aún no hay quintetos con los filtros seleccionados.'}</p>
          {!esIdeal && <p style={{ fontSize: 13, color: 'var(--gris-500)', marginTop: 8 }}>Hacen falta partidos con exactamente 5 titulares marcados.</p>}
          {esIdeal && categoria.menorMejor && <p style={{ fontSize: 13, color: 'var(--gris-500)', marginTop: 8 }}>El quinteto defensivo usa el DRTG: hacen falta los puntos del rival guardados en los partidos.</p>}
        </div>
      ) : (
        <div className="quintetos-layout">
          <div className="card quintetos-pizarra-card">
            <div className="quintetos-pizarra-head">
              <div>
                <div className="quintetos-cat-titulo">{categoria.label}</div>
                <div className="quintetos-cat-sub">{categoria.metrica}</div>
              </div>
              <CapturaBoton
                targetRef={pizarraRef}
                filename="quinteto-unicaja-avanzado"
                label="📸 Descargar quinteto"
              />
            </div>

            <div ref={pizarraRef} className="pizarra-captura">
              <div className="pizarra-titulo">
                <span>{categoria.label}</span>
                {temporadaNombre && <span className="pizarra-temporada">{temporadaNombre}</span>}
              </div>
              <div className="pizarra-subtitulo">
                <b>{esIdeal ? 'Quinteto ideal' : 'Cinco inicial'}</b> · {categoria.metrica}
                <div className="pizarra-nombres">{fichas.map(f => f.j.nombre.split(' ')[0]).join(' · ')}</div>
              </div>
              <div className="pizarra">
                <Cancha />
                {fichas.map(({ j, hueco, pos }) => (
                  <div key={j.id} className="pizarra-jugador" style={{ left: `${hueco.x}%`, top: `${hueco.y}%` }}>
                    <div className="pizarra-ficha">
                      {j.foto_url
                        ? <div className="pizarra-foto" role="img" aria-label={j.nombre} style={{ backgroundImage: `url("${j.foto_url}")` }} />
                        : <span>#{j.dorsal}</span>}
                      <b className="pizarra-dorsal">{j.dorsal}</b>
                    </div>
                    <div className="pizarra-nombre">{j.nombre.split(' ')[0]}</div>
                    <div className="pizarra-pos">{pos}</div>
                  </div>
                ))}
              </div>

              {panel && (
                <div className="pizarra-stats">
                  <div className="pizarra-stat destacada">
                    <div className="pizarra-stat-val">{panel.destacado.val}</div>
                    <div className="pizarra-stat-lbl">{panel.destacado.lbl}</div>
                  </div>
                  {panel.otros.map(st => (
                    <div key={st.lbl} className="pizarra-stat"><div className="pizarra-stat-val">{st.val}</div><div className="pizarra-stat-lbl">{st.lbl}</div></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="quintetos-lateral">
            {esIdeal ? (
              <>
                <div className="card quintetos-ranking">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--blanco)' }}>
                    Composición · {categoria.label}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--gris-500)', marginBottom: 10 }}>
                    Mejor jugador por posición según {categoria.nombre}, media por partido
                  </p>
                  <table className="qe-tabla">
                    <thead>
                      <tr><th>Posición</th><th>Jugador</th><th>Media</th></tr>
                    </thead>
                    <tbody>
                      {ideal.items.map(it => (
                        <tr key={it.slot}>
                          <td>{it.slot}</td>
                          <td style={{ color: 'var(--blanco)', fontFamily: 'var(--font-body)' }}>{it.d.jugador.nombre}</td>
                          <td style={{ color: 'var(--lima)' }}>{categoria.id === 'i-ef' ? it.valor + '%' : rnd(it.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {explicacionIdeal && (
                  <div className="card quintetos-explicacion">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--blanco)' }}>
                      ¿Por qué este quinteto?
                    </h3>
                    <p className="qe-principal">{explicacionIdeal.principal}</p>
                    <p>{explicacionIdeal.motivo}</p>
                    {explicacionIdeal.comparacion && <p>{explicacionIdeal.comparacion}</p>}
                    {explicacionIdeal.avisos.map(a => <p key={a} className="qe-aviso">{a}</p>)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="card quintetos-ranking">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--blanco)' }}>
                    Ranking · {categoria.label}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--gris-500)', marginBottom: 14 }}>
                    {categoria.minimo ? `Mínimo ${minimoUsado} partido${minimoUsado > 1 ? 's' : ''} juntos${categoria.id === 'win' ? ' · solo cuentan partidos con marcador de los dos equipos' : ''}` : 'Ordenado por partidos como titulares juntos'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visibles.map((q, i) => (
                      <button
                        key={q.key}
                        type="button"
                        className={`quinteto-row${q.key === activo.key ? ' activo' : ''}`}
                        onClick={() => setSelKey(q.key)}
                      >
                        <span className="quinteto-pos">{i + 1}º</span>
                        <span className="quinteto-nombres">{q.jugadores.map(j => j.nombre.split(' ')[0]).join(' · ')}</span>
                        <span className="quinteto-valor">{categoria.fmt(categoria.valor(q))}</span>
                      </button>
                    ))}
                  </div>
                  {lista.length > 5 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                      onClick={() => setVerTodos(v => !v)}
                    >
                      {verTodos ? 'Ver menos' : `Ver todo (${lista.length})`}
                    </button>
                  )}
                </div>

                {explicacion && (
                  <div className="card quintetos-explicacion">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--blanco)' }}>
                      ¿Por qué este quinteto?
                    </h3>
                    <p className="qe-principal">{explicacion.posicion}</p>
                    <p>{explicacion.motivo}</p>
                    {explicacion.resultado && <p>{explicacion.resultado}</p>}
                    <p>{explicacion.clave}</p>
                    <table className="qe-tabla">
                      <thead>
                        <tr><th></th><th>Este quinteto</th><th>Media</th></tr>
                      </thead>
                      <tbody>
                        {explicacion.filasComp.map(f => {
                          const d = f.v != null && f.m != null ? f.v - f.m : null
                          return (
                            <tr key={f.l}>
                              <td>{f.l}</td>
                              <td className={d != null && d > 0 ? 'pos' : d != null && d < 0 ? 'neg' : ''}>{f.v != null ? f.v + (f.u || '') : '—'}</td>
                              <td>{f.m != null ? f.m + (f.u || '') : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {explicacion.avisos.map(a => <p key={a} className="qe-aviso">{a}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
