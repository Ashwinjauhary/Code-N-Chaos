import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Landing() {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(false);

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
              style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <button 
                className="btn-primary hero-btn"
                onClick={() => navigate('/login')}
              >
                ENTER ARENA 🚀
              </button>
              <button 
                className="btn-secondary hero-btn"
                onClick={() => setShowInstructions(true)}
                style={{ backgroundColor: '#fff', color: '#000', border: '3px solid #000', boxShadow: '4px 4px 0 #000', fontWeight: 'bold' }}
              >
                INSTRUCTIONS 📜
              </button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="organizers-section"
            >
              <p className="organizers-text">Organized & Sponsored by</p>
              <div className="logos-flex" style={{ gap: '2.5rem', justifyContent: 'center', alignItems: 'center' }}>
                <img src="/psit_logo.png" alt="PSIT Logo" className="org-logo" style={{ height: '65px' }} />
                <img src="/codester_logo.png" alt="Codester Logo" className="org-logo" style={{ height: '80px' }} />
                <img src="/logix_logo.png" alt="Logix Club Logo" className="org-logo" style={{ height: '110px' }} />
              </div>
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

        {/* INSTRUCTIONS MODAL */}
        {showInstructions && (
          <div className="modal-overlay" onClick={() => setShowInstructions(false)} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
            justifyContent: 'center', alignItems: 'center', padding: '1rem'
          }}>
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff', border: '4px solid #000', 
                boxShadow: '8px 8px 0 #000', padding: '2rem', maxWidth: '800px', 
                width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '8px',
                color: '#000'
              }}
            >
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', borderBottom: '4px solid #000', paddingBottom: '0.5rem', textAlign: 'center', fontWeight: '900' }}>
                📜 FULL INSTRUCTION GUIDE
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left', lineHeight: '1.6' }}>
                <section>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>🎮 1. Event Structure</h3>
                  <p>The event consists of 3 tech-based mini-games: <strong>Word Search, Memory Match, and Crossword</strong>. You must complete them to secure your rank on the leaderboard.</p>
                </section>
                
                <section>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#e74c3c', marginBottom: '0.5rem' }}>🚨 2. Strict Anti-Cheat System</h3>
                  <p>Our live anti-cheat system monitors all activity. The following actions will trigger a warning:</p>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', listStyleType: 'square' }}>
                    <li>Switching tabs or opening new windows.</li>
                    <li>Minimizing the browser window.</li>
                    <li>Attempting to copy/paste text.</li>
                    <li>Opening Developer Tools (Inspect Element).</li>
                  </ul>
                  <p style={{ fontWeight: 'bold', marginTop: '0.5rem', backgroundColor: '#ffeaa7', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>Exceeding the warning limit will result in instant disqualification.</p>
                </section>
                
                <section>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>⏱️ 3. Time Limits & Submission</h3>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', listStyleType: 'square' }}>
                    <li><strong>Word Search:</strong> 25 Minutes duration.</li>
                    <li><strong>Memory Match & Crossword:</strong> You will get an option to <strong>"Submit Early"</strong> after 5 minutes of gameplay.</li>
                    <li>If the timer runs out, your current score will be auto-submitted.</li>
                  </ul>
                </section>
                
                <section>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>🏆 4. Scoring Criteria</h3>
                  <p>Your final rank on the live leaderboard is based on:</p>
                  <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                    <li>Accuracy: <span style={{ fontWeight: 'normal' }}>Number of correct answers/matches.</span></li>
                    <li>Speed: <span style={{ fontWeight: 'normal' }}>How fast you complete and submit the games. (Faster submission = higher rank in case of tie-breakers).</span></li>
                  </ol>
                </section>
              </div>
              
              <button 
                onClick={() => setShowInstructions(false)}
                style={{
                  marginTop: '2rem', width: '100%', padding: '1rem', 
                  backgroundColor: '#000', color: '#fff', fontWeight: '900', 
                  fontSize: '1.2rem', border: 'none', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '2px'
                }}
              >
                GOT IT! LET'S GO 🚀
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
