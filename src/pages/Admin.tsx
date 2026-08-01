import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { emojiQuestions } from '../data/emojiData';
import { crosswordGrid, GRID_ROWS, GRID_COLS } from '../data/crosswordData';
import { WORD_LIST, wordSearchPlacements, wordSearchGrid } from '../data/wordSearchData';

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
  emoji_time?: number;
  emoji_metadata?: any;
  crossword_score?: number;
  crossword_time?: number;
  crossword_metadata?: any;
  memorymatch_score?: number;
  memorymatch_time?: number;
  memorymatch_metadata?: any;
  wordsearch_score?: number;
  wordsearch_time?: number;
  wordsearch_metadata?: any;
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
  const [showAnswers, setShowAnswers] = useState<string | null>(null);

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
        .select('participant_id, game, score, completion_time_seconds, metadata');

      const scoreMap: Record<string, Record<string, { score: number, time: number, metadata?: any }>> = {};
      allScores?.forEach((s: any) => {
        if (!scoreMap[s.participant_id]) scoreMap[s.participant_id] = {};
        scoreMap[s.participant_id][s.game] = {
          score: s.score,
          time: s.completion_time_seconds,
          metadata: s.metadata
        };
      });

      const enriched = leaderboard.map((p: any) => ({
        ...p,
        emoji_score: scoreMap[p.participant_id]?.emoji?.score,
        emoji_time: scoreMap[p.participant_id]?.emoji?.time,
        emoji_metadata: scoreMap[p.participant_id]?.emoji?.metadata,
        crossword_score: scoreMap[p.participant_id]?.crossword?.score,
        crossword_time: scoreMap[p.participant_id]?.crossword?.time,
        crossword_metadata: scoreMap[p.participant_id]?.crossword?.metadata,
        memorymatch_score: scoreMap[p.participant_id]?.memorymatch?.score,
        memorymatch_time: scoreMap[p.participant_id]?.memorymatch?.time,
        memorymatch_metadata: scoreMap[p.participant_id]?.memorymatch?.metadata,
        wordsearch_score: scoreMap[p.participant_id]?.wordsearch?.score,
        wordsearch_time: scoreMap[p.participant_id]?.wordsearch?.time,
        wordsearch_metadata: scoreMap[p.participant_id]?.wordsearch?.metadata,
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
    updateEventState({ unlocked_games: ['emoji', 'crossword', 'wordsearch', 'memorymatch'] });
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
    const games = ['emoji', 'crossword', 'memorymatch', 'wordsearch'];
    
    // We will find all missing scores for unlocked games and submit 0
    const promises: any[] = [];
    
    participants.forEach((p) => {
      games.forEach((game) => {
        if (unlockedGames.includes(game)) {
          const hasScore = 
            (game === 'emoji' && p.emoji_score !== undefined) ||
            (game === 'crossword' && p.crossword_score !== undefined) ||
            (game === 'wordsearch' && p.wordsearch_score !== undefined) ||
            (game === 'memorymatch' && p.memorymatch_score !== undefined);
            
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
    const headers = ['Rank', 'Name', 'Roll Number', 'Class', 'Section', 'Email', 'Phone', 'Emoji Score', 'Emoji Correct', 'Emoji Time (s)', 'Crossword Score', 'Crossword Words', 'Crossword Time (s)', 'Memory Match Score', 'Memory Match Moves', 'Memory Match Time (s)', 'Word Search Score', 'Word Search Words', 'Word Search Time (s)', 'Total Score', 'Total Time (s)', 'Games Completed'];
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
      p.emoji_metadata?.correct ?? 0,
      p.emoji_time ?? 0,
      p.crossword_score ?? 0,
      p.crossword_metadata?.correct ?? 0,
      p.crossword_time ?? 0,
      p.memorymatch_score ?? 0,
      p.memorymatch_metadata?.moves ?? 0,
      p.memorymatch_time ?? 0,
      p.wordsearch_score ?? 0,
      p.wordsearch_metadata?.correct ?? 0,
      p.wordsearch_time ?? 0,
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

  const speedBonusParticipants = participants
    .filter((p) => p.games_completed >= 4)
    .sort((a, b) => a.total_time - b.total_time)
    .slice(0, 3);

  // Analytics Stats
  const gameStats = () => {
    let emojiScores = 0, emojiCount = 0, emojiTime = 0;
    let crossScores = 0, crossCount = 0, crossTime = 0;
    let wordScores = 0, wordCount = 0, wordTime = 0;
    let memScores = 0, memCount = 0, memTime = 0;

    participants.forEach(p => {
      if (p.emoji_score !== undefined) { emojiScores += p.emoji_score; emojiCount++; emojiTime += (p.emoji_time || 0); }
      if (p.crossword_score !== undefined) { crossScores += p.crossword_score; crossCount++; crossTime += (p.crossword_time || 0); }
      if (p.wordsearch_score !== undefined) { wordScores += p.wordsearch_score; wordCount++; wordTime += (p.wordsearch_time || 0); }
      if (p.memorymatch_score !== undefined) { memScores += p.memorymatch_score; memCount++; memTime += (p.memorymatch_time || 0); }
    });

    return [
      { name: 'Emoji', avgScore: emojiCount ? Math.round(emojiScores / emojiCount) : 0, avgTime: emojiCount ? Math.round(emojiTime / emojiCount) : 0 },
      { name: 'Crossword', avgScore: crossCount ? Math.round(crossScores / crossCount) : 0, avgTime: crossCount ? Math.round(crossTime / crossCount) : 0 },
      { name: 'Word Search', avgScore: wordCount ? Math.round(wordScores / wordCount) : 0, avgTime: wordCount ? Math.round(wordTime / wordCount) : 0 },
      { name: 'Mem Match', avgScore: memCount ? Math.round(memScores / memCount) : 0, avgTime: memCount ? Math.round(memTime / memCount) : 0 },
    ];
  };

  const completionStats = () => {
    const counts = [0, 0, 0, 0, 0];
    participants.forEach(p => {
      counts[p.games_completed] = (counts[p.games_completed] || 0) + 1;
    });
    return [
      { name: '0 Games', value: counts[0] },
      { name: '1 Game', value: counts[1] },
      { name: '2 Games', value: counts[2] },
      { name: '3 Games', value: counts[3] },
      { name: '4 Games', value: counts[4] },
    ].filter(s => s.value > 0);
  };

  const COLORS = ['#FF4560', '#00E396', '#008FFB', '#FEB019', '#775DD0'];

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
            {['emoji', 'crossword', 'wordsearch', 'memorymatch'].map((game) => (
              <button
                key={game}
                className={`btn-game-toggle ${unlockedGames.includes(game) ? 'active' : ''}`}
                onClick={() => unlockGame(game)}
                disabled={loading}
              >
                {unlockedGames.includes(game) ? '🔓' : '🔒'}{' '}
                {game === 'emoji' ? 'Emoji Game' : game === 'crossword' ? 'Crossword' : game === 'wordsearch' ? 'Word Search' : 'Memory Match'}
              </button>
            ))}
            <button className="btn-secondary" onClick={unlockAll} disabled={loading}>
              🔓 Unlock All
            </button>
          </div>
        </section>

        {/* Answer Keys */}
        <section className="admin-section">
          <h2>🔑 Answer Keys (Admin Only)</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => setShowAnswers('emoji')}>Emoji Answers</button>
            <button className="btn-secondary" onClick={() => setShowAnswers('crossword')}>Crossword Answers</button>
            <button className="btn-secondary" onClick={() => setShowAnswers('wordsearch')}>Word Search Answers</button>
          </div>
        </section>

        {/* Analytics Dashboard */}
        <section className="admin-section">
          <h2>📊 Analytics Dashboard</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
            <div className="admin-login-card" style={{ maxWidth: '100%' }}>
              <h3>Average Scores</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gameStats()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#00E5FF' }} />
                    <Legend />
                    <Bar dataKey="avgScore" name="Avg Score" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-login-card" style={{ maxWidth: '100%' }}>
              <h3>Average Completion Time (Seconds)</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gameStats()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#FF0055' }} />
                    <Legend />
                    <Bar dataKey="avgTime" name="Avg Time (s)" fill="#FF0055" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-login-card" style={{ maxWidth: '100%', gridColumn: 'span 2' }}>
              <h3>Game Completion Rate</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionStats()} cx="50%" cy="50%" labelLine={false} label={({name, percent}) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} outerRadius={100} fill="#8884d8" dataKey="value">
                      {completionStats().map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#FFEA00' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
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
                  <th>Emoji</th>
                  <th>Crossword</th>
                  <th>Memory Match</th>
                  <th>Word Search</th>
                  <th className="sortable" onClick={() => handleSort('total_score')}>
                    Total Score {sortBy === 'total_score' && (sortDir === 'asc' ? '↑' : '↓')}
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
                    <td>
                      <div>{p.emoji_score ?? '-'}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{p.emoji_time ? `${p.emoji_time}s` : ''}</div>
                      {p.emoji_metadata?.correct !== undefined && <div style={{ fontSize: '0.8em', color: 'var(--accent-orange)' }}>{p.emoji_metadata.correct}/{p.emoji_metadata.total} correct</div>}
                    </td>
                    <td>
                      <div>{p.crossword_score ?? '-'}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{p.crossword_time ? `${p.crossword_time}s` : ''}</div>
                      {p.crossword_metadata?.correct !== undefined && <div style={{ fontSize: '0.8em', color: 'var(--accent-orange)' }}>{p.crossword_metadata.correct}/{p.crossword_metadata.total} words</div>}
                    </td>
                    <td>
                      <div>{p.memorymatch_score ?? '-'}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{p.memorymatch_time ? `${p.memorymatch_time}s` : ''}</div>
                      {p.memorymatch_metadata?.moves !== undefined && <div style={{ fontSize: '0.8em', color: 'var(--accent-orange)' }}>{p.memorymatch_metadata.moves} moves</div>}
                    </td>
                    <td>
                      <div>{p.wordsearch_score ?? '-'}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{p.wordsearch_time ? `${p.wordsearch_time}s` : ''}</div>
                      {p.wordsearch_metadata?.correct !== undefined && <div style={{ fontSize: '0.8em', color: 'var(--accent-orange)' }}>{p.wordsearch_metadata.correct}/{p.wordsearch_metadata.total} words</div>}
                    </td>
                    <td className="score-cell">{p.total_score}</td>
                    <td>
                      <div>{p.games_completed}/4</div>
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
      
      {/* Answer Keys Modal */}
      <AnimatePresence>
        {showAnswers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="admin-modal-overlay"
            onClick={() => setShowAnswers(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="admin-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ width: '80%', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#00E5FF' }}>Answer Key: {showAnswers.toUpperCase()}</h2>
                <button className="btn-secondary" onClick={() => setShowAnswers(null)}>Close</button>
              </div>
              
              {showAnswers === 'emoji' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {emojiQuestions.map((q, i) => (
                    <div key={i} style={{ padding: '1rem', background: '#1a1a2e', borderRadius: '8px', border: '1px solid #333' }}>
                      <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>{q.emojis}</span>
                      <span style={{ fontWeight: 'bold', color: '#00E5FF' }}>{q.answer}</span>
                    </div>
                  ))}
                </div>
              )}

              {showAnswers === 'crossword' && (
                <div className="crossword-layout" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="crossword-grid-container" style={{ margin: '0' }}>
                    <div
                      className="crossword-grid"
                      style={{
                        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                      }}
                    >
                      {crosswordGrid.map((row, r) =>
                        row.map((cell, c) => (
                          <div
                            key={`${r}-${c}`}
                            className={`crossword-cell ${
                              cell.letter === null ? 'black' : 'white'
                            } correct-word`}
                          >
                            {cell.number && <span className="cell-number">{cell.number}</span>}
                            {cell.letter !== null && (
                              <input
                                type="text"
                                readOnly
                                value={cell.letter}
                                className="cell-input"
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showAnswers === 'wordsearch' && (
                <div className="wordsearch-layout" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="wordsearch-grid">
                    {wordSearchGrid.map((row, r) => (
                      <div key={r} className="wordsearch-row">
                        {row.map((letter, c) => {
                          const isFound = wordSearchPlacements.some(p => p.cells.some(cell => cell.row === r && cell.col === c));
                          return (
                            <div
                              key={c}
                              className={`wordsearch-cell ${isFound ? 'found' : ''}`}
                            >
                              {letter}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="word-list-panel" style={{ marginTop: '2rem' }}>
                    <h3>Words to Find</h3>
                    <div className="word-list-grid">
                      {WORD_LIST.map((word) => (
                        <div key={word} className="word-list-item found">
                          {word}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
