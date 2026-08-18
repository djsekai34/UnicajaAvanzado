// Función serverless de Vercel: expone /api/leer-url en producción.
// La lógica real vive en src/lib/leerUrlServidor.js, compartida con el
// middleware de desarrollo de Vite (vite.config.js) para que funcione
// igual en local y desplegado.
import { leerUrlExterna } from '../src/lib/leerUrlServidor.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }
  const urlParam = req.query?.url
  const urlTexto = Array.isArray(urlParam) ? urlParam[0] : urlParam
  const { status, body } = await leerUrlExterna(urlTexto)
  res.status(status).json(body)
}
