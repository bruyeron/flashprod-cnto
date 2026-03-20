
export default function Loading({ dark, message = "En cours de chargement..." }) {
  return (
    <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3.5 ${dark ? "bg-[#0d1117]/90" : "bg-[#f5f7fa]/90"}`}>
      <img src="https://www.connecteo.mg/integration/images/design/loading.gif" alt="loading" />
      <span className={`text-[13px] font-medium ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {message}
      </span>
    </div>
  );
}
