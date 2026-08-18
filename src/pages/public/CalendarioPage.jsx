import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AniversarioBadge from '../../components/public/AniversarioBadge'

const RECINTO_LOCAL = 'Palacio de los Deportes José María Martín Carpena'

// Colores/abreviaturas por competición (coinciden con los `nombre` de la
// tabla `competiciones`: ACB, BCL, Copa del Rey, Supercopa, Intercontinental).
// Cualquier competición nueva que no esté aquí cae en un estilo neutro por
// defecto — no hace falta tocar este fichero al añadir partidos de otra
// competición desde el admin, solo se pintará en gris hasta que se le
// asigne un color propio.
const COMPETICIONES = {
  'ACB': { color: 'var(--verde)', abbr: 'ACB' },
  'BCL': { color: '#3B82F6', abbr: 'BCL' },
  'Copa del Rey': { color: 'var(--warning)', abbr: 'Copa' },
  'Supercopa': { color: 'var(--lima)', abbr: 'SCopa' },
  'Intercontinental': { color: '#8B5CF6', abbr: 'Inter' },
}
const COMPETICION_DEFAULT = { color: 'var(--gris-400)', abbr: '—' }

function competicionInfo(nombre) {
  return COMPETICIONES[nombre] || { ...COMPETICION_DEFAULT, abbr: nombre?.slice(0, 5) || '—' }
}

// La jornada puede ser "Jornada 12" (liga regular) o el nombre de una fase
// de playoff ("Cuartos de final", "Semifinales", "Final"...) — se muestra
// distinto según el caso: corto tipo "J12" en la rejilla, o el nombre de
// la fase tal cual si no es una jornada numerada.
function formatJornada(jornada) {
  if (!jornada) return { corto: '', largo: '' }
  const valor = String(jornada).trim()
  const m = valor.match(/^(?:Jornada\s+|J\s*)?(\d+)$/i)
  if (m) return { corto: `J${m[1]}`, largo: `Jornada ${m[1]}` }
  if (/^F4$|^Final\s*Four$/i.test(valor)) return { corto: 'F4', largo: 'Final Four' }
  return { corto: valor, largo: valor }
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_SEMANA_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function fmtFechaLarga(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diaSemana = DIAS_SEMANA[dt.getDay()]
  return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${d} de ${MESES[m - 1]} de ${y}`
}

// Genera la rejilla de celdas (semanas de lunes a domingo) para un mes,
// incluyendo los días de relleno del mes anterior/siguiente.
function generarRejillaMes(year, monthIndex) {
  const primerDia = new Date(year, monthIndex, 1)
  const offsetInicio = (primerDia.getDay() + 6) % 7 // 0 = lunes
  const diasEnMes = new Date(year, monthIndex + 1, 0).getDate()
  const totalCeldas = Math.ceil((offsetInicio + diasEnMes) / 7) * 7

  const celdas = []
  for (let i = 0; i < totalCeldas; i++) {
    const fecha = new Date(year, monthIndex, i - offsetInicio + 1)
    celdas.push({ fecha, esDelMes: fecha.getMonth() === monthIndex })
  }
  return celdas
}

export default function CalendarioPage() {
  const hoy = new Date()
  const hoyISO = toISO(hoy)

  const [temporada, setTemporada] = useState(null)
  const [partidos, setPartidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data: temps } = await supabase.from('temporadas').select('*').order('id', { ascending: false })
      const activa = temps?.find(t => t.activa) || temps?.[0] || null
      setTemporada(activa)

      if (activa) {
        const { data: parts } = await supabase
          .from('partidos')
          .select('*, competiciones(nombre)')
          .eq('temporada_id', activa.id)
          .order('fecha')
        setPartidos(parts || [])
      } else {
        setPartidos([])
      }
      setLoading(false)
    }
    cargar()
  }, [])

  // Partido de referencia para saber en qué mes abrir el calendario:
  // el próximo que quede, o si ya pasó la temporada, el último jugado.
  const partidoRef = useMemo(() => {
    if (partidos.length === 0) return null
    return partidos.find(p => p.fecha >= hoyISO) || partidos[partidos.length - 1]
  }, [partidos, hoyISO])

  useEffect(() => {
    if (!partidoRef || cursor) return
    const [y, m] = partidoRef.fecha.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
  }, [partidoRef, cursor])

  const partidosPorFecha = useMemo(() => {
    const mapa = {}
    for (const p of partidos) {
      if (!mapa[p.fecha]) mapa[p.fecha] = []
      mapa[p.fecha].push(p)
    }
    return mapa
  }, [partidos])

  const competicionesEnUso = useMemo(() => {
    const nombres = [...new Set(partidos.map(p => p.competiciones?.nombre).filter(Boolean))]
    return nombres.map(nombre => ({ nombre, ...competicionInfo(nombre) }))
  }, [partidos])

  const proximoPartido = useMemo(
    () => partidos.find(p => p.fecha >= hoyISO) || null,
    [partidos, hoyISO]
  )

  const minMax = useMemo(() => {
    if (partidos.length === 0) return null
    const [minY, minM] = partidos[0].fecha.split('-').map(Number)
    const [maxY, maxM] = partidos[partidos.length - 1].fecha.split('-').map(Number)
    return { minValor: minY * 12 + (minM - 1), maxValor: maxY * 12 + (maxM - 1) }
  }, [partidos])

  const cursorValor = cursor ? cursor.year * 12 + cursor.month : null
  const puedeRetroceder = cursor && minMax ? cursorValor > minMax.minValor : false
  const puedeAvanzar = cursor && minMax ? cursorValor < minMax.maxValor : false

  function cambiarMes(delta) {
    setCursor(c => {
      if (!c) return c
      let month = c.month + delta
      let year = c.year
      if (month < 0) { month = 11; year -= 1 }
      if (month > 11) { month = 0; year += 1 }
      return { year, month }
    })
  }

  function irAHoy() {
    if (!partidoRef) return
    const [y, m] = partidoRef.fecha.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
  }

  const aniosDisponibles = useMemo(() => {
    if (partidos.length === 0) return []
    const anios = new Set(partidos.map(p => Number(p.fecha.slice(0, 4))))
    return [...anios].sort((a, b) => a - b)
  }, [partidos])

  function irAMes(year, month) {
    if (!minMax) return
    const valor = year * 12 + month
    const acotado = Math.min(Math.max(valor, minMax.minValor), minMax.maxValor)
    setCursor({ year: Math.floor(acotado / 12), month: ((acotado % 12) + 12) % 12 })
  }

  const celdas = useMemo(() => cursor ? generarRejillaMes(cursor.year, cursor.month) : [], [cursor])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Calendario</h2>
          <p>{temporada ? `Partidos de Unicaja en la temporada ${temporada.nombre}` : 'Partidos de Unicaja'}</p>
        </div>
        {temporada && <AniversarioBadge temporadaNombre={temporada.nombre} />}
      </div>

      {partidos.length === 0 ? (
        <div className="empty-state card">
          <p>Todavía no hay partidos cargados para esta temporada.</p>
        </div>
      ) : (
        <>
          {proximoPartido && (
            <div className="calendario-proximo-card">
              <div className="calendario-proximo-label">Próximo partido</div>
              <div className="calendario-proximo-main">
                <div>
                  {(() => {
                    const info = competicionInfo(proximoPartido.competiciones?.nombre)
                    const { largo: jornadaLarga } = formatJornada(proximoPartido.jornada)
                    return (
                      <div className="calendario-proximo-comp" style={{ color: info.color }}>
                        {info.abbr}{jornadaLarga ? ` · ${jornadaLarga}` : ''}
                      </div>
                    )
                  })()}
                  <div className="calendario-proximo-partido">
                    {proximoPartido.es_local === null ? (
                      <><strong>Unicaja</strong> vs {proximoPartido.rival}</>
                    ) : proximoPartido.es_local ? (
                      <><strong>Unicaja</strong> vs {proximoPartido.rival}</>
                    ) : (
                      <>{proximoPartido.rival} vs <strong>Unicaja</strong></>
                    )}
                  </div>
                  <div className="calendario-proximo-fecha">{fmtFechaLarga(proximoPartido.fecha)}</div>
                  <div className="calendario-proximo-lugar">
                    {proximoPartido.es_local === null
                      ? 'Sede neutra'
                      : proximoPartido.es_local
                        ? RECINTO_LOCAL
                        : `Fuera de casa · ${proximoPartido.rival}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {cursor && (
            <div className="calendario-mes">
              <div className="calendario-mes-header">
                <button
                  type="button"
                  className="calendario-nav-btn"
                  onClick={() => cambiarMes(-1)}
                  disabled={!puedeRetroceder}
                  aria-label="Mes anterior"
                >
                  ‹
                </button>
                <div className="calendario-mes-titulo">
                  {MESES[cursor.month].charAt(0).toUpperCase() + MESES[cursor.month].slice(1)} {cursor.year}
                </div>
                <button
                  type="button"
                  className="calendario-nav-btn"
                  onClick={() => cambiarMes(1)}
                  disabled={!puedeAvanzar}
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
                <select
                  className="calendario-select-mes"
                  value={cursor.month}
                  onChange={e => irAMes(cursor.year, Number(e.target.value))}
                  aria-label="Ir a mes"
                >
                  {MESES.map((m, i) => (
                    <option key={m} value={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
                <select
                  className="calendario-select-anio"
                  value={cursor.year}
                  onChange={e => irAMes(Number(e.target.value), cursor.month)}
                  aria-label="Ir a año"
                >
                  {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button type="button" className="calendario-hoy-btn" onClick={irAHoy}>
                  Hoy
                </button>
              </div>

              <div className="calendario-grid">
                {DIAS_SEMANA_CORTO.map(d => (
                  <div key={d} className="calendario-grid-dia-label">{d}</div>
                ))}
                {celdas.map(({ fecha, esDelMes }) => {
                  const fechaISO = toISO(fecha)
                  const partidosDia = partidosPorFecha[fechaISO] || []
                  const esHoy = fechaISO === hoyISO
                  return (
                    <div
                      key={fechaISO}
                      className={`calendario-grid-celda${esDelMes ? '' : ' fuera-de-mes'}${esHoy ? ' es-hoy' : ''}`}
                    >
                      <div className="calendario-grid-numero">{fecha.getDate()}</div>
                      {partidosDia.map(p => {
                        const info = competicionInfo(p.competiciones?.nombre)
                        const jugado = p.puntos_unicaja != null && p.puntos_rival != null
                        const ganado = jugado && p.puntos_unicaja > p.puntos_rival
                        const { corto: jornadaCorta, largo: jornadaLarga } = formatJornada(p.jornada)
                        const tituloJornada = jornadaLarga ? ` · ${jornadaLarga}` : ''
                        const tituloResultado = jugado ? ` · ${p.puntos_unicaja}-${p.puntos_rival}` : ''
                        const tituloRival = p.es_local === null
                          ? `Unicaja - ${p.rival} (sede neutra)`
                          : p.es_local ? 'Unicaja vs ' + p.rival : p.rival + ' vs Unicaja'
                        const titulo = `${info.abbr}${tituloJornada} · ${tituloRival} · ${fmtFechaLarga(fechaISO)}${tituloResultado}`
                        return (
                          <div
                            key={p.id}
                            className={`calendario-grid-partido${p.es_local === null ? ' neutral' : p.es_local ? ' local' : ' visitante'}`}
                            style={{ borderLeftColor: info.color }}
                            title={titulo}
                          >
                            <span className="calendario-grid-comp" style={{ color: info.color }}>
                              {info.abbr}{jornadaCorta ? ` · ${jornadaCorta}` : ''}
                            </span>
                            <span className="calendario-grid-rival">{p.rival}</span>
                            {jugado && (
                              <span className={`calendario-grid-resultado${ganado ? ' ganado' : ' perdido'}`}>
                                {p.puntos_unicaja}-{p.puntos_rival}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {competicionesEnUso.length > 0 && (
            <div className="calendario-leyenda">
              {competicionesEnUso.map(c => (
                <div key={c.nombre} className="calendario-leyenda-item">
                  <span className="calendario-leyenda-dot" style={{ background: c.color }} />
                  {c.nombre}
                </div>
              ))}
              <div className="calendario-leyenda-item">
                <span className="calendario-leyenda-swatch local" /> Casa
              </div>
              <div className="calendario-leyenda-item">
                <span className="calendario-leyenda-swatch visitante" /> Fuera
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .calendario-proximo-card {
          background: rgba(78,158,71,.08);
          border: 1px solid var(--verde);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .calendario-proximo-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: var(--verde);
          margin-bottom: 10px;
        }
        .calendario-proximo-main { display: flex; align-items: center; gap: 16px; }
        .calendario-proximo-comp { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
        .calendario-proximo-partido { font-size: 16px; color: var(--blanco); font-weight: 500; }
        .calendario-proximo-partido strong { color: var(--verde); }
        .calendario-proximo-fecha { font-size: 13px; color: var(--gris-400); margin-top: 3px; text-transform: capitalize; }
        .calendario-proximo-lugar { font-size: 12px; color: var(--gris-500); margin-top: 2px; }

        .calendario-mes {
          background: var(--gris-800);
          border: 1px solid var(--gris-700);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .calendario-mes-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }
        .calendario-mes-titulo {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--blanco);
          text-transform: capitalize;
          flex: 1;
          text-align: center;
        }
        .calendario-nav-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius);
          border: 1px solid var(--gris-700);
          background: var(--gris-900);
          color: var(--blanco);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transition: background .15s, opacity .15s;
        }
        .calendario-nav-btn:hover:not(:disabled) { background: var(--gris-700); }
        .calendario-nav-btn:disabled { opacity: .3; cursor: not-allowed; }
        .calendario-hoy-btn {
          border-radius: var(--radius);
          border: 1px solid var(--gris-700);
          background: var(--gris-900);
          color: var(--gris-300);
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          cursor: pointer;
          transition: background .15s;
        }
        .calendario-hoy-btn:hover { background: var(--gris-700); }
        .calendario-select-mes,
        .calendario-select-anio {
          height: 30px;
          box-sizing: border-box;
          border-radius: var(--radius);
          border: 1px solid var(--gris-700);
          background: var(--gris-900);
          color: var(--gris-300);
          font-size: 12px;
          font-weight: 600;
          padding: 0 6px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          text-align: center;
          text-align-last: center;
        }
        .calendario-select-mes { width: 84px; flex-shrink: 0; }
        .calendario-select-anio { width: 58px; flex-shrink: 0; }
        .calendario-select-mes:hover,
        .calendario-select-anio:hover { background: var(--gris-700); }

        .calendario-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .calendario-grid-dia-label {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--gris-500);
          text-transform: uppercase;
          letter-spacing: .5px;
          padding-bottom: 6px;
        }
        .calendario-grid-celda {
          background: var(--gris-900);
          border: 1px solid var(--gris-700);
          border-radius: var(--radius);
          min-height: 84px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .calendario-grid-celda.fuera-de-mes { opacity: .35; }
        .calendario-grid-celda.es-hoy { border-color: var(--verde); box-shadow: inset 0 0 0 1px var(--verde); }
        .calendario-grid-numero { font-size: 12px; color: var(--gris-500); text-align: right; }
        .calendario-grid-celda.es-hoy .calendario-grid-numero { color: var(--verde); font-weight: 700; }
        .calendario-grid-partido {
          border-left: 3px solid var(--verde);
          background: var(--gris-800);
          border-radius: 4px;
          padding: 3px 5px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow: hidden;
        }
        .calendario-grid-partido.local { background: rgba(78,158,71,.12); }
        .calendario-grid-partido.neutral { background: rgba(234,179,8,.12); }
        .calendario-grid-comp { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
        .calendario-grid-rival {
          font-size: 11px;
          color: var(--gris-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .calendario-grid-resultado {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-display);
        }
        .calendario-grid-resultado.ganado { color: #4ADE80; }
        .calendario-grid-resultado.perdido { color: #F87171; }

        .calendario-leyenda {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--gris-800);
        }
        .calendario-leyenda-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--gris-400);
        }
        .calendario-leyenda-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .calendario-leyenda-swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .calendario-leyenda-swatch.local { background: rgba(78,158,71,.4); border: 1px solid var(--verde); }
        .calendario-leyenda-swatch.visitante { background: var(--gris-700); border: 1px solid var(--gris-600); }

        @media (max-width: 640px) {
          .calendario-grid { gap: 4px; }
          .calendario-grid-celda { min-height: 62px; padding: 4px; }
          .calendario-grid-rival { font-size: 9.5px; }
          .calendario-grid-comp { font-size: 8px; }
          .calendario-mes-titulo { font-size: 15px; }
          .calendario-proximo-lugar { display: none; }
        }
      `}</style>
    </div>
  )
}
