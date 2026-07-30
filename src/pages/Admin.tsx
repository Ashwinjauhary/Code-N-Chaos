import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';

interface ParticipantScore {
  participant_id: string;
  name: string;
  roll_number: string;
  total_score: number;
  total_time: number;
  games_completed: number;
  email: string;
  phone_number: string;
  class: string;
  section: string;
  emoji_score?: number;
  crossword_score?: number;
  wordsearch_score?: number;
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [eventStatus, setEventStatus] = useState<string>('not_started');
  const [unlockedGames, setUnlockedGames] = useState<string[]>([]);
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', roll_number: '', class: '', section: '', email: '', phone_number: '' });
  const [sortBy, setSortBy] = useState<'total_score' | 'name' | 'total_time'>('total_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  const fetchData = useCallback(async () => {
    // Fetch event state
    const { data: es } = await supabase
      .from('event_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (es) {
      setEventStatus(es.status);
      setUnlockedGames(es.unlocked_games || []);
    }

    // Fetch all participants with scores
    const { data: leaderboard } = await supabase
      .from('leaderboard')
      .select('*');

    if (leaderboard) {
      // Fetch individual game scores
      const { data: allScores } = await supabase
        .from('game_scores')
        .select('participant_id, game, score');

      const scoreMap: Record<string, Record<string, number>> = {};
      allScores?.forEach((s: any) => {
        if (!scoreMap[s.participant_id]) scoreMap[s.participant_id] = {};
        scoreMap[s.participant_id][s.game] = s.score;
      });

      const enriched = leaderboard.map((p: any) => ({
        ...p,
        emoji_score: scoreMap[p.participant_id]?.emoji,
        crossword_score: scoreMap[p.participant_id]?.crossword,
        wordsearch_score: scoreMap[p.participant_id]?.wordsearch,
      }));

      setParticipants(enriched);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();

    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated, fetchData]);

  const updateEventState = async (updates: Record<string, any>) => {
    setLoading(true);
    await supabase.from('event_state').update(updates).eq('id', 1);
    await fetchData();
    setLoading(false);
  };

  const startEvent = () => updateEventState({ status: 'running', started_at: new Date().toISOString() });
  const endEvent = () => updateEventState({ status: 'ended', ended_at: new Date().toISOString() });

  const unlockGame = (gameId: string) => {
    const newUnlocked = unlockedGames.includes(gameId)
      ? unlockedGames.filter((g) => g !== gameId)
      : [...unlockedGames, gameId];
    updateEventState({ unlocked_games: newUnlocked });
  };

  const unlockAll = () => {
    updateEventState({ unlocked_games: ['emoji', 'crossword', 'wordsearch'] });
  };

  const resetEvent = async () => {
    setLoading(true);
    // Use RPC to reset event state and delete game scores bypassing RLS
    const { error } = await supabase.rpc('admin_reset_event');
    if (error) {
      alert('Error resetting event: ' + error.message);
    }
    setConfirmReset(false);
    await fetchData();
    setLoading(false);
  };

  const forceSubmitMissing = async () => {
    if (!window.confirm("Are you sure? This will submit a score of 0 for any participant who hasn't completed unlocked games.")) return;
    setLoading(true);
    const games = ['emoji', 'crossword', 'wordsearch'];
    
    // We will find all missing scores for unlocked games and submit 0
    const promises: any[] = [];
    
    participants.forEach((p) => {
      games.forEach((game) => {
        if (unlockedGames.includes(game)) {
          const hasScore = 
            (game === 'emoji' && p.emoji_score !== undefined) ||
            (game === 'crossword' && p.crossword_score !== undefined) ||
            (game === 'wordsearch' && p.wordsearch_score !== undefined);
            
          if (!hasScore) {
            promises.push(
              supabase.rpc('submit_score', {
                p_participant_id: p.participant_id,
                p_game: game,
                p_score: 0,
                p_time_seconds: 0,
              })
            );
          }
        }
      });
    });
    
    await Promise.allSettled(promises);
    await fetchData();
    setLoading(false);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('participants').insert([newParticipant]);
    if (error) {
      alert('Error adding participant: ' + error.message);
    } else {
      setNewParticipant({ name: '', roll_number: '', class: '', section: '', email: '', phone_number: '' });
      setShowAddForm(false);
      await fetchData();
    }
    setLoading(false);
  };

  const handleRemoveParticipant = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to completely remove ${name} and their scores?`)) {
      setLoading(true);
      // Use RPC to bypass any RLS issues
      const { error } = await supabase.rpc('admin_delete_participant', { p_id: id });
      if (error) {
        alert('Error removing participant: ' + error.message);
      } else {
        await fetchData();
      }
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Rank', 'Name', 'Roll Number', 'Class', 'Section', 'Email', 'Phone', 'Emoji', 'Crossword', 'Word Search', 'Total Score', 'Total Time (s)', 'Games Completed'];
    const sorted = [...participants].sort((a, b) => b.total_score - a.total_score || a.total_time - b.total_time);
    const rows = sorted.map((p, i) => [
      i + 1,
      p.name,
      p.roll_number,
      p.class,
      p.section,
      p.email,
      p.phone_number,
      p.emoji_score ?? 0,
      p.crossword_score ?? 0,
      p.wordsearch_score ?? 0,
      p.total_score,
      p.total_time,
      p.games_completed,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codenchaos_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
    if (sortBy === 'total_time') return dir * (a.total_time - b.total_time);
    return dir * (a.total_score - b.total_score);
  });

  const handleSort = (col: 'total_score' | 'name' | 'total_time') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  };

  // Speed bonus: top 3 fastest with all 3 games completed
  const speedBonusParticipants = participants
    .filter((p) => p.games_completed >= 3)
    .sort((a, b) => a.total_time - b.total_time)
    .slice(0, 3);

  if (!authenticated) {
    return (
      <Layout>
        <div className="admin-login">
          <motion.div
            className="admin-login-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>🔐 Admin Panel</h2>
            <p>Enter the admin password to continue.</p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                autoFocus
              />
              {passwordError && <div className="form-error">{passwordError}</div>}
              <button type="submit" className="btn-primary">
                Login
              </button>
            </form>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admin-page">
        <div className="admin-header">
          <h1>⚙️ Admin Panel</h1>
          <div className={`event-status-badge ${eventStatus}`}>
            <span className="status-dot" />
            {eventStatus === 'not_started' ? 'Not Started' : eventStatus === 'running' ? 'Running' : 'Ended'}
          </div>
        </div>

        {/* Event Controls */}
        <section className="admin-section">
          <h2>Event Controls</h2>
          <div className="admin-controls">
            <button
              className="btn-success"
              onClick={startEvent}
              disabled={loading || eventStatus === 'running'}
            >
              ▶ Start Event
            </button>
            <button
              className="btn-danger"
              onClick={endEvent}
              disabled={loading || eventStatus !== 'running'}
            >
              ⬛ End Event
            </button>
          </div>
        </section>

        {/* Game Unlock Controls */}
        <section className="admin-section">
          <h2>Unlock Games</h2>
          <div className="admin-controls">
            {['emoji', 'crossword', 'wordsearch'].map((game) => (
              <button
                key={game}
                className={`btn-game-toggle ${unlockedGames.includes(game) ? 'active' : ''}`}
                onClick={() => unlockGame(game)}
                disabled={loading}
              >
                {unlockedGames.includes(game) ? '🔓' : '🔒'}{' '}
                {game === 'emoji' ? 'Emoji Game' : game === 'crossword' ? 'Crossword' : 'Word Search'}
              </button>
            ))}
            <button className="btn-secondary" onClick={unlockAll} disabled={loading}>
              🔓 Unlock All
            </button>
          </div>
        </section>

        {/* Speed Bonus */}
        {speedBonusParticipants.length > 0 && (
          <section className="admin-section">
            <h2>⚡ Speed Bonus (Top 3 Fastest Completions)</h2>
            <div className="speed-bonus-list">
              {speedBonusParticipants.map((p, i) => (
                <div key={p.participant_id} className={`speed-bonus-item rank-${i + 1}`}>
                  <span className="speed-rank">{['🥇', '🥈', '🥉'][i]}</span>
                  <span className="speed-name">{p.name}</span>
                  <span className="speed-time">{Math.floor(p.total_time / 60)}m {p.total_time % 60}s</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Participant Management */}
        <section className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>👥 Participant Management</h2>
            <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '➕ Add Participant'}
            </button>
          </div>
          
          {showAddForm && (
            <div className="admin-login-card" style={{ marginBottom: '2rem', textAlign: 'left', maxWidth: '100%' }}>
              <h3>Add New Participant</h3>
              <form onSubmit={handleAddParticipant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required placeholder="Full Name" value={newParticipant.name} onChange={e => setNewParticipant({...newParticipant, name: e.target.value})} />
                <input required placeholder="Roll Number" value={newParticipant.roll_number} onChange={e => setNewParticipant({...newParticipant, roll_number: e.target.value})} />
                <input required placeholder="Class" value={newParticipant.class} onChange={e => setNewParticipant({...newParticipant, class: e.target.value})} />
                <input required placeholder="Section" value={newParticipant.section} onChange={e => setNewParticipant({...newParticipant, section: e.target.value})} />
                <input required type="email" placeholder="Email" value={newParticipant.email} onChange={e => setNewParticipant({...newParticipant, email: e.target.value})} />
                <input required type="tel" placeholder="Phone Number" value={newParticipant.phone_number} onChange={e => setNewParticipant({...newParticipant, phone_number: e.target.value})} />
                <div style={{ gridColumn: 'span 2' }}>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                    Save Participant
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Class & Sec</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map(p => (
                  <tr key={`manage-${p.participant_id}`}>
                    <td>{p.name}</td>
                    <td>{p.roll_number}</td>
                    <td>{p.class} / {p.section}</td>
                    <td>
                      <div style={{ fontSize: '0.9em' }}>{p.phone_number}</div>
                      <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{p.email}</div>
                    </td>
                    <td>
                      <button 
                        className="btn-danger" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => handleRemoveParticipant(p.participant_id, p.name)}
                        disabled={loading}
                      >
                        🗑 Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Scores Table */}
        <section className="admin-section">
          <h2>
            Live Scores ({participants.length} participants)
            <button className="btn-export" onClick={exportCSV}>
              📥 Export CSV
            </button>
          </h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Student {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Class & Section</th>
                  <th>Contact</th>
                  <th className="sortable" onClick={() => handleSort('total_score')}>
                    Score {sortBy === 'total_score' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Games</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((p, i) => (
                  <tr key={p.participant_id}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="participant-name">{p.name}</div>
                      <div className="participant-roll">{p.roll_number}</div>
                    </td>
                    <td>
                      <div>{p.class}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Sec: {p.section}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9em' }}>{p.phone_number}</div>
                      <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{p.email}</div>
                    </td>
                    <td className="score-cell">{p.total_score}</td>
                    <td>
                      <div>{p.games_completed}/3</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{Math.floor(p.total_time / 60)}m {p.total_time % 60}s</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reset */}
        <section className="admin-section admin-danger-zone">
          <h2>⚠️ Danger Zone</h2>
          {!confirmReset ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-danger" onClick={() => setConfirmReset(true)} disabled={loading}>
                🗑 Reset Event
              </button>
              <button className="btn-secondary" onClick={forceSubmitMissing} disabled={loading} style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}>
                ⏱ Force Submit Missing Scores
              </button>
            </div>
          ) : (
            <div className="confirm-reset">
              <p>Are you sure? This will delete ALL scores and reset the event state.</p>
              <div className="confirm-buttons">
                <button className="btn-danger" onClick={resetEvent} disabled={loading}>
                  Yes, Reset Everything
                </button>
                <button className="btn-secondary" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
