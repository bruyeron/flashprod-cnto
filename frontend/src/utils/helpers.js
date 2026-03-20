// ─────────────────────────────────────────────
// VALUE ACCESSORS
// ─────────────────────────────────────────────
export function v(d, src, attr) {
  return d ? (d[src + "::" + attr] ?? null) : null;
}
export function pct(n, den) {
  return n === null || den === null || den === 0 ? null : n / den;
}

// ─────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────
export function parseDate(s) {
  if (!s) return new Date(0);
  // Support DD/MM/YYYY et YYYY-MM-DD
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return new Date(+m1[3], +m1[2] - 1, +m1[1]);
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3]);
  return new Date(s);
}
export function getMois(s) {
  if (!s) return "?";
  // Support DD/MM/YYYY et YYYY-MM-DD
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return m1[3] + "-" + m1[2].padStart(2, "0");
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return m2[1] + "-" + m2[2];
  return "?";
}
export function shortDate(s) {
  if (!s) return s;
  // Support DD/MM/YYYY et YYYY-MM-DD
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})/);
  if (m1) return m1[1].padStart(2, "0") + "/" + m1[2].padStart(2, "0");
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{1,2})$/);
  if (m2) return m2[3].padStart(2, "0") + "/" + m2[2];
  return s;
}
export function getDayLabel(s) {
  return ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][parseDate(s).getDay()];
}
export function formatMonth(m) {
  try {
    const [y, mo] = m.split("-");
    return (
      ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"][
        parseInt(mo) - 1
      ] + " " + y
    );
  } catch { return m; }
}

// ─────────────────────────────────────────────
// NUMBER FORMAT
// ─────────────────────────────────────────────
export function fmtNum(val) {
  return val === null || val === undefined || isNaN(val)
    ? "—"
    : Math.round(val).toLocaleString("fr-FR");
}
export function fmtPct(val) {
  return val === null || val === undefined || isNaN(val)
    ? "—"
    : Math.round(val * 100) + "%";
}
export function fmtPctDecimal(val, digits = 2) {
  return val === null || val === undefined || isNaN(val)
    ? "—"
    : val.toFixed(digits) + "%";
}
export function fmtSec(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return Math.round(val) + "s";
}
export function fmtHHMM(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function fmtDecimal(val, digits = 1) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toFixed(digits);
}

// ─────────────────────────────────────────────
// CHIP COLOR
// ─────────────────────────────────────────────
export function getChipClass(value, row, dark) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const { colorMode, refMin, refMax } = row;
  let chip = "";

  if (colorMode === "range") {
    if (value >= refMin && value <= refMax) chip = "green";
    else if (value < refMin) chip = value >= refMin - 0.1 ? "red" : "orange";
    else chip = "red";
  } else if (colorMode === "min") {
    if (value >= refMin) chip = "green";
    else if (value >= refMin - 0.05) chip = "orange";
    else chip = "red";
  } else if (colorMode === "max_inv") {
    if (value <= refMax) chip = "green";
    else if (value <= refMax + 0.05) chip = "red";
    else chip = "orange";
  } else if (colorMode === "range_target") {
    // like range but tighter: red if slightly over
    if (value >= refMin && value <= refMax) chip = "green";
    else if (value < refMin) chip = value >= refMin * 0.95 ? "red" : "orange";
    else chip = "red";
  }

  const colors = {
    green:  dark ? "bg-green-950 text-green-400"  : "bg-green-100 text-green-700",
    orange: dark ? "bg-amber-950 text-amber-400"  : "bg-amber-100 text-amber-700",
    red:    dark ? "bg-red-950 text-red-400"       : "bg-red-100 text-red-600",
  };
  return colors[chip] ?? "";
}
