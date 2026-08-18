import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { parseCalendarText } from '../../lib/calendarioParser'
import toast from 'react-hot-toast'

let nextRowId = 1

export default function ImportarCalendario() {
  const [temporadas, setTemporadas] = useState([])
  const [competiciones, setCompeticiones] = useState([])
  const [temporadaId, setTemporadaId] = useState('')
  const [competicionId, setCompeticionId] = useState('')
  const [loading, setLoading] = useState(true)

  const [url, setUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

  const [filas, setFilas] = useState([])
  const [sustituir, setSustituir] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: temps }, { data: comps }] = await Promise.all([
        supabase.from('temporadas').select('*').order('id', { ascending: false }),
        supabase.from('competiciones').select('*').order('id'),
      ])
      setTemporadas(temps || [])
      setCompeticiones(comps || [])
      const activa = temps?.find(t => t.activa) || temps?.[0]
      if (activa) setTemporadaId(String(activa.id))
      const acb = comps?.find(c => c.nombre === 'ACB') || comps?.[0]
      if (acb) setCompeticionId(String(acb.id))
      setLoading(false)
    }
    load()
  }, [])

  const temporadaActual = temporadas.find(t => String(t.id) === temporadaId)
  const anioInicioTemporada = temporadaActual
    ? Number(String(temporadaActual.nombre).slice(0, 4)) || null
    : null

  // ── Leer la URL a través del proxy del servidor ──────────────────────
  // El navegador no puede leer directamente el contenido de otra web
  // (CORS), así que la lectura la hace la función serverless /api/leer-url,
  // que descarga el HTML por debajo y nos lo devuelve ya listo para
  // analizar. Si falla (web caída, contenido cargado por JS, etc.), el
  // partido se puede añadir directamente a mano desde la pestaña Partidos.
  const intentarLeerUrl = async () => {
    if (!url.trim()) return
    setUrlLoading(true)
    setUrlError('')
    try {
      const res = await fetch(`/api/leer-url?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.html) throw new Error(data?.error || `respuesta no válida del servidor (status ${res.status})`)
      const html = data.html
      const sinEtiquetas = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<\/(div|li|tr|p|h[1-6]|section|article|header|footer|ul|ol|table|thead|tbody)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
      // Decodifica entidades HTML (&amp;, &aacute;, &nbsp;...) usando el
      // propio navegador, en vez de sustituirlas una a una a mano.
      const decodificador = document.createElement('textarea')
      decodificador.innerHTML = sinEtiquetas
      const soloTexto = decodificador.value.replace(/[ \t]+/g, ' ')
      const detectadas = parseCalendarText(soloTexto, anioInicioTemporada)
      cargarFilas(detectadas)
      if (detectadas.length === 0) {
        toast.error('Se leyó la URL pero no se detectó ningún partido del Unicaja.')
      } else {
        toast.success(`${detectadas.length} partido(s) detectado(s)`)
      }
    } catch (err) {
      setUrlError(
        `No se ha podido leer esa URL (${err.message || 'error desconocido'}). ` +
        'Puedes añadir el partido directamente a mano desde la pestaña "Partidos".'
      )
    } finally {
      setUrlLoading(false)
    }
  }

  const cargarFilas = (detectadas) => {
    setFilas(detectadas.map(d => ({ ...d, id: nextRowId++ })))
  }

  const actualizarFila = (id, campo, valor) => {
    setFilas(f => f.map(row => row.id === id ? { ...row, [campo]: valor } : row))
  }

  const borrarFila = (id) => {
    setFilas(f => f.filter(row => row.id !== id))
  }

  const filasValidas = filas.filter(f => f.fecha && f.rival.trim())
  const filasInvalidas = filas.length - filasValidas.length

  const guardarCalendario = async () => {
    if (!temporadaId || !competicionId) {
      toast.error('Selecciona temporada y competición')
      return
    }
    if (filasValidas.length === 0) {
      toast.error('No hay partidos válidos para guardar (falta fecha o rival)')
      return
    }
    setSaving(true)

    if (sustituir) {
      const { error: delError } = await supabase
        .from('partidos')
        .delete()
        .eq('temporada_id', Number(temporadaId))
        .eq('competicion_id', Number(competicionId))
      if (delError) {
        setSaving(false)
        toast.error('Error al sustituir el calendario existente')
        return
      }
    }

    // Evitar duplicados: partidos ya existentes con la misma fecha+rival
    // en esta temporada/competición se omiten (salvo que se haya sustituido).
    let existentes = []
    if (!sustituir) {
      const { data } = await supabase
        .from('partidos')
        .select('fecha, rival')
        .eq('temporada_id', Number(temporadaId))
        .eq('competicion_id', Number(competicionId))
      existentes = data || []
    }
    const yaExiste = (fecha, rival) =>
      existentes.some(e => e.fecha === fecha && e.rival.trim().toLowerCase() === rival.trim().toLowerCase())

    const aInsertar = filasValidas
      .filter(f => !yaExiste(f.fecha, f.rival))
      .map(f => ({
        fecha: f.fecha,
        rival: f.rival.trim(),
        es_local: f.esLocal === 'neutral' ? null : !!f.esLocal,
        jornada: f.jornada ? String(f.jornada).trim() : null,
        temporada_id: Number(temporadaId),
        competicion_id: Number(competicionId),
      }))
    const omitidos = filasValidas.length - aInsertar.length

    if (aInsertar.length === 0) {
      setSaving(false)
      toast.error('Todos esos partidos ya estaban guardados')
      return
    }

    let { error } = await supabase.from('partidos').insert(aInsertar)

    // Si la tabla `partidos` todavía no tiene la columna `jornada` en
    // Supabase, Postgres devuelve el error de columna inexistente (código
    // 42703). En vez de bloquear el guardado, se reintenta sin jornada y
    // se avisa — para guardar también la jornada, añade esa columna
    // (numérica, puede ir vacía) a la tabla en Supabase.
    let sinColumnaJornada = false
    if (
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        /column .*jornada.* does not exist/i.test(error.message || '') ||
        /'jornada'.*schema cache/i.test(error.message || ''))
    ) {
      sinColumnaJornada = true
      const aInsertarSinJornada = aInsertar.map(({ jornada, ...resto }) => resto)
      const reintento = await supabase.from('partidos').insert(aInsertarSinJornada)
      error = reintento.error
    }

    setSaving(false)
    if (error) {
      toast.error(`Error al guardar el calendario: ${error.message || 'error desconocido'}`)
      return
    }
    if (sinColumnaJornada) {
      toast.error('Guardado, pero sin la jornada: añade la columna "jornada" a la tabla "partidos" en Supabase para poder guardarla', { duration: 6000 })
    }
    toast.success(
      omitidos > 0
        ? `${aInsertar.length} partido(s) guardado(s), ${omitidos} ya existían y se omitieron`
        : `${aInsertar.length} partido(s) guardado(s) en el calendario`
    )
    setFilas([])
    setUrl('')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Importar calendario</h2>
          <p>Pega una URL o escribe el calendario a mano y se actualizará en la página pública</p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label>Temporada *</label>
          <select value={temporadaId} onChange={e => setTemporadaId(e.target.value)}>
            {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' ★' : ''}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Competición *</label>
          <select value={competicionId} onChange={e => setCompeticionId(e.target.value)}>
            {competiciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label>URL del calendario (ej. https://acb.com/es/liga/calendario)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://acb.com/es/liga/calendario"
            />
            <button type="button" className="btn btn-primary" onClick={intentarLeerUrl} disabled={urlLoading || !url.trim()}>
              {urlLoading ? <><span className="spinner" /> Leyendo...</> : 'Obtener'}
            </button>
          </div>
          {urlError && (
            <p style={{ fontSize: 12.5, color: '#e8917f', marginTop: 10, lineHeight: 1.6 }}>{urlError}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--gris-500)', marginTop: 10, lineHeight: 1.6 }}>
            Algunas webs pueden bloquear la lectura o cargar el calendario con JavaScript, en cuyo caso puede fallar.
            Si un partido no se detecta bien, puedes editarlo abajo antes de guardar, o añadirlo directamente
            desde la pestaña "Partidos".
          </p>
        </div>
      </div>

      {filas.length > 0 && (
        <>
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Jornada / fase</th>
                  <th>Fecha</th>
                  <th>Rival</th>
                  <th>Condición</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filas.map(f => {
                  const invalida = !f.fecha || !f.rival.trim()
                  return (
                    <tr key={f.id} style={invalida ? { background: 'rgba(230,80,60,0.06)' } : undefined}>
                      <td style={{ width: 100 }}>
                        <input
                          type="text"
                          value={f.jornada ?? ''}
                          onChange={e => actualizarFila(f.id, 'jornada', e.target.value || null)}
                          placeholder="ej: 1, Cuartos"
                          style={{ width: 100 }}
                        />
                      </td>
                      <td style={{ width: 160 }}>
                        <input
                          type="date"
                          value={f.fecha}
                          onChange={e => actualizarFila(f.id, 'fecha', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          value={f.rival}
                          onChange={e => actualizarFila(f.id, 'rival', e.target.value)}
                          placeholder="Nombre del rival"
                        />
                      </td>
                      <td style={{ width: 130 }}>
                        <select
                          value={f.esLocal === 'neutral' ? 'neutral' : f.esLocal ? 'true' : 'false'}
                          onChange={e => actualizarFila(f.id, 'esLocal', e.target.value === 'neutral' ? 'neutral' : e.target.value === 'true')}
                        >
                          <option value="true">Local</option>
                          <option value="false">Visitante</option>
                          <option value="neutral">Sede neutra</option>
                        </select>
                      </td>
                      <td style={{ width: 40 }}>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => borrarFila(f.id)}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gris-300)', width: 'auto' }}>
              <input type="checkbox" checked={sustituir} onChange={e => setSustituir(e.target.checked)} style={{ width: 'auto' }} />
              Sustituir el calendario existente de esta competición (borra los partidos actuales antes de guardar)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {filasInvalidas > 0 && (
                <span style={{ fontSize: 12.5, color: '#e8917f' }}>{filasInvalidas} fila(s) incompleta(s) — no se guardarán</span>
              )}
              <button type="button" className="btn btn-primary" onClick={guardarCalendario} disabled={saving || filasValidas.length === 0}>
                {saving ? <><span className="spinner" /> Guardando...</> : `Guardar ${filasValidas.length} partido(s) en el calendario`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
