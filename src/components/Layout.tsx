import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useParticipant } from '../context/ParticipantContext';
import Avatar from './Avatar';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  fullScreen?: boolean;
}

export default function Layout({ children, showNav = true, fullScreen = false }: LayoutProps) {
  const location = useLocation();
  const { participant, isLoggedIn, logout } = useParticipant();

  return (
    <div className={`app-layout ${fullScreen ? 'full-screen' : ''}`}>
      {showNav && (
        <nav className="app-nav">
          <Link to={isLoggedIn ? '/lobby' : '/'} className="nav-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-text">Code N Chaos</span>
          </Link>
          <div className="nav-links">
            {isLoggedIn && (
              <>
                <Link
                  to="/lobby"
                  className={`nav-link ${location.pathname === '/lobby' ? 'active' : ''}`}
                >
                  Lobby
                </Link>
                <Link
                  to="/leaderboard"
                  className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
                >
                  Leaderboard
                </Link>
                <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar seed={participant?.roll_number || 'default'} size={32} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="user-name">{participant?.name}</span>
                    <span className="user-roll">{participant?.roll_number}</span>
                  </div>
                </div>
                <button onClick={logout} className="nav-logout">
                  Logout
                </button>
              </>
            )}
            {!isLoggedIn && (
              <Link
                to="/leaderboard"
                className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
              >
                Leaderboard
              </Link>
            )}
          </div>
        </nav>
      )}
      <motion.main
        className="app-main"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
    </div>
  );
}
