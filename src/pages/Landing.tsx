import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <Layout showNav={false}>
      <div className="landing-page">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-content">
            <motion.div 
              className="badge"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              The Ultimate Tech Arena ⚡
            </motion.div>
            
            <motion.h1 
              className="hero-title"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
            >
              CODE <span className="highlight">N</span> CHAOS
            </motion.h1>
            
            <motion.p 
              className="hero-subtitle"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Compete in high-stakes tech mini-games. Outsmart the anti-cheat. Climb the real-time leaderboard.
            </motion.p>
            
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <button 
                className="btn-primary hero-btn"
                onClick={() => navigate('/login')}
              >
                ENTER ARENA 🚀
              </button>
            </motion.div>
          </div>
          
          {/* Decorative floating elements */}
          <motion.div className="floating-item float-1" animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>💻</motion.div>
          <motion.div className="floating-item float-2" animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5 }}>🧠</motion.div>
          <motion.div className="floating-item float-3" animate={{ y: [0, -25, 0], rotate: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 6 }}>🎯</motion.div>
        </section>

        {/* MARQUEE SECTION */}
        <div className="marquee-container">
          <div className="marquee-content">
            <span>✦ 4 EXTREME GAMES ✦ REAL-TIME LEADERBOARD ✦ LIVE ANTI-CHEAT ✦ INSTANT SCORING ✦</span>
            <span>✦ 4 EXTREME GAMES ✦ REAL-TIME LEADERBOARD ✦ LIVE ANTI-CHEAT ✦ INSTANT SCORING ✦</span>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <section className="features-section">
          <h2>WHAT TO EXPECT</h2>
          <div className="features-grid">
            <motion.div className="feature-card" whileHover={{ y: -10, scale: 1.02 }}>
              <div className="feature-icon">🎮</div>
              <h3>4 Unique Games</h3>
              <p>Test your tech knowledge with Emoji Puzzles, Crosswords, Memory Matches, and Word Searches.</p>
            </motion.div>
            
            <motion.div className="feature-card" whileHover={{ y: -10, scale: 1.02 }}>
              <div className="feature-icon">👁️</div>
              <h3>Anti-Cheat System</h3>
              <p>Tab-switching, copy-pasting, and right-clicking are strictly monitored. Play fair or get disqualified!</p>
            </motion.div>
            
            <motion.div className="feature-card" whileHover={{ y: -10, scale: 1.02 }}>
              <div className="feature-icon">🏆</div>
              <h3>Live Leaderboard</h3>
              <p>Scores update in real-time. The fastest and most accurate player takes the crown.</p>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
