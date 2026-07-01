import { Outlet, NavLink } from 'react-router-dom'
import logo from '../assets/Unicaja.png'
import { useAuth } from '../context/AuthContext'

const IconGrid = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)
const IconUser = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconCalendar = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconSeason = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)
const IconLogout = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

export default function AdminLayout() {
  const { signOut, user } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Unicaja" style={{ height: 40, marginBottom: 8 }} />
          <h1>Unicaja <span style={{ color: 'var(--verde)' }}>Avanzado</span></h1>
          <p>Panel Admin</p>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">General</span>
          <NavLink to="/admin" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconGrid /> Dashboard
          </NavLink>
          <NavLink to="/admin/temporadas" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconSeason /> Temporadas
          </NavLink>

          <span className="nav-section-label">Datos</span>
          <NavLink to="/admin/jugadores" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconUser /> Jugadores
          </NavLink>
          <NavLink to="/admin/partidos" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconCalendar /> Partidos
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: 12, color: 'var(--gris-500)', marginBottom: 10, paddingLeft: 4 }}>
            {user?.email}
          </div>
          <button className="btn-logout" onClick={signOut}>
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
