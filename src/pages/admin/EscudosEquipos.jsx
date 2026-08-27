import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function EscudosEquipos() {
  const [escudos, setEscudos] = useState([])
  const [rivales, setRivales] = useState([]) // nombres únicos de rival sacados de Partidos
  const [temporadas, setTemporadas] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal genérico (rivales y el escudo "de siempre" de Unicaja)
  const [modal, setModal] = useState(false)
  const [tituloModal, setTituloModal] = useState('')
  const [nombreObjetivo, setNombreObjetivo] = useState('') // nombre guardado en la tabla
  const [temporadaObjetivo, setTemporadaObjetivo] = useState(null) // null = escudo de siempre
  const [escudoUrl, setEscudoUrl] = useState('')
  const [errorImagen, setErrorImagen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: esc }, { data: partidos }, { data: temps }] = await Promise.all([
      supabase.from('escudos_equipos').select('*').order('nombre'),
      supabase.from('partidos').select('rival'),
      supabase.from('temporadas').select('*').order('id', { ascending: false }),
    ])
    setEscudos(esc || [])
    // Rivales únicos que aparecen en Partidos, ordenados alfabéticamente
    const unicos = [...new Set((partidos || []).map(p => p.rival.trim()))].sort((a, b) => a.localeCompare(b))
    setRivales(unicos)
    setTemporadas(temps || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  // Escudo "de siempre" de un nombre (temporada_id vacío)
  const escudoNormalDe = (nombre) => escudos.find(e => norm(e.nombre) === norm(nombre) && !e.temporada_id)
  // Escudo específico de una temporada para un nombre
  const escudoTemporadaDe = (nombre, temporadaId) =>
    escudos.find(e => norm(e.nombre) === norm(nombre) && e.temporada_id === temporadaId)

  const temporadaActiva = temporadas.find(t => t.activa) || temporadas[0] || null

  const abrirModal = ({ titulo, nombre, temporadaId, existente }) => {
    setTituloModal(titulo)
    setNombreObjetivo(nombre)
    setTemporadaObjetivo(temporadaId)
    setEscudoUrl(existente?.escudo_url || '')
    setErrorImagen(false)
    setEditId(existente?.id || null)
    setModal(true)
  }

  const openParaRival = (nombreRival) => {
    abrirModal({ titulo: `Escudo de ${nombreRival}`, nombre: nombreRival, temporadaId: null, existente: escudoNormalDe(nombreRival) })
  }

  const openUnicajaNormal = () => {
    abrirModal({ titulo: 'Escudo de Unicaja (de siempre)', nombre: 'UNICAJA', temporadaId: null, existente: escudoNormalDe('UNICAJA') })
  }

  const openUnicajaTemporada = () => {
    if (!temporadaActiva) return
    abrirModal({
      titulo: `Escudo especial de Unicaja — ${temporadaActiva.nombre}`,
      nombre: 'UNICAJA',
      temporadaId: temporadaActiva.id,
      existente: escudoTemporadaDe('UNICAJA', temporadaActiva.id),
    })
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `escudos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    setEscudoUrl(publicUrl)
    setErrorImagen(false)
    setUploading(false)
    toast.success('Escudo subido')
  }

  const guardar = async (ev) => {
    ev.preventDefault()
    setSaving(true)
    const payload = {
      nombre: nombreObjetivo.trim(),
      escudo_url: escudoUrl.trim(),
      temporada_id: temporadaObjetivo,
    }
    const { error } = editId
      ? await supabase.from('escudos_equipos').update(payload).eq('id', editId)
      : await supabase.from('escudos_equipos').insert(payload)
    setSaving(false)
    if (error) { toast.error(`Error al guardar: ${error.message || 'error desconocido'}`); return }
    toast.success('Escudo guardado')
    setModal(false)
    load()
  }

  const borrar = async () => {
    if (!editId) return
    if (!confirm('¿Quitar este escudo?')) return
    const { error } = await supabase.from('escudos_equipos').delete().eq('id', editId)
    if (error) { toast.error('Error al borrar'); return }
    toast.success('Escudo quitado')
    setModal(false)
    load()
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const escudoUnicajaTemporada = temporadaActiva ? escudoTemporadaDe('UNICAJA', temporadaActiva.id) : null
  const escudoUnicajaNormal = escudoNormalDe('UNICAJA')
  // Lo que se ve en pantalla ahora mismo para Unicaja: el de la temporada
  // si hay uno, si no el de siempre.
  const escudoUnicajaVisible = escudoUnicajaTemporada || escudoUnicajaNormal

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Escudos de equipos</h1>
          <p>
            Listado de todos los rivales que han aparecido alguna vez en Partidos. Ponle el escudo una vez a
            cada uno y saldrá automático en todos sus partidos, pasados y futuros. Si borras un partido, el
            escudo del rival se queda guardado — no depende de que exista ese partido.
          </p>
        </div>
      </div>

      {/* Fila especial de Unicaja, con opción de escudo normal + escudo solo de esta temporada */}
      <div className="card" style={{ marginBottom: 20, background: 'rgba(157,196,26,.06)', borderColor: 'var(--lima)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {escudoUnicajaVisible
            ? <img src={escudoUnicajaVisible.escudo_url} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gris-800)', border: '1px solid var(--gris-700)' }} />
          }
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: 'var(--lima)' }}>Unicaja</strong>
            <div style={{ fontSize: 12, color: 'var(--gris-500)', marginTop: 2 }}>
              {escudoUnicajaTemporada
                ? `Usando el escudo especial de ${temporadaActiva?.nombre} ahora mismo`
                : 'Usando el escudo de siempre ahora mismo'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {temporadaActiva && (
              <button className="btn btn-sm btn-lima" onClick={openUnicajaTemporada}>
                {escudoUnicajaTemporada ? `✏️ Escudo especial (${temporadaActiva.nombre})` : `+ Escudo especial (${temporadaActiva.nombre})`}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={openUnicajaNormal}>
              {escudoUnicajaNormal ? 'Cambiar escudo de siempre' : '+ Escudo de siempre'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--gris-500)', marginTop: 12, marginBottom: 0 }}>
          Ej. este año podéis poner el escudo especial del 50 aniversario solo para {temporadaActiva?.nombre || 'esta temporada'};
          en cuanto empiece la siguiente, si no le ponéis uno nuevo, se muestra otra vez el de siempre automáticamente.
        </p>
      </div>

      {rivales.length === 0 && (
        <div className="empty-state card" style={{ marginBottom: 20 }}>
          <p>Todavía no hay rivales en Partidos. Añade partidos y aquí podrás ponerles el escudo.</p>
        </div>
      )}
      {rivales.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr><th style={{ width: 50 }}></th><th>Rival</th><th></th></tr>
            </thead>
            <tbody>
              {rivales.map(nombreRival => {
                const e = escudoNormalDe(nombreRival)
                return (
                  <tr key={nombreRival}>
                    <td>
                      {e
                        ? <img src={e.escudo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gris-800)', border: '1px solid var(--gris-700)' }} />
                      }
                    </td>
                    <td>{nombreRival}</td>
                    <td style={{ width: 140, textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openParaRival(nombreRival)}>
                        {e ? 'Cambiar escudo' : '+ Añadir escudo'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{tituloModal}</h3>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={guardar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  {escudoUrl && !errorImagen
                    ? <img
                        src={escudoUrl}
                        alt="preview"
                        onLoad={() => setErrorImagen(false)}
                        onError={() => setErrorImagen(true)}
                        style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'contain', border: '3px solid var(--verde)', background: 'var(--gris-800)' }}
                      />
                    : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gris-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--gris-500)' }}>🛡️</div>
                  }
                  <p style={{ fontSize: 12.5, color: 'var(--gris-500)', margin: 0 }}>
                    Pega el link <strong>directo a la imagen</strong> del escudo (tiene que terminar en .png, .svg
                    o .jpg — no el link a la página donde la viste). Fondo transparente si puede ser.
                  </p>
                </div>
                {escudoUrl && errorImagen && (
                  <p style={{ fontSize: 12.5, color: '#e8917f', marginTop: 0, marginBottom: 16 }}>
                    ⚠️ Esa URL no carga como imagen. Seguramente pegaste el link de la página web en vez del
                    link directo al archivo — en la web del logo, clic derecho sobre la imagen → "Copiar
                    dirección de la imagen".
                  </p>
                )}

                <div className="form-group">
                  <label>URL del escudo *</label>
                  <input value={escudoUrl} onChange={e => { setEscudoUrl(e.target.value); setErrorImagen(false) }} required placeholder="https://..." />
                </div>

                <div className="form-group">
                  <label>...o súbelo directamente desde tu ordenador</label>
                  <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                  {uploading && <p style={{ fontSize: 12.5, color: 'var(--gris-500)', marginTop: 6 }}>Subiendo...</p>}
                </div>

                <div className="form-actions">
                  {editId && (
                    <button type="button" className="btn btn-danger" onClick={borrar} style={{ marginRight: 'auto' }}>
                      Quitar escudo
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || uploading}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
