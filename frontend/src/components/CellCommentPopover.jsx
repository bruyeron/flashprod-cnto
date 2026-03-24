import { useEffect, useRef } from 'react';
import { useComments } from '../context/CommentContext';
import { X, Send, Trash2, MessageSquare } from 'lucide-react';

function fmtDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CellCommentPopover({ cellKey, dark, author, onClose, anchorRect }) {
  const { getComments, addComment, deleteComment } = useComments();
  const inputRef = useRef(null);
  const popRef   = useRef(null);
  const comments = getComments(cellKey);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    let mounted = false;
    const handler = (e) => {
      if (!mounted) return;
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    };
    const t = requestAnimationFrame(() => { mounted = true; });
    document.addEventListener('mousedown', handler);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  //Lit la valeur directement depuis le DOM — pas de re-render
  const handleSend = () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    addComment(cellKey, author, val);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') onClose();
  };

  // Position
  const top  = anchorRect ? Math.min(anchorRect.bottom + 6, window.innerHeight - 290) : 100;
  const left = anchorRect ? Math.min(anchorRect.left, window.innerWidth - 300) : 100;

  const bg    = dark ? 'bg-[#1c2433] border-[#30363d] text-slate-200' : 'bg-white border-slate-200 text-slate-800';
  const inputCls = dark
    ? 'bg-[#21262d] border-[#30363d] text-slate-200 placeholder-slate-500 focus:border-[#00afa9]'
    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#00afa9]';

  return (
    <div
      ref={popRef}
      className={`fixed z-[500] w-72 rounded-xl shadow-2xl border ${bg} flex flex-col overflow-hidden`}
      style={{ top, left }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${dark ? 'border-[#30363d]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-1.5">
          <MessageSquare size={14} className="text-[#00afa9]" />
          <span className="text-xs font-semibold">Commentaires</span>
          {comments.length > 0 && (
            <span className="text-[10px] bg-[#00afa9] text-white px-1.5 py-0.5 rounded-full font-bold">
              {comments.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className={`p-1 rounded transition-colors cursor-pointer ${dark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <X size={13} />
        </button>
      </div>

      {/* Liste */}
      <div className="overflow-y-auto max-h-44 px-3 py-2 space-y-2">
        {comments.length === 0 ? (
          <p className={`text-[11px] text-center py-3 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
            Aucun commentaire — soyez le premier !
          </p>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`rounded-lg px-2.5 py-2 ${dark ? 'bg-[#21262d]' : 'bg-slate-50'} group`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-[#00afa9]">{c.author}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{fmtDate(c.date)}</span>
                  {c.author === author && (
                    <button
                      onClick={() => deleteComment(cellKey, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-300 transition-all cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[12px] leading-relaxed break-words">{c.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Saisie — input non contrôlé, pas de value= ni onChange= */}
      <div className={`px-3 py-2 border-t ${dark ? 'border-[#30363d]' : 'border-slate-100'}`}>
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            defaultValue=""
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un commentaire…"
            className={`flex-1 border rounded-lg px-2.5 py-1.5 text-[12px] outline-none transition-all focus:ring-2 focus:ring-[#00afa9]/20 ${inputCls}`}
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-lg bg-[#00afa9] hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
        <p className={`text-[9px] mt-1 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          Connecté en tant que <span className="font-semibold text-[#00afa9]">{author}</span>
        </p>
      </div>
    </div>
  );
}
