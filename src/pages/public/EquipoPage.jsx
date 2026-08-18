import { useMemo, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePublicData } from '../../hooks/usePublicData'
import { calcTeamTotals } from '../../lib/advanced'
import FiltrosBar from '../../components/public/FiltrosBar'
import AniversarioBadge from '../../components/public/AniversarioBadge'
import EquipoRecordCard from '../../components/public/EquipoRecordCard'
import CapturaBoton from '../../components/public/CapturaBoton'
import trofeoACB from '../../assets/titulos/acb.png'
import trofeoBCL from '../../assets/titulos/bcl.png'
import trofeoCopa from '../../assets/titulos/copa.png'
import trofeoSupercopa from '../../assets/titulos/supercopa.png'
import trofeoIntercontinental from '../../assets/titulos/intercontinental.png'

// Imagen de trofeo por competición. Si mañana añadís una competición nueva
// sin imagen aquí, se muestra sin icono (no rompe nada).
const TROFEO_IMG = {
  ACB: trofeoACB,
  BCL: trofeoBCL,
  'Copa del Rey': trofeoCopa,
  Supercopa: trofeoSupercopa,
  Intercontinental: trofeoIntercontinental,
}

// Algunas imágenes de trofeo se ven más "pequeñas" que otras según cómo
// esté recortado/centrado el PNG que se use — este mapa permite darle un
// empujón de tamaño solo a esas, sin tocar el resto del grid.
const TROFEO_SIZE = {
  'Copa del Rey': 78,
  Intercontinental: 78,
}
const TROFEO_SIZE_DEFAULT = 64

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function rnd(v, d = 1) { return v != null ? Math.round(v * 10 ** d) / 10 ** d : null }

// Categorías del ranking: qué estadística, de dónde sacarla (media por
// jugador ya calculada por el hook) y cómo formatear el valor.
const RANKING_CATS = [
  { key: 'pts',  label: 'Puntos',         get: d => d.stats.pts,          fmt: v => rnd(v) },
  { key: 'rt',   label: 'Rebotes',        get: d => d.stats.rt,           fmt: v => rnd(v) },
  { key: 'as_',  label: 'Asistencias',    get: d => d.stats.as_,          fmt: v => rnd(v) },
  { key: 'rec',  label: 'Recuperaciones', get: d => d.stats.rec,          fmt: v => rnd(v) },
  { key: 'tap',  label: 'Tapones',        get: d => d.stats.tap,          fmt: v => rnd(v) },
  { key: 'per',  label: 'Pérdidas',       get: d => d.stats.per,          fmt: v => rnd(v) },
  { key: 'val',  label: 'Valoración',     get: d => d.stats.val,          fmt: v => rnd(v) },
  { key: 'ws',   label: 'Win Shares',     get: d => d.advanced?.ws,       fmt: v => v != null ? rnd(v, 2) : null },
  { key: 'ts_pct',           label: 'TS%',        get: d => d.advanced?.ts_pct,           fmt: v => v + '%' },
  { key: 'usg_pct',          label: 'USG%',       get: d => d.advanced?.usg_pct,          fmt: v => v + '%' },
  { key: 'net_rating',       label: 'NRTG',       get: d => d.advanced?.net_rating,       fmt: v => (v > 0 ? '+' : '') + v },
  { key: 'win_pct_titular',  label: 'V% Titular', get: d => d.advanced?.win_pct_titular,  fmt: v => v + '%' },
]

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function EquipoPage() {
  const data = usePublicData()
  const { jugadores, promediosPorJugador, partidosFiltrados, loading } = data
  const temporadaActual = data.temporadas?.find(t => String(t.id) === String(data.temporadaId))
  const temporadaNombre = temporadaActual?.nombre

  // Totales y medias del equipo — suma de TODAS las stats de TODOS los
  // jugadores en los partidos filtrados (lo mismo que se mete partido a
  // partido en el admin, agregado)
  const totales = useMemo(() => calcTeamTotals(data.statsFiltradas), [data.statsFiltradas])
  const numPartidos = partidosFiltrados.length
  // Ojo: la media se saca sobre los partidos que tienen stats metidas
  // (no sobre todos los del calendario filtrado, que pueden incluir
  // partidos aún no jugados o sin estadísticas registradas todavía).
  const numPartidosConStats = useMemo(
    () => new Set(data.statsFiltradas.map(s => s.partido_id)).size,
    [data.statsFiltradas]
  )
  const media = key => numPartidosConStats > 0 ? totales[key] / numPartidosConStats : 0

  const t2pct = totales.t2_intentos > 0 ? rnd((totales.t2_anotados / totales.t2_intentos) * 100) : null
  const t3pct = totales.t3_intentos > 0 ? rnd((totales.t3_anotados / totales.t3_intentos) * 100) : null
  const tlpct = totales.tl_intentos > 0 ? rnd((totales.tl_anotados / totales.tl_intentos) * 100) : null

  // Rankings — solo jugadores con al menos 1 partido en el rango filtrado
  const jugadoresConDatos = Object.values(promediosPorJugador).filter(d => d.partidos > 0)

  const rankings = useMemo(() => {
    return RANKING_CATS.map(cat => ({
      ...cat,
      ordenado: [...jugadoresConDatos]
        .filter(d => cat.get(d) != null)
        .sort((a, b) => cat.get(b) - cat.get(a)),
    }))
  }, [promediosPorJugador, partidosFiltrados])

  const [expandido, setExpandido] = useState({})
  const rankingsRef = useRef(null)
  const toggleExpandido = (key) => setExpandido(e => ({ ...e, [key]: !e[key] }))

  // Títulos conseguidos esta temporada, cruzados con TODAS las competiciones
  // para poder pintar también las que no se han ganado (apagadas)
  const [titulos, setTitulos] = useState([])
  useEffect(() => {
    if (!temporadaActual?.id) { setTitulos([]); return }
    let cancel = false
    supabase.from('titulos').select('competicion_id, conseguido').eq('temporada_id', temporadaActual.id)
      .then(({ data }) => { if (!cancel) setTitulos(data || []) })
    return () => { cancel = true }
  }, [temporadaActual?.id])

  const titulosPorCompeticion = useMemo(() => {
    const map = {}
    titulos.forEach(t => { map[t.competicion_id] = t.conseguido })
    return map
  }, [titulos])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Equipo</h2>
          <p>{numPartidosConStats} partidos · totales, medias y rankings de la plantilla</p>
        </div>
        <AniversarioBadge temporadaNombre={temporadaNombre} />
      </div>

      <FiltrosBar {...data} extra={<EquipoRecordCard temporada={temporadaActual} />} />

      {numPartidos === 0 ? (
        <div className="empty-state card">
          <p>No hay partidos con los filtros seleccionados.</p>
        </div>
      ) : (
        <>
          {/* ── TOTALES Y MEDIAS DEL EQUIPO ── */}
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--verde)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Producción del equipo</span> — suma de las estadísticas de todos los jugadores en los partidos filtrados. El número grande es la media por partido; debajo, el total acumulado de la temporada (o del rango filtrado).
          </div>

          <div className="stat-grid">
            {[
              { label: 'Puntos', value: rnd(media('pts')), total: rnd(totales.pts), accent: true },
              { label: 'Rebotes', value: rnd(media('rt')), total: rnd(totales.rt) },
              { label: 'Asistencias', value: rnd(media('as_')), total: rnd(totales.as_) },
              { label: 'Recuperaciones', value: rnd(media('rec')), total: rnd(totales.rec) },
              { label: 'Tapones', value: rnd(media('tap')), total: rnd(totales.tap) },
              { label: 'Pérdidas', value: rnd(media('per')), total: rnd(totales.per) },
              { label: 'Faltas', value: rnd(media('fp')), total: rnd(totales.fp) },
              { label: 'Valoración', value: rnd(media('val')), total: rnd(totales.val), lima: true },
              { label: 'Minutos', value: rnd(totales.min), soloTotal: true },
            ].map(s => (
              <div key={s.label} className={`stat-card${s.accent ? ' accent' : s.lima ? ' lima' : ''}`}>
                <div className="sc-label">{s.label}</div>
                <div className="sc-value">{s.value ?? '—'}</div>
                <div className="sc-sub">{s.soloTotal ? 'Total jugados en el año' : `Total: ${s.total ?? '—'}`}</div>
              </div>
            ))}
          </div>

          <div className="adv-grid">
            <div className="adv-card">
              <div className="adv-label">T2</div>
              <div className="adv-name">{rnd(totales.t2_anotados)}/{rnd(totales.t2_intentos)} de media</div>
              <div className="adv-value pct">{t2pct != null ? t2pct + '%' : '—'}</div>
            </div>
            <div className="adv-card">
              <div className="adv-label">T3</div>
              <div className="adv-name">{rnd(totales.t3_anotados)}/{rnd(totales.t3_intentos)} de media</div>
              <div className="adv-value pct">{t3pct != null ? t3pct + '%' : '—'}</div>
            </div>
            <div className="adv-card">
              <div className="adv-label">TL</div>
              <div className="adv-name">{rnd(totales.tl_anotados)}/{rnd(totales.tl_intentos)} de media</div>
              <div className="adv-value pct">{tlpct != null ? tlpct + '%' : '—'}</div>
            </div>
          </div>

          {/* ── TÍTULOS ── */}
          {data.competiciones.length > 0 && (
            <>
              <div style={{ marginTop: 8, marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid #5C2D91', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Títulos</span> — competiciones conseguidas {temporadaNombre ? `en la temporada ${temporadaNombre}` : 'esta temporada'}.
              </div>

              <div className="titulos-grid">
                {data.competiciones.map(c => {
                  const conseguido = !!titulosPorCompeticion[c.id]
                  const img = TROFEO_IMG[c.nombre]
                  return (
                    <div key={c.id} className={`titulo-card-grande${conseguido ? ' conseguido' : ''}`}>
                      {img && (
                        <img
                          src={img}
                          alt={c.nombre}
                          className="titulo-img-grande"
                          style={{
                            opacity: conseguido ? 1 : 0.25,
                            filter: conseguido ? 'none' : 'grayscale(1)',
                            width: TROFEO_SIZE[c.nombre] || TROFEO_SIZE_DEFAULT,
                            height: TROFEO_SIZE[c.nombre] || TROFEO_SIZE_DEFAULT,
                          }}
                        />
                      )}
                      <div className="titulo-nombre">{c.nombre}</div>
                      <div className={`titulo-estado${conseguido ? ' conseguido' : ''}`}>
                        {conseguido ? '🏆 Conseguido' : 'No conseguido'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── RANKINGS ── */}
          <div style={{ marginTop: 8, marginBottom: 16, padding: '12px 16px', background: 'var(--gris-800)', borderLeft: '3px solid var(--lima)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--gris-400)', lineHeight: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--blanco)', fontWeight: 700 }}>Rankings</span> — top 5 de la plantilla por media en cada estadística, por competición, tramo de meses, mes en concreto. Pulsa en un jugador para ir a su ficha.
            </div>
            <CapturaBoton targetRef={rankingsRef} filename="ranking-unicaja-avanzado" label="📸 Descargar ranking" />
          </div>

          <div ref={rankingsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, padding: 4 }}>
            {rankings.map(cat => {
              const abierto = !!expandido[cat.key]
              const lista = abierto ? cat.ordenado : cat.ordenado.slice(0, 5)
              return (
              <div key={cat.key} className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--blanco)' }}>{cat.label}</h3>
                {lista.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--gris-500)' }}>Sin datos.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lista.map((d, i) => (
                      <Link
                        key={d.jugador.id}
                        to={`/${slugify(d.jugador.nombre)}`}
                        className="ranking-row"
                      >
                        <span style={{ width: 22, textAlign: 'center', fontSize: i < 3 ? 16 : 12, color: i < 3 ? undefined : 'var(--gris-500)', fontWeight: 700 }}>
                          {MEDALLAS[i] || `${i + 1}º`}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--verde)', fontSize: 12, minWidth: 24 }}>
                          #{d.jugador.dorsal}
                        </span>
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--blanco)' }}>{d.jugador.nombre}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--lima)' }}>
                          {cat.fmt(cat.get(d))}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {cat.ordenado.length > 5 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                    onClick={() => toggleExpandido(cat.key)}
                  >
                    {abierto ? 'Ver menos' : `Ver todo (${cat.ordenado.length})`}
                  </button>
                )}
              </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
