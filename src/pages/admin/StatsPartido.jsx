import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const LEYENDA = [
  { abr: 'MIN',  desc: 'Minutos jugados' },
  { abr: 'PTS',  desc: 'Puntos' },
  { abr: 'T2',   desc: 'Tiros de 2 anotados' },
  { abr: 'T2i',  desc: 'Tiros de 2 intentados' },
  { abr: 'T2%',  desc: 'Porcentaje tiros de 2 (automático)' },
  { abr: 'T3',   desc: 'Tiros de 3 anotados' },
  { abr: 'T3i',  desc: 'Tiros de 3 intentados' },
  { abr: 'T3%',  desc: 'Porcentaje tiros de 3 (automático)' },
  { abr: 'TL',   desc: 'Tiros libres anotados' },
  { abr: 'TLi',  desc: 'Tiros libres intentados' },
  { abr: 'TL%',  desc: 'Porcentaje tiros libres (automático)' },
  { abr: 'RO',   desc: 'Rebotes ofensivos' },
  { abr: 'RD',   desc: 'Rebotes defensivos' },
  { abr: 'RT',   desc: 'Rebotes totales (automático)' },
  { abr: 'AS',   desc: 'Asistencias' },
  { abr: 'PÉR',  desc: 'Pérdidas' },
  { abr: 'REC',  desc: 'Recuperaciones' },
  { abr: 'TAP',  desc: 'Tapones' },
  { abr: 'TR',   desc: 'Tapones recibidos' },
  { abr: 'MAT',  desc: 'Mates' },
  { abr: 'FP',   desc: 'Faltas personales' },
  { abr: 'FR',   desc: 'Faltas recibidas' },
  { abr: '+/-',  desc: 'Diferencial en pista' },
  { abr: 'VAL',  desc: 'Valoración' },
]

const CAMPOS = [
  { key: 'min',         label: 'MIN',  tipo: 'decimal' },
  { key: 'pts',         label: 'PTS',  tipo: 'entero' },
  { key: 't2_anotados', label: 'T2',   tipo: 'entero' },
  { key: 't2_intentos', label: 'T2i',  tipo: 'entero' },
  { key: 't3_anotados', label: 'T3',   tipo: 'entero' },
  { key: 't3_intentos', label: 'T3i',  tipo: 'entero' },
  { key: 'tl_anotados', label: 'TL',   tipo: 'entero' },
  { key: 'tl_intentos', label: 'TLi',  tipo: 'entero' },
  { key: 'ro',          label: 'RO',   tipo: 'entero' },
  { key: 'rd',          label: 'RD',   tipo: 'entero' },
  { key: 'as_',         label: 'AS',   tipo: 'entero' },
  { key: 'per',         label: 'PÉR',  tipo: 'entero' },
  { key: 'rec',         label: 'REC',  tipo: 'entero' },
  { key: 'tap',         label: 'TAP',  tipo: 'entero' },
  { key: 'tr',          label: 'TR',   tipo: 'entero' },
  { key: 'mat',         label: 'MAT',  tipo: 'entero' },
  { key: 'fp',          label: 'FP',   tipo: 'entero' },
  { key: 'fr',          label: 'FR',   tipo: 'entero' },
  { key: 'plus_minus',  label: '+/-',  tipo: 'entero_signed' },
  { key: 'val',         label: 'VAL',  tipo: 'entero' },
]

const emptyStats = () => Object.fromEntries(CAMPOS.map(c => [c.key, '']))

export default function StatsPartido() {
  const { id } = useParams()
  const [partido, setPartido] = useState(null)
  const [leyendaAbierta, setLeyendaAbierta] = useState(false)
  const [jugadores, setJugadores] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [editandoId, setEditandoId] = useState(null)
  const [formStats, setFormStats] = useState(emptyStats())
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: p } = await supabase
      .from('partidos')
      .select('*, competiciones(nombre), temporadas(nombre)')
      .eq('id', id)
      .single()
    setPartido(p)

    const { data: jugs } = await supabase
      .from('jugadores')
      .select('*')
      .eq('temporada_id', p.temporada_id)
      .eq('activo', true)
      .order('dorsal')
    setJugadores(jugs || [])

    const { data: stats } = await supabase
      .from('stats')
      .select('*')
      .eq('partido_id', id)
    const map = {}
    stats?.forEach(s => { map[s.jugador_id] = s })
    setStatsMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const openEdit = (jugador) => {
    const existing = statsMap[jugador.id]
    const draft = drafts[jugador.id]

    if (draft) {
      // Hay borrador sin guardar: restaurarlo
      setFormStats(draft)
    } else if (existing) {
      setFormStats(Object.fromEntries(CAMPOS.map(c => [c.key, existing[c.key] ?? ''])))
    } else {
      setFormStats(emptyStats())
    }
    setEditandoId(jugador.id)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { partido_id: Number(id), jugador_id: editandoId }
    CAMPOS.forEach(c => {
      const v = formStats[c.key]
      payload[c.key] = v === '' || v === null ? null : (c.tipo === 'decimal') ? parseFloat(v) : parseInt(v)
    })

    const t2m = payload.t2_anotados || 0
    const t2i = payload.t2_intentos || 0
    const t3m = payload.t3_anotados || 0
    const t3i = payload.t3_intentos || 0
    const tlm = payload.tl_anotados || 0
    const tli = payload.tl_intentos || 0
    const ro  = payload.ro || 0
    const rd  = payload.rd || 0

    payload.t2_pct = t2i > 0 ? Math.round(t2m / t2i * 1000) / 10 : null
    payload.t3_pct = t3i > 0 ? Math.round(t3m / t3i * 1000) / 10 : null
    payload.tl_pct = tli > 0 ? Math.round(tlm / tli * 1000) / 10 : null
    payload.rt     = ro + rd

    const existing = statsMap[editandoId]
    const { error } = existing
      ? await supabase.from('stats').update(payload).eq('id', existing.id)
      : await supabase.from('stats').insert(payload)

    setSaving(false)
    if (error) { toast.error('Error al guardar stats'); return }

    // Limpiar borrador al guardar con éxito
    setDrafts(d => { const next = { ...d }; delete next[editandoId]; return next })
    toast.success('Stats guardadas')
    setEditandoId(null)
    load()
  }

  const handleDelete = async (jugadorId) => {
    const existing = statsMap[jugadorId]
    if (!existing) return
    if (!confirm('¿Eliminar las stats de este jugador en este partido?')) return
    await supabase.from('stats').delete().eq('id', existing.id)
    toast.success('Stats eliminadas')
    load()
  }

  // Guarda el borrador en cada cambio de input
  const setVal = (key, val) => {
    setFormStats(f => {
      const next = { ...f, [key]: val }
      setDrafts(d => ({ ...d, [editandoId]: next }))
      return next
    })
  }

  const badgeClass = (nombre) => {
    const map = { ACB: 'acb', BCL: 'bcl', 'Copa del Rey': 'copa', Supercopa: 'super', Intercontinental: 'inter' }
    return `badge badge-${map[nombre] || 'acb'}`
  }

  const preview = {
    t2pct: formStats.t2_intentos > 0 ? Math.round(formStats.t2_anotados / formStats.t2_intentos * 1000) / 10 : '—',
    t3pct: formStats.t3_intentos > 0 ? Math.round(formStats.t3_anotados / formStats.t3_intentos * 1000) / 10 : '—',
    tlpct: formStats.tl_intentos > 0 ? Math.round(formStats.tl_anotados / formStats.tl_intentos * 1000) / 10 : '—',
    rt:    (Number(formStats.ro) || 0) + (Number(formStats.rd) || 0),
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  const yaMetidos = jugadores.filter(j => statsMap[j.id])
  const sinMeter  = jugadores.filter(j => !statsMap[j.id])

  return (
    <div>
      {/* Header del partido */}
      <div style={{ marginBottom: 28 }}>
        <Link to="/admin/partidos" style={{ color: 'var(--gris-500)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          ← Volver a partidos
        </Link>
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--gris-500)', marginBottom: 4 }}>
                {new Date(partido.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                Unicaja vs <span style={{ color: 'var(--lima)' }}>{partido.rival}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={badgeClass(partido.competiciones?.nombre)}>{partido.competiciones?.nombre}</span>
              <span className={`badge ${partido.es_local ? 'badge-local' : 'badge-visit'}`}>{partido.es_local ? 'Local' : 'Visitante'}</span>
              {partido.puntos_unicaja != null && (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: partido.puntos_unicaja > partido.puntos_rival ? '#4ADE80' : '#F87171' }}>
                  {partido.puntos_unicaja} – {partido.puntos_rival}
                </span>
              )}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gris-500)' }}>
              {yaMetidos.length} / {jugadores.length} jugadores con stats
            </div>
          </div>
        </div>
      </div>

      {/* Jugadores sin stats */}
      {sinMeter.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12, color: 'var(--gris-300)', fontSize: 15 }}>
            Sin stats ({sinMeter.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sinMeter.map(j => (
              <button key={j.id} className="btn btn-ghost" onClick={() => openEdit(j)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--lima)', fontWeight: 700 }}>#{j.dorsal}</span>
                {j.nombre}
                {/* Indicador de borrador pendiente */}
                {drafts[j.id] ? (
                  <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>● Borrador</span>
                ) : (
                  <span style={{ color: 'var(--lima)', fontSize: 12 }}>+ Añadir</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jugadores con stats */}
      {yaMetidos.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12, color: 'var(--gris-300)', fontSize: 15 }}>
            Stats registradas ({yaMetidos.length})
          </h3>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>MIN</th>
                  <th>PTS</th>
                  <th>T2</th>
                  <th>T3</th>
                  <th>TL</th>
                  <th>RT</th>
                  <th>AS</th>
                  <th>+/-</th>
                  <th>VAL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {yaMetidos.map(j => {
                  const s = statsMap[j.id]
                  return (
                    <tr key={j.id}>
                      <td style={{ color: 'var(--lima)', fontWeight: 700 }}>{j.dorsal}</td>
                      <td style={{ fontWeight: 600, color: 'var(--blanco)' }}>{j.nombre}</td>
                      <td>{s.min ?? '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--blanco)' }}>{s.pts ?? '—'}</td>
                      <td>{s.t2_anotados ?? '—'}/{s.t2_intentos ?? '—'} <span style={{ fontSize:11, color:'var(--gris-500)' }}>({s.t2_pct != null ? s.t2_pct+'%' : '—'})</span></td>
                      <td>{s.t3_anotados ?? '—'}/{s.t3_intentos ?? '—'} <span style={{ fontSize:11, color:'var(--gris-500)' }}>({s.t3_pct != null ? s.t3_pct+'%' : '—'})</span></td>
                      <td>{s.tl_anotados ?? '—'}/{s.tl_intentos ?? '—'} <span style={{ fontSize:11, color:'var(--gris-500)' }}>({s.tl_pct != null ? s.tl_pct+'%' : '—'})</span></td>
                      <td>{s.rt ?? '—'}</td>
                      <td>{s.as_ ?? '—'}</td>
                      <td style={{ color: s.plus_minus > 0 ? '#4ADE80' : s.plus_minus < 0 ? '#F87171' : 'inherit', fontWeight: 700 }}>
                        {s.plus_minus != null ? (s.plus_minus > 0 ? `+${s.plus_minus}` : s.plus_minus) : '—'}
                      </td>
                      <td style={{ color: 'var(--lima)', fontWeight: 700 }}>{s.val ?? '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j.id)}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de entrada de stats */}
      {editandoId && (() => {
        const jugador = jugadores.find(j => j.id === editandoId)
        const tieneBorrador = !!drafts[editandoId] && !statsMap[editandoId]
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditandoId(null)}>
            <div className="modal" style={{ maxWidth: 900 }}>
              <div className="modal-header">
                <div>
                  <h3>Stats — {jugador?.nombre}</h3>
                  <div style={{ fontSize: 13, color: 'var(--gris-500)', marginTop: 2 }}>
                    #{jugador?.dorsal} · {jugador?.posicion}
                  </div>
                </div>
                <button className="btn-close" onClick={() => setEditandoId(null)}>×</button>
              </div>
              <div className="modal-body">

                {/* Aviso de borrador recuperado */}
                {tieneBorrador && (
                  <div style={{
                    marginBottom: 16, padding: '8px 12px',
                    background: 'var(--negro)', border: '1px solid #F59E0B',
                    borderRadius: 'var(--radius)', fontSize: 12, color: '#F59E0B',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>⚠</span> Borrador recuperado — tus datos no se han perdido.
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: 'auto', fontSize: 11 }}
                      onClick={() => {
                        setDrafts(d => { const next = { ...d }; delete next[editandoId]; return next })
                        setFormStats(emptyStats())
                      }}
                    >
                      Descartar borrador
                    </button>
                  </div>
                )}

                {/* Leyenda desplegable */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLeyendaAbierta(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>{leyendaAbierta ? '▾' : '▸'}</span>
                    Leyenda de abreviaturas
                  </button>
                  {leyendaAbierta && (
                    <div style={{
                      marginTop: 10,
                      background: 'var(--gris-900)',
                      border: '1px solid var(--gris-700)',
                      borderRadius: 'var(--radius)',
                      padding: '14px 18px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                      gap: '7px 20px',
                    }}>
                      {LEYENDA.map(l => (
                        <div key={l.abr} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--lima)', minWidth: 34 }}>{l.abr}</span>
                          <span style={{ fontSize: 12, color: 'var(--gris-300)' }}>{l.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview calculados en tiempo real */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: 'T2%', val: preview.t2pct, pct: true },
                    { label: 'T3%', val: preview.t3pct, pct: true },
                    { label: 'TL%', val: preview.tlpct, pct: true },
                    { label: 'RT',  val: preview.rt,    pct: false },
                  ].map(c => (
                    <div key={c.label} style={{
                      background: 'var(--negro)',
                      border: '1px solid var(--verde)',
                      borderRadius: 'var(--radius)',
                      padding: '8px 16px',
                      textAlign: 'center',
                      minWidth: 72,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--gris-500)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--lima)', fontSize: 20 }}>
                        {c.val}{typeof c.val === 'number' && c.pct ? '%' : ''}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: 'var(--gris-500)' }}>← Calculo automatico</div>
                </div>

                {/* Grid de inputs */}
                <div className="stats-input-grid">
                  {CAMPOS.map(c => (
                    <div key={c.key} className="form-group">
                      <label>{c.label}</label>
                      <input
                        type="number"
                        step={c.tipo === 'decimal' ? '0.1' : '1'}
                        value={formStats[c.key]}
                        onChange={e => setVal(c.key, e.target.value)}
                        placeholder="0"
                        min={c.tipo === 'entero_signed' ? undefined : 0}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => setEditandoId(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <><span className="spinner" /> Guardando...</> : 'Guardar stats'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}