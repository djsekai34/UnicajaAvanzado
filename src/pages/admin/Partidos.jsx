import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const emptyForm = {
  fecha: '', rival: '', es_local: 'true',
  competicion_id: '', puntos_unicaja: '', puntos_rival: '', temporada_id: ''
}

export default function Partidos() {
  const [partidos, setPartidos] = useState([])
  const [competiciones, setCompeticiones] = useState([])
  const [temporadas, setTemporadas] = useState([])
  const [filtroTemp, setFiltroTemp] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async (tid) => {
    const { data: temps } = await supabase.from('temporadas').select('*').order('id', { ascending: false })
    const { data: comps } = await supabase.from('competiciones').select('*').order('id')
    setTemporadas(temps || [])
    setCompeticiones(comps || [])
    const activa = temps?.find(t => t.activa)
    const useTid = tid || filtroTemp || activa?.id || temps?.[0]?.id
    setFiltroTemp(String(useTid))
    if (useTid) {
      const { data } = await supabase
        .from('partidos')
        .select('*, competiciones(nombre)')
        .eq('temporada_id', useTid)
        .order('fecha', { ascending: false })
      setPartidos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleFiltro = (tid) => {
    setFiltroTemp(tid)
    load(tid)
  }

  const openCreate = () => {
    const tid = filtroTemp || String(temporadas.find(t => t.activa)?.id || temporadas[0]?.id || '')
    setForm({ ...emptyForm, temporada_id: tid, competicion_id: String(competiciones[0]?.id || '') })
    setEditId(null)
    setModal(true)
  }

  const openEdit = (p) => {
    setForm({
      fecha: p.fecha,
      rival: p.rival,
      es_local: String(p.es_local),
      competicion_id: String(p.competicion_id),
      puntos_unicaja: p.puntos_unicaja ?? '',
      puntos_rival: p.puntos_rival ?? '',
      temporada_id: String(p.temporada_id),
    })
    setEditId(p.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      fecha: form.fecha,
      rival: form.rival.trim(),
      es_local: form.es_local === 'true',
      competicion_id: Number(form.competicion_id),
      temporada_id: Number(form.temporada_id),
      puntos_unicaja: form.puntos_unicaja !== '' ? Number(form.puntos_unicaja) : null,
      puntos_rival: form.puntos_rival !== '' ? Number(form.puntos_rival) : null,
    }
    const { error } = editId
      ? await supabase.from('partidos').update(payload).eq('id', editId)
      : await supabase.from('partidos').insert(payload)

    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(editId ? 'Partido actualizado' : 'Partido añadido')
    setModal(false)
    load(filtroTemp)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido y todas sus stats?')) return
    await supabase.from('partidos').delete().eq('id', id)
    toast.success('Partido eliminado')
    load(filtroTemp)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const badgeClass = (nombre) => {
    const map = { ACB: 'acb', BCL: 'bcl', 'Copa del Rey': 'copa', Supercopa: 'super', Intercontinental: 'inter' }
    return `badge badge-${map[nombre] || 'acb'}`
  }

  const resultado = (p) => {
    if (p.puntos_unicaja == null) return '—'
    const ganado = p.puntos_unicaja > p.puntos_rival
    return (
      <span style={{ color: ganado ? '#4ADE80' : '#F87171', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {p.puntos_unicaja} - {p.puntos_rival}
      </span>
    )
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Partidos</h2>
          <p>Gestión de partidos y estadísticas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo partido</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <select value={filtroTemp} onChange={e => handleFiltro(e.target.value)} style={{ maxWidth: 200 }}>
          {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' ★' : ''}</option>)}
        </select>
      </div>

      {partidos.length === 0 ? (
        <div className="empty-state card">
          <p>No hay partidos en esta temporada.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>+ Nuevo partido</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rival</th>
                <th>Competición</th>
                <th>Condición</th>
                <th>Resultado</th>
                <th>Stats</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partidos.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--blanco)' }}>{p.rival}</td>
                  <td><span className={badgeClass(p.competiciones?.nombre)}>{p.competiciones?.nombre}</span></td>
                  <td><span className={`badge ${p.es_local ? 'badge-local' : 'badge-visit'}`}>{p.es_local ? 'Local' : 'Visitante'}</span></td>
                  <td>{resultado(p)}</td>
                  <td>
                    <Link to={`/admin/partidos/${p.id}/stats`} className="btn btn-lima btn-sm">
                      Meter stats
                    </Link>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar partido' : 'Nuevo partido'}</h3>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Temporada *</label>
                    <select value={form.temporada_id} onChange={e => set('temporada_id', e.target.value)} required>
                      {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Competición *</label>
                    <select value={form.competicion_id} onChange={e => set('competicion_id', e.target.value)} required>
                      <option value="">— Selecciona —</option>
                      {competiciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Condición *</label>
                    <select value={form.es_local} onChange={e => set('es_local', e.target.value)}>
                      <option value="true">Local</option>
                      <option value="false">Visitante</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Rival *</label>
                    <input value={form.rival} onChange={e => set('rival', e.target.value)} required placeholder="ej: Real Madrid" />
                  </div>
                  <div className="form-group">
                    <label>Puntos Unicaja</label>
                    <input type="number" value={form.puntos_unicaja} onChange={e => set('puntos_unicaja', e.target.value)} placeholder="85" min={0} />
                  </div>
                  <div className="form-group">
                    <label>Puntos rival</label>
                    <input type="number" value={form.puntos_rival} onChange={e => set('puntos_rival', e.target.value)} placeholder="80" min={0} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> Guardando...</> : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
