import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function calcularRecord(partidos) {
  const jugados = (partidos || []).filter(p => p.puntos_unicaja != null && p.puntos_rival != null)
  const victorias = jugados.filter(p => p.puntos_unicaja > p.puntos_rival).length
  const derrotas = jugados.length - victorias
  const pct = jugados.length > 0 ? Math.round((victorias / jugados.length) * 1000) / 10 : null
  return { victorias, derrotas, pct, total: jugados.length }
}

// Tarjeta pequeña con la foto/nombre del entrenador, el récord V-D de la
// temporada actual y, si ha repetido en más de una temporada, el récord
// total acumulado con el club.
export default function EquipoRecordCard({ temporada }) {
  const [recordActual, setRecordActual] = useState(null)
  const [recordTotal, setRecordTotal] = useState(null)
  const [repiteTemporadas, setRepiteTemporadas] = useState(false)

  useEffect(() => {
    if (!temporada?.id) { setRecordActual(null); setRecordTotal(null); return }
    let cancel = false

    async function load() {
      const { data: partidosActual } = await supabase
        .from('partidos')
        .select('puntos_unicaja, puntos_rival')
        .eq('temporada_id', temporada.id)
      if (!cancel) setRecordActual(calcularRecord(partidosActual))

      if (temporada.entrenador) {
        const { data: temporadasEntrenador } = await supabase
          .from('temporadas')
          .select('id')
          .eq('entrenador', temporada.entrenador)
        const ids = (temporadasEntrenador || []).map(t => t.id)
        if (!cancel) setRepiteTemporadas(ids.length > 1)
        if (ids.length > 1) {
          const { data: partidosTotal } = await supabase
            .from('partidos')
            .select('puntos_unicaja, puntos_rival')
            .in('temporada_id', ids)
          if (!cancel) setRecordTotal(calcularRecord(partidosTotal))
        } else if (!cancel) {
          setRecordTotal(null)
        }
      } else if (!cancel) {
        setRepiteTemporadas(false)
        setRecordTotal(null)
      }
    }
    load()
    return () => { cancel = true }
  }, [temporada?.id, temporada?.entrenador])

  if (!temporada) return null

  return (
    <div className="equipo-record-card">
      <div className="equipo-record-entrenador">
        {temporada.entrenador_foto_url
          ? <img src={temporada.entrenador_foto_url} alt={temporada.entrenador || 'Entrenador'} />
          : <div className="equipo-record-avatar-placeholder">👤</div>
        }
        <div>
          <div className="equipo-record-label">Entrenador</div>
          <div className="equipo-record-nombre">{temporada.entrenador || '—'}</div>
        </div>
      </div>

      {recordActual && recordActual.total > 0 && (
        <div className="equipo-record-linea">
          <span className="equipo-record-tag">{temporada.nombre}</span>
          <span className="equipo-record-vd">
            <span className="pos">{recordActual.victorias}V</span>
            <span className="sep">-</span>
            <span className="neg">{recordActual.derrotas}D</span>
          </span>
          <span className="equipo-record-pct">{recordActual.pct}%</span>
        </div>
      )}

      {repiteTemporadas && recordTotal && recordTotal.total > 0 && (
        <div className="equipo-record-linea">
          <span className="equipo-record-tag">Total</span>
          <span className="equipo-record-vd">
            <span className="pos">{recordTotal.victorias}V</span>
            <span className="sep">-</span>
            <span className="neg">{recordTotal.derrotas}D</span>
          </span>
          <span className="equipo-record-pct">{recordTotal.pct}%</span>
        </div>
      )}
    </div>
  )
}
