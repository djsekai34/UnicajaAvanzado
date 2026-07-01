import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Temporadas() {
  const [temporadas, setTemporadas] = useState([])
  const [form, setForm] = useState({ nombre: '', entrenador: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('temporadas').select('*').order('id', { ascending: false })
    setTemporadas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error } = await supabase.from('temporadas').insert({
      nombre: form.nombre.trim(),
      entrenador: form.entrenador.trim() || null
    })
    setSaving(false)
    if (error) { toast.error('Error al crear temporada'); return }
    toast.success('Temporada creada')
    setForm({ nombre: '', entrenador: '' })
    load()
  }

  const setActiva = async (id) => {
    await supabase.from('temporadas').update({ activa: false }).neq('id', id)
    await supabase.from('temporadas').update({ activa: true }).eq('id', id)
    toast.success('Temporada activa actualizada')
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta temporada? Se eliminarán también todos sus jugadores y partidos.')) return
    const { error } = await supabase.from('temporadas').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Temporada eliminada')
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Temporadas</h2>
          <p>Gestiona las temporadas del club</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Nueva temporada</h3>
        <form onSubmit={handleCreate}>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Temporada *</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="ej: 2027/28"
                required
              />
            </div>
            <div className="form-group">
              <label>Entrenador</label>
              <input
                value={form.entrenador}
                onChange={e => setForm(f => ({ ...f, entrenador: e.target.value }))}
                placeholder="ej: Ibon Navarro"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Creando...</> : '+ Crear'}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Temporada</th>
              <th>Entrenador</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {temporadas.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{t.nombre}</td>
                <td style={{ color: 'var(--gris-300)' }}>{t.entrenador || '—'}</td>
                <td>
                  {t.activa
                    ? <span className="badge badge-local">Activa</span>
                    : <span className="badge badge-visit">Inactiva</span>}
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {!t.activa && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setActiva(t.id)}>
                        Marcar como activa
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
