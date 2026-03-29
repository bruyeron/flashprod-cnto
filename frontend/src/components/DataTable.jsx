import { useState, useCallback } from 'react';
import { buildRows } from '../config/rowDefinitions';
import { buildAgg } from '../utils/dataProcessor';
import {
  parseDate, shortDate, getDayLabel,
  fmtNum, fmtPct, fmtPctDecimal, fmtSec, fmtHHMM, fmtDecimal, getChipClass,
} from '../utils/helpers';
import { useComments } from '../context/CommentContext';
import { useAuth } from '../context/AuthContext';
import CellCommentPopover from './CellCommentPopover';
// [v12-2] weekAverage importé : la colonne Tot. des lignes manuelles affiche la moyenne
import { loadManualValues, weekTotal, weekAverage } from './WeeklyCompletionModal';

// ToggleBtn
function ToggleBtn({ collapsed, onClick, dark }) {
  return (
    <button onClick={onClick} className={`w-[17px] h-[17px] rounded text-[10px] font-bold flex-shrink-0 flex items-center justify-center border cursor-pointer transition-colors ${dark ? 'bg-white/10 border-white/30 text-white/70 hover:border-blue-400 hover:text-blue-400' : 'bg-white/70 border-slate-400 text-slate-500 hover:border-[#096475] hover:text-blue-500 hover:bg-blue-50'}`}>
      {collapsed ? '+' : '−'}
    </button>
  );
}

// CellValue
function CellValue({ value, row, dark }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className={dark ? 'text-slate-700' : 'text-slate-300'}>—</span>;
  }
  let formatted;
  switch (row.fmt) {
    case 'percent':         formatted = fmtPct(value); break;
    case 'percent_decimal': formatted = fmtPctDecimal(value, 1); break;
    case 'second':          formatted = fmtSec(value); break;
    case 'duration':        formatted = fmtHHMM(value); break;
    case 'decimal0':        formatted = fmtDecimal(value, 0); break;
    case 'decimal1':        formatted = fmtDecimal(value, 1); break;
    case 'decimal2':        formatted = fmtDecimal(value, 2); break;
    default:                formatted = fmtNum(value);
  }
  if (!row.colorMode) return <span>{formatted}</span>;
  const chipClass = getChipClass(value, row, dark);
  return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[12px] font-semibold leading-tight ${chipClass || ''}`}>{formatted}</span>;
}

// DataCell — cellule avec support commentaire
function DataCell({ value, row, dark, cellKey, tdClass }) {
  const { hasComment } = useComments();
  const { user } = useAuth();
  const [popover, setPopover] = useState(null);
  const hasC = hasComment(cellKey);

  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(prev => prev ? null : { rect });
  }, []);

  return (
    <>
      <td onClick={handleClick} className={`${tdClass} relative cursor-pointer select-none group/cell`} title="Cliquer pour commenter">
        {/* Triangle indicateur orange si commentaire présent */}
        {hasC && (
          <span className="absolute top-0 right-0 w-0 h-0 z-10 pointer-events-none"
            style={{ borderStyle: 'solid', borderWidth: '0 7px 7px 0', borderColor: 'transparent #f59e0b transparent transparent' }} />
        )}
        <CellValue value={value} row={row} dark={dark} />
      </td>
      {popover && (
        <CellCommentPopover
          cellKey={cellKey}
          dark={dark}
          author={user?.username || 'anonyme'}
          onClose={() => setPopover(null)}
          anchorRect={popover.rect}
        />
      )}
    </>
  );
}

// Main 
export default function DataTable({ dataIdx, collapseState, onToggle, dark, currentActivity = '' }) {
  const { dateIndex, dateWeek, sortedDates, allFiles, allRd } = dataIdx;
  // [v12-4] currentActivity transmis à buildRows pour injecter les lignes YAS 21h-7h
  const rows = buildRows(allFiles, allRd, currentActivity);

  // Structure : { [activity]: { [week]: { abs_reel: [...], non_logue: [...] } } }
  const _allManualValues = loadManualValues();
  const manualValues = _allManualValues[currentActivity] || {};

  const weekDay = {};
  sortedDates.forEach((dt) => {
    const w = dateWeek[dt];
    if (!weekDay[w]) weekDay[w] = [];
    weekDay[w].push(dt);
  });
  const sortedWeeks = [...new Set(sortedDates.map((d) => dateWeek[d]))];

  const bg       = dark ? '#161b22' : '#fff';
  const bgH      = dark ? 'bg-[#21262d]'     : 'bg-slate-100';
  const brd      = dark ? 'border-[#30363d]' : 'border-slate-200';
  const brdS     = dark ? 'border-[#484f58]' : 'border-slate-300';
  const txtMuted = dark ? 'text-slate-500'   : 'text-slate-400';
  const txt      = dark ? 'text-slate-200'   : 'text-slate-800';
  const hov      = dark ? 'hover:bg-[#1f2d45]' : 'hover:bg-blue-50';
  const wkBg     = dark ? 'bg-[#1a2035]'     : 'bg-[#f0f4ff]';


  // [v12-2] resolveValue — colonne Tot. affiche MOYENNE pour abs_reel et non_logue
  const resolveValue = (row, agg, weekKey, dayIndex) => {
    if (row.code === 'abs_reel') {
      if (dayIndex !== undefined && weekKey) {
        const v = manualValues[weekKey]?.abs_reel?.[dayIndex];
        return (v !== null && v !== undefined && v !== '') ? Number(v) : null;
      }
      if (weekKey) return weekAverage(manualValues[weekKey]?.abs_reel);
    }
    if (row.code === 'non_logue') {
      if (dayIndex !== undefined && weekKey) {
        const v = manualValues[weekKey]?.non_logue?.[dayIndex];
        return (v !== null && v !== undefined && v !== '') ? Number(v) : null;
      }
      if (weekKey) return weekAverage(manualValues[weekKey]?.non_logue);
    }
    return row.formula(agg);
  };

  // Convertit getDay() (0=dim,1=lun..6=sam) vers index tableau (0=lun..6=dim)
  const dateToManualIndex = (dt) => {
    const jsDay = parseDate(dt).getDay(); // 0=dim, 1=lun, ..., 6=sam
    return jsDay === 0 ? 6 : jsDay - 1;  // → 0=lun, ..., 5=sam, 6=dim
  };

  const dataCols = (row) =>
    sortedWeeks.map((w) => {
      const wDates = weekDay[w].slice().sort((a, b) => parseDate(a) - parseDate(b));
      const wAgg   = buildAgg(wDates, dateIndex);
      const wVal   = resolveValue(row, wAgg, w);

      //cellKey préfixée par currentActivity → isolation par activité
      if (collapseState['w:' + w]) {
        return (
          <DataCell key={w} value={wVal} row={row} dark={dark}
            cellKey={`${currentActivity}::${row.code}::${w}::total`}
            tdClass={`px-2 py-1.5 text-center border-b border-r-[3px] border-blue-500 text-[12px] font-bold min-w-[72px] ${wkBg}`} />
        );
      }

      return [
        ...wDates.map((dt) => {
          const dayVal = (row.code === 'abs_reel' || row.code === 'non_logue')
            ? resolveValue(row, null, w, dateToManualIndex(dt))
            : row.formula(dateIndex[dt] || {});
          return (
            <DataCell key={dt} value={dayVal} row={row} dark={dark}
              cellKey={`${currentActivity}::${row.code}::${w}::${dt}`}
              tdClass={`px-2 py-1.5 text-center border-b border-r ${brd} text-[12px] min-w-[72px] ${row.type === 'kpi' ? 'font-semibold' : 'font-normal'}`} />
          );
        }),
        <DataCell key={w + '-wt'} value={wVal} row={row} dark={dark}
          cellKey={`${currentActivity}::${row.code}::${w}::total`}
          tdClass={`px-2 py-1.5 text-center border-b border-l border-r-2 ${brdS} text-[12px] font-bold min-w-[72px] ${wkBg}`} />,
      ];
    });

  return (
    <div className="flex-1 overflow-auto relative">
      <table className="border-collapse whitespace-nowrap min-w-full" style={{ background: bg }}>
        <thead className="sticky top-0 z-50">
          <tr>
            <th rowSpan={2} className={`sticky left-0 z-[60] min-w-[215px] max-w-[215px] ${bgH} border-b border-r ${brd} text-left px-2.5 py-1.5 text-[16px] font-semibold tracking-widest ${txtMuted}`}>INDICATEUR</th>
            <th rowSpan={2} className={`sticky left-[215px] z-[60] min-w-[58px] max-w-[58px] ${bgH} border-b border-r ${brdS} text-center px-2 py-1.5 text-[16px] font-semibold text-amber-600`}>MIN</th>
            <th rowSpan={2} className={`sticky left-[273px] z-[60] min-w-[58px] max-w-[58px] ${bgH} border-b border-r-[3px] ${brdS} text-center px-2 py-1.5 text-[16px] font-semibold text-green-600`}>MAX</th>
            {sortedWeeks.map((w) => {
              const dc = collapseState['w:' + w] ? 1 : weekDay[w].length + 1;
              return (
                <th key={w} colSpan={dc} className={`${bgH} ${brd} border-b border-r text-[12px] font-semibold ${txt} px-2 py-1`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <ToggleBtn collapsed={!!collapseState['w:' + w]} onClick={() => onToggle('w:' + w)} dark={dark} />
                    {w}
                  </div>
                </th>
              );
            })}
          </tr>
          <tr>
            {sortedWeeks.map((w) => {
              if (collapseState['w:' + w]) {
                return (
                  <th key={w} className={`min-w-[72px] ${wkBg} border-b border-r-[3px] border-blue-500 text-[10px] font-bold text-blue-600 px-2 py-1`}>
                    <div className="flex flex-col items-center gap-0.5"><span className="font-bold">Total</span><span className="font-normal">{w}</span></div>
                  </th>
                );
              }
              const wDates = weekDay[w].slice().sort((a, b) => parseDate(a) - parseDate(b));
              return [
                ...wDates.map((d) => (
                  <th key={d} className={`${bgH} ${brd} border-b border-r text-center px-2 py-1 min-w-[72px]`}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[12px] font-semibold ${txt}`}>{getDayLabel(d)}</span>
                      <span className={`text-[9px] font-normal ${txtMuted}`}>{shortDate(d)}</span>
                    </div>
                  </th>
                )),
                <th key={w + '-wt'} className={`min-w-[72px] ${wkBg} border-b border-l border-r-2 ${brdS} text-center px-2 py-1`}>
                  <div className="flex flex-col items-center gap-0">
                    <span className={`text-[9px] font-bold ${txt}`}>Tot.</span>
                    <span className={`text-[9px] font-normal ${txtMuted}`}>{w}</span>
                  </div>
                </th>,
              ];
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            if (row.type === 'section') {
              const sectionBg = dark ? '#1c2433' : '#f0f9ff';
              return (
                <tr key={ri} className={dark ? 'bg-[#1c2433] hover:bg-[#1c2d50]' : 'bg-blue-50/70 hover:bg-blue-100'}>
                  <td className={`sticky left-0 z-30 text-left px-2.5 py-1.5 text-[13px] font-bold tracking-widest uppercase border-b ${dark ? 'text-[#00afa9] border-blue-900' : 'text-[#00afa9] border-blue-200'}`} style={{ background: sectionBg }}>{row.label}</td>
                  <td className={`sticky left-[215px] z-20 min-w-[58px] max-w-[58px] border-b border-r-2 ${dark ? 'border-blue-900' : 'border-blue-200'}`} style={{ background: sectionBg }} />
                  <td className={`sticky left-[273px] z-20 min-w-[58px] max-w-[58px] border-b border-r-[3px] ${dark ? 'border-blue-900' : 'border-blue-200'}`} style={{ background: sectionBg }} />
                  {sortedWeeks.map((w) => {
                    const numCols = collapseState['w:' + w] ? 1 : (weekDay[w]?.length || 0) + 1;
                    return Array.from({ length: numCols }).map((_, i) => (
                      <td key={`${w}-${i}`} className={`border-b ${i === numCols - 1 ? 'border-r-[3px]' : 'border-r'} ${dark ? 'border-blue-900' : 'border-blue-200'}`} style={{ background: sectionBg }} />
                    ));
                  })}
                </tr>
              );
            }
            const isKpi = row.type === 'kpi';
            return (
              <tr key={ri} className={`group ${hov}`} style={{ background: bg }}>
                <td className={`sticky left-0 z-20 px-2.5 py-1.5 text-left border-b border-r ${brd} text-[13px] ${isKpi ? `font-semibold pl-3.5 ${txt}` : `font-normal pl-6 ${txtMuted}`}`} style={{ background: bg }}>
                  {row.label}
                  {/* Badge "manuel" pour les lignes à saisie manuelle */}
                  {(row.code === 'abs_reel' || row.code === 'non_logue') && (
                    <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>manuel</span>
                  )}
                </td>
                <td className={`sticky left-[215px] z-20 min-w-[58px] max-w-[58px] px-2 py-1.5 text-center border-b border-r-2 ${brdS} text-[12px] font-semibold text-amber-600`} style={{ background: bg }}>
                  {row.refMin !== undefined ? (row.fmt === 'second' ? fmtSec(row.refMin) : row.fmt?.startsWith('decimal') ? fmtDecimal(row.refMin, 1) : fmtPct(row.refMin)) : ''}
                </td>
                <td className={`sticky left-[273px] z-20 min-w-[58px] max-w-[58px] px-2 py-1.5 text-center border-b border-r-[3px] ${brdS} text-[12px] font-semibold text-green-600`} style={{ background: bg }}>
                  {row.refMax !== undefined ? (row.fmt === 'second' ? fmtSec(row.refMax) : row.fmt?.startsWith('decimal') ? fmtDecimal(row.refMax, 1) : fmtPct(row.refMax)) : ''}
                </td>
                {dataCols(row)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
