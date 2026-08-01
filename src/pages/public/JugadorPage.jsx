import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { calcAllAdvanced, calcTeamTotals } from '../../lib/advanced'
import AniversarioBadge from '../../components/public/AniversarioBadge'

const COLORS = ['#4E9E47','#9DC41A','#60A5FA','#F59E0B']

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function rnd(v, d=1) { return v != null ? Math.round(v*10**d)/10**d : null }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--gris-800)', border:'1px solid var(--gris-700)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--gris-400)', marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:700 }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

const ADV_METRICS = [
  { key:'ts_pct',    label:'TS%',    desc:'True Shooting %',         fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'efg_pct',   label:'eFG%',   desc:'Effective FG%',           fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'usg_pct',   label:'USG%',   desc:'Usage Rate',              fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'per',       label:'PER',    desc:'Player Efficiency Rating', fmt: v => v!=null?v:'—',                 type:'rating' },
  { key:'bpm',       label:'BPM',    desc:'Box Plus/Minus',          fmt: v => v!=null?(v>0?'+':'')+v:'—',    type:'pm' },
  { key:'ws',        label:'WS',     desc:'Win Shares',              fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'ows',       label:'OWS',    desc:'Offensive Win Shares',    fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'dws',       label:'DWS',    desc:'Defensive Win Shares',    fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'ws40',      label:'WS/40',  desc:'Win Shares por 40 min',   fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'pf40',      label:'FP/40',  desc:'Faltas personales por 40 min', fmt: v => v!=null?v:'—',             type:'rating' },
  { key:'ortg',      label:'ORTG',   desc:'Offensive Rating',        fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'drtg',      label:'DRTG',   desc:'Defensive Rating',        fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'net_rating',label:'NRTG',   desc:'Net Rating',              fmt: v => v!=null?(v>0?'+':'')+v:'—',    type:'pm' },
  { key:'ast_pct',   label:'AST%',   desc:'Assist Percentage',       fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'reb_pct',   label:'REB%',   desc:'Rebound Percentage',      fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'oreb_pct',  label:'OREB%',  desc:'Off. Rebound %',          fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'dreb_pct',  label:'DREB%',  desc:'Def. Rebound %',          fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'tov_pct',   label:'TOV%',   desc:'Turnover %',              fmt: v => v!=null?v+'%':'—',             type:'pct' },
  { key:'ast_to',    label:'AST/TO', desc:'Asistencias/Pérdidas',    fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'epm',       label:'EPM',    desc:'Estimated Plus/Minus',    fmt: v => v!=null?(v>0?'+':'')+v:'—',    type:'pm' },
  { key:'raptor',    label:'RAPTOR', desc:'RAPTOR (aprox.)',          fmt: v => v!=null?(v>0?'+':'')+v:'—',    type:'pm' },
  { key:'lebron',    label:'LEBRON', desc:'LEBRON (aprox.)',          fmt: v => v!=null?(v>0?'+':'')+v:'—',    type:'pm' },
  { key:'tendencia_val', label:'TEND', desc:'Tendencia VAL (últ.5)', fmt: v => v!=null?v:'—',                  type:'rating' },
  { key:'win_pct_titular',  label:'V% TITULAR',  desc:'% de victorias en los partidos que fue titular',  fmt: v => v!=null?v+'%':'—', type:'pct' },
  { key:'win_pct_suplente', label:'V% SUPLENTE', desc:'% de victorias en los partidos que fue suplente', fmt: v => v!=null?v+'%':'—', type:'pct' },
]

export default function JugadorPage() {
  const { slug } = useParams()
  const [jugador, setJugador]   = useState(null)
  const [stats, setStats]       = useState([])
  const [partidos, setPartidos] = useState([])
  const [allStats, setAllStats] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('resumen')
  const [filtroComp, setFiltroComp] = useState('todas')
  const [competiciones, setCompeticiones] = useState([])

  useEffect(() => {
    async function load() {
      // Buscar jugador por slug
      const { data: jugs } = await supabase.from('jugadores').select('*, temporadas(nombre)')
      const jug = jugs?.find(j => slugify(j.nombre) === slug)
      if (!jug) { setLoading(false); return }
      setJugador(jug)

      const { data: comps } = await supabase.from('competiciones').select('*')
      setCompeticiones(comps || [])

      const { data: parts } = await supabase
        .from('partidos')
        .select('*, competiciones(id,nombre)')
        .eq('temporada_id', jug.temporada_id)
        .order('fecha')
      setPartidos(parts || [])

      const partidoIds = (parts || []).map(p => p.id)
      const { data: st } = await supabase.from('stats').select('*').eq('jugador_id', jug.id)
      setStats(st || [])

      if (partidoIds.length > 0) {
        const { data: allSt } = await supabase.from('stats').select('*').in('partido_id', partidoIds)
        setAllStats(allSt || [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (!jugador) return <div className="empty-state"><p>Jugador no encontrado</p></div>

  // Filtrar por competición
  const statsFiltradas = stats.filter(s => {
    if (filtroComp === 'todas') return true
    const p = partidos.find(p => p.id === s.partido_id)
    return p && String(p.competicion_id) === filtroComp
  })

  const n = statsFiltradas.length
  const avg = key => n > 0 ? statsFiltradas.reduce((a,s) => a+(s[key]||0), 0) / n : null
  const sum = key => statsFiltradas.reduce((a,s) => a+(s[key]||0), 0)

  const jugPartidos = [...new Set(statsFiltradas.map(s => s.partido_id))]
  let teamAvg = {}
  jugPartidos.forEach(pid => {
    const tot = calcTeamTotals(allStats.filter(s => s.partido_id === pid))
    Object.keys(tot).forEach(k => { teamAvg[k] = (teamAvg[k]||0) + tot[k] })
  })
  Object.keys(teamAvg).forEach(k => { teamAvg[k] /= jugPartidos.length })

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

  const statsOrdenadas = statsFiltradas
    .map(s => ({ ...s, fecha: partidos.find(p=>p.id===s.partido_id)?.fecha || '' }))
    .sort((a,b) => a.fecha.localeCompare(b.fecha))

  const ultimoPartido = partidos.find(p => p.id === statsOrdenadas[statsOrdenadas.length-1]?.partido_id)
  const advanced = n > 0 ? calcAllAdvanced(avgStats, teamAvg, ultimoPartido?.puntos_rival, statsOrdenadas, partidos) : {}

  const { dd, td } = advanced.dobles_dobles != null
    ? { dd: advanced.dobles_dobles, td: advanced.triples_dobles }
    : { dd: 0, td: 0 }

  const chartData = statsOrdenadas.map(s => {
    const p = partidos.find(pp => pp.id === s.partido_id)
    return {
      partido: `vs ${p?.rival?.substring(0,8) || ''}`,
      fecha: p?.fecha?.slice(5) || '',
      PTS: s.pts || 0,
      REB: s.rt  || 0,
      AST: s.as_ || 0,
      VAL: s.val || 0,
      '+/-': s.plus_minus || 0,
      MIN: rnd(s.min) || 0,
    }
  })

  const badgeCls = (nombre) => {
    const map = { ACB:'acb', BCL:'bcl', 'Copa del Rey':'copa', Supercopa:'super', Intercontinental:'inter' }
    return `badge badge-${map[nombre]||'acb'}`
  }

  const fmtPct = (m, i) => {
    const pct = i > 0 ? rnd(m/i*100) : null
    return `${rnd(m,1)}/${rnd(i,1)} (${pct != null ? pct+'%' : '—'})`
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        <Link to="/" style={{ color:'var(--gris-500)', fontSize:13, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
          ← Volver a estadísticas
        </Link>
        <AniversarioBadge temporadaNombre={jugador.temporadas?.nombre} />
      </div>

      {/* Header jugador */}
      <div className="card" style={{ marginBottom:28 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:24, alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{
              width:72, height:72, borderRadius:'50%',
              background:'var(--gris-700)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'var(--verde)',
              overflow:'hidden', flexShrink:0,
            }}>
              {jugador.foto_url
                ? <img src={jugador.foto_url} alt={jugador.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : jugador.dorsal || '?'
              }
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700 }}>{jugador.nombre}</div>
                {jugador.es_cupo && (
                  <span className="badge badge-super" title="Jugador de cupo" style={{ gap: 6 }}>
                    <svg width="16" height="11" viewBox="0 0 3 2" style={{ borderRadius: 2, flexShrink: 0 }}>
                      <rect width="3" height="2" fill="#AA151B" />
                      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
                    </svg>
                    Cupo
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                <span className="pos-pill">{jugador.posicion}</span>
                <span style={{ fontSize:13, color:'var(--gris-500)' }}>{jugador.nacionalidad}</span>
                <span style={{ fontSize:13, color:'var(--gris-500)' }}>· {jugador.temporadas?.nombre}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:'var(--verde)' }}>{n}</div>
              <div style={{ fontSize:11, color:'var(--gris-500)', textTransform:'uppercase', letterSpacing:'.8px' }}>Partidos</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:'var(--lima)' }}>{rnd(avg('val')) ?? '—'}</div>
              <div style={{ fontSize:11, color:'var(--gris-500)', textTransform:'uppercase', letterSpacing:'.8px' }}>Val. media</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700 }}>{rnd(avg('pts')) ?? '—'}</div>
              <div style={{ fontSize:11, color:'var(--gris-500)', textTransform:'uppercase', letterSpacing:'.8px' }}>Pts media</div>
            </div>
          </div>
        </div>
        {!jugador.activo && (
          <div style={{
            marginTop: 20,
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            background: 'rgba(230, 80, 60, 0.12)',
            border: '1px solid rgba(230, 80, 60, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e8917f' }}>
              Este jugador ya no pertenece a la plantilla actual. Podrás ver las estadísticas de los {n} partido{n === 1 ? '' : 's'} que ha jugado en la temporada {jugador.temporadas?.nombre}.
            </span>
          </div>
        )}
      </div>

      {/* Filtro competición */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        <button className={`btn btn-sm ${filtroComp==='todas'?'btn-primary':'btn-ghost'}`} onClick={() => setFiltroComp('todas')}>Todas</button>
        {competiciones.map(c => (
          <button key={c.id} className={`btn btn-sm ${filtroComp===String(c.id)?'btn-primary':'btn-ghost'}`}
            onClick={() => setFiltroComp(String(c.id))}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[{id:'resumen',label:'Resumen'},{id:'partidos',label:'Partido a partido'},{id:'avanzadas',label:'Avanzadas'},{id:'graficas',label:'Gráficas'}].map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {n === 0 ? (
        <div className="empty-state card"><p>No hay estadísticas con este filtro.</p></div>
      ) : (
        <>
          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <>
              <div className="stat-grid">
                {[
                  { label:'Partidos jugados', value: n, sub: 'esta temporada' },
                  { label:'De titular', value: statsFiltradas.filter(s => s.titular).length, sub: `de ${n} partidos` },
                  { label:'Puntos', value: rnd(avg('pts')), accent:true },
                  { label:'Rebotes', value: rnd(avg('rt')) },
                  { label:'Asistencias', value: rnd(avg('as_')) },
                  { label:'Recuperaciones', value: rnd(avg('rec')) },
                  { label:'Tapones', value: rnd(avg('tap')) },
                  { label:'Pérdidas', value: rnd(avg('per')) },
                  { label:'Minutos', value: rnd(avg('min')) },
                  { label:'+/-', value: rnd(avg('plus_minus')), lima: true },
                  { label:'Valoración', value: rnd(avg('val')), lima: true },
                  { label:'Mates', value: sum('mat') },
                  { label:'Dobles-dobles', value: dd },
                  { label:'Triples-dobles', value: td },
                ].map(s => (
                  <div key={s.label} className={`stat-card${s.accent?' accent':s.lima?' lima':''}`}>
                    <div className="sc-label">{s.label}</div>
                    <div className="sc-value">{s.value ?? '—'}</div>
                    <div className="sc-sub">{s.sub || 'por partido'}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:16 }}>Tiros</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                  {[
                    { label:'Tiros de 2', m: avg('t2_anotados'), i: avg('t2_intentos') },
                    { label:'Tiros de 3', m: avg('t3_anotados'), i: avg('t3_intentos') },
                    { label:'Tiros libres', m: avg('tl_anotados'), i: avg('tl_intentos') },
                  ].map(t => (
                    <div key={t.label} style={{ background:'var(--negro)', borderRadius:'var(--radius)', padding:16 }}>
                      <div style={{ fontSize:12, color:'var(--gris-500)', marginBottom:6 }}>{t.label}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18 }}>{fmtPct(t.m, t.i)}</div>
                      <div style={{ height:4, background:'var(--gris-700)', borderRadius:99, marginTop:10 }}>
                        <div style={{ height:'100%', width:`${t.i>0?Math.min(t.m/t.i*100,100):0}%`, background:'var(--verde)', borderRadius:99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PARTIDO A PARTIDO ── */}
          {tab === 'partidos' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Rival</th><th>Rol</th><th>Comp.</th><th>Resultado</th><th>MIN</th>
                    <th>PTS</th><th>T2</th><th>T3</th><th>TL</th>
                    <th>RO</th><th>RD</th><th>RT</th><th>AS</th>
                    <th>PÉR</th><th>REC</th><th>TAP</th><th>MAT</th>
                    <th>FP</th><th>FR</th><th>+/-</th><th>VAL</th>
                  </tr>
                </thead>
                <tbody>
                  {statsOrdenadas.map(s => {
                    const p = partidos.find(pp => pp.id === s.partido_id)
                    const pm = s.plus_minus
                    return (
                      <tr key={s.id}>
                        <td style={{ whiteSpace:'nowrap' }}>
                          {p?.fecha ? new Date(p.fecha).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}) : '—'}
                        </td>
                        <td style={{ fontWeight:600, color:'var(--blanco)' }}>{p?.rival || '—'}</td>
                        <td>
                          {s.titular
                            ? <span className="badge badge-local">Titular</span>
                            : <span className="badge badge-visit">Suplente</span>}
                        </td>
                        <td><span className={badgeCls(p?.competiciones?.nombre)}>{p?.competiciones?.nombre}</span></td>
                        <td style={{ whiteSpace:'nowrap', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13 }}>
  {p?.puntos_unicaja != null
    ? <span style={{ color: p.puntos_unicaja > p.puntos_rival ? '#4ADE80' : '#F87171' }}>
        {p.puntos_unicaja}–{p.puntos_rival}
      </span>
    : '—'
  }
</td>
                        <td className="num">{rnd(s.min)}</td>
                        <td className="num highlight">{s.pts}</td>
                        <td className="num">{s.t2_anotados}/{s.t2_intentos}</td>
                        <td className="num">{s.t3_anotados}/{s.t3_intentos}</td>
                        <td className="num">{s.tl_anotados}/{s.tl_intentos}</td>
                        <td className="num">{s.ro}</td>
                        <td className="num">{s.rd}</td>
                        <td className="num">{s.rt}</td>
                        <td className="num">{s.as_}</td>
                        <td className="num">{s.per}</td>
                        <td className="num">{s.rec}</td>
                        <td className="num">{s.tap}</td>
                        <td className="num">{s.mat}</td>
                        <td className="num">{s.fp}</td>
                        <td className="num">{s.fr}</td>
                        <td className={`num ${pm>0?'pos':pm<0?'neg':''}`}>{pm!=null?(pm>0?'+':'')+pm:'—'}</td>
                        <td className="num lima">{s.val}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ background:'var(--gris-800)', fontWeight:700 }}>
                    <td colSpan={3} style={{ color:'var(--gris-400)', fontSize:12 }}>MEDIA</td>
                    <td></td> 
                    <td className="num">{rnd(avg('min'))}</td>
                    <td className="num highlight">{rnd(avg('pts'))}</td>
                    <td className="num">{rnd(avg('t2_anotados'),1)}/{rnd(avg('t2_intentos'),1)}</td>
                    <td className="num">{rnd(avg('t3_anotados'),1)}/{rnd(avg('t3_intentos'),1)}</td>
                    <td className="num">{rnd(avg('tl_anotados'),1)}/{rnd(avg('tl_intentos'),1)}</td>
                    <td className="num">{rnd(avg('ro'))}</td>
                    <td className="num">{rnd(avg('rd'))}</td>
                    <td className="num">{rnd(avg('rt'))}</td>
                    <td className="num">{rnd(avg('as_'))}</td>
                    <td className="num">{rnd(avg('per'))}</td>
                    <td className="num">{rnd(avg('rec'))}</td>
                    <td className="num">{rnd(avg('tap'))}</td>
                    <td className="num">{rnd(avg('mat'))}</td>
                    <td className="num">{rnd(avg('fp'))}</td>
                    <td className="num">{rnd(avg('fr'))}</td>
                    <td className={`num ${avg('plus_minus')>0?'pos':avg('plus_minus')<0?'neg':''}`}>
                      {rnd(avg('plus_minus'))!=null?(rnd(avg('plus_minus'))>0?'+':'')+rnd(avg('plus_minus')):'—'}
                    </td>
                    <td className="num lima">{rnd(avg('val'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── AVANZADAS ── */}
          {tab === 'avanzadas' && (
            <div className="adv-grid">
              {ADV_METRICS.map(m => {
                const v = advanced[m.key]
                const fmt = m.fmt(v)
                const cls = m.type==='pm' ? (v>0?'pos':v<0?'neg':'neu') : m.type==='pct'?'pct':'neu'
                const barPct = m.type==='pct' && v!=null ? Math.min(v, 100) : null
                return (
                  <div key={m.key} className="adv-card">
                    <div className="adv-label">{m.label}</div>
                    <div className="adv-name">{m.desc}</div>
                    <div className={`adv-value ${cls}`}>{fmt}</div>
                    {barPct != null && (
                      <div className="adv-bar">
                        <div className="adv-bar-fill" style={{ width:`${barPct}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── GRÁFICAS ── */}
          {tab === 'graficas' && (
            <>
              <div className="chart-card" style={{ marginBottom:20 }}>
                <h3>Evolución PTS / REB / AST</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top:5, right:20, left:0, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                    <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                    <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:12, color:'var(--gris-300)' }} />
                    <Line type="monotone" dataKey="PTS" stroke="#4E9E47" strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} />
                    <Line type="monotone" dataKey="REB" stroke="#9DC41A" strokeWidth={2} dot={{ r:3 }} />
                    <Line type="monotone" dataKey="AST" stroke="#60A5FA" strokeWidth={2} dot={{ r:3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="charts-grid">
                <div className="chart-card">
                  <h3>Valoración por partido</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                      <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:10 }} />
                      <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="VAL" name="Valoración" fill="var(--lima)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>+/- por partido</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                      <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:10 }} />
                      <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="var(--gris-500)" />
                      <Bar dataKey="+/-" name="+/-" radius={[4,4,0,0]} fill="var(--verde)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Minutos por partido</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                      <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:10 }} />
                      <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="MIN" name="Minutos" fill="var(--gris-600)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Evolución VAL — Tendencia</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gris-700)" />
                      <XAxis dataKey="partido" tick={{ fill:'var(--gris-500)', fontSize:10 }} />
                      <YAxis tick={{ fill:'var(--gris-500)', fontSize:11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={rnd(avg('val'))} stroke="var(--gris-500)" strokeDasharray="4 4" label={{ value:'Media', fill:'var(--gris-500)', fontSize:10 }} />
                      <Line type="monotone" dataKey="VAL" stroke="var(--lima)" strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
