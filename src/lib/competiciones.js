// Colores/abreviaturas por competición (coinciden con los `nombre` de la
// tabla `competiciones`: ACB, BCL, Copa del Rey, Supercopa, Intercontinental).
// Cualquier competición nueva que no esté aquí cae en un estilo neutro por
// defecto — no hace falta tocar este fichero al añadir partidos de otra
// competición desde el admin, solo se pintará en gris hasta que se le
// asigne un color propio.
export const COMPETICIONES = {
  'ACB': { color: 'var(--verde)', abbr: 'ACB' },
  'BCL': { color: '#3B82F6', abbr: 'BCL' },
  'Copa del Rey': { color: 'var(--warning)', abbr: 'Copa' },
  'Supercopa': { color: 'var(--lima)', abbr: 'SCopa' },
  'Intercontinental': { color: '#8B5CF6', abbr: 'Inter' },
  'Amistosos': { color: '#FFFFFF', abbr: 'Amist' },
}
const COMPETICION_DEFAULT = { color: 'var(--gris-400)', abbr: '—' }

export function competicionInfo(nombre) {
  return COMPETICIONES[nombre] || { ...COMPETICION_DEFAULT, abbr: nombre?.slice(0, 5) || '—' }
}

// La jornada puede ser "Jornada 12" (liga regular) o el nombre de una fase
// de playoff ("Cuartos de final", "Semifinales", "Final", "F4"...) — se
// muestra distinto según el caso: corto tipo "J12" en la rejilla, o el
// nombre de la fase tal cual si no es una jornada numerada.
export function formatJornada(jornada) {
  if (!jornada) return { corto: '', largo: '' }
  const valor = String(jornada).trim()
  const m = valor.match(/^(?:Jornada\s+|J\s*)?(\d+)$/i)
  if (m) return { corto: `J${m[1]}`, largo: `Jornada ${m[1]}` }
  if (/^F4$|^Final\s*Four$/i.test(valor)) return { corto: 'F4', largo: 'Final Four' }
  return { corto: valor, largo: valor }
}

// Código corto de un equipo a partir de su nombre (para la URL), ej.
// "Real Madrid" → "RMA", "Barça" → "BAR". Es una aproximación (no el
// código oficial de cada club), solo para que la URL sea legible.
export function codigoEquipo(nombre) {
  if (!nombre) return 'eq'
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  let codigo = palabras.map(p => p[0]).join('')
  if (codigo.length < 3) codigo = nombre.replace(/\s+/g, '')
  return codigo.slice(0, 4).toLowerCase()
}

// URL legible de un partido: competición-uni-rival-fecha (ej.
// "acb-uni-rma-27092026"). Sin ningún id interno de la base de datos —
// para buscar el partido se usa la fecha (con el código del rival como
// desempate si algún día hubiera dos partidos el mismo día).
export function generarSlugPartido(partido) {
  const compAbbr = competicionInfo(partido.competiciones?.nombre).abbr
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const rivalCod = codigoEquipo(partido.rival).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const [anio, mes, dia] = (partido.fecha || '').split('-')
  const fecha = anio && mes && dia ? `${dia}${mes}${anio}` : ''
  return `${compAbbr || 'partido'}-uni-${rivalCod || 'riv'}-${fecha}`
}

// Saca la fecha (y el código del rival, por si hace falta desempatar) de
// la URL del partido. El último tramo es la fecha en formato DDMMAAAA;
// se convierte a AAAA-MM-DD (el formato de la base de datos).
export function datosDesdeSlugPartido(slug) {
  if (!slug) return null
  const partes = String(slug).split('-')
  const ultimo = partes[partes.length - 1]
  const m = ultimo.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (!m) return null
  const [, dia, mes, anio] = m
  return { fecha: `${anio}-${mes}-${dia}`, rivalCod: partes[partes.length - 2] || null }
}
