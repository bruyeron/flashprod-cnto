export default function Legend({ dark }) {
  const bg2 = dark ? "bg-[#161b22]" : "bg-white";
  const border = dark ? "border-[#30363d]" : "border-slate-200";
  const muted = dark ? "text-slate-500" : "text-slate-400";
  const chip = (color, label) => {
    const c = { green: dark ? "bg-green-950 text-green-400" : "bg-green-100 text-green-700", orange: dark ? "bg-amber-950 text-amber-400" : "bg-amber-100 text-amber-700", red: dark ? "bg-red-950 text-red-400" : "bg-red-100 text-red-600" };
    return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${c[color]}`}>{label}</span>;
  };
  return (
    <div className={`flex items-center gap-4 px-5 h-8 ${bg2} border-t ${border} flex-shrink-0`}>
      <span className={`text-[11px] font-medium ${muted}`}>Performance :</span>
      <div className="flex items-center gap-1 text-[11px]">{chip("green","✓ OK")}<span className={muted}>Dans la cible</span></div>
      <div className="flex items-center gap-1 text-[11px]">{chip("orange","~ ")}<span className={muted}>Acceptable</span></div>
      <div className="flex items-center gap-1 text-[11px]">{chip("red","✗ ")}<span className={muted}>Hors cible</span></div>
      <div className={`w-px h-4 mx-1 ${dark ? "bg-slate-700" : "bg-slate-300"}`} />
      <div className="flex items-center gap-1.5 text-[11px]"><div className={`w-3.5 h-0.5 rounded ${dark ? "bg-slate-500" : "bg-slate-400"}`} /><span className={muted}>Total semaine</span></div>
      <div className="flex items-center gap-1.5 text-[11px]"><div className="w-3.5 h-0.5 rounded bg-blue-500" /><span className={muted}>Total mois</span></div>
    </div>
  );
}
