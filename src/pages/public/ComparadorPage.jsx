import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePublicData } from '../../hooks/usePublicData'
import FiltrosBar from '../../components/public/FiltrosBar'
import AniversarioBadge from '../../components/public/AniversarioBadge'

const COLORS = ['#4E9E47','#9DC41A','#60A5FA','#F59E0B']

function rnd(v, d=1) { return v!=null ? Math.round(v*10**d)/10**d : null }

const METRICAS_COMP = [
  { key:'pts',       label:'PTS',    desc:'Puntos por partido',     src:'stats' },
  { key:'rt',        label:'REB',    desc:'Rebotes por partido',    src:'stats' },
  { key:'as_',       label:'AST',    desc:'Asistencias por partido',src:'stats' },
  { key:'rec',       label:'REC',    desc:'Recuperaciones',         src:'stats' },
  { key:'tap',       label:'TAP',    desc:'Tapones',                src:'stats' },
  { key:'val',       label:'VAL',    desc:'Valoración ACB',         src:'stats' },
  { key:'plus_minus',label:'+/-',    desc:'Diferencial en pista',   src:'stats' },
  { key:'min',       label:'MIN',    desc:'Minutos',                src:'stats' },
  { key:'ts_pct',    label:'TS%',    desc:'True Shooting %',        src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'efg_pct',   label:'eFG%',   desc:'Effective FG%',          src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'usg_pct',   label:'USG%',   desc:'Usage Rate',             src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'per',       label:'PER',    desc:'Player Efficiency Rating',src:'advanced' },
  { key:'bpm',       label:'BPM',    desc:'Box Plus/Minus',         src:'advanced', fmt: v=>v!=null?(v>0?'+':'')+v:'—' },
  { key:'ws',        label:'WS',     desc:'Win Shares',             src:'advanced' },
  { key:'ortg',      label:'ORTG',   desc:'Offensive Rating',       src:'advanced' },
  { key:'drtg',      label:'DRTG',   desc:'Defensive Rating',       src:'advanced' },
  { key:'net_rating',label:'NRTG',   desc:'Net Rating',             src:'advanced', fmt: v=>v!=null?(v>0?'+':'')+v:'—' },
  { key:'ast_pct',   label:'AST%',   desc:'Assist %',               src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'reb_pct',   label:'REB%',   desc:'Rebound %',              src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'tov_pct',   label:'TOV%',   desc:'Turnover %',             src:'advanced', fmt: v=>v!=null?v+'%':'—' },
  { key:'ast_to',    label:'AST/TO', desc:'Asistencias/Pérdidas',   src:'advanced' },
  { key:'epm',       label:'EPM',    desc:'Estimated Plus/Minus',   src:'advanced', fmt: v=>v!=null?(v>0?'+':'')+v:'—' },
  { key:'raptor',    label:'RAPTOR', desc:'RAPTOR (aprox.)',         src:'advanced', fmt: v=>v!=null?(v>0?'+':'')+v:'—' },
  { key:'lebron',    label:'LEBRON', desc:'LEBRON (aprox.)',         src:'advanced', fmt: v=>v!=null?(v>0?'+':'')+v:'—' },
]

const RADAR_KEYS = ['pts','rt','as_','rec','tap','val']
const RADAR_LABELS = ['PTS','REB','AST','REC','TAP','VAL']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--gris-800)', border:'1px solid var(--gris-700)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:700 }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function ComparadorPage() {
  const data = usePublicData()
  const { promediosPorJugador, jugadoresSeleccionados, jugadores, loading } = data
  const temporadaNombre = data.temporadas?.find(t => String(t.id) === String(data.temporadaId))?.nombre
  const [seleccionados, setSeleccionados] = useState([])

  const toggleSel = (id) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const jugadoresComp = seleccionados
    .map(id => promediosPorJugador[id])
    .filter(Boolean)

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  // Radar data
  const radarData = RADAR_LABELS.map((label, i) => {
    const key = RADAR_KEYS[i]
    const punto = { metric: label }
    jugadoresComp.forEach(d => {
      const nombre = d.jugador?.nombre?.split(' ')[0] || '?'
      punto[nombre] = rnd(d.stats[key]) || 0
    })
    return punto
  })

  const getVal = (d, m) => {
    if (m.src === 'stats') return rnd(d.stats[m.key])
    return d.advanced?.[m.key] ?? null
  }

  const fmtVal = (m, v) => {
    if (v == null) return '—'
    if (m.fmt) return m.fmt(v)
    return v
  }

  // Determinar mejor valor en cada métrica
  const bestIdx = (key, src) => {
    const vals = jugadoresComp.map(d => src==='stats' ? (d.stats[key]||0) : (d.advanced?.[key]||0))
    const max = Math.max(...vals)
    return vals.indexOf(max)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Comparador</h2>
          <p>Selecciona hasta 4 jugadores para comparar</p>
        </div>
        <AniversarioBadge temporadaNombre={temporadaNombre} />
      </div>

      <FiltrosBar {...data} />

      {/* Selector de jugadores para comparar */}
      <div className="card" style={{ marginBottom:28 }}>
        <div style={{ marginBottom:12, fontSize:13, color:'var(--gris-400)' }}>
          Seleccionados: {seleccionados.length}/4
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {jugadores.filter(j => promediosPorJugador[j.id]).map((j, i) => (
            <button
              key={j.id}
              onClick={() => toggleSel(j.id)}
              className={`jugador-chip${seleccionados.includes(j.id)?' selected':''}`}
              style={{ borderColor: seleccionados.includes(j.id) ? COLORS[seleccionados.indexOf(j.id)] : undefined }}
            >
              {j.foto_url
  ? <img src={j.foto_url} alt={j.nombre} style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  : <span className="dorsal" style={{ color: seleccionados.includes(j.id) ? COLORS[seleccionados.indexOf(j.id)] : 'var(--verde)' }}>#{j.dorsal}</span>
}
              {j.nombre}
            </button>
          ))}
        </div>
        {seleccionados.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop:12 }} onClick={() => setSeleccionados([])}>
            ✕ Limpiar selección
          </button>
        )}
      </div>

      {jugadoresComp.length < 2 ? (
        <div className="empty-state card">
          <p>Selecciona al menos 2 jugadores para comparar.</p>
        </div>
      ) : (
        <>
          {/* Header con nombres */}
          <div
            className="compare-header-grid"
            style={{ '--cols': jugadoresComp.length, gap: 12, marginBottom: 16 }}
          >
            <div className="compare-header-placeholder" />
            {jugadoresComp.map((d, i) => (
              <div key={d.jugador.id} style={{
                background:'var(--gris-800)',
                border:`2px solid ${COLORS[i]}`,
                borderRadius:'var(--radius-lg)',
                padding:'16px',
                textAlign:'center',
              }}>
                <div style={{
  width:48, height:48, borderRadius:'50%',
  background: COLORS[i]+'22',
  border:`2px solid ${COLORS[i]}`,
  display:'flex', alignItems:'center', justifyContent:'center',
  fontFamily:'var(--font-display)', fontSize:20, fontWeight:700,
  color: COLORS[i], margin:'0 auto 10px',
  overflow:'hidden', flexShrink:0,
}}>
  {d.jugador.foto_url
    ? <img src={d.jugador.foto_url} alt={d.jugador.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    : d.jugador.dorsal
  }
</div>
                <div style={{ fontWeight:700, color:'var(--blanco)', fontSize:14 }}>{d.jugador.nombre}</div>
                <div style={{ fontSize:11, color:'var(--gris-500)', marginTop:2 }}>
                  {d.jugador.posicion} · {d.partidos} partidos
                </div>
              </div>
            ))}
          </div>

          {/* Tabla comparativa */}
          <div style={{ marginBottom:28 }}>
            {METRICAS_COMP.map(m => {
              const vals = jugadoresComp.map(d => getVal(d, m))
              const numVals = vals.map(v => typeof v === 'number' ? v : null)
              const maxVal = Math.max(...numVals.filter(v => v!=null))
              const minVal = Math.min(...numVals.filter(v => v!=null))
              const range = maxVal - minVal || 1

              return (
                <div key={m.key} className="compare-row">
                  <div className="compare-label">
                    <div style={{ fontWeight:700, color:'var(--blanco)' }}>{m.label}</div>
                    <div style={{ fontSize:10, color:'var(--gris-500)', marginTop:2 }}>{m.desc}</div>
                  </div>
                  <div className="compare-bars">
                    {jugadoresComp.map((d, i) => {
                      const v = getVal(d, m)
                      const num = typeof v === 'number' ? v : null
                      const pct = num != null ? Math.max(((num - minVal) / range) * 100, 5) : 0
                      const isBest = num === maxVal && jugadoresComp.length > 1
                      return (
                        <div key={d.jugador.id} className="compare-bar-row">
                          <div className="compare-name" style={{ color: COLORS[i], fontSize:12, fontWeight:600 }}>
                            {d.jugador.nombre.split(' ')[0]}
                          </div>
                          <div className="compare-bar-wrap">
                            <div className="compare-bar-fill" style={{ width:`${pct}%`, background: COLORS[i] }} />
                          </div>
                          <div className="compare-val" style={{ color: isBest ? COLORS[i] : 'var(--gris-300)' }}>
                            {fmtVal(m, v)}{isBest ? ' ★' : ''}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Radar */}
          <div className="chart-card">
            <h3>Radar comparativo</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--gris-700)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill:'var(--gris-400)', fontSize:12 }} />
                {jugadoresComp.map((d, i) => {
                  const nombre = d.jugador?.nombre?.split(' ')[0] || '?'
                  return (
                    <Radar key={d.jugador.id} name={nombre} dataKey={nombre}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  )
                })}
                <Legend wrapperStyle={{ fontSize:13, color:'var(--gris-300)' }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
