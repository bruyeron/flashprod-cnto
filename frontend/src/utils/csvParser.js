export function parseCSV(text) {
  // normalize line endings and drop BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const h0 = lines[0];
  // detect separator among comma, tab, semicolon, pipe
  const candidates = [',', '\t', ';', '|'];
  let sep = candidates[0];
  let maxCount = 0;
  candidates.forEach((c) => {
    const count = h0.split(c).length;
    if (count > maxCount) {
      maxCount = count;
      sep = c;
    }
  });

  const headers = h0.split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(sep);
    const obj = {};
    headers.forEach((h, j) => { obj[h] = (parts[j] || "").trim().replace(/^"|"$/g, ""); });
    rows.push(obj);
  }
  return rows;
}
