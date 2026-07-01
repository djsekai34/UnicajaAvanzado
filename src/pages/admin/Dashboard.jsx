import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [counts, setCounts] = useState({ jugadores: 0, partidos: 0, stats: 0 })
  const [temporadaActiva, setTemporadaActiva] = useState(null)
  const [ultimosPartidos, setUltimosPartidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: temp }, { count: j }, { count: p }, { count: s }, { data: partidos }] = await Promise.all([
        supabase.from('temporadas').select('*').eq('activa', true).single(),
        supabase.from('jugadores').select('*', { count: 'exact', head: true }),
        supabase.from('partidos').select('*', { count: 'exact', head: true }),
        supabase.from('stats').select('*', { count: 'exact', head: true }),
        supabase.from('partidos')
          .select('*, competiciones(nombre)')
          .order('fecha', { ascending: false })
          .limit(5),
      ])
      setTemporadaActiva(temp)
      setCounts({ jugadores: j || 0, partidos: p || 0, stats: s || 0 })
      setUltimosPartidos(partidos || [])
      setLoading(false)
    }
    load()
  }, [])

  const badgeClass = (nombre) => {
    const map = { ACB: 'acb', BCL: 'bcl', 'Copa del Rey': 'copa', Supercopa: 'super', Intercontinental: 'inter' }
    return `badge badge-${map[nombre] || 'acb'}`
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Temporada activa: <strong style={{ color: 'var(--lima)' }}>{temporadaActiva?.nombre ?? '—'}</strong></p>
        </div>
        <Link to="/admin/partidos" className="btn btn-primary">
          + Nuevo partido
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Jugadores</div>
          <div className="value lima">{counts.jugadores}</div>
        </div>
        <div className="stat-card">
          <div className="label">Partidos</div>
          <div className="value">{counts.partidos}</div>
        </div>
        <div className="stat-card">
          <div className="label">Registros de stats</div>
          <div className="value verde">{counts.stats}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Últimos partidos</h3>
          <Link to="/admin/partidos" className="btn btn-ghost btn-sm">Ver todos</Link>
        </div>

        {ultimosPartidos.length === 0 ? (
          <div className="empty-state">
            <p>No hay partidos registrados aún.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rival</th>
                  <th>Competición</th>
                  <th>Condición</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ultimosPartidos.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 600, color: 'var(--blanco)' }}>{p.rival}</td>
                    <td><span className={badgeClass(p.competiciones?.nombre)}>{p.competiciones?.nombre}</span></td>
                    <td><span className={`badge ${p.es_local ? 'badge-local' : 'badge-visit'}`}>{p.es_local ? 'Local' : 'Visitante'}</span></td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {p.puntos_unicaja != null ? `${p.puntos_unicaja} - ${p.puntos_rival}` : '—'}
                    </td>
                    <td>
                      <Link to={`/admin/partidos/${p.id}/stats`} className="btn btn-ghost btn-sm">Stats</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
