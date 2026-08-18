import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const emptyForm = { nombre: '', entrenador: '', entrenador_foto_url: '' }

// Mismo mapeo de clases visuales que se usa en el resto de la web para
// pintar cada competición con su color.
const BADGE_CLASS = { ACB: 'acb', BCL: 'bcl', 'Copa del Rey': 'copa', Supercopa: 'super', Intercontinental: 'inter' }
const BADGE_ABREV = { ACB: 'ACB', BCL: 'BCL', 'Copa del Rey': 'COPA', Supercopa: 'SUPER', Intercontinental: 'INTER' }

// Autoformatea lo que se va escribiendo al formato "20xx/xx": el usuario
// solo teclea los 4 dígitos del año de inicio (ej. 2027) y se le añade
// automáticamente "/28".
function formatTemporadaInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length < 4) return digits
  const inicio = Number(digits)
  const fin = (inicio + 1) % 100
  return `${digits}/${String(fin).padStart(2, '0')}`
}

export default function Temporadas() {
  const [temporadas, setTemporadas] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [mismoEntrenador, setMismoEntrenador] = useState(false)
  const [copiarPlantilla, setCopiarPlantilla] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editUploading, setEditUploading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // temporada a borrar
  const [deleting, setDeleting] = useState(false)
  const [competiciones, setCompeticiones] = useState([])
  const [titulosPorTemporada, setTitulosPorTemporada] = useState({}) // { temporada_id: { competicion_id: true/false } }
  const [tooltip, setTooltip] = useState(null) // { x, y, texto }

  const mostrarTooltip = (e, texto) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 8, texto })
  }
  const ocultarTooltip = () => setTooltip(null)

  const load = async () => {
    const [{ data }, { data: comps }, { data: tits }] = await Promise.all([
      supabase.from('temporadas').select('*').order('id', { ascending: false }),
      supabase.from('competiciones').select('*').order('id'),
      supabase.from('titulos').select('*'),
    ])
    setTemporadas(data || [])
    setCompeticiones(comps || [])
    const map = {}
    ;(tits || []).forEach(t => {
      if (!map[t.temporada_id]) map[t.temporada_id] = {}
      map[t.temporada_id][t.competicion_id] = t.conseguido
    })
    setTitulosPorTemporada(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // La temporada más reciente ya creada (para ofrecer "mismo entrenador" /
  // "copiar plantilla" al dar de alta la siguiente)
  const temporadaAnterior = temporadas[0]

  const uploadFoto = async (file) => {
    const ext = file.name.split('.').pop()
    const path = `entrenadores/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); return null }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    return publicUrl
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFoto(file)
    if (url) { setForm(f => ({ ...f, entrenador_foto_url: url })); toast.success('Foto subida') }
    setUploading(false)
  }

  const handleEditUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEditUploading(true)
    const url = await uploadFoto(file)
    if (url) { setEditForm(f => ({ ...f, entrenador_foto_url: url })); toast.success('Foto subida') }
    setEditUploading(false)
  }

  const toggleMismoEntrenador = (checked) => {
    setMismoEntrenador(checked)
    if (checked && temporadaAnterior) {
      setForm(f => ({
        ...f,
        entrenador: temporadaAnterior.entrenador || '',
        entrenador_foto_url: temporadaAnterior.entrenador_foto_url || '',
      }))
    } else {
      setForm(f => ({ ...f, entrenador: '', entrenador_foto_url: '' }))
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)

    const { data: nueva, error } = await supabase.from('temporadas').insert({
      nombre: form.nombre.trim(),
      entrenador: form.entrenador.trim() || null,
      entrenador_foto_url: form.entrenador_foto_url || null,
    }).select().single()

    if (error) { toast.error('Error al crear temporada'); setSaving(false); return }

    // Copiar la plantilla activa de la temporada anterior, si se ha pedido
    if (copiarPlantilla && temporadaAnterior) {
      const { data: jugadoresAnteriores } = await supabase
        .from('jugadores')
        .select('nombre, dorsal, posicion, nacionalidad, foto_url, es_cupo')
        .eq('temporada_id', temporadaAnterior.id)
        .eq('activo', true)

      if (jugadoresAnteriores?.length) {
        const nuevosJugadores = jugadoresAnteriores.map(j => ({
          ...j,
          temporada_id: nueva.id,
          activo: true,
        }))
        const { error: errJug } = await supabase.from('jugadores').insert(nuevosJugadores)
        if (errJug) {
          toast.error('Temporada creada, pero hubo un error copiando la plantilla')
        } else {
          toast.success(`Temporada creada con ${nuevosJugadores.length} jugadores copiados`)
        }
      } else {
        toast.success('Temporada creada')
      }
    } else {
      toast.success('Temporada creada')
    }

    setSaving(false)
    setForm(emptyForm)
    setMismoEntrenador(false)
    setCopiarPlantilla(false)
    load()
  }

  const openEdit = (t) => {
    setEditId(t.id)
    setEditForm({ nombre: t.nombre, entrenador: t.entrenador || '', entrenador_foto_url: t.entrenador_foto_url || '' })
    setEditModal(true)
  }

  const toggleTitulo = async (temporada, competicionId) => {
    if (!temporada.activa) return // solo se puede tocar en la temporada activa
    const actual = titulosPorTemporada[temporada.id]?.[competicionId]
    const nuevoValor = !actual
    setTitulosPorTemporada(m => ({ ...m, [temporada.id]: { ...m[temporada.id], [competicionId]: nuevoValor } })) // optimista
    const { error } = await supabase
      .from('titulos')
      .upsert({ temporada_id: temporada.id, competicion_id: competicionId, conseguido: nuevoValor }, { onConflict: 'temporada_id,competicion_id' })
    if (error) {
      toast.error('Error al guardar el título')
      setTitulosPorTemporada(m => ({ ...m, [temporada.id]: { ...m[temporada.id], [competicionId]: actual } })) // revertir
    }
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    if (!editForm.nombre.trim()) return
    setEditSaving(true)
    const { error } = await supabase.from('temporadas').update({
      nombre: editForm.nombre.trim(),
      entrenador: editForm.entrenador.trim() || null,
      entrenador_foto_url: editForm.entrenador_foto_url || null,
    }).eq('id', editId)
    setEditSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Temporada actualizada')
    setEditModal(false)
    load()
  }

  const setActiva = async (id) => {
    await supabase.from('temporadas').update({ activa: false }).neq('id', id)
    await supabase.from('temporadas').update({ activa: true }).eq('id', id)
    toast.success('Temporada activa actualizada')
    load()
  }

  const handleDelete = (t) => setConfirmDelete(t)

  const ejecutarDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const { error } = await supabase.from('temporadas').delete().eq('id', confirmDelete.id)
    setDeleting(false)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Temporada eliminada')
    setConfirmDelete(null)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {form.entrenador_foto_url
              ? <img src={form.entrenador_foto_url} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--verde)' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--gris-500)' }}>👤</div>
            }
            <div>
              <label className="btn btn-ghost btn-sm" style={{ cursor: mismoEntrenador ? 'not-allowed' : 'pointer', opacity: mismoEntrenador ? 0.5 : 1 }}>
                {uploading ? 'Subiendo...' : 'Foto del entrenador'}
                <input type="file" accept="image/*" onChange={handleUpload} disabled={mismoEntrenador} style={{ display: 'none' }} />
              </label>
              {form.entrenador_foto_url && !mismoEntrenador && (
                <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => setForm(f => ({ ...f, entrenador_foto_url: '' }))}>Quitar</button>
              )}
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Temporada *</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: formatTemporadaInput(e.target.value) }))}
                placeholder="ej: escribe 2027 → 2027/28"
                required
              />
            </div>
            <div className="form-group">
              <label>Entrenador</label>
              <input
                value={form.entrenador}
                onChange={e => setForm(f => ({ ...f, entrenador: e.target.value }))}
                placeholder="ej: Ibon Navarro"
                disabled={mismoEntrenador}
              />
            </div>
          </div>

          {temporadaAnterior && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: '12px 14px', background: 'var(--negro)', border: '1px solid var(--gris-700)', borderRadius: 'var(--radius)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gris-300)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={mismoEntrenador}
                  onChange={e => toggleMismoEntrenador(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--verde)', cursor: 'pointer' }}
                />
                ¿Repite el mismo entrenador que en {temporadaAnterior.nombre}
                {temporadaAnterior.entrenador ? ` (${temporadaAnterior.entrenador})` : ''}?
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gris-300)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={copiarPlantilla}
                  onChange={e => setCopiarPlantilla(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--verde)', cursor: 'pointer' }}
                />
                Copiar la plantilla de jugadores de {temporadaAnterior.nombre}
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? <><span className="spinner" /> Creando...</> : '+ Crear'}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Entrenador</th>
              <th>Temporada</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {temporadas.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {t.entrenador_foto_url
                      ? <img src={t.entrenador_foto_url} alt={t.entrenador || ''} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gris-700)' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--gris-500)' }}>👤</div>
                    }
                  </div>
                  {competiciones.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {competiciones.map(c => {
                        const conseguido = !!titulosPorTemporada[t.id]?.[c.id]
                        const cls = BADGE_CLASS[c.nombre] || 'acb'
                        const texto = t.activa
                          ? `${c.nombre}${conseguido ? ' — conseguida' : ''}`
                          : `${c.nombre} — solo editable en la temporada activa`
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleTitulo(t, c.id)}
                            onMouseEnter={(e) => mostrarTooltip(e, texto)}
                            onMouseLeave={ocultarTooltip}
                            className={`titulo-tag titulo-tag-${cls}`}
                            style={{
                              cursor: t.activa ? 'pointer' : 'not-allowed',
                              opacity: conseguido ? 1 : 0.3,
                            }}
                          >
                            {BADGE_ABREV[c.nombre] || c.nombre}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{t.nombre}</td>
                <td style={{ color: 'var(--gris-300)' }}>{t.entrenador || '—'}</td>
                <td>
                  {t.activa
                    ? <span className="badge badge-local">Activa</span>
                    : <span className="badge badge-visit">Inactiva</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Editar</button>
                    {!t.activa && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setActiva(t.id)}>
                          Marcar como activa
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Editar temporada</h3>
              <button className="btn-close" onClick={() => setEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSave}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  {editForm.entrenador_foto_url
                    ? <img src={editForm.entrenador_foto_url} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--verde)' }} />
                    : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--gris-500)' }}>👤</div>
                  }
                  <div>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                      {editUploading ? 'Subiendo...' : 'Foto del entrenador'}
                      <input type="file" accept="image/*" onChange={handleEditUpload} style={{ display: 'none' }} />
                    </label>
                    {editForm.entrenador_foto_url && (
                      <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: 8 }} onClick={() => setEditForm(f => ({ ...f, entrenador_foto_url: '' }))}>Quitar</button>
                    )}
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Temporada *</label>
                    <input
                      value={editForm.nombre}
                      onChange={e => setEditForm(f => ({ ...f, nombre: formatTemporadaInput(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Entrenador</label>
                    <input value={editForm.entrenador} onChange={e => setEditForm(f => ({ ...f, entrenador: e.target.value }))} placeholder="ej: Ibon Navarro" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={editSaving || editUploading}>
                    {editSaving ? <><span className="spinner" /> Guardando...</> : 'Guardar'}
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
              <h3>Eliminar temporada</h3>
              <button className="btn-close" onClick={() => setConfirmDelete(null)} disabled={deleting}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>
                ¿Eliminar la temporada <strong style={{ color: 'var(--blanco)' }}>{confirmDelete.nombre}</strong>?
              </p>
              <div style={{
                marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(230, 80, 60, 0.12)', border: '1px solid rgba(230, 80, 60, 0.35)',
                fontSize: 13.5, color: '#e8917f', lineHeight: 1.6,
              }}>
                Se eliminarán también todos sus jugadores, partidos y estadísticas. Esta acción no se puede deshacer.
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

      {tooltip && createPortal(
        <div className="floating-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.texto}
        </div>,
        document.body
      )}
    </div>
  )
}
