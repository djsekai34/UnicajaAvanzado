import { useState, useRef, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { usePublicData } from "../../hooks/usePublicData";
import FiltrosBar from "../../components/public/FiltrosBar";
import AniversarioBadge from "../../components/public/AniversarioBadge";
import EquipoRecordCard from "../../components/public/EquipoRecordCard";
import CapturaBoton from "../../components/public/CapturaBoton";

const COLORS = ["#4E9E47", "#9DC41A", "#5C2D91", "#FFFFFF"];

function rnd(v, d = 1) {
  return v != null ? Math.round(v * 10 ** d) / 10 ** d : null;
}

const METRICAS_COMP = [
  { key: "pts", label: "PTS", desc: "Puntos por partido", src: "stats" },
  { key: "rt", label: "REB", desc: "Rebotes por partido", src: "stats" },
  { key: "as_", label: "AST", desc: "Asistencias por partido", src: "stats" },
  { key: "rec", label: "REC", desc: "Recuperaciones", src: "stats" },
  { key: "tap", label: "TAP", desc: "Tapones", src: "stats" },
  { key: "val", label: "VAL", desc: "Valoración ACB", src: "stats" },
  {
    key: "plus_minus",
    label: "+/-",
    desc: "Diferencial en pista",
    src: "stats",
  },
  { key: "min", label: "MIN", desc: "Minutos", src: "stats" },
  {
    key: "ts_pct",
    label: "TS%",
    desc: "True Shooting %",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "efg_pct",
    label: "eFG%",
    desc: "Effective FG%",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "usg_pct",
    label: "USG%",
    desc: "Usage Rate",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "per",
    label: "PER",
    desc: "Player Efficiency Rating",
    src: "advanced",
  },
  {
    key: "bpm",
    label: "BPM",
    desc: "Box Plus/Minus",
    src: "advanced",
    fmt: (v) => (v != null ? (v > 0 ? "+" : "") + v : "—"),
  },
  { key: "ws", label: "WS", desc: "Win Shares", src: "advanced" },
  { key: "dws", label: "DWS", desc: "Defensive Win Shares", src: "advanced" },
  { key: "ows", label: "OWS", desc: "Offensive Win Shares", src: "advanced" },
  {
    key: "pf40",
    label: "FP/40",
    desc: "Faltas personales por 40 min",
    src: "advanced",
  },
  { key: "ortg", label: "ORTG", desc: "Offensive Rating", src: "advanced" },
  { key: "drtg", label: "DRTG", desc: "Defensive Rating", src: "advanced" },
  {
    key: "net_rating",
    label: "NRTG",
    desc: "Net Rating",
    src: "advanced",
    fmt: (v) => (v != null ? (v > 0 ? "+" : "") + v : "—"),
  },
  {
    key: "ast_pct",
    label: "AST%",
    desc: "Assist %",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "reb_pct",
    label: "REB%",
    desc: "Rebound %",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "tov_pct",
    label: "TOV%",
    desc: "Turnover %",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "ast_to",
    label: "AST/TO",
    desc: "Asistencias/Pérdidas",
    src: "advanced",
  },
  {
    key: "epm",
    label: "EPM",
    desc: "Estimated Plus/Minus",
    src: "advanced",
    fmt: (v) => (v != null ? (v > 0 ? "+" : "") + v : "—"),
  },
  {
    key: "raptor",
    label: "RAPTOR",
    desc: "RAPTOR (aprox.)",
    src: "advanced",
    fmt: (v) => (v != null ? (v > 0 ? "+" : "") + v : "—"),
  },
  {
    key: "lebron",
    label: "LEBRON",
    desc: "LEBRON (aprox.)",
    src: "advanced",
    fmt: (v) => (v != null ? (v > 0 ? "+" : "") + v : "—"),
  },
  {
    key: "win_pct_titular",
    label: "V% TIT",
    desc: "% victorias siendo titular",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "win_pct_suplente",
    label: "V% SUP",
    desc: "% victorias siendo suplente",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "aportacion_equipo_pct",
    label: "APORT%",
    desc: "% de la producción total del equipo (PTS+REB+AST+ROB+TAP) que pone",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
  {
    key: "minutos_equipo_pct",
    label: "MIN%",
    desc: "% de los minutos totales del equipo en la temporada que juega",
    src: "advanced",
    fmt: (v) => (v != null ? v + "%" : "—"),
  },
];

// Métricas que pueden ser negativas (+/-, ratings de impacto...). Solo se
// tratan de forma especial (escala relativa min-max) cuando entre los
// jugadores comparados hay de verdad algún valor negativo — si todos son
// positivos, se escalan igual que el resto (proporcional al máximo real).
const METRICAS_CON_SIGNO = new Set([
  "plus_minus",
  "bpm",
  "net_rating",
  "epm",
  "raptor",
  "lebron",
]);

const RADAR_KEYS = ["pts", "rt", "as_", "rec", "tap", "val"];
const RADAR_LABELS = ["PTS", "REB", "AST", "REC", "TAP", "VAL"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--gris-800)",
        border: "1px solid var(--gris-700)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function ComparadorPage() {
  const data = usePublicData();
  const { promediosPorJugador, jugadoresSeleccionados, jugadores, loading } =
    data;
  const temporadaActual = data.temporadas?.find(
    (t) => String(t.id) === String(data.temporadaId),
  );
  const temporadaNombre = temporadaActual?.nombre;
  const [seleccionados, setSeleccionados] = useState([]);
  const [vista, setVista] = useState("lista"); // 'lista' | 'cuadricula'
  const cuadriculaRef = useRef(null);
  const capturaBotonRef = useRef(null);

  // Antes de generar la captura, preguntamos con un modal propio si se
  // quieren mostrar las fotos de los jugadores en la imagen o no (dorsal
  // en su lugar). `capturaTrigger` es un contador que dispara la captura
  // de verdad una vez el estado ya se ha aplicado y el DOM se ha vuelto a
  // pintar con la opción elegida.
  const [modalCapturaAbierto, setModalCapturaAbierto] = useState(false);
  const [mostrarFotosCaptura, setMostrarFotosCaptura] = useState(true);
  const [capturandoUI, setCapturandoUI] = useState(false);
  const [capturaTrigger, setCapturaTrigger] = useState(0);

  useEffect(() => {
    if (capturaTrigger > 0) capturaBotonRef.current?.capturar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturaTrigger]);

  const elegirCaptura = (conFotos) => {
    setMostrarFotosCaptura(conFotos);
    setModalCapturaAbierto(false);
    setCapturandoUI(true);
    setCapturaTrigger((t) => t + 1);
  };

  const toggleSel = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  };

  const jugadoresComp = seleccionados
    .map((id) => promediosPorJugador[id])
    .filter(Boolean);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );

  // Radar data
  const radarData = RADAR_LABELS.map((label, i) => {
    const key = RADAR_KEYS[i];
    const punto = { metric: label };
    jugadoresComp.forEach((d) => {
      const nombre = d.jugador?.nombre?.split(" ")[0] || "?";
      punto[nombre] = rnd(d.stats[key]) || 0;
    });
    return punto;
  });

  const getVal = (d, m) => {
    if (m.src === "stats") return rnd(d.stats[m.key]);
    return d.advanced?.[m.key] ?? null;
  };

  const fmtVal = (m, v) => {
    if (v == null) return "—";
    if (m.fmt) return m.fmt(v);
    return v;
  };

  // Determinar mejor valor en cada métrica
  const bestIdx = (key, src) => {
    const vals = jugadoresComp.map((d) =>
      src === "stats" ? d.stats[key] || 0 : d.advanced?.[key] || 0,
    );
    const max = Math.max(...vals);
    return vals.indexOf(max);
  };

  // Ancho de la barra: proporcional al valor real respecto al máximo del
  // grupo (así 13 vs 16 se ve como 13 siendo el 81% de 16). Solo se usa la
  // escala relativa min-max cuando de verdad hay algún valor negativo entre
  // los comparados, porque ahí un ancho "real" no tiene sentido.
  const calcPct = (num, numVals, maxVal, minVal, range, esMetricaConSigno) => {
    if (num == null) return 5; // sin dato: mínimo gris, para distinguirlo de un 0 real
    if (num <= 0) return 0; // valor real 0 o negativo: la barra no se rellena nada
    const hayNegativos = numVals.some((x) => x != null && x < 0);
    if (esMetricaConSigno && hayNegativos) {
      return Math.max(((num - minVal) / range) * 100, 5);
    }
    return maxVal > 0 ? Math.max((num / maxVal) * 100, 4) : 50;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Comparador</h2>
          <p>Selecciona hasta 4 jugadores para comparar</p>
        </div>
        <AniversarioBadge temporadaNombre={temporadaNombre} />
      </div>

      <FiltrosBar
        {...data}
        extra={<EquipoRecordCard temporada={temporadaActual} />}
      />

      {/* Selector de jugadores para comparar */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div
          style={{ marginBottom: 12, fontSize: 13, color: "var(--gris-400)" }}
        >
          Seleccionados: {seleccionados.length}/4
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {jugadores
            .filter((j) => promediosPorJugador[j.id])
            .map((j, i) => (
              <button
                key={j.id}
                onClick={() => toggleSel(j.id)}
                className={`jugador-chip${seleccionados.includes(j.id) ? " selected" : ""}`}
                style={{
                  borderColor: seleccionados.includes(j.id)
                    ? COLORS[seleccionados.indexOf(j.id)]
                    : undefined,
                }}
              >
                {j.foto_url ? (
                  <img
                    src={j.foto_url}
                    alt={j.nombre}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    className="dorsal"
                    style={{
                      color: seleccionados.includes(j.id)
                        ? COLORS[seleccionados.indexOf(j.id)]
                        : "var(--verde)",
                    }}
                  >
                    #{j.dorsal}
                  </span>
                )}
                {j.nombre}
              </button>
            ))}
        </div>
        {seleccionados.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setSeleccionados([])}
          >
            ✕ Limpiar selección
          </button>
        )}
      </div>

      {jugadoresComp.length < 2 ? (
        <div className="empty-state card">
          <p>Selecciona al menos 2 jugadores para comparar.</p>
        </div>
      ) : (
        <>
          {/* Header con nombres */}
          <div
            className="compare-header-grid"
            style={{
              "--cols": jugadoresComp.length,
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div className="compare-header-placeholder" />
            {jugadoresComp.map((d, i) => (
              <div
                key={d.jugador.id}
                style={{
                  background: "var(--gris-800)",
                  border: `2px solid ${COLORS[i]}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: COLORS[i] + "22",
                    border: `2px solid ${COLORS[i]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS[i],
                    margin: "0 auto 10px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {d.jugador.foto_url ? (
                    <img
                      src={d.jugador.foto_url}
                      alt={d.jugador.nombre}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    d.jugador.dorsal
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--blanco)",
                    fontSize: 14,
                  }}
                >
                  {d.jugador.nombre}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--gris-500)",
                    marginTop: 2,
                  }}
                >
                  {d.jugador.posicion} · {d.partidos} partidos
                </div>
              </div>
            ))}
          </div>

          {/* Selector de vista: lista (una fila por métrica) o cuadrícula
              (tarjetas pequeñas, 3 por fila). Solo tiene sentido en PC — en
              móvil siempre se usa cuadrícula, así que el selector se oculta
              por CSS ahí. */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              className="compare-vista-selector"
              style={{ display: "flex", gap: 8 }}
            >
              <button
                type="button"
                className={`btn btn-sm ${vista === "lista" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setVista("lista")}
              >
                ☰ Lista
              </button>
              <button
                type="button"
                className={`btn btn-sm ${vista === "cuadricula" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setVista("cuadricula")}
              >
                ▦ Cuadrícula
              </button>
            </div>
            {/* La captura siempre se saca en formato cuadrícula, aunque
                ahora mismo estés viendo la lista — displayForzado se
                encarga de hacerla visible solo mientras se genera la
                imagen. */}
            <button
              type="button"
              className="btn btn-captura btn-sm"
              onClick={() => setModalCapturaAbierto(true)}
              disabled={capturandoUI}
            >
              {capturandoUI ? (
                <>
                  <span className="spinner" /> Generando...
                </>
              ) : (
                "📸 Descargar comparativa"
              )}
            </button>
            <CapturaBoton
              ref={capturaBotonRef}
              targetRef={cuadriculaRef}
              displayForzado="block"
              filename="comparativa-unicaja-avanzado"
              mostrarBoton={false}
              onDone={() => setCapturandoUI(false)}
            />
          </div>

          {/* Tabla comparativa */}
          <div
            className={`compare-vista-lista${vista !== "lista" ? " cv-oculto" : ""}`}
          >
            <div style={{ marginBottom: 28 }}>
              {METRICAS_COMP.map((m) => {
                const vals = jugadoresComp.map((d) => getVal(d, m));
                const numVals = vals.map((v) =>
                  typeof v === "number" ? v : null,
                );
                const maxVal = Math.max(...numVals.filter((v) => v != null));
                const minVal = Math.min(...numVals.filter((v) => v != null));
                const range = maxVal - minVal || 1;

                return (
                  <div key={m.key} className="compare-row">
                    <div className="compare-label">
                      <div style={{ fontWeight: 700, color: "var(--blanco)" }}>
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--gris-500)",
                          marginTop: 2,
                        }}
                      >
                        {m.desc}
                      </div>
                    </div>
                    <div className="compare-bars">
                      {jugadoresComp.map((d, i) => {
                        const v = getVal(d, m);
                        const num = typeof v === "number" ? v : null;
                        const pct = calcPct(
                          num,
                          numVals,
                          maxVal,
                          minVal,
                          range,
                          METRICAS_CON_SIGNO.has(m.key),
                        );
                        const isBest =
                          num === maxVal && jugadoresComp.length > 1;
                        return (
                          <div key={d.jugador.id} className="compare-bar-row">
                            <div
                              className="compare-name"
                              style={{
                                color: COLORS[i],
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {d.jugador.nombre.split(" ")[0]}
                            </div>
                            <div className="compare-bar-wrap">
                              <div
                                className="compare-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    num != null ? COLORS[i] : "var(--gris-700)",
                                  opacity: num != null ? 1 : 0.5,
                                }}
                              />
                            </div>
                            <div
                              className="compare-val"
                              style={{
                                color: isBest ? COLORS[i] : "var(--gris-300)",
                              }}
                            >
                              {fmtVal(m, v)}
                              {isBest ? " ★" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={cuadriculaRef}
            className={`compare-vista-cuadricula${vista !== "cuadricula" ? " cv-oculto" : ""}`}
          >
            {capturandoUI && mostrarFotosCaptura && (
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                {jugadoresComp.map(
                  (d, i) =>
                    d.jugador.foto_url && (
                      <div
                        key={d.jugador.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: `2px solid ${COLORS[i]}`,
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={d.jugador.foto_url}
                            alt={d.jugador.nombre}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: COLORS[i],
                          }}
                        >
                          {d.jugador.nombre.split(" ")[0]}
                        </span>
                      </div>
                    ),
                )}
              </div>
            )}
            <div className="compare-grid-cards" style={{ marginBottom: 28 }}>
              {METRICAS_COMP.map((m) => {
                const vals = jugadoresComp.map((d) => getVal(d, m));
                const numVals = vals.map((v) =>
                  typeof v === "number" ? v : null,
                );
                const maxVal = Math.max(...numVals.filter((v) => v != null));
                const minVal = Math.min(...numVals.filter((v) => v != null));
                const range = maxVal - minVal || 1;

                return (
                  <div key={m.key} className="compare-mini-card">
                    <div className="compare-mini-header">
                      <span className="compare-mini-label">{m.label}</span>
                      <span className="compare-mini-desc">{m.desc}</span>
                    </div>
                    <div className="compare-mini-vals">
                      {jugadoresComp.map((d, i) => {
                        const v = getVal(d, m);
                        const num = typeof v === "number" ? v : null;
                        const pct = calcPct(
                          num,
                          numVals,
                          maxVal,
                          minVal,
                          range,
                          METRICAS_CON_SIGNO.has(m.key),
                        );
                        const isBest =
                          num === maxVal && jugadoresComp.length > 1;
                        return (
                          <div key={d.jugador.id} className="compare-mini-row">
                            <span
                              className="compare-mini-nombre"
                              style={{ color: COLORS[i] }}
                            >
                              {d.jugador.nombre.split(" ")[0]}
                            </span>
                            {/* Solo visible en PC — en móvil se oculta por CSS */}
                            <span className="compare-mini-bar-wrap">
                              <span
                                className="compare-mini-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    num != null ? COLORS[i] : "var(--gris-700)",
                                  opacity: num != null ? 1 : 0.5,
                                }}
                              />
                            </span>
                            <span
                              className="compare-mini-val"
                              style={{
                                color: isBest ? COLORS[i] : "var(--gris-300)",
                              }}
                            >
                              {fmtVal(m, v)}
                              {isBest ? " ★" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar */}
          <div className="chart-card">
            <h3>Radar comparativo</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--gris-700)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "var(--gris-400)", fontSize: 12 }}
                />
                {jugadoresComp.map((d, i) => {
                  const nombre = d.jugador?.nombre?.split(" ")[0] || "?";
                  return (
                    <Radar
                      key={d.jugador.id}
                      name={nombre}
                      dataKey={nombre}
                      stroke={COLORS[i]}
                      fill={COLORS[i]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  );
                })}
                <Legend
                  wrapperStyle={{ fontSize: 13, color: "var(--gris-300)" }}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {modalCapturaAbierto && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setModalCapturaAbierto(false)
          }
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Descargar comparativa</h3>
              <button
                className="btn-close"
                onClick={() => setModalCapturaAbierto(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--gris-400)", marginBottom: 18 }}>
                ¿Quieres que salgan las fotos de los jugadores y su nombre en la
                imagen? Así se vería cada opción:
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 36,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      margin: "0 auto 8px",
                      border: "2px solid var(--verde)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: jugadoresComp[0]?.jugador.foto_url
                        ? "transparent"
                        : "var(--gris-700)",
                    }}
                  >
                    {jugadoresComp[0]?.jugador.foto_url ? (
                      <img
                        src={jugadoresComp[0].jugador.foto_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ color: "var(--verde)", fontWeight: 700 }}>
                        #{jugadoresComp[0]?.jugador.dorsal}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--blanco)",
                      marginBottom: 2,
                    }}
                  >
                    {jugadoresComp[0]?.jugador.nombre || "Nombre"}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--gris-400)" }}>
                    Con fotos y nombres
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      margin: "0 auto 8px",
                      border: "2px dashed var(--gris-600)",
                      background: "var(--gris-800)",
                      fontSize: 11,
                      color: "var(--gris-500)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    #--
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--gris-500)",
                      marginBottom: 2,
                    }}
                  >
                    (Sin nombre)
                  </div>
                  <span style={{ fontSize: 11, color: "var(--gris-400)" }}>
                    Sin fotos y nombres
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => elegirCaptura(false)}
                >
                  Sin fotos y nombres
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => elegirCaptura(true)}
                >
                  Con fotos y nombres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
