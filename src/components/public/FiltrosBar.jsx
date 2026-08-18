import { useLocation } from 'react-router-dom'

const MESES = [
  { v: 'todos', l: 'Todos los meses' },
  { v: '1',  l: 'Enero' },
  { v: '2',  l: 'Febrero' },
  { v: '3',  l: 'Marzo' },
  { v: '4',  l: 'Abril' },
  { v: '5',  l: 'Mayo' },
  { v: '6',  l: 'Junio' },
  { v: '9',  l: 'Septiembre' },
  { v: '10', l: 'Octubre' },
  { v: '11', l: 'Noviembre' },
  { v: '12', l: 'Diciembre' },
]

export default function FiltrosBar({
  temporadas, competiciones, jugadores,
  temporadaId, setTemporadaId,
  compId, setCompId,
  mes, setMes,
  fechaDesde, setFechaDesde,
  fechaHasta, setFechaHasta,
  jugadoresIds, toggleJugador,
  extra,
}) {
  const location = useLocation()
  const esComparador = location.pathname.startsWith('/comparador')
  const esEquipo = location.pathname.startsWith('/equipo')

  const badgeComp = (nombre) => {
    const map = { ACB: 'acb', BCL: 'bcl', 'Copa del Rey': 'copa', Supercopa: 'super', Intercontinental: 'inter' }
    return map[nombre] || 'acb'
  }

  return (
    <div>
      <div className="filters-bar">
        <div className="filter-group">
          <label>Temporada</label>
          <select value={temporadaId} onChange={e => setTemporadaId(e.target.value)}>
            {temporadas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' ★' : ''}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Competición</label>
          <select value={compId} onChange={e => setCompId(e.target.value)}>
            <option value="todas">Todas</option>
            {competiciones.map(c => (
              <option key={c.id} value={String(c.id)}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)}>
            {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>

        <div className="filter-group">
          <label>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>

        {(fechaDesde || fechaHasta || mes !== 'todos' || compId !== 'todas') && (
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => {
            setFechaDesde(''); setFechaHasta(''); setMes('todos'); setCompId('todas')
          }}>
            ✕ Limpiar
          </button>
        )}

        {extra && (
          <div className="filters-bar-extra">
            {extra}
          </div>
        )}
      </div>

      {/* Selector de jugadores — no aplica en /comparador */}
      {!esComparador && !esEquipo && (
        <div className="jugadores-selector">
          {jugadores.map(j => (
            <button
              key={j.id}
              className={`jugador-chip${jugadoresIds.includes(j.id) ? ' selected' : ''}`}
              onClick={() => toggleJugador(j.id)}
            >
              <span className="dorsal">#{j.dorsal}</span>
              {j.nombre}
              {j.posicion && <span style={{ fontSize: 10, color: 'var(--gris-500)' }}>{j.posicion[0]}</span>}
            </button>
          ))}
          {jugadoresIds.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: 99 }}
              onClick={() => jugadoresIds.forEach(id => toggleJugador(id))}>
              Ver todos
            </button>
          )}
        </div>
      )}
    </div>
  )
}