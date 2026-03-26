import { createContext, useContext, useState, useCallback } from 'react';

const CommentContext = createContext(null);
const STORAGE_KEY = 'fp_comments';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function CommentProvider({ children }) {
  const [comments, setComments] = useState(load);

  // Retourne les commentaires d'une cellule
  const getComments = useCallback((cellKey) => {
    return comments[cellKey] || [];
  }, [comments]);

  // Ajoute un commentaire sur une cellule
  const addComment = useCallback((cellKey, author, text) => {
    setComments(prev => {
      const updated = {
        ...prev,
        [cellKey]: [
          ...(prev[cellKey] || []),
          {
            id: Date.now().toString(),
            author,
            text: text.trim(),
            date: new Date().toISOString(),
          },
        ],
      };
      save(updated);
      return updated;
    });
  }, []);

  // Vérifie si une cellule a au moins un commentaire
  const hasComment = useCallback((cellKey) => {
    return (comments[cellKey] || []).length > 0;
  }, [comments]);

  return (
    <CommentContext.Provider value={{ getComments, addComment, hasComment }}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComments() {
  const ctx = useContext(CommentContext);
  if (!ctx) throw new Error('useComments doit être dans <CommentProvider>');
  return ctx;
}
