import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useLogoConfig } from "./hooks/useLogoConfig";
import AdminLayout from "./components/AdminLayout";
import PublicLayout from "./components/public/PublicLayout";
import LoginPage from "./pages/admin/LoginPage";
import Dashboard from "./pages/admin/Dashboard";
import Jugadores from "./pages/admin/Jugadores";
import Partidos from "./pages/admin/Partidos";
import ImportarCalendario from "./pages/admin/ImportarCalendario";
import EscudosEquipos from "./pages/admin/EscudosEquipos";
import IconoPagina from "./pages/admin/IconoPagina";
import StatsPartido from "./pages/admin/StatsPartido";
import Temporadas from "./pages/admin/Temporadas";
import EstadisticasPage from "./pages/public/EstadisticasPage";
import JugadorPage from "./pages/public/JugadorPage";
import ComparadorPage from "./pages/public/ComparadorPage";
import EquipoPage from "./pages/public/EquipoPage";
import CalendarioPage from "./pages/public/CalendarioPage";
import PartidoDetallePage from "./pages/public/PartidoDetallePage";
import SobreMiPage from "./pages/public/SobreMiPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  // Si hay un icono personalizado guardado en Admin → Icono de la página,
  // se usa también como icono de la pestaña del navegador. El <link> del
  // favicon está fijo en index.html, así que aquí se actualiza su href
  // en cuanto se conoce el logo configurado.
  const { logoUrl } = useLogoConfig()
  useEffect(() => {
    if (!logoUrl) return
    const enlace = document.querySelector('link[rel="icon"]')
    if (enlace) enlace.href = logoUrl
  }, [logoUrl])

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<EstadisticasPage />} />
        <Route path="comparador" element={<ComparadorPage />} />
        <Route path="equipo" element={<EquipoPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="partido/:id" element={<PartidoDetallePage />} />
        <Route path=":slug" element={<JugadorPage />} />
        <Route path="sobre-mi" element={<SobreMiPage />} />
      </Route>

      {/* ADMIN */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="temporadas" element={<Temporadas />} />
        <Route path="jugadores" element={<Jugadores />} />
        <Route path="partidos" element={<Partidos />} />
        <Route path="partidos/:id/stats" element={<StatsPartido />} />
        <Route path="calendario-importar" element={<ImportarCalendario />} />
        <Route path="escudos" element={<EscudosEquipos />} />
        <Route path="icono" element={<IconoPagina />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
