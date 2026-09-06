import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import logoPorDefecto from '../../assets/Unicaja.png'

export default function IconoPagina() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('configuracion').select('logo_url').eq('id', 1).single()
    setLogoUrl(data?.logo_url || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const guardarUrl = async (nuevaUrl) => {
    const { error } = await supabase.from('configuracion').update({ logo_url: nuevaUrl, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) { toast.error(`Error al guardar: ${error.message || 'error desconocido'}`); return false }
    setLogoUrl(nuevaUrl)
    return true
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `configuracion/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir la imagen'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    const ok = await guardarUrl(publicUrl)
    setUploading(false)
    if (ok) toast.success('Icono actualizado en toda la web')
  }

  const restaurarPorDefecto = async () => {
    const ok = await guardarUrl(null)
    setConfirmarRestaurar(false)
    if (ok) toast.success('Restaurado el icono por defecto')
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Icono de la pagina web</h1>
          <p>
            El logo que subas aquí sustituye al de siempre en toda la web (cabecera, panel admin, login) y en
            el icono de la pestaña del navegador. Usa una imagen con fondo transparente si puede ser (PNG).
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 160, height: 160, borderRadius: 16, background: '#0D0D0D',
            border: '1px solid var(--gris-700)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16,
          }}>
            <img
              src={logoUrl || logoPorDefecto}
              alt="Icono actual"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--gris-500)', textAlign: 'center', margin: 0 }}>
            {logoUrl ? 'Icono personalizado en uso' : 'Usando el icono por defecto (no has subido ninguno todavía)'}
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <label className="btn btn-primary" style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Subiendo...' : (logoUrl ? 'Cambiar icono' : 'Subir icono')}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
            {logoUrl && (
              <button className="btn btn-ghost" onClick={() => setConfirmarRestaurar(true)} disabled={uploading}>
                Restaurar el de siempre
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmarRestaurar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmarRestaurar(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Restaurar el icono por defecto</h3>
              <button className="btn-close" onClick={() => setConfirmarRestaurar(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gris-300)', lineHeight: 1.6 }}>
                Se dejará de usar el icono personalizado y volverá el de siempre en toda la web (cabecera, panel
                admin, login y la pestaña del navegador).
              </p>
              <div className="form-actions" style={{ marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setConfirmarRestaurar(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={restaurarPorDefecto}>Restaurar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
