import { useState, forwardRef, useImperativeHandle } from 'react'
import html2canvas from 'html2canvas'

// Captura el contenido de `targetRef` como imagen PNG y la ofrece para
// guardar. En móvil, si el navegador soporta compartir archivos, se abre
// el panel nativo de compartir (desde ahí se puede guardar en la galería).
// En PC (o si el share falla/se cancela), se descarga como archivo normal.
//
// `displayForzado`: si el elemento a capturar está oculto por CSS (p.ej.
// una vista alternativa que no es la que se está mostrando ahora mismo),
// se le fuerza ese `display` justo antes de capturar y se restaura justo
// después — así se puede "fotografiar" algo que el usuario no está viendo
// en pantalla en ese momento. Para que no se vea un parpadeo en la web
// mientras tanto, se posiciona fuera de la pantalla (position:fixed con
// left muy negativo) en vez de mostrarlo en su sitio habitual; la imagen
// capturada sale completa igualmente, solo cambia dónde se renderiza
// mientras se genera.
//
// `mostrarBoton`: si es false, el componente no renderiza su propio botón
// (por si el que lo usa quiere lanzar la captura desde otro sitio, p.ej.
// tras confirmar algo en un modal previo). En ese caso se controla con una
// ref: `ref.current.capturar()`.
//
// `onDone`: callback opcional que se llama cuando la captura termina
// (con éxito, error o cancelación del share), útil para sincronizar un
// estado de "capturando" externo cuando `mostrarBoton` es false.
const CapturaBoton = forwardRef(function CapturaBoton(
  { targetRef, filename = 'captura', label = '📸 Descargar imagen', displayForzado = null, mostrarBoton = true, onDone },
  ref
) {
  const [capturando, setCapturando] = useState(false)

  const capturar = async () => {
    if (!targetRef.current) return
    setCapturando(true)
    const el = targetRef.current
    const estiloOriginal = {
      display: el.style.display,
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      zIndex: el.style.zIndex,
    }

    try {
      if (displayForzado) {
        // Se muestra el elemento (para que html2canvas pueda capturarlo),
        // pero fuera de la pantalla — así nunca se ve un parpadeo en la
        // web, aunque en la imagen descargada sí salga completo.
        el.style.setProperty('display', displayForzado, 'important')
        el.style.setProperty('position', 'fixed', 'important')
        el.style.setProperty('left', '-99999px', 'important')
        el.style.setProperty('top', '0', 'important')
        el.style.setProperty('z-index', '-1', 'important')
      }

      const canvas = await html2canvas(el, {
        backgroundColor: '#0D0D0D',
        scale: 2, // más resolución para que se vea nítido al compartir
        useCORS: true,
      })

      // Ya tenemos la imagen capturada, no hace falta seguir forzando la
      // visibilidad del elemento.
      if (displayForzado) {
        el.style.display = estiloOriginal.display
        el.style.position = estiloOriginal.position
        el.style.left = estiloOriginal.left
        el.style.top = estiloOriginal.top
        el.style.zIndex = estiloOriginal.zIndex
      }

      canvas.toBlob(async (blob) => {
        if (!blob) { setCapturando(false); return }
        const file = new File([blob], `${filename}.png`, { type: 'image/png' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: filename })
            setCapturando(false)
            onDone?.()
            return
          } catch (err) {
            // Si cancela el panel de compartir, seguimos con la descarga normal
          }
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${filename}.png`
        document.body.appendChild(a)
        a.click()
        // Esperamos un poco antes de quitar el link y liberar la URL: si se
        // hace en el mismo tick, el navegador a veces no llega a registrar
        // bien la descarga y se queda "pendiente" — eso es lo que provocaba
        // que, al refrescar la página (F5) justo después, la descarga se
        // disparase sola otra vez.
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 200)
        setCapturando(false)
        onDone?.()
      }, 'image/png')
    } catch (err) {
      console.error('Error al generar la captura', err)
      if (displayForzado) {
        el.style.display = estiloOriginal.display
        el.style.position = estiloOriginal.position
        el.style.left = estiloOriginal.left
        el.style.top = estiloOriginal.top
        el.style.zIndex = estiloOriginal.zIndex
      }
      setCapturando(false)
      onDone?.()
    }
  }

  useImperativeHandle(ref, () => ({ capturar }))

  if (!mostrarBoton) return null

  return (
    <button type="button" className="btn btn-captura btn-sm" onClick={capturar} disabled={capturando}>
      {capturando ? <><span className="spinner" /> Generando...</> : label}
    </button>
  )
})

export default CapturaBoton
