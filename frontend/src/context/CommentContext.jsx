/**
 * src/context/CommentContext.jsx
 *
 * MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
 *  - Suppression complète du localStorage ('fp_comments')
 *  - Les commentaires sont chargés depuis GET /api/comments/{activity}
 *  - addComment envoie un POST /api/comments
 *  - deleteComment envoie un DELETE /api/comments/{id}
 *  - currentActivity et token sont nécessaires (passés depuis main.jsx via AuthContext)
 *  - Un useEffect recharge les commentaires à chaque changement d'activité
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CommentContext = createContext(null);

export function CommentProvider({ children, currentActivity }) {
  const { token } = useAuth();

  // { cell_key: [{ id, author, text, date }, ...] }
  const [comments, setComments] = useState({});
  const [loading, setLoading]   = useState(false);

  // ── Chargement des commentaires de l'activité courante ────────────────────
  const loadComments = useCallback(async () => {
    if (!token || !currentActivity) {
      setComments({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(currentActivity)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json(); // [{ id, cell_key, activity, author, text, date }]

      // Regrouper par cell_key pour un accès O(1)
      const indexed = {};
      list.forEach(c => {
        if (!indexed[c.cell_key]) indexed[c.cell_key] = [];
        indexed[c.cell_key].push(c);
      });
      setComments(indexed);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
    } finally {
      setLoading(false);
    }
  }, [token, currentActivity]);

  // Recharger à chaque changement d'activité
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // ── Lecture ────────────────────────────────────────────────────────────────
  const getComments = useCallback((cellKey) => {
    return comments[cellKey] || [];
  }, [comments]);

  const hasComment = useCallback((cellKey) => {
    return (comments[cellKey] || []).length > 0;
  }, [comments]);

  // ── Ajout ──────────────────────────────────────────────────────────────────
  const addComment = useCallback(async (cellKey, _author, text) => {
    // _author ignoré : le backend utilise l'utilisateur connecté via le token
    if (!token || !currentActivity) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cell_key: cellKey,
          activity: currentActivity,
          text,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newComment = await res.json();

      // Mise à jour locale optimiste (pas besoin de recharger tout)
      setComments(prev => ({
        ...prev,
        [cellKey]: [...(prev[cellKey] || []), newComment],
      }));
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
    }
  }, [token, currentActivity]);

  // ── Suppression ────────────────────────────────────────────────────────────
  const deleteComment = useCallback(async (commentId, cellKey) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Retirer localement
      setComments(prev => ({
        ...prev,
        [cellKey]: (prev[cellKey] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error('Erreur suppression commentaire:', err);
    }
  }, [token]);

  return (
    <CommentContext.Provider value={{ getComments, addComment, deleteComment, hasComment, loading, reloadComments: loadComments }}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComments() {
  const ctx = useContext(CommentContext);
  if (!ctx) throw new Error('useComments doit être dans <CommentProvider>');
  return ctx;
}
