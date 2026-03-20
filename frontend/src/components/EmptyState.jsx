export default function EmptyState({ dark }) {
  const muted = dark ? "text-slate-500" : "text-slate-400";
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${muted}`}>
      <div className="text-[54px] opacity-25 select-none">📂</div>
      <div className={`text-[16px] font-semibold opacity-40 ${dark ? "text-slate-400" : "text-slate-500"}`}>Aucune donnée chargée</div>
      <div className="text-[12px]">Cliquez sur « Charger CSV » — séparateur virgule (,) ou tabulation</div>
    </div>
  );
}
