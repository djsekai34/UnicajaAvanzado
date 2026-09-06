import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Lee el logo personalizado guardado en Admin → Icono de la página. Si no
// hay ninguno guardado (o falla la lectura), devuelve null y cada sitio
// usa su logo por defecto de siempre.
export function useLogoConfig() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    supabase.from('configuracion').select('logo_url').eq('id', 1).single()
      .then(({ data }) => {
        if (activo) setLogoUrl(data?.logo_url || null)
      })
      .finally(() => { if (activo) setLoading(false) })
    return () => { activo = false }
  }, [])

  return { logoUrl, loading }
}
