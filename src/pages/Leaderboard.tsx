import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import confetti from 'canvas-confetti';
import { useParticipant } from '../context/ParticipantContext';

interface LeaderboardEntry {
  participant_id: string;
  name: string;
  roll_number: string;
  total_score: number;
  total_time: number;
  games_completed: number;
}

export default function Leaderboard() {
  const { participant } = useParticipant();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: false })
      .order('total_time', { ascending: true });

    if (!error && data) {
      setEntries(data as LeaderboardEntry[]);
      
      // Blast confetti if current user is in top 3
      if (participant) {
        const top3 = (data as LeaderboardEntry[]).slice(0, 3);
        if (top3.some(e => e.participant_id === participant.id)) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00E5FF', '#FF0055', '#FFEA00'],
            disableForReducedMotion: true
          });
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to score changes for live updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_scores' },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="leaderboard-page">
          <div className="leaderboard-loading">
            <div className="spinner large" />
            <p>Loading leaderboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="leaderboard-page">
        <div className="leaderboard-header">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="lb-icon">🏆</span> Live Leaderboard
          </motion.h1>
          <motion.p
            className="leaderboard-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Code N Chaos — Tech Gaming Arena
          </motion.p>
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE
          </div>
        </div>

      {entries.length === 0 ? (
        <div className="leaderboard-empty">
          <p>No scores yet. The arena awaits its first champion!</p>
        </div>
      ) : (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="col-rank">Rank</th>
                <th className="col-name">Participant</th>
                <th className="col-score">Total Score</th>
                <th className="col-time">Time</th>
                <th className="col-games">Games</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <motion.tr
                      key={entry.participant_id}
                      className={`leaderboard-row ${getRankStyle(rank)}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      layout
                    >
                      <td className="col-rank">
                        <span className={`rank-badge ${getRankStyle(rank)}`}>
                          {getRankEmoji(rank)}
                        </span>
                      </td>
                      <td className="col-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Avatar seed={entry.roll_number} size={36} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="participant-name">{entry.name}</span>
                            <span className="participant-roll">{entry.roll_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="col-score">
                        <span className="score-value">{entry.total_score}</span>
                      </td>
                      <td className="col-time">{formatTime(entry.total_time)}</td>
                      <td className="col-games">
                        <span className="games-badge">{entry.games_completed}/4</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
    </Layout>
  );
}
