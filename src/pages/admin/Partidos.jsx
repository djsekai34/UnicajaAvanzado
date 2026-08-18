import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const emptyForm = {
  fecha: '', rival: '', es_local: 'true', jornada: '',
  competicion_id: '', puntos_unicaja: '', puntos_rival: '', temporada_id: ''
}

export default function Partidos() {
  const [partidos, setPartidos] = useState([])
  const [competiciones, setCompeticiones] = useState([])
  const [temporadas, setTemporadas] = useState([])
  const [filtroTemp, setFiltroTemp] = useState('')
  const [filtroComp, setFiltroComp] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null) // partido a borrar
  const [deleting, setDeleting] = useState(false)

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
        .order('fecha', { ascending: true })
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
      es_local: p.es_local === null ? 'neutral' : String(p.es_local),
      jornada: p.jornada ?? '',
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
      es_local: form.es_local === 'neutral' ? null : form.es_local === 'true',
      jornada: form.jornada.trim() ? form.jornada.trim() : null,
      competicion_id: Number(form.competicion_id),
      temporada_id: Number(form.temporada_id),
      puntos_unicaja: form.puntos_unicaja !== '' ? Number(form.puntos_unicaja) : null,
      puntos_rival: form.puntos_rival !== '' ? Number(form.puntos_rival) : null,
    }
    const { error } = editId
      ? await supabase.from('partidos').update(payload).eq('id', editId)
      : await supabase.from('partidos').insert(payload)

    setSaving(false)
    if (error) { toast.error(`Error al guardar: ${error.message || 'error desconocido'}`); return }
    toast.success(editId ? 'Partido actualizado' : 'Partido añadido')
    setModal(false)
    load(filtroTemp)
  }

  const handleDelete = (p) => setConfirmDelete(p)

  const ejecutarDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const { error } = await supabase.from('partidos').delete().eq('id', confirmDelete.id)
    setDeleting(false)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Partido eliminado')
    setConfirmDelete(null)
    load(filtroTemp)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const partidosFiltrados = filtroComp
    ? partidos.filter(p => String(p.competicion_id) === filtroComp)
    : partidos

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

      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
        <select value={filtroTemp} onChange={e => handleFiltro(e.target.value)} style={{ maxWidth: 200 }}>
          {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' ★' : ''}</option>)}
        </select>
        <select value={filtroComp} onChange={e => setFiltroComp(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Todas las competiciones</option>
          {competiciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {partidosFiltrados.length === 0 ? (
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
              {partidosFiltrados.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--blanco)' }}>{p.rival}</td>
                  <td><span className={badgeClass(p.competiciones?.nombre)}>{p.competiciones?.nombre}</span></td>
                  <td><span className={`badge ${p.es_local === null ? 'badge-neutral' : p.es_local ? 'badge-local' : 'badge-visit'}`}>{p.es_local === null ? 'Sede neutra' : p.es_local ? 'Local' : 'Visitante'}</span></td>
                  <td>{resultado(p)}</td>
                  <td>
                    <Link to={`/admin/partidos/${p.id}/stats`} className="btn btn-lima btn-sm">
                      Meter stats
                    </Link>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>Borrar</button>
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
                      <option value="neutral">Sede neutra</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Rival *</label>
                    <input value={form.rival} onChange={e => set('rival', e.target.value)} required placeholder="ej: Real Madrid" />
                  </div>
                  <div className="form-group">
                    <label>Jornada / fase</label>
                    <input
                      value={form.jornada}
                      onChange={e => set('jornada', e.target.value)}
                      placeholder="ej: 1, Cuartos de final, Semifinal..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Puntos Unicaja</label>
                    <input value={editId ? (form.puntos_unicaja !== '' ? form.puntos_unicaja : '— (aún sin stats)') : 'Calculo automático'} disabled />
                  </div>
                  <div className="form-group">
                    <label>Puntos rival</label>
                    <input type="number" value={form.puntos_rival} onChange={e => set('puntos_rival', e.target.value)} placeholder="80" min={0} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--gris-500)', marginTop: 10, marginBottom: 20 }}>
                  Los puntos del Unicaja se calculan automaticamente sumando los puntos de cada jugador cuando metas sus estadísticas del partido.
                </p>
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

      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !deleting && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Eliminar partido</h3>
              <button className="btn-close" onClick={() => setConfirmDelete(null)} disabled={deleting}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>
                ¿Eliminar el partido contra <strong style={{ color: 'var(--blanco)' }}>{confirmDelete.rival}</strong>
                {confirmDelete.fecha ? ` (${new Date(confirmDelete.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}?
              </p>
              <div style={{
                marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(230, 80, 60, 0.12)', border: '1px solid rgba(230, 80, 60, 0.35)',
                fontSize: 13.5, color: '#e8917f', lineHeight: 1.6,
              }}>
                Se eliminarán también todas las estadísticas de los jugadores en este partido. Esta acción no se puede deshacer.
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={ejecutarDelete} disabled={deleting}>
                  {deleting ? <><span className="spinner" /> Eliminando...</> : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
