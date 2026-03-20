import { buildRows } from "../config/rowDefinitions";
import { buildAgg } from "../utils/dataProcessor";
import { parseDate, shortDate, getDayLabel, formatMonth, fmtNum, fmtPct, fmtPctDecimal, fmtSec, fmtHHMM, fmtDecimal, getChipClass } from "../utils/helpers";

// ─── sub-components ──────────────────────────

function ToggleBtn({ collapsed, onClick, dark }) {
  return (
    <button onClick={onClick} className={`w-[17px] h-[17px] rounded text-[10px] font-bold flex-shrink-0 flex items-center justify-center border cursor-pointer transition-colors ${dark ? "bg-white/10 border-white/30 text-white/70 hover:border-blue-400 hover:text-blue-400" : "bg-white/70 border-slate-400 text-slate-500 hover:border-[#096475] hover:text-blue-500 hover:bg-blue-50"}`}>
      {collapsed ? "+" : "−"}
    </button>
  );
}

function CellValue({ value, row, dark }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className={dark ? "text-slate-700" : "text-slate-300"}>—</span>;
  }

  let formatted;
  switch (row.fmt) {
    case "percent": formatted = fmtPct(value); break;
    case "percent_decimal": formatted = fmtPctDecimal(value,1); break;
    case "second": formatted = fmtSec(value); break;
    case "duration": formatted = fmtHHMM(value); break;
    case "decimal0": formatted = fmtDecimal(value, 0); break;
    case "decimal1": formatted = fmtDecimal(value, 1); break;
    case "decimal2": formatted = fmtDecimal(value, 2); break;
    default: formatted = fmtNum(value);
  }

  if (!row.colorMode) return <span>{formatted}</span>;

  const chipClass = getChipClass(value, row, dark);
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[12px] font-semibold leading-tight ${chipClass || ""}`}>
      {formatted}
    </span>
  );
}

// ─── main ─────────────────────────────────────

export default function DataTable({ dataIdx, collapseState, onToggle, dark }) {
  const { dateIndex, dateWeek, sortedDates, allFiles, allRd } = dataIdx;
  const rows = buildRows(allFiles, allRd);

  // build flat week->dates mapping (weeks run Mon-Sun, label like "sem-40")
  const weekDay = {};
  sortedDates.forEach((dt) => {
    const w = dateWeek[dt];
    if (!weekDay[w]) weekDay[w] = [];
    weekDay[w].push(dt);
  });
  // preserve original date order for week sorting
  const sortedWeeks = [...new Set(sortedDates.map((d) => dateWeek[d]))];
  const countCols = () => {
    let n = 0;
    sortedWeeks.forEach((w) => {
      if (collapseState["w:" + w]) { n += 1; return; }
      n += weekDay[w].length; // one column per day
      n += 1; // plus weekly total
    });
    return n;
  };

  // Theme tokens
  const bg = dark ? "#161b22" : "#fff";
  const bgH = dark ? "bg-[#21262d]" : "bg-slate-100";
  const brd = dark ? "border-[#30363d]" : "border-slate-200";
  const brdS = dark ? "border-[#484f58]" : "border-slate-300";
  const txtMuted = dark ? "text-slate-500" : "text-slate-400";
  const txt = dark ? "text-slate-200" : "text-slate-800";
  const hov = dark ? "hover:bg-[#1f2d45]" : "hover:bg-blue-50";
  const wkBg = dark ? "bg-[#1a2035]" : "bg-[#f0f4ff]";

  const renderCell = (value, row) => <CellValue value={value} row={row} dark={dark} />;

  const dataCols = (row) =>
    sortedWeeks.map((w) => {
      const wDates = weekDay[w].slice().sort((a, b) => parseDate(a) - parseDate(b));
      const wAgg = buildAgg(wDates, dateIndex);
      const wVal = row.formula(wAgg);

      if (collapseState["w:" + w]) {
        return (
          <td key={w} className={`px-2 py-1.5 text-center border-b border-r-[3px] border-blue-500 text-[12px] font-bold min-w-[72px] ${wkBg}`}>
            {renderCell(wVal, row)}
          </td>
        );
      }

      return [
        ...wDates.map((dt) => (
          <td key={dt} className={`px-2 py-1.5 text-center border-b border-r ${brd} text-[12px] min-w-[72px] ${row.type === "kpi" ? "font-semibold" : "font-normal"}`}>
            {renderCell(row.formula(dateIndex[dt] || {}), row)}
          </td>
        )),
        <td key={w + "-wt"} className={`px-2 py-1.5 text-center border-b border-l border-r-2 ${brdS} text-[12px] font-bold min-w-[72px] ${wkBg}`}>
          {renderCell(wVal, row)}
        </td>,
      ];
    });

  return (
    <div className="flex-1 overflow-auto relative">
      <table className="border-collapse whitespace-nowrap min-w-full" style={{ background: bg }}>

        {/* ── THEAD ── */}
        <thead className="sticky top-0 z-50">

          {/* Row 1 – weeks */}
          <tr>
            <th rowSpan={2} className={`sticky left-0 z-[60] min-w-[215px] max-w-[215px] ${bgH} border-b border-r ${brd} text-left px-2.5 py-1.5 text-[16px] font-semibold tracking-widest ${txtMuted}`}>INDICATEUR</th>
            {/* <th rowSpan={2} className={`sticky left-[215px] z-[60] min-w-[110px] max-w-[110px] ${bgH} border-b border-r-2 ${brdS} text-center px-2.5 py-1.5 text-[16px] font-semibold tracking-wider ${txtMuted}`}>CODE</th> */}
            <th rowSpan={2} className={`sticky left-[215px] z-[60] min-w-[58px] max-w-[58px] ${bgH} border-b border-r ${brdS} text-center px-2 py-1.5 text-[16px] font-semibold text-amber-600`}>MIN</th>
            <th rowSpan={2} className={`sticky left-[273px] z-[60] min-w-[58px] max-w-[58px] ${bgH} border-b border-r-[3px] ${brdS} text-center px-2 py-1.5 text-[16px] font-semibold text-green-600`}>MAX</th>
            {sortedWeeks.map((w) => {
              const dc = collapseState["w:" + w] ? 1 : weekDay[w].length + 1;
              return (
                <th key={w} colSpan={dc} className={`${bgH} ${brd} border-b border-r text-[12px] font-semibold ${txt} px-2 py-1`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <ToggleBtn collapsed={!!collapseState["w:" + w]} onClick={() => onToggle("w:" + w)} dark={dark} />
                    {w}
                  </div>
                </th>
              );
            })}
          </tr>

          {/* Row 2 – days */}
          <tr>
            {sortedWeeks.map((w) => {
              if (collapseState["w:" + w]) {
                return (
                  <th key={w} rowSpan={1} className={`min-w-[72px] ${wkBg} border-b border-r-[3px] border-blue-500 text-[10px] font-bold text-blue-600 px-2 py-1`}>
                    <div className="flex flex-col items-center gap-0.5"><span className="font-bold">Total</span><span className="font-normal">{w}</span></div>
                  </th>
                );
              }
              const wDates = weekDay[w].slice().sort((a,b)=> parseDate(a)-parseDate(b));
              return [
                ...wDates.map((d)=> (
                  <th key={d} className={`${bgH} ${brd} border-b border-r text-center px-2 py-1 min-w-[72px]`}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[12px] font-semibold ${txt}`}>{getDayLabel(d)}</span>
                      <span className={`text-[9px] font-normal ${txtMuted}`}>{shortDate(d)}</span>
                    </div>
                  </th>
                )),
                <th key={w + "-wt"} className={`min-w-[72px] ${wkBg} border-b border-l border-r-2 ${brdS} text-center px-2 py-1`}>
                  <div className="flex flex-col items-center gap-0">
                    <span className={`text-[9px] font-bold ${txt}`}>Tot.</span>
                    <span className={`text-[9px] font-normal ${txtMuted}`}>{w}</span>
                  </div>
                </th>,
              ];
            })}
          </tr>
        </thead>

        {/* ── TBODY ── */}
        <tbody>
          {rows.map((row, ri) => {
            // Section header
            if (row.type === "section") {
              const sectionBg = dark ? "#1c2433" : "#f0f9ff";
              
              return (
                <tr key={ri} className={` ${dark ? "bg-[#1c2433] hover:bg-[#1c2d50]" : "bg-blue-50/70 hover:bg-blue-100"}` }>
                  {/* Label - sticky at left-0 */}
                  <td className={`sticky left-0 z-30 text-left px-2.5 py-1.5 text-[13px] font-bold tracking-widest uppercase border-b ${dark ? "text-[#00afa9] border-blue-900" : "text-[#00afa9] border-blue-200"}`} style={{ background: sectionBg }}>
                    {row.label}
                  </td>
                  {/* MIN column - empty for sections, sticky at left-[215px] */}
                  <td className={`sticky left-[215px] z-20 min-w-[58px] max-w-[58px] border-b border-r-2 ${dark ? "border-blue-900" : "border-blue-200"}`} style={{ background: sectionBg }}></td>
                  {/* MAX column - empty for sections, sticky at left-[273px] */}
                  <td className={`sticky left-[273px] z-20 min-w-[58px] max-w-[58px] border-b border-r-[3px] ${dark ? "border-blue-900" : "border-blue-200"}`} style={{ background: sectionBg }}></td>
                  {/* Empty data columns for sections */}
                  {sortedWeeks.map((w) => {
                    const numCols = collapseState["w:" + w] ? 1 : (weekDay[w]?.length || 0) + 1;
                    return Array.from({ length: numCols }).map((_, i) => (
                      <td key={`${w}-${i}`} className={`border-b ${i === numCols - 1 ? "border-r-[3px]" : "border-r"} ${dark ? "border-blue-900" : "border-blue-200"}`} style={{ background: sectionBg }}></td>
                    ));
                  })}
                </tr>
              );
            }

            const isKpi = row.type === "kpi";
            return (
              <tr key={ri} className={`group ${hov}`} style={{ background: bg }}>
                {/* Label */}
                <td className={`sticky left-0 z-20 px-2.5 py-1.5 text-left border-b border-r ${brd} text-[13px] ${isKpi ? `font-semibold pl-3.5 ${txt}` : `font-normal pl-6 ${txtMuted}`}`} style={{ background: bg }}>
                  {row.label}
                </td>
                {/* Code */}
                {/* <td className={`sticky left-[215px] z-20 px-2.5 py-1.5 text-left border-b border-r-2 ${brdS} text-[12px] ${txtMuted}`} style={{ background: bg }}>
                  {row.code || ""}
                </td> */}
                {/* RefMin */}
                <td className={`sticky left-[215px] z-20 min-w-[58px] max-w-[58px] px-2 py-1.5 text-center border-b border-r-2 ${brdS} text-[12px] font-semibold text-amber-600`} style={{ background: bg }}>
                  {row.refMin !== undefined
                    ? (row.fmt === "second" ? fmtSec(row.refMin) : row.fmt === "decimal1" || row.fmt === "decimal2" ? fmtDecimal(row.refMin, 1) : fmtPct(row.refMin))
                    : ""}
                </td>
                {/* RefMax */}
                <td className={`sticky left-[273px] z-20 min-w-[58px] max-w-[58px] px-2 py-1.5 text-center border-b border-r-[3px] ${brdS} text-[12px] font-semibold text-green-600`} style={{ background: bg }}>
                  {row.refMax !== undefined
                    ? (row.fmt === "second" ? fmtSec(row.refMax) : row.fmt === "decimal1" || row.fmt === "decimal2" ? fmtDecimal(row.refMax, 1) : fmtPct(row.refMax))
                    : ""}
                </td>
                {/* Data */}
                {dataCols(row)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
 