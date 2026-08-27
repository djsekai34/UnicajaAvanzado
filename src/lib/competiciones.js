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
