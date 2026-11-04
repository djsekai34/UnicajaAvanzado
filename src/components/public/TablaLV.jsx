// Comparativa compacta por sede (Local / Visitante / Neutral): una línea por
// métrica, con el valor de cada sede y una barrita fina; la mejor se
// marca con una estrella (en "menorEsMejor", la más baja — p.ej. puntos encajados
// o pérdidas). Las filas sin `num` (partidos, minutos) salen como texto
// simple, sin barra. Mantiene las mismas props que la tabla anterior.
const COLORES = { Local: '#60A5FA', Visitante: '#F59E0B', Neutral: '#A78BFA' }

export default function TablaSede({ cabeceras, filas }) {
  const cols = `repeat(${cabeceras.length}, minmax(0, 1fr))`
  return (
    <div className="sede-comp">
      <div className="sede-fila sede-cab">
        <span />
        <div className="sede-celdas" style={{ gridTemplateColumns: cols }}>
          {cabeceras.map(c => (
            <span key={c} className="sede-cab-item"><i style={{ background: COLORES[c] || '#9CA3AF' }} />{c}</span>
          ))}
        </div>
      </div>
      {filas.map(f => {
        const nums = f.celdas.map(c => c.num).filter(v => v != null)
        const max = nums.length ? Math.max(...nums.map(v => Math.abs(v)), 0.0001) : 1
        const mejor = nums.length > 1 ? (f.menorEsMejor ? Math.min(...nums) : Math.max(...nums)) : null
        const todosIguales = nums.length > 1 && nums.every(v => v === nums[0])
        return (
          <div key={f.label} className="sede-fila">
            <span className="sede-fila-label">{f.label}</span>
            <div className="sede-celdas" style={{ gridTemplateColumns: cols }}>
              {f.celdas.map((c, i) => {
                const esMejor = mejor != null && !todosIguales && c.num === mejor
                return (
                  <div key={i} className={`sede-celda${esMejor ? ' mejor' : ''}`}>
                    <span className="sede-valor">{c.txt}{esMejor && <span className="sede-estrella" title="Mejor registro">★</span>}</span>
                    {c.num != null && (
                      <div className="sede-barra-pista">
                        <div className="sede-barra" style={{ width: `${Math.max(6, (Math.abs(c.num) / max) * 100)}%`, background: COLORES[cabeceras[i]] || '#9CA3AF' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
