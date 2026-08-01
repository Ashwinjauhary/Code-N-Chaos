import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ParticipantProvider, useParticipant } from './context/ParticipantContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import EmojiGame from './pages/EmojiGame';
import CrosswordGame from './pages/CrosswordGame';
import WordSearchGame from './pages/WordSearchGame';
import MemoryMatchGame from './pages/MemoryMatchGame';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useParticipant();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/game/emoji" element={<ProtectedRoute><EmojiGame /></ProtectedRoute>} />
        <Route path="/game/crossword" element={<ProtectedRoute><CrosswordGame /></ProtectedRoute>} />
        <Route path="/game/wordsearch" element={<ProtectedRoute><WordSearchGame /></ProtectedRoute>} />
        <Route path="/game/memorymatch" element={<ProtectedRoute><MemoryMatchGame /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

import { useEffect } from 'react';


export default function App() {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Play click sound if the target is a button, a link, or inside one
      if (target.closest('button') || target.closest('a') || target.classList.contains('clickable')) {
        // click
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <BrowserRouter>
      <ParticipantProvider>
        <AppRoutes />
      </ParticipantProvider>
    </BrowserRouter>
  );
}
