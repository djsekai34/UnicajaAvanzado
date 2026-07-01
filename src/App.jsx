import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminLayout from "./components/AdminLayout";
import PublicLayout from "./components/public/PublicLayout";
import LoginPage from "./pages/admin/LoginPage";
import Dashboard from "./pages/admin/Dashboard";
import Jugadores from "./pages/admin/Jugadores";
import Partidos from "./pages/admin/Partidos";
import StatsPartido from "./pages/admin/StatsPartido";
import Temporadas from "./pages/admin/Temporadas";
import EstadisticasPage from "./pages/public/EstadisticasPage";
import JugadorPage from "./pages/public/JugadorPage";
import ComparadorPage from "./pages/public/ComparadorPage";
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
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<EstadisticasPage />} />
        <Route path="comparador" element={<ComparadorPage />} />
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
