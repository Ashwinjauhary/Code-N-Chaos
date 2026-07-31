import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ParticipantProvider, useParticipant } from './context/ParticipantContext';
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
        <Route path="/" element={<Login />} />
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

export default function App() {
  return (
    <BrowserRouter>
      <ParticipantProvider>
        <AppRoutes />
      </ParticipantProvider>
    </BrowserRouter>
  );
}
