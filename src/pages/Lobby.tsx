import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import Layout from '../components/Layout';

interface EventState {
  status: 'not_started' | 'running' | 'ended';
  unlocked_games: string[];
}

interface GameCompletion {
  [game: string]: boolean;
}

const GAMES = [
  { id: 'emoji', name: 'Emoji → Tech Word', icon: '🎯', route: '/game/emoji', description: 'Guess the tech term from emoji clues' },
  { id: 'crossword', name: 'Tech Crossword', icon: '📝', route: '/game/crossword', description: 'Complete the CS crossword puzzle' },
  { id: 'wordsearch', name: 'Word Search', icon: '🔍', route: '/game/wordsearch', description: 'Find hidden tech terms in the grid' },
];

export default function Lobby() {
  const { participant } = useParticipant();
  const navigate = useNavigate();
  const [eventState, setEventState] = useState<EventState>({ status: 'not_started', unlocked_games: [] });
  const [completedGames, setCompletedGames] = useState<GameCompletion>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial event state
  useEffect(() => {
    async function fetchState() {
      const { data } = await supabase
        .from('event_state')
        .select('status, unlocked_games, started_at')
        .eq('id', 1)
        .single();

      if (data) {
        setEventState(data as EventState);
        
        // Robust reset: Check if event started_at has changed or is null (reset)
        const currentStartedAt = data.started_at || 'not_started';
        const savedStartedAt = sessionStorage.getItem('event_started_at');
        
        if (savedStartedAt && savedStartedAt !== currentStartedAt) {
          // Clear all game-related session storage when event is reset or restarted
          const keysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (
              key.includes('emoji_') || 
              key.includes('crossword_') || 
              key.includes('wordsearch_') ||
              key.includes('game_start_time_')
            )) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
        }
        sessionStorage.setItem('event_started_at', currentStartedAt);
      }

      // Fetch game completion status
      if (participant) {
        const { data: scores } = await supabase
          .from('game_scores')
          .select('game, completed')
          .eq('participant_id', participant.id);

        if (scores) {
          const completed: GameCompletion = {};
          scores.forEach((s: any) => {
            if (s.completed) completed[s.game] = true;
          });
          setCompletedGames(completed);
        }
      }

      setLoading(false);
    }
    fetchState();
  }, [participant]);

  // Subscribe to event state changes
  useEffect(() => {
    const channel = supabase
      .channel('event-state-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_state' },
        (payload) => {
          const newState = payload.new as any;
          setEventState({
            status: newState.status,
            unlocked_games: newState.unlocked_games || [],
          });
          
          const currentStartedAt = newState.started_at || 'not_started';
          const savedStartedAt = sessionStorage.getItem('event_started_at');
          
          if (savedStartedAt && savedStartedAt !== currentStartedAt) {
            // Clear all game-related session storage when event is reset or restarted
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key && (
                key.includes('emoji_') || 
                key.includes('crossword_') || 
                key.includes('wordsearch_') ||
                key.includes('game_start_time_')
              )) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
            setCompletedGames({});
          }
          sessionStorage.setItem('event_started_at', currentStartedAt);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isGameUnlocked = (gameId: string) => {
    return eventState.status === 'running' && eventState.unlocked_games.includes(gameId);
  };

  const isGameCompleted = (gameId: string) => {
    return completedGames[gameId] === true;
  };

  const handleGameClick = (game: typeof GAMES[0]) => {
    if (isGameCompleted(game.id)) return;
    if (isGameUnlocked(game.id)) {
      navigate(game.route);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="lobby-loading">
          <div className="spinner large" />
          <p>Loading event status...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="lobby-page">
        <div className="lobby-header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Tech Gaming Arena
          </motion.h1>

          <motion.div
            className={`event-status-badge ${eventState.status}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <span className="status-dot" />
            {eventState.status === 'not_started' && 'Waiting to Start'}
            {eventState.status === 'running' && 'Event Live'}
            {eventState.status === 'ended' && 'Event Ended'}
          </motion.div>
        </div>

        {eventState.status === 'not_started' && (
          <motion.div
            className="lobby-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="waiting-icon">⏳</div>
            <h2>Hang tight!</h2>
            <p>The event hasn't started yet. Games will appear here once the admin starts the event.</p>
            <div className="pulse-ring" />
          </motion.div>
        )}

        {eventState.status === 'ended' && (
          <motion.div
            className="lobby-ended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="ended-icon">🏁</div>
            <h2>Event has ended!</h2>
            <p>Check the leaderboard for final results.</p>
            <button onClick={() => navigate('/leaderboard')} className="btn-primary">
              View Leaderboard
            </button>
          </motion.div>
        )}

        {eventState.status === 'running' && (
          <div className="games-grid">
            {GAMES.map((game, index) => {
              const unlocked = isGameUnlocked(game.id);
              const completed = isGameCompleted(game.id);

              return (
                <motion.div
                  key={game.id}
                  className={`game-card ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                  onClick={() => handleGameClick(game)}
                  whileHover={unlocked && !completed ? { scale: 1.03, y: -5 } : {}}
                  whileTap={unlocked && !completed ? { scale: 0.98 } : {}}
                >
                  <div className="game-card-icon">{game.icon}</div>
                  <h3>{game.name}</h3>
                  <p>{game.description}</p>
                  <div className="game-card-status">
                    {completed && <span className="status-completed">✓ Completed</span>}
                    {!completed && unlocked && <span className="status-play">▶ Play Now</span>}
                    {!completed && !unlocked && <span className="status-locked">🔒 Locked</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
