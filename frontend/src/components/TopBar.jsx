/**
 * src/components/TopBar.jsx – VERSION SANS AUTH0
 * Utilise useAuth() au lieu de useAuth0().
 */
import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Sun, Moon, Upload, Power, CircleUserRound, ShieldCheck } from 'lucide-react';
import logo from "../assets/logo.png";
import AdminPanel from "./AdminPanel";

export default function TopBar({ dark, onToggleTheme, allGroups, selectedGroup, onGroupChange, statusMsg, onFileLoad }) {
  const fileRef = useRef();
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  const bg2   = dark ? "bg-[#161b22]"   : "bg-white";
  const border= dark ? "border-[#30363d]" : "border-slate-200";
  const text  = dark ? "text-slate-200" : "text-slate-800";
  const muted = dark ? "text-slate-500" : "text-slate-400";

  return (
    <>
      <div className={`h-14 ${bg2} border-b-2 ${border} flex items-center px-5 gap-3.5 flex-shrink-0 z-[100] shadow-sm`}>
        <div className="w-[110px] h-[34px] rounded-[9px] mt-2 flex items-center justify-center overflow-hidden flex-shrink-0 select-none">
          <img src={logo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className={`font-bold text-[18px] tracking-tight ${text}`}>Flash Production</span>
        <div className={`w-px h-[22px] ${dark ? "bg-slate-700" : "bg-slate-200"}`} />
        <span className={`text-[12px] font-medium ${muted}`}>Activité :</span>

        {allGroups.length > 1 ? (
          <select
            className={`${dark ? "bg-[#21262d] border-[#30363d] text-slate-200" : "bg-slate-100 border-slate-200 text-slate-800"} border rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer outline-none min-w-[150px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            <option value="">— Tous —</option>
            {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        ) : (
          <span className={`${muted} ml-2`}>{allGroups[0] || '–'}</span>
        )}

        <span className={`text-[11px] font-normal ${muted}`}>{statusMsg}</span>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && (
            <div className={`text-[12px] ${muted} mr-2 flex items-center gap-1`}>
              <CircleUserRound size={18} />
              <span>{user.username}</span>
              {isAdmin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">Admin</span>}
            </div>
          )}

          {/* Bouton panel admin */}
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              title="Gestion des comptes"
              className={`w-9 h-9 rounded-lg border cursor-pointer flex items-center justify-center transition-all ${dark ? "bg-[#21262d] border-[#30363d] hover:border-purple-500 hover:bg-purple-900/40" : "bg-slate-100 border-slate-200 hover:border-purple-400 hover:bg-purple-50"}`}
            >
              <ShieldCheck size={16} strokeWidth={2.5} className="text-purple-500" />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className={`w-9 h-9 rounded-lg border cursor-pointer flex items-center justify-center text-[16px] transition-all ${dark ? "bg-[#21262d] border-[#096475] hover:bg-[#00afa9]" : "bg-slate-100 border-[#cce1e1] hover:border-[#096475] hover:bg-[#00afa9]"}`}
          >
            {dark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          </button>

          {/* Charger CSV */}
          <button
            onClick={() => fileRef.current.click()}
            className="bg-[#00afa9] hover:bg-[#096475] text-white border-[#808284] px-4 py-2 rounded-lg text-[12px] cursor-pointer font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
          >
            <Upload size={14} strokeWidth={2.5} />
            Charger CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { onFileLoad(e.target.files[0]); e.target.value = ""; }}
          />

          {/* Logout */}
          {isAuthenticated && (
            <button
              onClick={logout}
              title="Déconnexion"
              className={`w-9 h-9 rounded-lg border cursor-pointer flex items-center justify-center transition-all ${dark ? "bg-[#21262d] border-[#096475] hover:bg-[#00afa9]" : "bg-slate-100 border-[#cce1e1] hover:border-[#096475] hover:bg-[#00afa9]"}`}
            >
              <Power size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {showAdmin && <AdminPanel dark={dark} onClose={() => setShowAdmin(false)} />}
    </>
  );
}
