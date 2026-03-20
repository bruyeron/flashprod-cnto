import { v, pct } from "../utils/helpers";

// ─── shortcuts ───────────────────────────────
const inc = (attr) => (d) => v(d, "incoming", attr);
const prev = (attr) => (d) => v(d, "prev", attr);
const isol = (attr) => (d) => v(d, "isol", attr);
const rd = (attr) => (d) => v(d, "rd", attr);
const h21 = (attr) => (d) => v(d, "Yas_21-6h", attr);   // tranche 21h-6h
const h7 = (attr) => (d) => v(d, "Yas_7-21h", attr);   // tranche 7h-21h
const p21 = (attr) => (d) => v(d, "prev_yas_21-6h", attr);
const p7 = (attr) => (d) => v(d, "prev_yas_7-21h", attr);

// ─── duration helpers ────────────────────────
// Durations stored as seconds in the aggregated index
const durSec = (src, attr) => (d) => v(d, src, attr); // raw seconds
const hLog = (d) => {
  // Heures loguées = sum of all rd durations (total in-chair time)
  const rdKeys = ["Appel entrant", "Appel manuel", "Appel sortant", "E-Mail",
    "Mode recherche", "Numérotation", "Post-travail",
    //  "Traitement BO", //101 Traitement
    "Brief", "Calibrage", "Débriefe après paralleling", "Individual Coaching",
    "Point avec le DO", "Sharing time", "Supervision", // 111 management
    "Formation", // 122 Formation
    "Aucun contexte démarré", "Consultation", "Ostie", "Pause", "Attente"];
  let sum = 0;
  rdKeys.forEach(k => { const val = v(d, "rd", k); if (val) sum += val; });
  return sum || null;
};
const hLogWithBO = (d) => {
  const log = hLog(d);
  const bo = v(d, "rd", "Traitement BO") || 0;
  return log ? log + bo : null;
}
const hProd = (d) => {
  // Heures productives = Traitement
  const keys = ["Appel entrant", "Appel manuel", "Appel sortant", "E-Mail",
    "Mode recherche", "Numérotation", "Post-travail"];
  let sum = 0;
  keys.forEach(k => { const val = v(d, "rd", k); if (val) sum += val; });
  return sum || null;
};
const hPause = (d) => {
  // Heures productives = Traitement
  const keys = ["Aucun contexte démarré", "Consultation", "Ostie", "Pause"];
  let sum = 0;
  keys.forEach(k => { const val = v(d, "rd", k); if (val) sum += val; });
  return sum || null;
};
const hMngt = (d) => {
  // Heures productives = Traitement
  const keys = ["Brief", "Calibrage", "Débriefe après paralleling", "Individual Coaching",
    "Point avec le DO", "Sharing time", "Supervision"];
  let sum = 0;
  keys.forEach(k => { const val = v(d, "rd", k); if (val) sum += val; });
  return sum || null;
};
const hInChair = (d) => {
  // Heures de production (in-chair) = hLog - Pause - Dispo - Management - Formation - Pause non-categorisée
  const log = hLog(d);
  const pause = hPause(d);
  const mgmt = hMngt(d);
  const formation = v(d, "rd", "Formation") || 0;
  
  if (!log) return null;
  return log - pause - mgmt - formation;
};

export const ROW_DEFS = [

  // ══════════════════════════════════════════
  // 1. PRÉVISIONS
  // ══════════════════════════════════════════
  { type: "section", label: "Prévisions" },
  { type: "sub", label: "Prévisions", code: "prevision", formula: prev("prevision"), fmt: "number" },
  { type: "sub", label: "Reforecast", code: "reforecast", formula: prev("reforecast"), fmt: "number" },

  // ══════════════════════════════════════════
  // 2. VOLUMÉTRIE
  // ══════════════════════════════════════════
  { type: "section", label: "Volumétrie" },
  { type: "sub", label: "Reçus", code: "recu", formula: inc("recu"), fmt: "number" },
  { type: "kpi", label: "% TRP vs Prévisions", code: "%trp_prev", formula: (d) => pct(v(d, "incoming", "recu"), v(d, "prev", "prevision")), fmt: "percent", refMin: 0.90, refMax: 1.10, colorMode: "range" },
  { type: "kpi", label: "% TRP vs Reforecast", code: "%trp_ref", formula: (d) => pct(v(d, "incoming", "recu"), v(d, "prev", "reforecast")), fmt: "percent", refMin: 0.90, refMax: 1.10, colorMode: "range" },
  { type: "sub", label: "Traités", code: "traite", formula: inc("traite"), fmt: "number" },
  { type: "kpi", label: "% QS", code: "%qs", formula: (d) => pct(v(d, "incoming", "traite"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.90, colorMode: "min", refMin: 0.90 },
  { type: "sub", label: "Traité SL < 20 sec", code: "traite_sl", formula: inc("traite_sl"), fmt: "number" },
  { type: "kpi", label: "% SL", code: "%sl", formula: (d) => pct(v(d, "incoming", "traite_sl"), v(d, "incoming", "traite")), fmt: "percent", refMin: 0.80, colorMode: "min" },
  { type: "sub", label: "Appels transférés", code: "transfert", formula: inc("transfert"), fmt: "number" },
  { type: "kpi", label: "% Transfert", code: "%transfert", formula: (d) => pct(v(d, "incoming", "transfert"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.05, colorMode: "max_inv" },
  { type: "sub", label: "Raccrochés par agent", code: "racc", formula: inc("raccrochage"), fmt: "number" },
  { type: "kpi", label: "% Raccrochage", code: "%racc", formula: (d) => pct(v(d, "incoming", "raccrochage"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.05, colorMode: "max_inv" },

  // ══════════════════════════════════════════
  // 3. SL RÉVISÉ
  // ══════════════════════════════════════════
  { type: "section", label: "SL révisé à TRP 110% (calcul par tranche de 30min)" },
  { type: "sub", label: "Traités (isolé)", code: "traite_isol", formula: isol("traite_isol"), fmt: "number" },
  { type: "sub", label: "Traité SL (isolé)", code: "traite_sl_isol", formula: isol("traite_sl_isol"), fmt: "number" },
  { type: "kpi", label: "% SL révisé à TRP 110%", code: "%sl_isol", formula: (d) => pct(v(d, "isol", "traite_sl_isol"), v(d, "isol", "traite_isol")), fmt: "percent", refMin: 0.80, colorMode: "min" },

  // ══════════════════════════════════════════
  // 4. RÉPARTITION PAR FILE (dynamique)
  // ══════════════════════════════════════════
  { type: "section", label: "Répartition des appels reçus par file", dynamicFiles: true },

  // ══════════════════════════════════════════
  // 5. DURÉE DE TRAITEMENT
  // ══════════════════════════════════════════
  { type: "section", label: "Durée de traitement" },
  { type: "sub", label: "Durée totale de comm", code: "duree_com", formula: inc("duree_com"), fmt: "duration" },
  { type: "sub", label: "Durée total post-travail", code: "duree_acw", formula: inc("duree_acw"), fmt: "duration" },
  { type: "sub", label: "Durée de mise en attente", code: "en_attente", formula: rd("En attente"), fmt: "duration" },
  {
    type: "kpi", label: "Productivité / Heures loguées", code: "prod_hl",
    formula: (d) => {
      // (duree_com + duree_acw) / heures_loguees
      const traite = v(d, "incoming", "traite");
      const hlogbo = hLogWithBO(d);
      return traite && hlogbo ? traite / (hlogbo / 3600) : null;
    },
    fmt: "decimal1", refMin: 14, refMax: 14.4, colorMode: "range",
  },
  {
    type: "kpi", label: "DMC (sec)", code: "dmc",
    formula: (d) => {
      const com = v(d, "incoming", "duree_com");
      const traite = v(d, "incoming", "traite");
      return com && traite ? com / traite : null;
    },
    fmt: "second", refMin: 160, refMax: 180, colorMode: "range",
  },
  {
    type: "kpi", label: "ACW (sec)", code: "acw",
    formula: (d) => {
      const acw = v(d, "incoming", "duree_acw");
      const traite = v(d, "incoming", "traite");
      return acw && traite ? acw / traite : null;
    },
    fmt: "second", refMin: 5, refMax: 15, colorMode: "range",
  },
  {
    type: "kpi", label: "MEA (sec)", code: "mea",
    formula: (d) => {
      const mea = v(d, "rd", "En attente");
      const traite = v(d, "incoming", "traite");
      return mea && traite ? mea / traite : null;
    },
    fmt: "second", refMin: 5, refMax: 15, colorMode: "range",
  },
  {
    type: "kpi", label: "DMT (sec)", code: "dmt",
    formula: (d) => {
      const com = v(d, "incoming", "duree_com") || 0;
      const acw = v(d, "incoming", "duree_acw") || 0;
      const traite = v(d, "incoming", "traite");
      return traite ? (com + acw) / traite : null;
    },
    fmt: "second", refMin: 180, refMax: 220, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 6. APPELS COURTS
  // ══════════════════════════════════════════
  { type: "section", label: "Appels courts" },
  { type: "sub", label: "Appels courts < 10 sec", code: "appel_10s", formula: inc("appel_moins_10s"), fmt: "number" },
  { type: "kpi", label: "% Appels courts < 10 sec", code: "%a10", formula: (d) => pct(v(d, "incoming", "appel_moins_10s"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.05, colorMode: "max_inv" },
  { type: "sub", label: "Appels courts < 15 sec", code: "appel_15s", formula: inc("appel_moins_15s"), fmt: "number" },
  { type: "kpi", label: "% Appels courts < 15 sec", code: "%a15", formula: (d) => pct(v(d, "incoming", "appel_moins_15s"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.075, colorMode: "max_inv" },
  { type: "sub", label: "Appels courts < 50 sec", code: "appel_50s", formula: inc("appel_moins_50s"), fmt: "number" },
  { type: "kpi", label: "% Appels courts < 50 sec", code: "%a50", formula: (d) => pct(v(d, "incoming", "appel_moins_50s"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.25, colorMode: "max_inv" },

  // ══════════════════════════════════════════
  // 7. RÉITÉRATION MÊME TYPO
  // ══════════════════════════════════════════
  { type: "section", label: "Réitération même typologie" },
  { type: "sub", label: "Réitération 1h", code: "reit_1h_t", formula: inc("reit_typo_1h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 1h", code: "%reit_1h_t", formula: (d) => pct(v(d, "incoming", "reit_typo_1h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.05, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 1j", code: "reit_24h_t", formula: inc("reit_typo_24h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 1j", code: "%reit_24h_t", formula: (d) => pct(v(d, "incoming", "reit_typo_24h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.20, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 3j", code: "reit_72h_t", formula: inc("reit_typo_72h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 3j", code: "%reit_72h_t", formula: (d) => pct(v(d, "incoming", "reit_typo_72h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.20, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 7j", code: "reit_sem_t", formula: inc("reit_typo_semaine"), fmt: "number" },
  { type: "kpi", label: "% Réitération 7j", code: "%reit_sem_t", formula: (d) => pct(v(d, "incoming", "reit_typo_semaine"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.23, colorMode: "max_inv" },

  // ══════════════════════════════════════════
  // 8. RÉITÉRATION SANS TYPO
  // ══════════════════════════════════════════
  { type: "section", label: "Réitération sans distinction typologie" },
  { type: "sub", label: "Réitération 1h", code: "reit_1h", formula: inc("reit_1h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 1h", code: "%reit_1h", formula: (d) => pct(v(d, "incoming", "reit_1h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.05, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 1j", code: "reit_24h", formula: inc("reit_24h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 1j", code: "%reit_24h", formula: (d) => pct(v(d, "incoming", "reit_24h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.20, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 3j", code: "reit_72h", formula: inc("reit_72h"), fmt: "number" },
  { type: "kpi", label: "% Réitération 3j", code: "%reit_72h", formula: (d) => pct(v(d, "incoming", "reit_72h"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.20, colorMode: "max_inv" },
  { type: "sub", label: "Réitération 7j", code: "reit_sem", formula: inc("reit_semaine"), fmt: "number" },
  { type: "kpi", label: "% Réitération 7j", code: "%reit_sem", formula: (d) => pct(v(d, "incoming", "reit_semaine"), v(d, "incoming", "recu")), fmt: "percent", refMax: 0.23, colorMode: "max_inv" },
  {
    type: "kpi", label: "First Call Resolution (%FCR)", code: "%fcr",
    formula: (d) => 1 - pct(v(d, "incoming", "reit_24h"), v(d, "incoming", "traite")),
    fmt: "percent", refMin: 0.80, colorMode: "min",
  },

  // ══════════════════════════════════════════
  // 9. COUVERTURE DE CHARGE
  // ══════════════════════════════════════════
  { type: "section", label: "Couverture de charge et heures" },
  { type: "sub", label: "Besoin en heures", code: "besoin2", formula: (d) => v(d, "prev", "besoin2"), fmt: "decimal1" },
  { type: "sub", label: "Heures planifiées", code: "planning2", formula: (d) => v(d, "prev", "planning2"), fmt: "decimal1" },
  {
    type: "sub", label: "Heures loguées (avec Traitement BO)", code: "h_loguees",
    formula: (d) => {
      const hl = hLogWithBO(d);
      return hl ? hl / 3600 : null;
    },
    fmt: "decimal1",
  },
  {
    type: "sub", label: "Absentéisme en heures", code: "absenteisme",
    formula: (d) => {
      const plan = v(d, "prev", "planning2");
      const hl = hLogWithBO(d);
      if (!plan || !hl) return null;
      return plan -(hl / 3600) ;
    },
    fmt: "decimal1",
  },
  // { type: "sub", label: "Sous-staff (Planning vs besoin)", code: "sous_staff", formula: (d) => v(d, "prev", "sous_staff") ?? null, fmt: "decimal1" },
  // { type: "sub", label: "Sur-staff (Planning vs besoin)", code: "sur_staff", formula: (d) => v(d, "prev", "sur_staff") ?? null, fmt: "decimal1" },
  {
    type: "kpi", label: "Taux de couverture", code: "tx_couv",
    formula: (d) => pct(v(d, "prev", "planning2"), v(d, "prev", "besoin2")),
    fmt: "percent", refMin: 1.0, refMax: 1.10, colorMode: "range",
  },
  // {
  //   type: "kpi", label: "Taux d'efficacité de planification", code: "tx_eff",
  //   formula: (d) => {
  //     const plan = v(d, "prev", "planning2");
  //     const hl = hLog(d);
  //     return plan && hl ? (hl / 3600) / plan : null;
  //   },
  //   fmt: "percent", refMin: 0.81, refMax: 0.99, colorMode: "range",
  // },
  {
    type: "sub", label: "Besoin en ETP", code: "besoin_etp",
    formula: (d) => { const b = v(d, "prev", "besoin2"); return b ? b / 8 : null; },
    fmt: "decimal2",
  },
  {
    type: "sub", label: "ETP Planifiés", code: "etp_plan",
    formula: (d) => { const p = v(d, "prev", "planning2"); return p ? p / 8 : null; },
    fmt: "decimal2",
  },
  {
    type: "sub", label: "ETP Présents", code: "etp_pres",
    formula: (d) => { const hl = hLog(d); return hl ? (hl / 3600) / 8 : null; },
    fmt: "decimal2",
  },
  {
    type: "sub", label: "ETP Absents", code: "etp_abs",
    formula: (d) => {
      const hl = hLog(d);
      const p = v(d, "prev", "planning2");
      const etpPlan =  p ? p / 8 : null;
      const etpPresent =  hl ? (hl / 3600) / 8 : null;
      if (!etpPresent || !etpPlan) return null;
      return etpPlan - etpPresent  ;
    },
    fmt: "decimal2",
  },
  {
    type: "kpi", label: "Taux d'absence", code: "tx_abs",
    formula: (d) => {
      const hl = hLog(d);
      const plan = v(d, "prev", "planning2");
      const etpPlan =  plan  ? plan / 8 : null;
      const etpPresent =  hl ? (hl / 3600) / 8 : null;
      const etpAbsent = etpPlan && etpPresent ? etpPlan - etpPresent : null;

      if (!etpPlan || !etpAbsent) return null;
      return etpAbsent / etpPlan;
    },
    fmt: "percent", refMax: 0.08, refMin: 0.12, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 10. TAUX DE PRODUCTIVITÉ
  // ══════════════════════════════════════════
  { type: "section", label: "Taux de productivité et occupation" },
  {
    type: "sub", label: "Heures loguées", code: "hl_sec",
    formula: hLog,
    fmt: "duration",
  },
  {
    type: "sub", label: "Heures de production (in-chair)", code: "h_inchair",
    formula: hInChair,
    fmt: "duration",
  },
  {
    type: "sub", label: "Heures productives", code: "h_prod",
    formula: hProd,
    fmt: "duration",
  },
  {
    type: "kpi", label: "Taux d'occupation", code: "tx_occ",
    formula: (d) => {
      const prod = hProd(d);
      const inchair = hInChair(d);
      return prod && inchair ? prod / inchair : null;
    },
    fmt: "percent", refMin: 0.70, refMax: 0.80, colorMode: "range",
  },
  {
    type: "kpi", label: "Taux de productivité brut", code: "tx_prod_brut",
    formula: (d) => {
      const inchair = hInChair(d);
      const hl = hLog(d);
      return inchair && hl ? inchair / hl : null;
    },
    fmt: "percent", refMin: 0.80, refMax: 0.85, colorMode: "range",
  },
  {
    type: "kpi", label: "Taux de productivité net", code: "tx_prod_net",
    formula: (d) => {
      const prod = hProd(d);
      const hl = hLog(d);
      return prod && hl ? prod / hl : null;
    },
    fmt: "percent", refMin: 0.72, refMax: 0.76, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 11. TRAITEMENT (RD) – dynamique
  // ══════════════════════════════════════════
  {
    type: "section", label: "Traitement", dynamicRd: "traitement",
    rdKeys: ["Appel entrant", "Appel manuel", "Appel sortant", "E-Mail", "Mode recherche", "Numérotation", "Post-travail", "Traitement BO"]
  },
  {
    type: "kpi", label: "Taux Traitement BO", code: "tx_bo",
    formula: (d) => {
      const bo = v(d, "rd", "Traitement BO");
      const hl = hLog(d);
      return bo && hl ? bo / hl : null;
    },
    fmt: "percent", refMin: 0.01, colorMode: "min",
  },

  // ══════════════════════════════════════════
  // 12. MANAGEMENT – dynamique
  // ══════════════════════════════════════════
  {
    type: "section", label: "Management", dynamicRd: "management",
    rdKeys: ["Brief", "Calibrage", "Débriefe après paralleling", "Individual Coaching", "Point avec le DO", "Sharing time", "Supervision"]
  },
  {
    type: "kpi", label: "Taux management sur heures loguées", code: "tx_mgmt",
    formula: (d) => {
      const keys = ["Brief", "Calibrage", "Débriefe après paralleling", "Individual Coaching", "Point avec le DO", "Sharing time", "Supervision"];
      let sum = 0;
      keys.forEach(k => { sum += v(d, "rd", k) || 0; });
      const hl = hLog(d);
      return hl ? sum / hl : null;
    },
    fmt: "percent", refMin: 0.01, refMax: 0.02, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 13. FORMATION
  // ══════════════════════════════════════════
  { type: "section", label: "Formation", dynamicRd: "formation", rdKeys: ["Formation"] },
  {
    type: "kpi", label: "Taux formation sur heures loguées", code: "tx_form",
    formula: (d) => {
      const f = v(d, "rd", "Formation");
      const hl = hLog(d);
      return f && hl ? f / hl : null;
    },
    fmt: "percent_decimal", refMin: 0.01, refMax: 0.02, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 14. PAUSE
  // ══════════════════════════════════════════
  {
    type: "section", label: "Pause", dynamicRd: "pause",
    rdKeys: ["Aucun contexte démarré", "Consultation", "Ostie", "Pause"]
  },
  {
    type: "kpi", label: "Taux pause sur heures loguées", code: "tx_pause",
    formula: (d) => {
      const p = v(d, "rd", "Pause");
      const hl = hLog(d);
      return p && hl ? p / hl : null;
    },
    fmt: "percent", refMin: 0.04, refMax: 0.0729, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 15. DISPO
  // ══════════════════════════════════════════
  { type: "section", label: "Dispo" },
  { type: "sub", label: "Attente", code: "dispo_att", formula: rd("Attente"), fmt: "duration" },
  {
    type: "kpi", label: "Taux de dispo sur heures loguées", code: "tx_dispo",
    formula: (d) => {
      const att = v(d, "rd", "Attente");
      const hl = hLog(d);
      return att && hl ? att / hl : null;
    },
    fmt: "percent", refMin: 0.10, refMax: 0.1345, colorMode: "range",
  },

  // ══════════════════════════════════════════
  // 16. FINANCES
  // ══════════════════════════════════════════
  { type: "section", label: "Finances" },
  {
    type: "kpi", label: "Chiffre d'affaires", code: "ca",
    formula: (d) => {
      const recu = v(d, "incoming", "recu");
      // CA = appels reçus × tarif (0.3 par appel - from Excel row 131 col D = 0.3)
      return recu ? recu * 0.3 : null;
    },
    fmt: "decimal2",
  },
  {
    type: "kpi", label: "CA / Heures planifiées", code: "ca_hp",
    formula: (d) => {
      const recu = v(d, "incoming", "recu");
      const plan = v(d, "prev", "planning2");
      return recu && plan ? (recu * 0.3) / plan : null;
    },
    fmt: "decimal2", refMin: 4.32, colorMode: "min",
  },
  {
    type: "kpi", label: "CA / Heures loguées", code: "ca_hl",
    formula: (d) => {
      const recu = v(d, "incoming", "recu");
      const hl = hLog(d);
      return recu && hl ? (recu * 0.3) / (hl / 3600) : null;
    },
    fmt: "decimal2", refMin: 6, colorMode: "min",
  },
  {
    type: "kpi", label: "CA / ETP Planifiés", code: "ca_etp",
    formula: (d) => {
      const recu = v(d, "incoming", "recu");
      const plan = v(d, "prev", "planning2");
      return recu && plan ? (recu * 0.3) / (plan / 8) : null;
    },
    fmt: "decimal2",
  },
];

// ─────────────────────────────────────────────
// Build final rows (inject dynamic file/rd rows)
// ─────────────────────────────────────────────
export function buildRows(allFiles, allRd) {
  const result = [];
  for (const row of ROW_DEFS) {
    result.push(row);

    // Inject file % rows after the "Répartition" section header
    if (row.dynamicFiles) {
      allFiles.forEach((f) => {
        result.push({
          type: "sub",
          label: f,
          code: f,
          formula: (d) => {
            const file = v(d, "files", f);
            const recu = v(d, "incoming", "recu");
            return file !== null && recu ? file / recu : null;
          },
          fmt: "percent",
        });
      });
    }

    // Inject rd duration rows after "Traitement", "Management", etc. section headers
    if (row.dynamicRd && row.rdKeys) {
      row.rdKeys.forEach((k) => {
        result.push({
          type: "sub",
          label: k,
          code: k,
          formula: (d) => v(d, "rd", k),
          fmt: "duration",
        });
      });
    }
  }
  return result;
}
