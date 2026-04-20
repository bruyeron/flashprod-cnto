/**
 * src/main.jsx
 *
 * MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
 *  - CommentProvider reçoit maintenant currentActivity en prop
 *  - Pour cela, Root gère selectedGroup et le transmet au CommentProvider
 *  - Le reste est inchangé
 *
 * NOTE : CommentProvider doit être à l'intérieur de AuthProvider
 * pour pouvoir lire le token via useAuth().
 */

import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CommentProvider } from './context/CommentContext';

function Root() {
  const { isLoading, isAuthenticated } = useAuth();

  // MODIFIÉ : selectedGroup géré ici pour le passer au CommentProvider
  const [currentActivity, setCurrentActivity] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#00afa9]" />
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  return (
    // MODIFIÉ : currentActivity transmis au CommentProvider
    <CommentProvider currentActivity={currentActivity}>
      <App onActivityChange={setCurrentActivity} currentActivity={currentActivity} />
    </CommentProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
