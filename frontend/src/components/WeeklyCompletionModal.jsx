import { useRef } from 'react';
import { X, Save, ClipboardCheck } from 'lucide-react';

const STORAGE_KEY = 'fp_manual_values';
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const N_DAYS = 7;

// Lecture / écriture localStorage
export function loadManualValues() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveManualValues(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// weekTotal : somme des jours renseignés
// Exportée et utilisée par DataTable.jsx pour afficher le total hebdo dans le tableau.
export function weekTotal(weekData, field) {
  const arr = weekData?.[field];
  if (!Array.isArray(arr)) return null;
  const hasAny = arr.some(v => v !== null && v !== undefined && v !== '');
  if (!hasAny) return null;
  return arr.reduce((acc, v) => {
    const n = parseFloat(v);
    return isNaN(n) ? acc : acc + n;
  }, 0);
}

// weekAverage exportée — utilisée par DataTable pour la colonne Tot. des lignes manuelles
export function weekAverage(arr) {
  if (!Array.isArray(arr)) return null;
  const filled = arr.filter(v => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
  if (filled.length === 0) return null;
  const sum = filled.reduce((acc, v) => acc + parseFloat(v), 0);
  return sum / filled.length;
}

//  Composant
// currentActivity ajouté en prop
export default function WeeklyCompletionModal({ dark, sortedWeeks, onClose, currentActivity = '' }) {
  const refs      = useRef({});
  const saved_ref = useRef(null);

  // Lire uniquement les valeurs de l'activité courante
  const allValues = loadManualValues();
  const existing  = allValues[currentActivity] || {};

  sortedWeeks.forEach(w => {
    if (!refs.current[w]) refs.current[w] = { abs_reel: [], non_logue: [] };
  });

  const bg       = dark ? 'bg-[#161b22] text-slate-200' : 'bg-white text-slate-800';
  const card     = dark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-slate-50 border-slate-200';
  const hdr      = dark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `border rounded-lg px-1.5 py-1 text-[11px] text-center outline-none w-full
    focus:ring-1 focus:ring-[#00afa9]/40 transition-all
    ${dark
      ? 'bg-[#21262d] border-[#30363d] text-slate-200 placeholder-slate-600 focus:border-[#00afa9]'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300 focus:border-[#00afa9]'}`;

  // Lit les refs et sauvegarde sous la clé de l'activité courante
  const handleSave = () => {
    const weekData = {};
    sortedWeeks.forEach(w => {
      weekData[w] = { abs_reel: [], non_logue: [] };
      ['abs_reel', 'non_logue'].forEach(field => {
        for (let i = 0; i < N_DAYS; i++) {
          const el = refs.current[w]?.[field]?.[i];
          const raw = el?.value ?? '';
          const n = parseFloat(raw);
          weekData[w][field].push(isNaN(n) ? null : n);
        }
      });
    });

    // Merge avec les autres activités — ne pas les écraser
    const updated = { ...allValues, [currentActivity]: weekData };
    saveManualValues(updated);

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

  // Rendu d'une ligne (abs_reel ou non_logue)
  const renderRow = (label, field, weekSaved) => {
    const arr = weekSaved[field] || [];
    const avg = weekAverage(arr); // [v12-2]
    return (
      <tr>
        <td className={`pr-3 py-1.5 font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          {label}
        </td>
        {Array.from({ length: N_DAYS }).map((_, i) => {
          const val = weekSaved[field]?.[i];
          return (
            <td key={i} className="px-1 py-1">
              <input
                ref={el => {
                  refs.current[weekSaved.__week] ??= { abs_reel: [], non_logue: [] };
                  refs.current[weekSaved.__week][field][i] = el;
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
        {/* [v12-2] Colonne Moy. — moyenne des jours renseignés */}
        <td className="px-2 py-1 text-center font-bold text-[#00afa9] text-[11px]">
          {avg !== null ? avg.toFixed(2) : '—'}
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className={`${bg} w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}>

        {/* Header ────────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${dark ? 'border-[#30363d]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-[#00afa9]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">Complétion hebdomadaire</span>
                {/* [v12-1] Badge activité courante bien visible */}
                {currentActivity ? (
                  <span className="text-[12px] bg-[#00afa9] text-white px-2.5 py-0.5 rounded-full font-semibold">
                    {currentActivity}
                  </span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${dark ? 'border-slate-600 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    Aucune activité sélectionnée
                  </span>
                )}
              </div>
              <p className={`text-[11px] mt-0.5 ${hdr}`}>
                Couverture de charge — Absence réelle &amp; Non logués
                · La colonne <span className="font-semibold text-[#00afa9]">Moy.</span> affiche la moyenne des jours renseignés
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer transition-colors ${dark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {!currentActivity && (
            <div className={`rounded-lg px-4 py-3 text-sm border ${dark ? 'bg-amber-900/20 border-amber-800/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              ⚠ Aucune activité sélectionnée. Choisissez une activité dans la barre du haut avant de remplir.
            </div>
          )}

          {sortedWeeks.length === 0 && (
            <p className={`text-sm text-center py-8 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
              Aucune donnée chargée — chargez un CSV d'abord.
            </p>
          )}

          {sortedWeeks.map(week => {
            const saved = { ...existing[week] || {}, __week: week };
            return (
              <div key={week} className={`border rounded-xl p-4 ${card}`}>
                {/* Titre semaine */}
                <h3 className="text-sm font-bold text-[#00afa9] mb-3">{week}</h3>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className={`text-left pr-3 py-1 font-semibold ${hdr} w-28`}>Indicateur</th>
                        {DAYS.map(d => (
                          <th key={d} className={`text-center px-1 py-1 font-semibold ${hdr} min-w-[52px]`}>{d}</th>
                        ))}
                        {/* [v12-2] En-tête renommé Moy. */}
                        <th className="text-center px-2 py-1 font-semibold text-[#00afa9] min-w-[56px]">Moy.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRow('Absence réelle', 'abs_reel', saved)}
                      <tr>
                        <td colSpan={N_DAYS + 2} className={`py-0.5 ${dark ? 'border-t border-[#30363d]' : 'border-t border-slate-100'}`} />
                      </tr>
                      {renderRow('Non logués', 'non_logue', saved)}
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
            {/* Rappel de l'activité dans le footer */}
            Valeurs propres à l'activité <span className="font-semibold text-[#00afa9]">{currentActivity || '—'}</span> ·
          </p>
          <button
            ref={saved_ref}
            onClick={handleSave}
            disabled={!currentActivity}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold transition-all cursor-pointer bg-[#00afa9] hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
