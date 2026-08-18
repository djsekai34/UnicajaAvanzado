// Parser heurístico de calendarios pegados como texto plano (por ejemplo,
// copiando y pegando el contenido de una página como acb.com/es/liga/calendario,
// o escribiéndolo a mano en un formato similar), o del texto ya extraído
// automáticamente al leer una URL desde la pantalla de importación.
//
// Muchas páginas de calendario (acb.com incluida) muestran la fecha UNA
// sola vez como cabecera y debajo listan varios partidos de ese día sin
// repetirla, así que la fecha "activa" se mantiene mientras se recorren
// las líneas siguientes, hasta que aparece una fecha nueva. Reconoce
// líneas con "Equipo - Equipo" / "Equipo vs Equipo" donde uno de los dos
// es el Unicaja, y opcionalmente una jornada ("J1", "Jornada 1"). El
// resultado siempre se muestra en una tabla editable antes de guardar
// nada, así que un partido mal detectado se corrige a mano.

const MESES_MAP = {
  enero: 1, ene: 1,
  febrero: 2, feb: 2,
  marzo: 3, mar: 3,
  abril: 4, abr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6,
  julio: 7, jul: 7,
  agosto: 8, ago: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9,
  octubre: 10, oct: 10,
  noviembre: 11, nov: 11,
  diciembre: 12, dic: 12,
}

const RE_FECHA_NUM = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/
const RE_FECHA_TEXTO = /\b(\d{1,2})\s+de\s+([a-zñáéíóúA-ZÑÁÉÍÓÚ]+)(?:\s+de\s+(\d{4}))?\b/i
const RE_JORNADA = /\bJ(?:ornada)?\.?\s*(\d{1,2})\b/i
// Fases de playoff / eliminatorias, que en ACB (y en Copa del Rey, etc.)
// sustituyen a la jornada numérica al final de temporada.
const RE_FASE_PLAYOFF = /\b(Cuartos de final|Semifinales?|Final(?:es)?|Final\s*Four|F4|Playoffs?|Play-?offs?)\b/i
const RE_HORA = /\b\d{1,2}[:.h]\d{2}\b/gi
// Partidos sin horario todavía confirmado: la web los marca como "XX:XX"
// o "--:--" en vez de una hora real.
const RE_HORA_PENDIENTE = /\b(?:[Xx]{1,2}|-{1,2})[:.h](?:[Xx]{1,2}|-{1,2})\b/g

// Palabras sueltas que suelen colarse detrás del nombre del equipo en
// calendarios web (enlaces de "ver ficha del partido", "comprar
// entradas", etc.) y que no forman parte del nombre real del rival.
const RUIDO_TRAS_EQUIPO =
  /\b(Previa|Resumen|Cr[oó]nica|Ficha(?:\s+del\s+partido)?|Entradas?|Compra(?:r)?(?:\s+entradas)?|Resultado|Estad[ií]sticas?|Ver\s+m[aá]s|Directo|En\s+directo)\b.*$/i

const RE_ENFRENTAMIENTO =
  /(.{2,45}?)\s+(?:-|–|—|vs\.?|v\.)\s+(.{2,45}?)(?:\s{2,}|\s*\d{1,2}[:.h]\d{2}|\s+(?=Previa|Resumen|Cr[oó]nica|Ficha|Entradas?|Compra|Resultado|Estad[ií]stica|Ver\s+m[aá]s|Directo)|\s*$)/i

function limpiar(s) {
  return s.replace(/\s+/g, ' ').trim()
}

// Quita ruido típico de calendarios web pegado al nombre: el código corto
// del equipo en mayúsculas (ej. "Real Madrid RMB" → "Real Madrid") y
// enlaces/textos de interfaz que se hayan colado detrás.
function limpiarNombreEquipo(s) {
  return limpiar(
    limpiar(s)
      .replace(RUIDO_TRAS_EQUIPO, '')
      .replace(/\s+[A-ZÑÁÉÍÓÚ&]{2,5}$/, '')
  )
}

function normalizarFecha(dia, mes, anioTexto, anioTemporadaInicio) {
  let anio
  if (anioTexto) {
    anio = String(anioTexto).length === 2 ? 2000 + Number(anioTexto) : Number(anioTexto)
  } else if (anioTemporadaInicio) {
    // Sin año explícito: la temporada cruza dos años naturales
    // (ej. septiembre 2026 - mayo 2027), así que julio-diciembre cae en el
    // año de inicio y enero-junio en el siguiente.
    anio = mes >= 7 ? anioTemporadaInicio : anioTemporadaInicio + 1
  } else {
    anio = new Date().getFullYear()
  }
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function detectarFecha(linea, anioTemporadaInicio) {
  const mNum = linea.match(RE_FECHA_NUM)
  if (mNum) {
    return normalizarFecha(Number(mNum[1]), Number(mNum[2]), mNum[3], anioTemporadaInicio)
  }
  const mTexto = linea.match(RE_FECHA_TEXTO)
  if (mTexto) {
    const mesNum = MESES_MAP[mTexto[2].toLowerCase()]
    if (mesNum) return normalizarFecha(Number(mTexto[1]), mesNum, mTexto[3], anioTemporadaInicio)
  }
  return null
}

/**
 * @param {string} texto - texto pegado por el usuario o extraído de una URL
 * @param {number|null} anioTemporadaInicio - ej. 2026 para la temporada "2026/27"
 * @returns {Array<{fecha: string, rival: string, esLocal: boolean, jornada: number|null}>}
 */
export function parseCalendarText(texto, anioTemporadaInicio = null) {
  if (!texto) return []
  const lineas = texto.split(/\r?\n/).map(limpiar).filter(Boolean)
  const resultado = []
  const vistos = new Set()

  // La fecha (y la jornada) de un calendario web suele aparecer una sola
  // vez como cabecera y aplica a todos los partidos que vienen debajo,
  // así que se guardan aquí y se mantienen activas hasta la siguiente.
  let fechaActual = null
  let jornadaActual = null

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]

    const jornadaMatch = linea.match(RE_JORNADA)
    if (jornadaMatch) jornadaActual = `Jornada ${jornadaMatch[1]}`
    const faseMatch = linea.match(RE_FASE_PLAYOFF)
    if (faseMatch) jornadaActual = faseMatch[1].replace(/-?offs?/i, 'offs').replace(/^./, c => c.toUpperCase())

    const fechaEnLinea = detectarFecha(linea, anioTemporadaInicio)
    if (fechaEnLinea) fechaActual = fechaEnLinea

    if (!fechaActual) continue
    if (!/unicaja/i.test(linea)) continue

    // El nombre de cada equipo puede venir partido en varias líneas al
    // limpiar el HTML (nombre, código, guion...), y el rival puede
    // aparecer ANTES de "Unicaja" (si Unicaja es visitante) o DESPUÉS
    // (si es local), así que se construye un pequeño contexto a ambos
    // lados de esta línea, parando en el límite del bloque de este
    // partido (una fecha/jornada nueva, o el "Previa"/"Compra entradas"
    // del partido anterior o de este mismo).
    const antes = []
    for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
      const previa = lineas[k]
      if (detectarFecha(previa, anioTemporadaInicio) || RE_JORNADA.test(previa) || RUIDO_TRAS_EQUIPO.test(previa)) break
      antes.unshift(previa)
    }
    const despues = []
    for (let j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
      const siguiente = lineas[j]
      if (detectarFecha(siguiente, anioTemporadaInicio) || RE_JORNADA.test(siguiente)) break
      despues.push(siguiente)
      if (RUIDO_TRAS_EQUIPO.test(siguiente)) break
    }

    const contextoLimpio = [...antes, linea, ...despues]
      .join(' ')
      .replace(new RegExp(RE_FECHA_NUM, 'g'), ' ')
      .replace(new RegExp(RE_FECHA_TEXTO, 'gi'), ' ')
      .replace(/\d{1,2}[:.h]\d{2}\b/gi, ' ')
      .replace(RE_HORA_PENDIENTE, ' ')
      .replace(new RegExp(RE_JORNADA, 'gi'), ' ')
      .replace(new RegExp(RE_FASE_PLAYOFF, 'gi'), ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let rival = null
    let esLocal = null
    const eqMatch = contextoLimpio.match(RE_ENFRENTAMIENTO)
    if (eqMatch) {
      const [, a, b] = eqMatch
      const aEsUnicaja = /unicaja/i.test(a)
      const bEsUnicaja = /unicaja/i.test(b)
      if (aEsUnicaja && !bEsUnicaja) { esLocal = true; rival = limpiarNombreEquipo(b) }
      else if (bEsUnicaja && !aEsUnicaja) { esLocal = false; rival = limpiarNombreEquipo(a) }
    }

    if (!rival) continue

    const key = `${fechaActual}|${rival.toLowerCase()}`
    if (vistos.has(key)) continue
    vistos.add(key)

    resultado.push({
      fecha: fechaActual,
      rival,
      esLocal: esLocal === null ? true : esLocal,
      jornada: jornadaActual,
    })
  }

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
