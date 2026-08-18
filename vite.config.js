import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { leerUrlExterna } from './src/lib/leerUrlServidor.js'

// Plugin de desarrollo: emula /api/leer-url (la función serverless de
// Vercel) mientras usamos `npm run dev`, para no depender de `vercel dev`.
// En producción, Vercel sirve la función real de api/leer-url.js; este
// middleware solo existe durante el desarrollo local.
function apiLeerUrlDev() {
  return {
    name: 'api-leer-url-dev',
    configureServer(server) {
      server.middlewares.use('/api/leer-url', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const { status, body } = await leerUrlExterna(url.searchParams.get('url'))
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiLeerUrlDev()],
})
