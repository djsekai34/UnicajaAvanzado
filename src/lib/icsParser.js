// Parser de ficheros .ics (iCalendar) exportados desde la web del club
// (ej. unicajabaloncesto.com → "Añadir al calendario"). Mucho más fiable
// que leer una URL y raspar el HTML: usa campos estructurados en vez de
// heurísticas de texto, y no depende de que la web renderice con JS.
//
// Campos que usa cada partido (bloque VEVENT):
// - SUMMARY: "Equipo A - Equipo B" (uno de los dos es Unicaja)
// - ORGANIZER: el equipo que juega en casa — de aquí se saca local/
//   visitante de forma fiable, sin adivinar por el orden del SUMMARY
// - DTSTART: fecha (y hora) del partido
// - DESCRIPTION: "Competición (Fase, Jornada N)" — de aquí se sacan la
//   competición y la jornada/fase

const MAPA_COMPETICIONES = {
  'liga endesa': 'ACB',
  'acb': 'ACB',
  'basketball champions league': 'BCL',
  'bcl': 'BCL',
  'copa del rey': 'Copa del Rey',
  'supercopa': 'Supercopa',
  'supercopa de españa': 'Supercopa',
  'fiba intercontinental cup': 'Intercontinental',
  'intercontinental cup': 'Intercontinental',
  'copa intercontinental': 'Intercontinental',
}

// Pasa el nombre de competición tal y como viene en el .ics (ej. "Liga
// Endesa") al nombre que usamos internamente (ej. "ACB"). Si no lo
// reconoce, devuelve el nombre tal cual venía, para que se pueda mapear
// a mano en la pantalla de importación.
function normalizarCompeticion(nombreIcs) {
  if (!nombreIcs) return null
  const clave = nombreIcs.trim().toLowerCase()
  return MAPA_COMPETICIONES[clave] || nombreIcs.trim()
}

function parseFechaICS(valor) {
  // Formatos posibles: "20260927T170000Z" (con hora) o "20270521" (solo
  // fecha, para eventos de día completo).
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

// El formato iCalendar puede partir líneas largas en varias, empezando
// las líneas de continuación por un espacio o tabulador — hay que
// "desdoblarlas" antes de parsear campo a campo.
function unfoldICS(texto) {
  return texto.replace(/\r?\n[ \t]/g, '')
}

/**
 * @param {string} texto - contenido del fichero .ics
 * @returns {Array<{fecha: string, rival: string, esLocal: boolean, jornada: string|null, competicionNombre: string|null}>}
 */
export function parseICS(texto) {
  if (!texto) return []
  const desdoblado = unfoldICS(texto)
  const bloques = desdoblado.split(/BEGIN:VEVENT/).slice(1)
  const resultado = []

  for (const bloqueRaw of bloques) {
    const bloque = bloqueRaw.split('END:VEVENT')[0]
    const lineas = bloque.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

    const campo = (nombre) => {
      const linea = lineas.find(l => l.startsWith(nombre + ':') || l.startsWith(nombre + ';'))
      if (!linea) return null
      const idx = linea.indexOf(':')
      return idx >= 0 ? linea.slice(idx + 1).trim() : null
    }

    const summary = campo('SUMMARY')
    const organizer = campo('ORGANIZER')
    const dtstart = campo('DTSTART')
    const description = campo('DESCRIPTION')
    if (!summary || !dtstart) continue

    const fecha = parseFechaICS(dtstart)
    if (!fecha) continue

    // Rival: el lado de "Equipo A - Equipo B" que NO es Unicaja.
    const partes = summary.split(/\s+-\s+/)
    if (partes.length < 2) continue
    const [ladoA, ladoB] = partes
    const aEsUnicaja = /unicaja/i.test(ladoA)
    const bEsUnicaja = /unicaja/i.test(ladoB)
    let rival = null
    if (aEsUnicaja && !bEsUnicaja) rival = ladoB.trim()
    else if (bEsUnicaja && !aEsUnicaja) rival = ladoA.trim()
    else continue // no se reconoce a Unicaja en ninguno de los dos lados

    // El ORGANIZER es quien juega en casa — mucho más fiable que asumir
    // un orden fijo en el SUMMARY.
    const esLocal = organizer ? /unicaja/i.test(organizer) : aEsUnicaja

    let jornada = null
    let competicionNombre = null
    if (description) {
      const mComp = description.match(/^([^(]+)\(/)
      competicionNombre = normalizarCompeticion(mComp ? mComp[1] : description)
      const mJornada = description.match(/Jornada\s+(\d+)/i)
      if (mJornada) {
        jornada = `Jornada ${mJornada[1]}`
      } else {
        // Fases sin número, ej. "1ª Fase", "Cuartos de final"...
        const mFase = description.match(/,\s*([^)]+)\)/)
        if (mFase) jornada = mFase[1].trim()
      }
    }

    resultado.push({ fecha, rival, esLocal, jornada, competicionNombre })
  }

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
