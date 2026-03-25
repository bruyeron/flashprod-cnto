import { useRef } from 'react';
import { X, Save, ClipboardCheck } from 'lucide-react';

const STORAGE_KEY = 'fp_manual_values';
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const N_DAYS = 7;

export function loadManualValues() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveManualValues(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function weekTotal(weekData, field) {
  const arr = weekData?.[field];
  if (!Array.isArray(arr)) return null;
  const sum = arr.reduce((acc, v) => {
    const n = parseFloat(v);
    return isNaN(n) ? acc : acc + n;
  }, 0);
  return arr.every(v => v === '' || v === null || v === undefined) ? null : sum;
}

export default function WeeklyCompletionModal({ dark, sortedWeeks, onClose }) {
  // Structure : refs.current[week][field][dayIndex] = <input>
  const refs = useRef({});
  const saved_ref = useRef(null); // bouton Sauvegarder

  const saved_state = useRef(false);

  // Initialise les refs par semaine au premier rendu
  const existing = loadManualValues();
  sortedWeeks.forEach(w => {
    if (!refs.current[w]) refs.current[w] = { abs_reel: [], non_logue: [] };
  });

  const bg   = dark ? 'bg-[#161b22] text-slate-200' : 'bg-white text-slate-800';
  const card = dark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200';
  const hdr  = dark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `border rounded-lg px-1.5 py-1 text-[11px] text-center outline-none w-full
    focus:ring-1 focus:ring-[#00afa9]/40 transition-all
    ${dark
      ? 'bg-[#21262d] border-[#30363d] text-slate-200 placeholder-slate-600 focus:border-[#00afa9]'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300 focus:border-[#00afa9]'}`;

  // Lit toutes les valeurs depuis les refs DOM et sauvegarde
  const handleSave = () => {
    const toSave = {};
    sortedWeeks.forEach(w => {
      toSave[w] = { abs_reel: [], non_logue: [] };
      ['abs_reel', 'non_logue'].forEach(field => {
        for (let i = 0; i < N_DAYS; i++) {
          const el = refs.current[w]?.[field]?.[i];
          const raw = el?.value ?? '';
          const n = parseFloat(raw);
          toSave[w][field].push(isNaN(n) ? null : n);
        }
      });
    });
    saveManualValues(toSave);
    // Feedback visuel rapide sur le bouton
    if (saved_ref.current) {
      saved_ref.current.textContent = '✓ Sauvegardé';
      saved_ref.current.classList.add('bg-green-500');
      saved_ref.current.classList.remove('bg-[#00afa9]');
      setTimeout(() => {
        if (saved_ref.current) {
          saved_ref.current.textContent = 'Sauvegarder';
          saved_ref.current.classList.remove('bg-green-500');
          saved_ref.current.classList.add('bg-[#00afa9]');
        }
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className={`${bg} w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? 'border-[#30363d]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-[#00afa9]" />
            <div>
              <span className="font-bold text-sm">Complétion hebdomadaire</span>
              <p className={`text-[11px] mt-0.5 ${hdr}`}>
                Couverture de charge — Absence réelle &amp; Non logués · 7 valeurs par semaine
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer transition-colors ${dark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {sortedWeeks.length === 0 && (
            <p className={`text-sm text-center py-8 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
              Aucune donnée chargée — chargez un CSV d'abord.
            </p>
          )}

          {sortedWeeks.map(week => {
            const saved = existing[week] || {};
            return (
              <div key={week} className={`border rounded-xl p-4 ${card}`}>
                {/* Titre semaine */}
                <h3 className="text-sm font-bold text-[#00afa9] mb-3">{week}</h3>

                {/* Grille 9 colonnes : label + 7 jours + total */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className={`text-left pr-3 py-1 font-semibold ${hdr} w-28`}>Indicateur</th>
                        {DAYS.map(d => (
                          <th key={d} className={`text-center px-1 py-1 font-semibold ${hdr} min-w-[52px]`}>{d}</th>
                        ))}
                        <th className={`text-center px-2 py-1 font-semibold text-[#00afa9] min-w-[56px]`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      {/* Ligne Absence réelle */}
                      <tr>
                        <td className={`pr-3 py-1.5 font-medium text-[11px] ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Absence réelle
                        </td>
                        {Array.from({ length: N_DAYS }).map((_, i) => {
                          const val = saved.abs_reel?.[i];
                          return (
                            <td key={i} className="px-1 py-1">
                              {/* defaultValue = valeur existante, pas de onChange */}
                              <input
                                ref={el => {
                                  if (!refs.current[week]) refs.current[week] = { abs_reel: [], non_logue: [] };
                                  refs.current[week].abs_reel[i] = el;
                                }}
                                type="number"
                                step="1"
                                min="0"
                                defaultValue={val !== null && val !== undefined ? val : ''}
                                placeholder="—"
                                className={inputCls}
                              />
                            </td>
                          );
                        })}
                        {/* Total calculé en temps réel via onBlur sur chaque input */}
                        <td className={`px-2 py-1 text-center font-bold text-[#00afa9] text-[11px]`}>
                          {(() => {
                            const arr = saved.abs_reel || [];
                            const s = arr.reduce((a, v) => a + (parseFloat(v) || 0), 0);
                            return arr.some(v => v !== null && v !== '') ? s.toFixed(2) : '—';
                          })()}
                        </td>
                      </tr>

                      {/* Séparateur */}
                      <tr><td colSpan={N_DAYS + 2} className={`py-0.5 ${dark ? 'border-t border-[#30363d]' : 'border-t border-slate-100'}`} /></tr>

                      {/* Ligne Non logués */}
                      <tr>
                        <td className={`pr-3 py-1.5 font-medium text-[11px] ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Non logués
                        </td>
                        {Array.from({ length: N_DAYS }).map((_, i) => {
                          const val = saved.non_logue?.[i];
                          return (
                            <td key={i} className="px-1 py-1">
                              <input
                                ref={el => {
                                  if (!refs.current[week]) refs.current[week] = { abs_reel: [], non_logue: [] };
                                  refs.current[week].non_logue[i] = el;
                                }}
                                type="number"
                                step="0.1"
                                min="0"
                                defaultValue={val !== null && val !== undefined ? val : ''}
                                placeholder="—"
                                className={inputCls}
                              />
                            </td>
                          );
                        })}
                        <td className={`px-2 py-1 text-center font-bold text-[#00afa9] text-[11px]`}>
                          {(() => {
                            const arr = saved.non_logue || [];
                            const s = arr.reduce((a, v) => a + (parseFloat(v) || 0), 0);
                            return arr.some(v => v !== null && v !== '') ? s.toFixed(2) : '—';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between flex-shrink-0 ${dark ? 'border-[#30363d]' : 'border-slate-200'}`}>
          <p className={`text-[11px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
            Valeurs mbola stockées localement · Int sy décimal accepté (ex : 1, 0.5, 2.25)
          </p>
          <button
            ref={saved_ref}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold transition-all cursor-pointer bg-[#00afa9] hover:bg-teal-600 text-white"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
