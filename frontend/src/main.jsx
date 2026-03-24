/**
 * src/main.jsx
 *
 * DIFFÉRENCES v8 vs v6 :
 *  [1] CommentProvider ajouté autour de l'app
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
// [1] Nouveau import v8
import { CommentProvider } from './context/CommentContext';

function Root() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#00afa9]" />
      </div>
    );
  }
  return isAuthenticated ? <App /> : <Login />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* [1] CommentProvider enveloppe toute l'app pour partager les commentaires */}
    <CommentProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </CommentProvider>
  </StrictMode>
);
