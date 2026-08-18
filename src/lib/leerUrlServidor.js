// Lógica compartida para leer el HTML de una URL externa desde el servidor
// (evita el bloqueo CORS del navegador). La usan tanto la función serverless
// de Vercel (api/leer-url.js) como el middleware de desarrollo de Vite
// (vite.config.js), para que /api/leer-url funcione igual en local y en
// producción.

const TIMEOUT_MS = 12000

// Devuelve { status, body } listo para mandar como respuesta JSON.
export async function leerUrlExterna(urlTexto) {
  if (!urlTexto || !urlTexto.trim()) {
    return { status: 400, body: { error: 'Falta el parámetro url' } }
  }

  let destino
  try {
    destino = new URL(urlTexto.trim())
  } catch {
    return { status: 400, body: { error: 'La URL no es válida' } }
  }

  if (destino.protocol !== 'http:' && destino.protocol !== 'https:') {
    return { status: 400, body: { error: 'Solo se admiten URLs http o https' } }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const respuesta = await fetch(destino.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    })

    if (!respuesta.ok) {
      return { status: 502, body: { error: `La web respondió con estado ${respuesta.status}` } }
    }

    const contentType = respuesta.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return { status: 415, body: { error: 'La URL no devolvió una página HTML' } }
    }

    const html = await respuesta.text()
    return { status: 200, body: { html } }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { status: 504, body: { error: 'La web tardó demasiado en responder' } }
    }
    return { status: 502, body: { error: 'No se ha podido obtener la URL' } }
  } finally {
    clearTimeout(timeout)
  }
}
