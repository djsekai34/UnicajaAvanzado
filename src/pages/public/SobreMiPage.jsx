import { Link } from "react-router-dom";
import { useEffect } from "react";

const STATS_PROYECTO = [
  { label: "Competiciones cubiertas", value: "5" },
  { label: "Métricas avanzadas", value: "20+" },
  { label: "Jugadores analizados", value: "14" },
];

const CONTACTOS = [
  {
    label: "Email",
    value: "davidjimenezvillena@gmail.com",
    short: "Escríbeme",
    href: "mailto:davidjimenezvillena@gmail.com",
    color: "var(--verde)",
    dorsal: "01",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    value: "github.com/djsekai34",
    short: "Mi código",
    href: "https://github.com/djsekai34",
    color: "var(--lima)",
    dorsal: "02",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.27 7.78 10.77.57.1.78-.25.78-.55v-2.15c-3.16.69-3.83-1.34-3.83-1.34-.52-1.3-1.27-1.65-1.27-1.65-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.52-.29-5.17-1.26-5.17-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.16a10.9 10.9 0 0 1 5.72 0c2.18-1.47 3.14-1.16 3.14-1.16.62 1.57.23 2.73.11 3.02.73.79 1.17 1.8 1.17 3.04 0 4.35-2.66 5.31-5.19 5.59.41.36.77 1.06.77 2.14v3.17c0 .3.21.66.79.55A11.04 11.04 0 0 0 23.02 11.5C23.02 5.24 18.27.5 12 .5Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    value: "David Jimenez Villena",
    short: "Conectemos",
    href: "https://www.linkedin.com/in/david-jimenez-villena/",
    color: "#60A5FA",
    dorsal: "03",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.15 1.45-2.15 2.94v5.66H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    value: "djvportfolio.vercel.app",
    short: "Mi web",
    href: "https://djvportfolio.vercel.app",
    color: "#F59E0B",
    dorsal: "04",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
    ),
  },
];

export default function SobreMiPage() {
  // Scroll al top al entrar en la página (ej. desde el footer)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div>
      <Link
        to="/"
        style={{
          color: "var(--gris-500)",
          fontSize: 13,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 28,
        }}
      >
        ← Volver a estadísticas
      </Link>

      {/* Header tipo "ficha de jugador" */}
      <div className="card" style={{ marginBottom: 24, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            position: "absolute", top: 0, right: 0, width: 180, height: 180,
            background: "radial-gradient(circle, var(--verde) 0%, transparent 70%)",
            opacity: 0.12, pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>
                David Jiménez Villena
              </div>
              <span className="badge badge-acb">Creador</span>
            </div>
            <div style={{ fontSize: 14, color: "var(--gris-400)", marginTop: 6 }}>
              Desarrollador Web Junior
            </div>
          </div>
        </div>

        {/* Mini stat-grid del proyecto, estilo ficha de jugador */}
        <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          {STATS_PROYECTO.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--lima)" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--gris-500)", textTransform: "uppercase", letterSpacing: ".6px", marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}

          {/* ── PELOTA ── cambia marginTop para bajarla/subirla dentro de la fila */}
          <div className="ball-track" style={{ width: 40, height: 60, flexShrink: 0, alignSelf: 'flex-start', marginTop: 23 }}>
            <div className="bouncing-ball">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#E8772E" stroke="#1a1a1a" strokeWidth="0.5" />
                <path d="M12 1v22M1 12h22M4 4c3 3 3 13 0 16M20 4c-3 3-3 13 0 16" stroke="#1a1a1a" strokeWidth="1.1" fill="none" />
              </svg>
              <div className="ball-shadow" />
            </div>
            <style>{`
              .ball-track { container-type: inline-size; }
              .bouncing-ball { position: relative; width: 26px; }
              .bouncing-ball svg {
                animation: ballBounceY 0.7s cubic-bezier(.5,0,.8,.5) infinite alternate;
                display: block;
              }
              .ball-shadow {
                position: absolute;
                bottom: -6px; left: 0;
                width: 26px; height: 5px;
                border-radius: 50%;
                background: rgba(0,0,0,0.4);
                animation: shadowPulse 0.7s cubic-bezier(.5,0,.8,.5) infinite alternate;
              }
              @keyframes ballBounceY {
                0%   { transform: translateY(0); }
                100% { transform: translateY(-30px); }
              }
              @keyframes shadowPulse {
                0%   { opacity: 0.4; transform: scale(1); }
                100% { opacity: 0.15; transform: scale(0.6); }
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Sobre el proyecto */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--verde)", marginBottom: 16 }}>
          Sobre Unicaja Avanzado
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderLeft: "3px solid var(--verde)", paddingLeft: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--blanco)", marginBottom: 4 }}>El origen</div>
            <p style={{ fontSize: 14, color: "var(--gris-300)", lineHeight: 1.7, margin: 0 }}>
              Unicaja Avanzado nació como proyecto personal inspirado en la cuenta y pagina web de{" "}
              <a href="https://www.rincondelmanager.com/smgr/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--blanco)", textDecoration: "underline" }}>
                El Rincón del SuperManager
              </a>
              . Su objetivo es traer al equipo un conjunto completo de métricas avanzadas similares a las que
              se usan en la NBA — TS%, PER, BPM, Win Shares, y aproximaciones a métricas de impacto como
              RAPTOR o LEBRON — aplicadas a la plantilla del Unicaja en ACB, BCL y el resto de competiciones
              de la temporada.
            </p>
          </div>

          <div style={{ borderLeft: "3px solid var(--lima)", paddingLeft: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--blanco)", marginBottom: 4 }}>Por qué existe</div>
            <p style={{ fontSize: 14, color: "var(--gris-300)", lineHeight: 1.7, margin: 0 }}>
              Es información que normalmente echamos en falta: la web oficial de la ACB y la mayoría de
              medios no la ofrecen, y solo se encuentra de forma parcial en sitios como{" "}
              <a href="https://www.rincondelmanager.com/smgr/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--blanco)", textDecoration: "underline" }}>
                El Rincón del SuperManager
              </a>
              . Aquí puedes consultar las estadísticas básicas y avanzadas de cada jugador, compararlas
              entre ellos y seguir su evolución partido a partido a lo largo de la temporada.
            </p>
          </div>

          <div style={{ borderLeft: "3px solid var(--gris-600)", paddingLeft: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--blanco)", marginBottom: 4 }}>El objetivo final</div>
            <p style={{ fontSize: 14, color: "var(--gris-300)", lineHeight: 1.7, margin: 0 }}>
              Que al terminar la temporada se pueda valorar, con datos y no solo con sensaciones, quién ha
              sido el jugador más completo y quién más ha aportado al equipo — una referencia más a la hora
              de decidir qué piezas merece la pena mantener de cara al futuro, o que jugadores han sido los más determinantes en cada competición, para poder opinar sobre la plantilla y el proyecto deportivo con un poco más de fundamento.
            </p>
          </div>

          <div style={{ borderLeft: "3px solid var(--gris-600)", paddingLeft: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--blanco)", marginBottom: 4 }}>Gratis y sin publicidad</div>
            <p style={{ fontSize: 14, color: "var(--gris-300)", lineHeight: 1.7, margin: 0 }}>
              Este proyecto es completamente gratuito, sin anuncios, hecho por amor al baloncesto y al
              Unicaja. Si te resulta útil y quieres echarme una mano, lo más valioso para mí es que me
              recomiendes a alguna empresa que esté buscando perfil junior, o que me dejes feedback y
              propuestas de nuevas métricas o mejoras.
            </p>
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="card">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--verde)", marginBottom: 4 }}>
          Mi plantilla de contacto
        </h3>
        <p style={{ fontSize: 12, color: "var(--gris-500)", marginBottom: 20 }}>
          Elige tu canal favorito y fichamos
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {CONTACTOS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="contact-card"
              style={{ "--card-color": c.color }}
            >
              <div className="contact-stripe" />
              <div className="contact-top">
                <div className="contact-icon">{c.icon}</div>
                <div className="contact-dorsal">#{c.dorsal}</div>
              </div>
              <div className="contact-body">
                <div className="contact-short">{c.short}</div>
                <div className="contact-label">{c.label}</div>
              </div>
              <div className="contact-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        <style>{`
          .contact-card {
            position: relative;
            display: flex;
            flex-direction: column;
            background: var(--negro);
            border: 1px solid var(--gris-700);
            border-radius: var(--radius-lg, 14px);
            padding: 18px;
            text-decoration: none;
            overflow: hidden;
            transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
          }
          .contact-card:hover {
            transform: translateY(-4px);
            border-color: var(--card-color);
            box-shadow: 0 12px 24px -10px var(--card-color);
          }
          .contact-stripe {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 4px;
            background: var(--card-color);
          }
          .contact-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .contact-icon {
            width: 46px; height: 46px;
            border-radius: 50%;
            background: color-mix(in srgb, var(--card-color) 14%, transparent);
            border: 2px solid var(--card-color);
            display: flex; align-items: center; justify-content: center;
            color: var(--card-color);
            flex-shrink: 0;
          }
          .contact-dorsal {
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 22px;
            color: var(--gris-700);
            line-height: 1;
          }
          .contact-body { flex: 1; }
          .contact-short {
            font-size: 11px;
            color: var(--card-color);
            text-transform: uppercase;
            letter-spacing: .8px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .contact-label {
            font-size: 15px;
            font-weight: 700;
            color: var(--blanco);
            margin-bottom: 2px;
          }
          .contact-arrow {
            position: absolute;
            bottom: 16px; right: 16px;
            color: var(--gris-600);
            transition: color .18s ease, transform .18s ease;
          }
          .contact-card:hover .contact-arrow {
            color: var(--card-color);
            transform: translateX(3px);
          }
        `}</style>
      </div>
    </div>
  );
}