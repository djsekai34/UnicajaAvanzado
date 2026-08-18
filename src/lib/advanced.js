/**
 * UNICAJA ADVANCED STATS ENGINE
 * ─────────────────────────────
 * Todas las métricas se calculan a partir de las stats básicas del box score.
 * Los totales de equipo se obtienen sumando las stats individuales de todos
 * los jugadores del partido.
 *
 * Constantes de referencia (ACB / Euroliga aproximadas):
 *   - Ritmo medio:        75 posesiones por 40 min
 *   - Puntos por posesión: 1.05
 *   - DRB% de liga:       0.73
 *   - FG% de liga:        0.46
 *   - FT% de liga:        0.75
 *   - FTA/FG de liga:     0.30
 */

// ─── CONSTANTES DE LIGA (ACB/BCL aproximadas) ───────────────────────────────
const LG = {
  PTS_PER_POSS:   1.05,   // puntos por posesión
  PACE:           75,      // posesiones por 40 min
  DRB_PCT:        0.73,    // % rebotes defensivos de liga
  FT_RATE:        0.30,    // FTA / FGA de liga
  FT_PCT:         0.75,    // % TL de liga
  FG_PCT:         0.46,    // % tiros de liga
  AST_FG_RATIO:   0.58,    // asistencias / FGM de liga
  GAME_MINUTES:   40,      // minutos por partido (ACB/BCL = 40, NBA = 48)
}

// ─── HELPER: posesiones individuales estimadas ───────────────────────────────
function estimatePoss(p) {
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fta = p.tl_intentos || 0
  const tov = p.per || 0
  const orb = p.ro || 0
  return fga - orb + 0.44 * fta + tov - fgm * 0 + 0.001
}

// ─── HELPER: totales de equipo sumando jugadores del partido ─────────────────
export function calcTeamTotals(jugadoresStats) {
  return jugadoresStats.reduce((acc, p) => {
    acc.min          += p.min          || 0
    acc.pts          += p.pts          || 0
    acc.t2_anotados  += p.t2_anotados  || 0
    acc.t2_intentos  += p.t2_intentos  || 0
    acc.t3_anotados  += p.t3_anotados  || 0
    acc.t3_intentos  += p.t3_intentos  || 0
    acc.tl_anotados  += p.tl_anotados  || 0
    acc.tl_intentos  += p.tl_intentos  || 0
    acc.ro           += p.ro           || 0
    acc.rd           += p.rd           || 0
    acc.rt           += p.rt           || 0
    acc.as_          += p.as_          || 0
    acc.per          += p.per          || 0
    acc.rec          += p.rec          || 0
    acc.tap          += p.tap          || 0
    acc.tr           += p.tr           || 0
    acc.fp           += p.fp           || 0
    acc.fr           += p.fr           || 0
    acc.val          += p.val          || 0
    return acc
  }, {
    min:0, pts:0, t2_anotados:0, t2_intentos:0,
    t3_anotados:0, t3_intentos:0, tl_anotados:0, tl_intentos:0,
    ro:0, rd:0, rt:0, as_:0, per:0, rec:0, tap:0, tr:0, fp:0, fr:0, val:0
  })
}

// ────────────────────────────────────────────────────────────────────────────
//  1. TS% — True Shooting Percentage
//     Fórmula: PTS / (2 * (FGA + 0.44 * FTA))
//  Referencia: Basketball-Reference
// ────────────────────────────────────────────────────────────────────────────
export function calcTS(p) {
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const fta = p.tl_intentos || 0
  const pts = p.pts || 0
  const denom = 2 * (fga + 0.44 * fta)
  if (denom === 0) return null
  return round(pts / denom * 100, 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  2. eFG% — Effective Field Goal Percentage
//     Fórmula: (FGM + 0.5 * 3PM) / FGA
//  Referencia: Basketball-Reference
// ────────────────────────────────────────────────────────────────────────────
export function calcEFG(p) {
  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const t3m = p.t3_anotados || 0
  if (fga === 0) return null
  return round((fgm + 0.5 * t3m) / fga * 100, 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  3. USG% — Usage Rate
//     Fórmula: 100 * ((FGA + 0.44*FTA + TOV) * (TmMP/5)) / (MP * (TmFGA + 0.44*TmFTA + TmTOV))
//     Sin datos de equipo: estimación individual normalizada
//  Referencia: Basketball-Reference
// ────────────────────────────────────────────────────────────────────────────
export function calcUSG(p, team) {
  const fga  = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const fta  = p.tl_intentos || 0
  const tov  = p.per || 0
  const mp   = p.min || 0
  if (mp === 0) return null

  if (team && team.min > 0) {
    const tmFGA = (team.t2_intentos || 0) + (team.t3_intentos || 0)
    const tmFTA = team.tl_intentos || 0
    const tmTOV = team.per || 0
    const tmMP  = team.min
    const num = (fga + 0.44 * fta + tov) * (tmMP / 5)
    const den = mp * (tmFGA + 0.44 * tmFTA + tmTOV)
    if (den === 0) return null
    return round(100 * num / den, 1)
  }

  // Estimación sin datos de equipo
  const poss = fga + 0.44 * fta + tov
  return round(Math.min((poss / mp) * LG.GAME_MINUTES / LG.PACE * 100 * 5, 45), 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  4. AST% — Assist Percentage
//     Fórmula: 100 * AST / ((MP / (TmMP/5)) * TmFGM - FGM)
//  Referencia: Basketball-Reference
// ────────────────────────────────────────────────────────────────────────────
export function calcASTPct(p, team) {
  const ast = p.as_ || 0
  const mp  = p.min || 0
  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  if (mp === 0) return null

  if (team && team.min > 0) {
    const tmFGM = (team.t2_anotados || 0) + (team.t3_anotados || 0)
    const tmMP  = team.min
    const denom = (mp / (tmMP / 5)) * tmFGM - fgm
    if (denom <= 0) return null
    return round(100 * ast / denom, 1)
  }

  // Estimación
  const possPlayed = mp / LG.GAME_MINUTES
  const estTmFGM = possPlayed * LG.PACE * LG.FG_PCT
  const denom = Math.max(estTmFGM - fgm, 1)
  return round(Math.min(100 * ast / denom, 60), 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  5. REB% — Rebound Percentage
//     Fórmula: 100 * (REB * TmMP/5) / (MP * (TmREB + OppREB))
//  Sin opp data: estimación asumiendo simetría defensiva
// ────────────────────────────────────────────────────────────────────────────
export function calcREBPct(p, team) {
  return _rebPct(p.rt || 0, p.min, team ? team.rt : null, p.min)
}
export function calcOREBPct(p, team) {
  return _rebPct(p.ro || 0, p.min, team ? team.ro : null, p.min)
}
export function calcDREBPct(p, team) {
  return _rebPct(p.rd || 0, p.min, team ? team.rd : null, p.min)
}

function _rebPct(reb, mp, tmReb, playerMP) {
  if (!mp || mp === 0) return null
  if (tmReb && tmReb > 0) {
    // Estimación: asumimos opp rebounds ≈ tmReb (simetría)
    const oppREB = tmReb
    const denom = playerMP * (tmReb + oppREB)
    if (denom === 0) return null
    return round(100 * (reb * (mp / 5)) / denom, 1)
  }
  // Sin datos de equipo
  const possMin = mp / LG.GAME_MINUTES
  const estAvailReb = possMin * LG.PACE * (1 - LG.FG_PCT) * 2
  return round(Math.min(100 * reb / Math.max(estAvailReb, 1), 35), 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  6. TOV% — Turnover Percentage
//     Fórmula: 100 * TOV / (FGA + 0.44*FTA + TOV)
//  Referencia: Basketball-Reference
// ────────────────────────────────────────────────────────────────────────────
export function calcTOVPct(p) {
  const tov = p.per || 0
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const fta = p.tl_intentos || 0
  const denom = fga + 0.44 * fta + tov
  if (denom === 0) return null
  return round(100 * tov / denom, 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  7. AST/TO — Ratio asistencias / pérdidas
// ────────────────────────────────────────────────────────────────────────────
export function calcASTTO(p) {
  const ast = p.as_ || 0
  const tov = p.per || 0
  // Sin pérdidas: mostramos las asistencias directamente con símbolo ∞
  // pero numéricamente limitamos a las AST para no distorsionar
  if (tov === 0) return ast > 0 ? ast : null
  return round(ast / tov, 2)
}

// ────────────────────────────────────────────────────────────────────────────
//  8. PER — Player Efficiency Rating (Hollinger completo)
//     uPER = (1/MP) * [3P + (2/3)*AST + (2 - factor*(TmAST/TmFG))*FG
//             + (FT*0.5*(1+(1-(TmAST/TmFG))+(2/3)*(TmAST/TmFG)))
//             - VOP*TOV - VOP*DRB%*(FGA-FG)
//             - VOP*0.44*(0.44+0.56*DRB%)*(FTA-FT)
//             + VOP*(1-DRB%)*(TRB-ORB) + VOP*DRB%*ORB
//             + VOP*STL + VOP*DRB%*BLK
//             - PF*((lgFT/lgPF) - 0.44*(lgFTA/lgPF)*VOP)]
//  Referencia: Basketball-Reference / Hollinger
// ────────────────────────────────────────────────────────────────────────────
export function calcPER(p, team) {
  const mp  = p.min || 0
  if (mp === 0) return null

  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const t3m = p.t3_anotados || 0
  const ftm = p.tl_anotados || 0
  const fta = p.tl_intentos || 0
  const ast = p.as_  || 0
  const tov = p.per  || 0
  const orb = p.ro   || 0
  const trb = p.rt   || 0
  const stl = p.rec  || 0
  const blk = p.tap  || 0
  const pf  = p.fp   || 0

  // Constantes de liga
  const VOP    = LG.PTS_PER_POSS
  const DRBpct = LG.DRB_PCT
  const lgFTr  = LG.FT_RATE   // FTA/FGA liga
  const lgFTpct= LG.FT_PCT

  // Factor de asistencias de equipo
  let tmASTratio = LG.AST_FG_RATIO
  if (team && team.as_ > 0 && (team.t2_anotados + team.t3_anotados) > 0) {
    tmASTratio = team.as_ / ((team.t2_anotados || 0) + (team.t3_anotados || 0))
  }
  const factor = 2/3 - (0.5 * tmASTratio) / (2 * tmASTratio)

  // Constantes FT de liga por falta
  const lgFTperPF  = lgFTpct * 2
  const lgFTAperPF = 2

  const uPER = (1 / mp) * (
    t3m
    + (2/3) * ast
    + (2 - factor * tmASTratio) * fgm
    + (ftm * 0.5 * (1 + (1 - tmASTratio) + (2/3) * tmASTratio))
    - VOP * tov
    - VOP * DRBpct * (fga - fgm)
    - VOP * 0.44 * (0.44 + 0.56 * DRBpct) * (fta - ftm)
    + VOP * (1 - DRBpct) * (trb - orb)
    + VOP * DRBpct * orb
    + VOP * stl
    + VOP * DRBpct * blk
    - pf * (lgFTperPF - 0.44 * lgFTAperPF * VOP)
  )

  // Ajuste de ritmo (normalizamos a ritmo de liga)
  const paceFactor = LG.PACE / LG.PACE // = 1 sin datos reales de pace
  const aPER = paceFactor * uPER

  // Normalizar a media 15 (factor empírico ACB ≈ 0.22)
  const lgAvgUPER = 0.22
  if (lgAvgUPER === 0) return null
  const PER = aPER * (15 / lgAvgUPER)
  return round(Math.max(PER, -10), 1)
}

// ────────────────────────────────────────────────────────────────────────────
//  9. ORTG — Offensive Rating (puntos producidos por 100 posesiones individuales)
//     Basado en Dean Oliver "Basketball on Paper"
// ────────────────────────────────────────────────────────────────────────────
export function calcORTG(p, team) {
  const mp  = p.min || 0
  if (mp === 0) return null

  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const t3m = p.t3_anotados || 0
  const ftm = p.tl_anotados || 0
  const fta = p.tl_intentos || 0
  const ast = p.as_ || 0
  const orb = p.ro  || 0
  const tov = p.per || 0
  const pts = p.pts || 0

  // Puntos producidos
  let qAST = 0.5
  if (team && team.min > 0) {
    const tmFGM = (team.t2_anotados || 0) + (team.t3_anotados || 0)
    const tmAST = team.as_ || 0
    qAST = ((mp / (team.min / 5)) * (1.14 * ((tmAST - ast) / tmFGM))) /
           ((fga - orb * 0.33) / (fgm || 1))
    qAST = Math.min(Math.max(qAST, 0), 1)
  }

  const ptsProd = (
    2 * (fgm + 0.5 * t3m) * (1 - 0.5 * qAST)
    + 2 * ((ast / 2) * (2 * LG.FG_PCT))
    + ftm
  )

  // Posesiones individuales
  const FGpart  = fga * (1 - (1 - (fgm / Math.max(fga, 1))) ** 2 * LG.FT_RATE)
  const FTpart  = 0.4 * fta
  const TMpart  = tov
  const poss    = FGpart + FTpart + TMpart
  if (poss === 0) return null

  return round((ptsProd / poss) * 100, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 10. DRTG — Defensive Rating (puntos permitidos por 100 posesiones individuales)
//     Estimación basada en Oliver: DRtg ≈ TeamDRtg + corrección individual
// ────────────────────────────────────────────────────────────────────────────
export function calcDRTG(p, team, puntosRival) {
  const mp  = p.min || 0
  if (mp === 0) return null

  const stl = p.rec || 0
  const blk = p.tap || 0
  const drb = p.rd  || 0
  const pf  = p.fp  || 0

  // Base: DRtg del equipo estimado desde puntos del rival
  let teamDRTG = 105 // valor de liga por defecto
  if (team && team.min > 0 && puntosRival != null) {
    const tmPoss = estimateTeamPoss(team)
    if (tmPoss > 0) teamDRTG = (puntosRival / tmPoss) * 100
  }

  // Stops individuales (Oliver)
  const stopsP1 = stl + blk * (1 - LG.DRB_PCT) + drb * 0.5
  const stopsP2 = (pf * LG.FT_PCT * 0.44)
  const dPoss   = mp / (team ? (team.min / 5) : LG.GAME_MINUTES) * LG.PACE * 0.2

  const stopPct = dPoss > 0 ? (stopsP1 - stopsP2) / dPoss : 0
  const adjFactor = 1 - stopPct * 0.15

  return round(teamDRTG * adjFactor, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 11. Net Rating = ORTG - DRTG
// ────────────────────────────────────────────────────────────────────────────
export function calcNetRating(ortg, drtg) {
  if (ortg == null || drtg == null) return null
  return round(ortg - drtg, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 12. BPM — Box Plus/Minus
//     Aproximación de Myers con coeficientes box score:
//     BPM ≈ -2.81 + 0.125*PTS/36 + 0.368*TRB/36 + 0.688*AST/36
//            + 1.354*STL/36 + 0.734*BLK/36 - 0.968*TOV/36
//            - 0.365*(FGA-FGM)/36 - 0.182*(FTA-FTM)/36 + 0.043*3PM/36
//     Referencia: Basketball-Reference / Daniel Myers
// ────────────────────────────────────────────────────────────────────────────
export function calcBPM(p) {
  const mp = p.min || 0
  if (mp < 1) return null

  const per36 = (x) => (x / mp) * 36

  const pts  = per36(p.pts || 0)
  const trb  = per36(p.rt  || 0)
  const ast  = per36(p.as_ || 0)
  const stl  = per36(p.rec || 0)
  const blk  = per36(p.tap || 0)
  const tov  = per36(p.per || 0)
  const fgm  = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fga  = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const ftm  = p.tl_anotados || 0
  const fta  = p.tl_intentos || 0
  const t3m  = p.t3_anotados || 0
  const missedFG = per36(fga - fgm)
  const missedFT = per36(fta - ftm)
  const threes   = per36(t3m)

  const bpm = -2.81
    + 0.125  * pts
    + 0.368  * trb
    + 0.688  * ast
    + 1.354  * stl
    + 0.734  * blk
    - 0.968  * tov
    - 0.365  * missedFG
    - 0.182  * missedFT
    + 0.043  * threes

  return round(bpm, 2)
}

// ────────────────────────────────────────────────────────────────────────────
// 13. Win Shares (WS) y WS/40
//     OWS = (PtsProd - 0.92 * LgPtsPoss * IndPoss) / MargPtsWin
//     DWS = (PlayerMin/TmMin) * TmDWS   →  estimado
//     WS/40 = WS / MinutosJugados * 40
//  Referencia: Basketball-Reference / Oliver (adaptado a partidos de 40 min)
// ────────────────────────────────────────────────────────────────────────────
export function calcWS(p, team, puntosRival, totalJuegos) {
  const mp  = p.min || 0
  if (mp === 0) return { ws: null, ws40: null }

  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const t3m = p.t3_anotados || 0
  const ftm = p.tl_anotados || 0
  const fta = p.tl_intentos || 0
  const ast = p.as_ || 0
  const orb = p.ro  || 0
  const trb = p.rt  || 0
  const stl = p.rec || 0
  const blk = p.tap || 0
  const tov = p.per || 0
  const pf  = p.fp  || 0

  const VOP = LG.PTS_PER_POSS
  const DRBpct = LG.DRB_PCT

  // Puntos producidos individuales (Oliver)
  const ptsProd = 2 * (fgm + 0.5 * t3m) + ftm + 0.5 * ast * 2 * LG.FG_PCT

  // Posesiones individuales
  const indPoss = fga - orb * (1 - DRBpct) + 0.44 * fta + tov

  // Marginal offense
  const margOffense = ptsProd - VOP * indPoss

  // Marginal points per win (Oliver: ≈ 0.32 * avgPPG_both_teams)
  const avgPPG   = team ? (team.pts || 80) : 80
  const margPtsWin = 0.32 * (avgPPG + (puntosRival || 80))

  const OWS = margOffense / Math.max(margPtsWin, 1)

  // Defensive WS estimado desde stops individuales
  const tmMP = team ? team.min : mp * 5
  const dStops = stl + blk * (1 - DRBpct) + trb * DRBpct * 0.5
  const tmDWS  = 0.25  // DWS típico del equipo por partido estimado
  const DWS    = (mp / tmMP) * tmDWS + (dStops / Math.max(mp, 1)) * 0.5

  const WS   = OWS + DWS
  const WS40 = (WS / mp) * 40

  return {
    ws:   round(WS, 3),
    ws40: round(WS40, 3),
    dws:  round(DWS, 3),
    ows:  round(OWS, 3),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 13b. PF/40 — Faltas personales por 40 minutos
//      Fórmula: FP / MIN * 40
//      Dato exacto, no requiere estimación: cuantas más faltas por 40 min,
//      más "indisciplinado" defensivamente (o más agresivo) es el jugador.
// ────────────────────────────────────────────────────────────────────────────
export function calcPF40(p) {
  const mp = p.min || 0
  const pf = p.fp  || 0
  if (mp === 0) return null
  return round((pf / mp) * 40, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 14. EPM — Estimated Plus/Minus (aproximación box-score a RPM/EPM)
//     Basado en los coeficientes públicos de EPM de dunksandthrees.com
//     EPM ≈ coef * stats_per_poss + intercepto
//  Referencia: dunksandthrees.com / Jacob Goldstein EPM
// ────────────────────────────────────────────────────────────────────────────
export function calcEPM(p) {
  const mp = p.min || 0
  if (mp < 1) return null

  const poss = Math.max(estimatePoss(p), 1)
  const pp = (x) => (x / poss) * 100 // por 100 posesiones

  const pts = pp(p.pts || 0)
  const ast = pp(p.as_ || 0)
  const orb = pp(p.ro  || 0)
  const drb = pp(p.rd  || 0)
  const stl = pp(p.rec || 0)
  const blk = pp(p.tap || 0)
  const tov = pp(p.per || 0)
  const fga = (p.t2_intentos || 0) + (p.t3_intentos || 0)
  const fgm = (p.t2_anotados || 0) + (p.t3_anotados || 0)
  const fta = p.tl_intentos || 0
  const ts  = calcTS(p) || 50

  // Coeficientes aproximados EPM (ofensivos y defensivos)
  const OEPM =
    + 0.082  * pts
    + 0.124  * ast
    + 0.062  * orb
    - 0.145  * tov
    + 0.021  * (ts - 55)
    - 1.2

  const DEPM =
    + 0.198  * stl
    + 0.082  * blk
    + 0.065  * drb
    - 0.5

  return {
    oepm: round(OEPM, 2),
    depm: round(DEPM, 2),
    epm:  round(OEPM + DEPM, 2),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 15. RAPTOR (aproximación — FiveThirtyEight)
//     RAPTOR real requiere tracking; hacemos una aproximación box-score
//     RAPTOR ≈ combina BPM con ajuste de ritmo y rol
//  Referencia: FiveThirtyEight RAPTOR methodology
// ────────────────────────────────────────────────────────────────────────────
export function calcRAPTOR(p, team) {
  const mp = p.min || 0
  if (mp < 1) return null

  const usg   = calcUSG(p, team) || 20
  const bpm   = calcBPM(p)
  const ts    = calcTS(p) || 50
  const astto = calcASTTO(p)

  if (bpm == null) return null

  // Ajuste ofensivo: penalizamos baja eficiencia con alto uso
  const tsAdj   = (ts - 55) * 0.04
  const usgAdj  = (usg - 20) * 0.03

  // RAPTOR ofensivo
  const ORAPTOR = bpm * 0.65 + tsAdj + usgAdj

  // RAPTOR defensivo: más conservador (sin tracking)
  const stl36 = ((p.rec || 0) / mp) * 36
  const blk36 = ((p.tap || 0) / mp) * 36
  const drb36 = ((p.rd  || 0) / mp) * 36
  const DRAPTOR = -1.5 + stl36 * 0.38 + blk36 * 0.14 + drb36 * 0.07

  return {
    oraptor: round(ORAPTOR, 2),
    draptor: round(DRAPTOR, 2),
    raptor:  round(ORAPTOR + DRAPTOR, 2),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 16. LEBRON (aproximación — BBall-Index)
//     LEBRON real usa RAPM + role archetypes; aproximamos con box score
//     LEBRON ≈ 0.6 * BPM + 0.3 * EPM + 0.1 * PER_adj
// ────────────────────────────────────────────────────────────────────────────
export function calcLEBRON(p, team) {
  const mp = p.min || 0
  if (mp < 1) return null

  const bpm = calcBPM(p)
  const epm = calcEPM(p)
  const per = calcPER(p, team)

  if (bpm == null || epm == null) return null

  // Normalizar PER a escala BPM (PER 15 ≈ BPM 0)
  const perAdj = per != null ? (per - 15) / 5 : 0

  const OLEBRON = 0.55 * bpm + 0.35 * epm.oepm + 0.10 * perAdj
  const DLEBRON = 0.55 * (bpm * 0.3) + 0.45 * epm.depm

  return {
    olebron: round(OLEBRON, 2),
    dlebron: round(DLEBRON, 2),
    lebron:  round(OLEBRON + DLEBRON, 2),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 17. Tendencia VAL — Media móvil últimos N partidos
// ────────────────────────────────────────────────────────────────────────────
export function calcTendenciaVal(statsOrdenadas, n = 5) {
  if (!statsOrdenadas || statsOrdenadas.length === 0) return null
  const ultimos = statsOrdenadas.slice(-n)
  const suma = ultimos.reduce((acc, s) => acc + (s.val || 0), 0)
  return round(suma / ultimos.length, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 18. Dobles-dobles y Triples-dobles
// ────────────────────────────────────────────────────────────────────────────
export function calcDDs(statsArray) {
  let dd = 0, td = 0
  for (const s of statsArray) {
    const cats = [
      s.pts || 0,
      s.rt  || 0,
      s.as_ || 0,
      s.rec || 0,
      s.tap || 0,
    ].filter(v => v >= 10).length
    if (cats >= 3) td++
    else if (cats >= 2) dd++
  }
  return { dd, td }
}

// ────────────────────────────────────────────────────────────────────────────
// 19. % Aportación al equipo — qué parte de la "producción" total del
//     equipo (PTS+REB+AST+ROB+TAP) pone el jugador. Usa los totales de
//     equipo reales de los partidos que jugó (no una estimación).
// ────────────────────────────────────────────────────────────────────────────
export function calcAportacionEquipo(p, team) {
  if (!team) return null
  const jugador = (p.pts || 0) + (p.rt || 0) + (p.as_ || 0) + (p.rec || 0) + (p.tap || 0)
  const equipo  = (team.pts || 0) + (team.rt || 0) + (team.as_ || 0) + (team.rec || 0) + (team.tap || 0)
  if (equipo <= 0) return null
  return round(100 * jugador / equipo, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// 20. % Minutos del equipo — qué parte de los minutos TOTALES jugados por
//     el equipo a lo largo de la temporada/rango filtrado (suma de los
//     minutos de todos los jugadores en todos los partidos, no una media)
//     se lleva este jugador. Usa el TOTAL de minutos del jugador (suma de
//     todos sus partidos) sobre el TOTAL de minutos del equipo.
// ────────────────────────────────────────────────────────────────────────────
export function calcMinutosEquipoPct(minTotalJugador, minTotalEquipo) {
  if (!minTotalEquipo) return null
  return round(100 * (minTotalJugador || 0) / minTotalEquipo, 1)
}

// ────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — calcula todas las métricas para un jugador
// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// 14. % de victoria siendo titular vs siendo suplente
//     Dato exacto: cruza cada partido jugado (con su "titular" sí/no) con el
//     resultado real de ese partido (puntos_unicaja vs puntos_rival).
// ────────────────────────────────────────────────────────────────────────────
export function calcWinPctPorRol(statsJugador, partidos) {
  if (!statsJugador?.length || !partidos?.length) {
    return { win_pct_titular: null, win_pct_suplente: null, partidos_titular: 0, partidos_suplente: 0 }
  }

  const partidoById = Object.fromEntries(partidos.map(p => [p.id, p]))
  let winTit = 0, totTit = 0, winSup = 0, totSup = 0

  statsJugador.forEach(s => {
    const p = partidoById[s.partido_id]
    if (!p || p.puntos_unicaja == null || p.puntos_rival == null) return
    const gano = p.puntos_unicaja > p.puntos_rival
    if (s.titular) {
      totTit++
      if (gano) winTit++
    } else {
      totSup++
      if (gano) winSup++
    }
  })

  return {
    win_pct_titular:  totTit > 0 ? round((winTit / totTit) * 100, 1) : null,
    win_pct_suplente: totSup > 0 ? round((winSup / totSup) * 100, 1) : null,
    partidos_titular:  totTit,
    partidos_suplente: totSup,
  }
}

export function calcAllAdvanced(playerStats, teamStats, puntosRival, todosLosPartidosStats, partidos, minTotalEquipoTemporada = null) {
  const p    = playerStats
  const team = teamStats || null

  const ts   = calcTS(p)
  const efg  = calcEFG(p)
  const usg  = calcUSG(p, team)
  const astP = calcASTPct(p, team)
  const rebP = calcREBPct(p, team)
  const orebP= calcOREBPct(p, team)
  const drebP= calcDREBPct(p, team)
  const tovP = calcTOVPct(p)
  const asto = calcASTTO(p)
  const per  = calcPER(p, team)
  const ortg = calcORTG(p, team)
  const drtg = calcDRTG(p, team, puntosRival)
  const nrtg = calcNetRating(ortg, drtg)
  const bpm  = calcBPM(p)
  const { ws, ws40, dws, ows } = calcWS(p, team, puntosRival)
  const pf40 = calcPF40(p)
  const epm  = calcEPM(p)
  const raptor = calcRAPTOR(p, team)
  const lebron = calcLEBRON(p, team)

  // Tendencia y DD/TD requieren histórico
  const tendVal = todosLosPartidosStats
    ? calcTendenciaVal(todosLosPartidosStats)
    : null
  const { dd, td } = todosLosPartidosStats
    ? calcDDs(todosLosPartidosStats)
    : { dd: null, td: null }

  const winPorRol = calcWinPctPorRol(todosLosPartidosStats, partidos)
  const aportacionEquipo = calcAportacionEquipo(p, team)
  const minTotalJugador = todosLosPartidosStats
    ? todosLosPartidosStats.reduce((a, s) => a + (s.min || 0), 0)
    : null
  const minutosEquipoPct = calcMinutosEquipoPct(minTotalJugador, minTotalEquipoTemporada)

  return {
    // Tiro
    ts_pct:  ts,
    efg_pct: efg,
    // Uso y creación
    usg_pct:  usg,
    ast_pct:  astP,
    ast_to:   asto,
    tov_pct:  tovP,
    // Rebote
    reb_pct:  rebP,
    oreb_pct: orebP,
    dreb_pct: drebP,
    // Rating ofensivo/defensivo
    ortg,
    drtg,
    net_rating: nrtg,
    // Eficiencia global
    per,
    bpm,
    ws,
    ws40,
    dws,
    ows,
    pf40,
    // Métricas propietarias aproximadas
    epm:     epm?.epm     ?? null,
    oepm:    epm?.oepm    ?? null,
    depm:    epm?.depm    ?? null,
    raptor:  raptor?.raptor  ?? null,
    oraptor: raptor?.oraptor ?? null,
    draptor: raptor?.draptor ?? null,
    lebron:  lebron?.lebron  ?? null,
    olebron: lebron?.olebron ?? null,
    dlebron: lebron?.dlebron ?? null,
    // Histórico
    tendencia_val: tendVal,
    dobles_dobles: dd,
    triples_dobles: td,
    win_pct_titular:   winPorRol.win_pct_titular,
    win_pct_suplente:  winPorRol.win_pct_suplente,
    partidos_titular:  winPorRol.partidos_titular,
    partidos_suplente: winPorRol.partidos_suplente,
    // Peso en el equipo
    aportacion_equipo_pct: aportacionEquipo,
    minutos_equipo_pct:    minutosEquipoPct,
  }
}

// ─── HELPER privado ──────────────────────────────────────────────────────────
function round(n, dec) {
  if (n == null || isNaN(n) || !isFinite(n)) return null
  return Math.round(n * 10 ** dec) / 10 ** dec
}

function estimateTeamPoss(team) {
  const fga = (team.t2_intentos || 0) + (team.t3_intentos || 0)
  const fta = team.tl_intentos || 0
  const tov = team.per || 0
  const orb = team.ro  || 0
  return fga - orb + 0.44 * fta + tov
}
