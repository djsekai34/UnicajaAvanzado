import { useEffect, useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/Unicaja.png";

export default function PublicLayout() {
  const [temporadaActiva, setTemporadaActiva] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("temporadas")
        .select("*")
        .eq("activa", true)
        .single();
      setTemporadaActiva(data);
    }
    load();
  }, []);

  return (
    <div className="pub-layout">
      <nav className="pub-nav">
        <Link to="/" className="pub-nav-logo">
          <img
            src={logo}
            alt="Unicaja"
            onError={(e) => (e.target.style.display = "none")}
          />
          <h1>
            Unicaja <span>Avanzado</span>
          </h1>
        </Link>
        <div className="pub-nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `pub-nav-link${isActive ? " active" : ""}`
            }
          >
            Estadísticas
          </NavLink>
          <NavLink
            to="/comparador"
            className={({ isActive }) =>
              `pub-nav-link${isActive ? " active" : ""}`
            }
          >
            Comparador
          </NavLink>
        </div>
        <Link
          to="/sobre-mi"
          style={{
            fontSize: 12,
            color: "var(--gris-500)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid var(--gris-700)",
            borderRadius: 99,
            padding: "4px 10px",
            transition: "border-color .15s, color .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--verde)";
            e.currentTarget.style.color = "var(--verde)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--gris-700)";
            e.currentTarget.style.color = "var(--gris-500)";
          }}
        >
          <span style={{ fontSize: 10 }}>🏀</span>
          <span>Creador del proyecto</span>
        </Link>
      </nav>
      <main className="pub-main">
        <Outlet />
      </main>
    <footer
  style={{
    borderTop: "1px solid var(--gris-800)",
    padding: "20px 32px",
    textAlign: "center",
    fontSize: 12,
    color: "var(--gris-500)",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }}
>
  {/* ── PELOTA IZQUIERDA ── */}
  <div className="footer-ball-track" style={{ width: 22, height: 40, flexShrink: 0, marginTop: 8, marginRight: 8 }}>
    <div className="footer-bouncing-ball">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#E8772E" stroke="#1a1a1a" strokeWidth="0.5" />
        <path d="M12 1v22M1 12h22M4 4c3 3 3 13 0 16M20 4c-3 3-3 13 0 16" stroke="#1a1a1a" strokeWidth="1.1" fill="none" />
      </svg>
      <div className="footer-ball-shadow" />
    </div>
  </div>

  <span>
    Unicaja Avanzado
    {temporadaActiva ? ` · Temporada ${temporadaActiva.nombre}` : ""} ·{" "}
    <Link
      to="/sobre-mi"
      style={{ color: "var(--verde)", textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
    >
      Desarrollado por David Jiménez
    </Link>
  </span>

  {/* ── PELOTA DERECHA ── */}
  <div className="footer-ball-track" style={{ width: 22, height: 40, flexShrink: 0, marginTop: 8, marginLeft: 6 }}>
    <div className="footer-bouncing-ball">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#E8772E" stroke="#1a1a1a" strokeWidth="0.5" />
        <path d="M12 1v22M1 12h22M4 4c3 3 3 13 0 16M20 4c-3 3-3 13 0 16" stroke="#1a1a1a" strokeWidth="1.1" fill="none" />
      </svg>
      <div className="footer-ball-shadow" />
    </div>
  </div>

  <style>{`
    .footer-ball-track { container-type: inline-size; }
    .footer-bouncing-ball { position: relative; width: 18px; }
    .footer-bouncing-ball svg {
      animation: footerBounceY 0.8s cubic-bezier(.5,0,.8,.5) infinite alternate;
      display: block;
    }
    .footer-ball-shadow {
      position: absolute;
      bottom: -4px; left: 0;
      width: 18px; height: 3px;
      border-radius: 50%;
      background: rgba(0,0,0,0.4);
      animation: footerShadowPulse 0.8s cubic-bezier(.5,0,.8,.5) infinite alternate;
    }
    @keyframes footerBounceY {
      0%   { transform: translateY(0); }
      100% { transform: translateY(-20px); }
    }
    @keyframes footerShadowPulse {
      0%   { opacity: 0.4; transform: scale(1); }
      100% { opacity: 0.12; transform: scale(0.55); }
    }
  `}</style>
</footer>
    </div>
  );
}
