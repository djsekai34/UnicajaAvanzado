import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import logoPorDefecto from '../assets/Unicaja.png'
import { useAuth } from '../context/AuthContext'
import { useLogoConfig } from '../hooks/useLogoConfig'

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
const IconUpload = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
  </svg>
)
const IconEscudo = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
  </svg>
)
const IconImagen = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
  </svg>
)
const IconLogout = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)
const IconPanel = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={16} height={16}>
    <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16" />
  </svg>
)

export default function AdminLayout() {
  const { signOut, user } = useAuth()
  const { logoUrl } = useLogoConfig()
  // Se recuerda si el panel estaba oculto la última vez, para no tener
  // que volver a ocultarlo cada vez que entras — útil sobre todo cuando
  // trabajas con el navegador a media pantalla.
  const [panelOculto, setPanelOculto] = useState(() => localStorage.getItem('admin_panel_oculto') === '1')
  const togglePanel = () => {
    setPanelOculto(o => {
      const nuevo = !o
      localStorage.setItem('admin_panel_oculto', nuevo ? '1' : '0')
      return nuevo
    })
  }

  return (
    <div className="admin-layout">
      {/* Cuando el panel está oculto no hay logo al lado del que colgarlo,
          así que aquí sí flota arriba a la izquierda para poder recuperarlo. */}
      {panelOculto && (
        <button
          className="btn-toggle-panel flotante"
          onClick={togglePanel}
          title="Mostrar panel"
          aria-label="Mostrar panel"
        >
          <IconPanel />
        </button>
      )}

      <aside className={`sidebar${panelOculto ? ' oculto' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <img src={logoUrl || logoPorDefecto} alt="Unicaja" style={{ height: 40 }} />
            <button
              className="btn-toggle-panel"
              onClick={togglePanel}
              title="Ocultar panel"
              aria-label="Ocultar panel"
            >
              <IconPanel />
            </button>
          </div>
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
          <NavLink to="/admin/calendario-importar" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconUpload /> Importar calendario
          </NavLink>
          <NavLink to="/admin/escudos" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconEscudo /> Escudos de equipos
          </NavLink>
          <NavLink to="/admin/icono" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconImagen /> Icono de la pagina web
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

      <main className={`main-content${panelOculto ? ' full' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
