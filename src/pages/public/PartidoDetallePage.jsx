import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { competicionInfo, formatJornada } from '../../lib/competiciones'
import { calcTeamTotals, formatMinutos } from '../../lib/advanced'
import logoUnicaja from '../../assets/Unicaja.png'

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const RECINTO_LOCAL = 'Palacio de los Deportes José María Martín Carpena'

// Estadísticas básicas disponibles para el filtro del podio.
const STATS_PODIO = [
  { key: 'pts', label: 'Puntos' },
  { key: 'rt',  label: 'Rebotes' },
  { key: 'as_', label: 'Asistencias' },
  { key: 'rec', label: 'Recuperaciones' },
  { key: 'tap', label: 'Tapones' },
  { key: 'val', label: 'Valoración' },
  { key: 'min', label: 'Minutos' },
  { key: 'plus_minus', label: '+/-' },
]

// Columnas de la tabla de estadísticas básicas del partido.
const COLS = [
  { key: 'min',  label: 'MIN',  fmt: v => v != null ? formatMinutos(v) : '—' },
  { key: 'pts',  label: 'PTS' },
  { key: 't2_anotados', label: 'T2',  compuesta: (s) => `${s.t2_anotados ?? 0}/${s.t2_intentos ?? 0}` },
  { key: 't3_anotados', label: 'T3',  compuesta: (s) => `${s.t3_anotados ?? 0}/${s.t3_intentos ?? 0}` },
  { key: 'tl_anotados', label: 'TL',  compuesta: (s) => `${s.tl_anotados ?? 0}/${s.tl_intentos ?? 0}` },
  { key: 'rt',   label: 'REB' },
  { key: 'as_',  label: 'AST' },
  { key: 'rec',  label: 'REC' },
  { key: 'tap',  label: 'TAP' },
  { key: 'per',  label: 'PÉR' },
  { key: 'fp',   label: 'FP' },
  { key: 'plus_minus', label: '+/-', fmt: v => v != null ? (v > 0 ? '+' + v : v) : '—' },
  { key: 'val',  label: 'VAL' },
]

// Icono de un vistazo para cada motivo de ausencia — así se distingue el
// tipo sin tener que leer el texto entero en la tabla del partido.
const ICONO_MOTIVO = {
  'Lesión': '🩹',
  'Decisión técnica': '📋',
  'Descanso': '😴',
  'Sanción': '🟥',
  'Selección nacional': '🌍',
  'Enfermedad': '🤒',
  'Otro': '❓',
}

export default function PartidoDetallePage() {
  const { id } = useParams()
  const [partido, setPartido] = useState(null)
  const [stats, setStats] = useState([])
  const [ausencias, setAusencias] = useState([])
  const [escudoRival, setEscudoRival] = useState(null)
  const [escudoUnicaja, setEscudoUnicaja] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statPodio, setStatPodio] = useState('pts')
  const [sortCol, setSortCol] = useState('dorsal')
  const [sortDir, setSortDir] = useState(-1)

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
  }

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data: p } = await supabase
        .from('partidos')
        .select('*, competiciones(nombre), temporadas(nombre)')
        .eq('id', id)
        .single()
      setPartido(p || null)

      if (p) {
        const { data: s } = await supabase
          .from('stats')
          .select('*, jugadores(nombre, dorsal, foto_url, posicion)')
          .eq('partido_id', id)
        setStats((s || []).filter(row => row.jugadores))

        const { data: a } = await supabase
          .from('ausencias')
          .select('*, jugadores(nombre, dorsal, foto_url, posicion)')
          .eq('partido_id', id)
        setAusencias((a || []).filter(row => row.jugadores))

        // Busca el escudo del rival, y el de Unicaja si se ha personalizado,
        // por nombre (normalizado). Si hay un escudo específico para la
        // temporada de este partido (ej. el especial del 50 aniversario),
        // ese tiene prioridad sobre el "de siempre" (temporada_id vacío).
        const { data: escudos } = await supabase.from('escudos_equipos').select('nombre, escudo_url, temporada_id')
        const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        const mejorEscudo = (nombreBuscado) => {
          const candidatos = escudos?.filter(e => norm(e.nombre) === norm(nombreBuscado)) || []
          const deTemporada = candidatos.find(e => e.temporada_id === p.temporada_id)
          const deSiempre = candidatos.find(e => !e.temporada_id)
          return (deTemporada || deSiempre)?.escudo_url || null
        }
        setEscudoRival(mejorEscudo(p.rival))
        setEscudoUnicaja(mejorEscudo('UNICAJA'))
      }
      setLoading(false)
    }
    cargar()
  }, [id])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!partido) return <div className="empty-state card"><p>Partido no encontrado.</p></div>

  const jugado = partido.puntos_unicaja != null && partido.puntos_rival != null
  const info = competicionInfo(partido.competiciones?.nombre)
  const { largo: jornadaLarga } = formatJornada(partido.jornada)
  const fechaFmt = new Date(partido.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const lugar = partido.es_local === null ? 'Sede neutra' : partido.es_local ? RECINTO_LOCAL : `Fuera de casa · ${partido.rival}`

  // Datos de cada equipo para el marcador (izquierda = local, derecha =
  // visitante — salvo sede neutra, que se deja Unicaja a la izquierda).
  const rivalIniciales = partido.rival
    .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const unicajaEquipo = { nombre: 'UNICAJA', iniciales: 'MLG', escudo: escudoUnicaja || logoUnicaja, esUnicaja: true, puntos: partido.puntos_unicaja ?? 0 }
  const rivalEquipo = { nombre: partido.rival, iniciales: rivalIniciales, escudo: escudoRival, esUnicaja: false, puntos: partido.puntos_rival ?? 0 }
  const [equipoIzqBase, equipoDerBase] = partido.es_local === false ? [rivalEquipo, unicajaEquipo] : [unicajaEquipo, rivalEquipo]
  const esLocalIzq = partido.es_local !== null // en sede neutra ninguno es "local"
  const equipoIzq = { ...equipoIzqBase, gana: jugado && equipoIzqBase.puntos > equipoDerBase.puntos, esLocal: esLocalIzq }
  const equipoDer = { ...equipoDerBase, gana: jugado && equipoDerBase.puntos > equipoIzqBase.puntos, esLocal: false }

  // Top 3 (podio) de la estadística elegida, solo entre quienes jugaron
  // (minutos > 0), ordenado de mayor a menor.
  const podio = [...stats]
    .filter(s => (s.min || 0) > 0)
    .sort((a, b) => (b[statPodio] || 0) - (a[statPodio] || 0))
    .slice(0, 3)
  const labelPodio = STATS_PODIO.find(s => s.key === statPodio)?.label || ''
  // Orden visual del podio: 2º a la izquierda, 1º en el centro (más alto), 3º a la derecha
  const ordenVisual = [podio[1], podio[0], podio[2]]
  const alturaPodio = { 0: 128, 1: 92, 2: 68 } // por posición real (1º,2º,3º)

  // Valor de la columna por la que se ordena: la mayoría son campos
  // planos de la stat (s.pts, s.min...), pero "dorsal" vive dentro de la
  // relación con jugadores (s.jugadores.dorsal), así que se resuelve aparte.
  const valorOrden = (s, col) => col === 'dorsal' ? (s.jugadores?.dorsal ?? 0) : (s[col] || 0)
  const statsOrdenadas = [...stats].sort((a, b) => sortDir * (valorOrden(b, sortCol) - valorOrden(a, sortCol)))
  const ausenciasOrdenadas = [...ausencias].sort((a, b) => (a.jugadores?.dorsal ?? 0) - (b.jugadores?.dorsal ?? 0))
  const totalesBrutos = calcTeamTotals(stats)
  // El total "oficial" de minutos de un partido siempre es un múltiplo de
  // 25 (200 en tiempo reglamentario, 225 con una prórroga, 250 con dos...)
  // porque son 5 jugadores en pista todo el rato. Si la suma real se
  // queda a menos de un minuto de esa cifra limpia, se redondea a ella
  // (pequeños redondeos de segundos al anotar el acta); si la diferencia
  // es mayor, se deja tal cual para no tapar un fallo real de algún dato.
  const minCercano25 = Math.round(totalesBrutos.min / 25) * 25
  const diferenciaSeg = Math.abs(totalesBrutos.min - minCercano25) * 60
  const totales = {
    ...totalesBrutos,
    min: diferenciaSeg <= 60 ? minCercano25 : totalesBrutos.min,
  }

  return (
    <div className="page">
      <Link to="/calendario" state={{ fecha: partido.fecha }} style={{ color: 'var(--gris-500)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← Volver al calendario
      </Link>

      <div className="marcador">
        <div className="marcador-bombillas">
          {Array.from({ length: 14 }).map((_, i) => <span key={i} className="bombilla" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>

        <div className="marcador-panel">
          <div className="marcador-top">
            <span className="marcador-comp" style={{ color: info.color, borderColor: info.color }}>
              {info.abbr}{jornadaLarga ? ` · ${jornadaLarga}` : ''}
            </span>
            <span className="marcador-estado">{jugado ? '● FINAL' : '○ POR JUGAR'}</span>
          </div>

          <div className="marcador-fila">
            <div className="marcador-equipo">
              {partido.es_local !== null && <span className="marcador-pill-cond local">🏠 Local</span>}
              <div className={`marcador-escudo${equipoIzq.esUnicaja ? ' unicaja' : ''}${equipoIzq.gana ? ' gana' : ''}`}>
                {equipoIzq.escudo ? <img src={equipoIzq.escudo} alt="" /> : equipoIzq.iniciales}
              </div>
              <span className="marcador-nombre">
                {equipoIzq.gana && <span className="marcador-trofeo">🏆</span>}
                {equipoIzq.nombre}
              </span>
            </div>

            <div className="marcador-centro">
              {jugado ? (
                <div className="marcador-resultado">
                  <span className={`marcador-digitos${equipoIzq.gana ? ' gana' : ''}`}>{String(equipoIzq.puntos).padStart(2, '0')}</span>
                  <span className="marcador-separador">:</span>
                  <span className={`marcador-digitos${equipoDer.gana ? ' gana' : ''}`}>{String(equipoDer.puntos).padStart(2, '0')}</span>
                </div>
              ) : (
                <div className="marcador-resultado">
                  <span className="marcador-digitos apagado">00</span>
                  <span className="marcador-separador apagado">:</span>
                  <span className="marcador-digitos apagado">00</span>
                </div>
              )}
            </div>

            <div className="marcador-equipo derecha">
              {partido.es_local !== null && <span className="marcador-pill-cond">✈️ Visitante</span>}
              <div className={`marcador-escudo${equipoDer.esUnicaja ? ' unicaja' : ''}${equipoDer.gana ? ' gana' : ''}`}>
                {equipoDer.escudo ? <img src={equipoDer.escudo} alt="" /> : equipoDer.iniciales}
              </div>
              <span className="marcador-nombre">
                {equipoDer.nombre}
                {equipoDer.gana && <span className="marcador-trofeo">🏆</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="marcador-meta">
          {fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)} · {lugar}
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="empty-state card" style={{ marginTop: 20 }}>
          <p>Todavía no hay estadísticas metidas para este partido.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Podio del partido</h3>
            <div className="podio-filtros">
              {STATS_PODIO.map(s => (
                <button
                  key={s.key}
                  className={`btn btn-sm ${statPodio === s.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStatPodio(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {podio.length === 0 ? (
              <p style={{ color: 'var(--gris-500)', fontSize: 13 }}>No hay datos suficientes.</p>
            ) : (
              <div className="podio">
                {ordenVisual.map((s, idxVisual) => {
                  if (!s) return <div key={idxVisual} className="podio-hueco" />
                  const posicionReal = podio.indexOf(s) // 0,1,2 → 1º,2º,3º
                  return (
                    <Link
                      key={s.jugador_id}
                      to={`/${slugify(s.jugadores.nombre)}`}
                      className={`podio-puesto podio-puesto-${posicionReal + 1}`}
                    >
                      <div className="podio-medalla">{posicionReal === 0 ? '🥇' : posicionReal === 1 ? '🥈' : '🥉'}</div>
                      {s.jugadores.foto_url ? (
                        <img src={s.jugadores.foto_url} alt="" className="podio-foto" />
                      ) : (
                        <div className="podio-foto podio-foto-vacia">#{s.jugadores.dorsal}</div>
                      )}
                      <div className="podio-nombre">{s.jugadores.nombre}</div>
                      <div className="podio-valor">
                        {statPodio === 'plus_minus' && (s[statPodio] || 0) > 0 ? '+' : ''}{s[statPodio] ?? 0}
                      </div>
                      <div className="podio-columna" style={{ height: alturaPodio[posicionReal] }}>
                        <span className="podio-numero">{posicionReal + 1}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
            <p style={{ color: 'var(--gris-500)', fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
              Top 3 en {labelPodio.toLowerCase()} entre los jugadores que disputaron minutos en este partido.
            </p>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Estadísticas del partido</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className={`col-sticky${sortCol==='dorsal'?' sorted':''}`} onClick={() => handleSort('dorsal')}>
                      Jugador {sortCol==='dorsal' ? (sortDir===1?'↓':'↑') : ''}
                    </th>
                    {COLS.map(c => (
                      <th key={c.key} className={`num${sortCol===c.key?' sorted':''}`} onClick={() => handleSort(c.key)}>
                        {c.label} {sortCol===c.key ? (sortDir===1?'↓':'↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsOrdenadas.map(s => (
                    <tr key={s.id}>
                      <td className="col-sticky">
                        <Link to={`/${slugify(s.jugadores.nombre)}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--verde)', fontSize: 13 }}>#{s.jugadores.dorsal}</span>
                          <span style={{ fontWeight: 600, color: 'var(--blanco)' }}>{s.jugadores.nombre}</span>
                          {s.titular && <span className="badge badge-local" style={{ fontSize: 10 }}>T</span>}
                        </Link>
                      </td>
                      {COLS.map(c => (
                        <td key={c.key} className="num">
                          {c.compuesta ? c.compuesta(s) : (c.fmt ? c.fmt(s[c.key]) : (s[c.key] ?? '—'))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {ausenciasOrdenadas.map(a => (
                    <tr key={`ausencia-${a.id}`} style={{ opacity: 0.6 }}>
                      <td className="col-sticky">
                        <Link to={`/${slugify(a.jugadores.nombre)}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gris-500)', fontSize: 13 }}>#{a.jugadores.dorsal}</span>
                          <span style={{ fontWeight: 600, color: 'var(--gris-300)' }}>{a.jugadores.nombre}</span>
                        </Link>
                      </td>
                      <td colSpan={COLS.length} style={{ textAlign: 'center', color: 'var(--gris-400)', fontSize: 13 }}>
                        No jugó → <span style={{ color: 'var(--gris-200)', fontWeight: 600 }}>{ICONO_MOTIVO[a.motivo] || '❓'} {a.motivo}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="fila-totales">
                    <td className="col-sticky" style={{ fontWeight: 700, color: 'var(--gris-300)' }}>TOTAL EQUIPO</td>
                    {COLS.map(c => (
                      <td key={c.key} className="num" style={{ fontWeight: 700, color: 'var(--blanco)' }}>
                        {c.compuesta
                          ? c.compuesta(totales)
                          : (c.fmt ? c.fmt(totales[c.key]) : (totales[c.key] ?? '—'))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        .fila-totales td { border-top: 2px solid var(--gris-600); background: var(--gris-800); }
        .fila-totales td.col-sticky { background: var(--gris-800); }
        .marcador {
          background: linear-gradient(155deg, #1a1a1a, #0a0a0a);
          border-radius: 18px;
          padding: 10px;
          box-shadow: 0 12px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06);
        }
        .marcador-bombillas {
          display: flex; justify-content: space-between; padding: 2px 10px 10px;
        }
        .bombilla {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--lima);
          box-shadow: 0 0 6px 1px rgba(157,196,26,.7);
          animation: parpadeo 2.4s ease-in-out infinite;
        }
        @keyframes parpadeo {
          0%, 100% { opacity: .25; box-shadow: 0 0 2px rgba(157,196,26,.3); }
          50% { opacity: 1; box-shadow: 0 0 8px 2px rgba(157,196,26,.8); }
        }
        .marcador-panel {
          background:
            radial-gradient(rgba(255,255,255,.035) 1px, transparent 1.4px) 0 0 / 7px 7px,
            #000;
          border-radius: 12px;
          border: 1px solid #232323;
          box-shadow: inset 0 0 40px rgba(0,0,0,.85), inset 0 0 2px rgba(157,196,26,.15);
          padding: 20px 22px 18px;
          text-align: center;
        }
        .marcador-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; gap: 10px; flex-wrap: wrap;
        }
        .marcador-comp {
          font-family: var(--font-mono, 'Orbitron', monospace);
          font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
          border: 1px solid; border-radius: 20px; padding: 4px 14px; display: inline-block;
        }
        .marcador-estado {
          font-family: 'Orbitron', var(--font-display), monospace;
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--gris-500);
          text-transform: uppercase;
        }
        .marcador-fila {
          display: flex; align-items: center; justify-content: center;
          gap: 14px;
        }
        .marcador-equipo {
          flex: 1; max-width: 150px; display: flex; flex-direction: column;
          align-items: center; gap: 8px; min-width: 0;
          padding: 0 4px 8px;
        }
        .marcador-escudo {
          width: 54px; height: 54px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Orbitron', var(--font-display), monospace; font-weight: 800; font-size: 15px;
          background: var(--gris-800); color: var(--gris-300);
          border: 2px solid var(--gris-700);
          overflow: hidden;
        }
        .marcador-escudo img { width: 100%; height: 100%; object-fit: contain; padding: 6px; box-sizing: border-box; }
        .marcador-escudo:has(img) { background: #fff; }
        .marcador-escudo.unicaja { background: var(--gris-800); border-color: var(--lima); }
        .marcador-escudo.unicaja:has(img) { background: #fff; }
        .marcador-escudo.unicaja:not(:has(img)) { color: var(--lima); }
        .marcador-escudo.gana { border-color: var(--lima); border-width: 3px; }
        .marcador-pill-cond {
          font-size: 8.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase;
          color: var(--gris-400); background: var(--gris-800); border: 1px solid var(--gris-700);
          border-radius: 20px; padding: 2px 8px; white-space: nowrap;
        }
        .marcador-pill-cond.local { color: var(--lima); border-color: rgba(157,196,26,.4); background: rgba(157,196,26,.08); }
        .marcador-nombre {
          font-family: 'Orbitron', var(--font-display), monospace;
          font-size: 11px; font-weight: 700; letter-spacing: .2px;
          color: var(--gris-200); text-transform: uppercase;
          max-width: 100%; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .marcador-trofeo { font-size: 11px; margin-right: 3px; }
        .marcador-centro { flex-shrink: 0; }
        .marcador-resultado {
          display: flex; align-items: center; justify-content: center; gap: 4px;
          background: #000; border-radius: 8px; padding: 10px 16px;
          border: 1px solid #1e1e1e;
        }
        .marcador-digitos {
          font-family: 'Orbitron', monospace;
          font-size: 46px; font-weight: 900; line-height: 1;
          color: #3a4a38; letter-spacing: 1px; min-width: 56px;
          text-shadow: 0 0 2px rgba(74,90,72,.4);
        }
        .marcador-digitos.gana { color: var(--lima); }
        .marcador-digitos.apagado { color: #2a2a2a; text-shadow: none; }
        .marcador-separador { font-family: 'Orbitron', monospace; font-size: 30px; color: var(--lima); font-weight: 700; animation: parpadeo-dosp 1.2s steps(1) infinite; }
        .marcador-separador.apagado { color: #2a2a2a; animation: none; }
        @keyframes parpadeo-dosp { 0%, 49% { opacity: 1; } 50%, 100% { opacity: .15; } }
        .marcador-meta { color: var(--gris-500); font-size: 12.5px; margin-top: 16px; text-align: center; text-transform: capitalize; }
        @media (max-width: 520px) {
          .marcador-nombre { font-size: 9px; }
          .marcador-pill-cond { font-size: 7.5px; padding: 1px 6px; }
          .marcador-escudo { width: 42px; height: 42px; font-size: 12px; }
          .marcador-digitos { font-size: 32px; min-width: 40px; }
          .marcador-resultado { padding: 8px 10px; gap: 2px; }
        }

        .podio-filtros { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }

        .podio { display: flex; align-items: flex-end; justify-content: center; gap: 14px; padding-top: 10px; }
        .podio-hueco { flex: 1; max-width: 140px; }
        .podio-puesto {
          display: flex; flex-direction: column; align-items: center;
          flex: 1; max-width: 140px; text-decoration: none; color: inherit;
        }
        .podio-medalla { font-size: 22px; line-height: 1; margin-bottom: 4px; }
        .podio-foto { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gris-700); }
        .podio-foto-vacia {
          display: flex; align-items: center; justify-content: center;
          background: var(--gris-800); color: var(--gris-400);
          font-family: var(--font-display); font-weight: 700; font-size: 13px;
        }
        .podio-nombre { font-size: 12.5px; font-weight: 600; color: var(--blanco); margin-top: 8px; text-align: center; }
        .podio-valor { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--lima); margin-top: 2px; }
        .podio-columna {
          width: 100%; margin-top: 10px; border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, var(--gris-700), var(--gris-800));
          display: flex; align-items: flex-start; justify-content: center; padding-top: 8px;
        }
        .podio-puesto-1 .podio-columna { background: linear-gradient(180deg, rgba(157,196,26,.35), rgba(157,196,26,.1)); }
        .podio-puesto-2 .podio-columna { background: linear-gradient(180deg, rgba(200,200,200,.3), rgba(200,200,200,.08)); }
        .podio-puesto-3 .podio-columna { background: linear-gradient(180deg, rgba(180,120,60,.3), rgba(180,120,60,.08)); }
        .podio-numero { font-family: var(--font-display); font-weight: 800; font-size: 15px; color: var(--gris-300); }
        .podio-puesto:hover .podio-columna { filter: brightness(1.2); }
      `}</style>
    </div>
  )
}
