import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const POSICIONES = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot']
const emptyForm = { nombre: '', dorsal: '', posicion: 'Base', nacionalidad: '', activo: true, foto_url: '', es_cupo: false }

export default function Jugadores() {
  const [jugadores, setJugadores] = useState([])
  const [temporadas, setTemporadas] = useState([])
  const [temporadaId, setTemporadaId] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmData, setConfirmData] = useState(null) // { tipo: 'baja' | 'borrar', jugador, count }
  const [confirmLoading, setConfirmLoading] = useState(false)

  const load = async () => {
    const { data: temps } = await supabase.from('temporadas').select('*').order('id', { ascending: false })
    setTemporadas(temps || [])
    const activa = temps?.find(t => t.activa)
    const tid = temporadaId || activa?.id || temps?.[0]?.id
    if (tid) {
      setTemporadaId(String(tid))
      const { data } = await supabase.from('jugadores').select('*').eq('temporada_id', tid).order('dorsal')
      setJugadores(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleTemporadaChange = async (tid) => {
    setTemporadaId(tid)
    const { data } = await supabase.from('jugadores').select('*').eq('temporada_id', tid).order('dorsal')
    setJugadores(data || [])
  }

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = (j) => {
    setForm({ nombre: j.nombre, dorsal: j.dorsal != null ? String(j.dorsal) : '', posicion: j.posicion || 'Base', nacionalidad: j.nacionalidad || '', activo: j.activo, foto_url: j.foto_url || '', es_cupo: !!j.es_cupo })
    setEditId(j.id)
    setModal(true)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `jugadores/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    set('foto_url', publicUrl)
    setUploading(false)
    toast.success('Foto subida')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!temporadaId) { toast.error('Selecciona una temporada primero'); return }
    setSaving(true)
    const payload = {
      nombre: form.nombre.trim(),
      dorsal: form.dorsal ? Number(form.dorsal) : null,
      posicion: form.posicion,
      nacionalidad: form.nacionalidad.trim(),
      activo: form.activo,
      temporada_id: Number(temporadaId),
      foto_url: form.foto_url || null,
      es_cupo: form.es_cupo,
    }
    const { error } = editId
      ? await supabase.from('jugadores').update(payload).eq('id', editId)
      : await supabase.from('jugadores').insert(payload)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(editId ? 'Jugador actualizado' : 'Jugador añadido')
    setModal(false)
    load()
  }

  const reactivar = async (j) => {
    await supabase.from('jugadores').update({ activo: true }).eq('id', j.id)
    toast.success(`${j.nombre} vuelve a la plantilla`)
    load()
  }

  // Único botón de baja/borrado: si tiene partidos, no se puede perder ese
  // historial → se marca como que ya no pertenece a la plantilla. Si no
  // tiene ninguno, se borra de verdad. En ambos casos se confirma con
  // el modal propio (nunca con el confirm() nativo del navegador).
  const handleDelete = async (j) => {
    const { count, error: countError } = await supabase
      .from('stats')
      .select('id', { count: 'exact', head: true })
      .eq('jugador_id', j.id)

    if (countError) { toast.error('Error al comprobar sus partidos'); return }

    setConfirmData({ tipo: count > 0 ? 'baja' : 'borrar', jugador: j, count })
  }

  const ejecutarConfirmacion = async () => {
    if (!confirmData) return
    const { tipo, jugador } = confirmData
    setConfirmLoading(true)

    if (tipo === 'baja') {
      await supabase.from('jugadores').update({ activo: false }).eq('id', jugador.id)
      toast.success(`${jugador.nombre} ya no pertenece a la plantilla`)
    } else {
      const { error } = await supabase.from('jugadores').delete().eq('id', jugador.id)
      if (error) { toast.error('Error al eliminar'); setConfirmLoading(false); return }
      toast.success('Jugador eliminado')
    }

    setConfirmLoading(false)
    setConfirmData(null)
    load()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const activos = jugadores.filter(j => j.activo)
  const bajas = jugadores.filter(j => !j.activo)
  const temporadaActual = temporadas.find(t => String(t.id) === String(temporadaId))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Jugadores</h2>
          <p>Plantilla por temporada</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Añadir jugador</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <select value={temporadaId} onChange={e => handleTemporadaChange(e.target.value)} style={{ maxWidth: 200 }}>
          {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' ★' : ''}</option>)}
        </select>
      </div>

      {activos.length === 0 ? (
        <div className="empty-state card">
          <p>No hay jugadores activos en esta temporada.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>+ Añadir jugador</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Foto</th><th>#</th><th>Nombre</th><th>Posición</th><th>Nacionalidad</th><th></th>
              </tr>
            </thead>
            <tbody>
              {activos.map(j => (
                <tr key={j.id}>
                  <td>
                    {j.foto_url
                      ? <img src={j.foto_url} alt={j.nombre} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gris-700)' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--verde)' }}>{j.dorsal || '?'}</div>
                    }
                  </td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--lima)', fontSize: 18 }}>{j.dorsal ?? '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--blanco)' }}>
                    {j.nombre}
                    {j.es_cupo && <span className="badge badge-super" style={{ marginLeft: 8 }}>Cupo</span>}
                  </td>
                  <td><span className="pos-pill">{j.posicion}</span></td>
                  <td>{j.nacionalidad || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bajas.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--blanco)' }}>
              Jugadores que estuvieron en la plantilla{temporadaActual ? ` · ${temporadaActual.nombre}` : ''}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--gris-500)', marginTop: 2 }}>
              Ya no forman parte del equipo, pero sus estadísticas se conservan.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th><th>#</th><th>Nombre</th><th>Posición</th><th>Nacionalidad</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bajas.map(j => (
                  <tr key={j.id} style={{ opacity: 0.65 }}>
                    <td>
                      {j.foto_url
                        ? <img src={j.foto_url} alt={j.nombre} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gris-700)' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gris-500)' }}>{j.dorsal || '?'}</div>
                      }
                    </td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gris-500)', fontSize: 18 }}>{j.dorsal ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--gris-300)' }}>
                      {j.nombre}
                      {j.es_cupo && <span className="badge badge-super" style={{ marginLeft: 8 }}>Cupo</span>}
                    </td>
                    <td><span className="pos-pill">{j.posicion}</span></td>
                    <td>{j.nacionalidad || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>Editar</button>
                        <button className="btn btn-primary btn-sm" onClick={() => reactivar(j)}>Reactivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar jugador' : 'Nuevo jugador'}</h3>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                {/* Preview foto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  {form.foto_url
                    ? <img src={form.foto_url} alt="preview" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--verde)' }} />
                    : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--gris-500)' }}>👤</div>
                  }
                  <div>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {uploading ? 'Subiendo...' : 'Subir foto'}
                      <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                    {form.foto_url && (
                      <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => set('foto_url', '')}>Quitar</button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--gris-500)', marginTop: 6 }}>JPG, PNG · recomendado 200×200px</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group full">
                    <label>Nombre completo *</label>
                    <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="ej: Carlos Suárez" />
                  </div>
                  <div className="form-group">
                    <label>Dorsal</label>
                    <input type="number" value={form.dorsal} onChange={e => set('dorsal', e.target.value)} placeholder="14" min={0} max={99} />
                  </div>
                  <div className="form-group">
                    <label>Posición</label>
                    <select value={form.posicion} onChange={e => set('posicion', e.target.value)}>
                      {POSICIONES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nacionalidad</label>
                    <input value={form.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} placeholder="Española" />
                  </div>
                  <div className="form-group">
                    <label>&nbsp;</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--gris-300)', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={form.es_cupo}
                        onChange={e => set('es_cupo', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--verde)', cursor: 'pointer' }}
                      />
                      Es jugador de cupo
                    </label>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                    {saving ? <><span className="spinner" /> Guardando...</> : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {confirmData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !confirmLoading && setConfirmData(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{confirmData.tipo === 'baja' ? 'Quitar de la plantilla' : 'Eliminar jugador'}</h3>
              <button className="btn-close" onClick={() => setConfirmData(null)} disabled={confirmLoading}>×</button>
            </div>
            <div className="modal-body">
              {confirmData.tipo === 'baja' ? (
                <>
                  <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--blanco)' }}>{confirmData.jugador.nombre}</strong> tiene{' '}
                    <strong style={{ color: 'var(--blanco)' }}>{confirmData.count}</strong> partido{confirmData.count === 1 ? '' : 's'} registrado{confirmData.count === 1 ? '' : 's'} esta temporada.
                  </p>
                  <div style={{
                    marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius)',
                    background: 'rgba(230, 80, 60, 0.12)', border: '1px solid rgba(230, 80, 60, 0.35)',
                    fontSize: 13.5, color: '#e8917f', lineHeight: 1.6,
                  }}>
                    El jugador ha jugado partidos, así que no se puede eliminar sin perder ese historial. Pasará a "Jugadores que estuvieron en la plantilla" y sus {confirmData.count} partido{confirmData.count === 1 ? '' : 's'} jugado{confirmData.count === 1 ? '' : 's'} con el club en la temporada {temporadaActual?.nombre} seguirán visibles en sus estadísticas.
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>
                  ¿Eliminar a <strong style={{ color: 'var(--blanco)' }}>{confirmData.jugador.nombre}</strong>? No tiene partidos registrados, así que se borrará por completo. Esta acción no se puede deshacer.
                </p>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmData(null)} disabled={confirmLoading}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={ejecutarConfirmacion} disabled={confirmLoading}>
                  {confirmLoading ? <><span className="spinner" /> Procesando...</> : (confirmData.tipo === 'baja' ? 'Quitar de la plantilla' : 'Eliminar definitivamente')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
