import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import { generateCards, memoryPairs, POINTS_PER_MATCH, MEMORY_GAME_DURATION_SECONDS, type MemoryCard } from '../data/memoryMatchData';
import { validateGameAccess } from '../utils/gameUtils';
import { useAntiCheat } from '../hooks/useAntiCheat';
import Timer from '../components/Timer';
import Layout from '../components/Layout';
import AntiCheatOverlay from '../components/AntiCheatOverlay';

export default function MemoryMatchGame() {
  const { participant } = useParticipant();
  const navigate = useNavigate();

  const [cards] = useState<MemoryCard[]>(() => {
    if (!participant) return generateCards();
    const saved = sessionStorage.getItem(`mm_cards_${participant.id}`);
    if (saved) {
      const parsedCards: MemoryCard[] = JSON.parse(saved);
      // Auto-clear cache if it contains the old "+" style combinations or text words
      if (parsedCards.some(c => c.content.includes('+') || c.content === 'Debug' || c.content === 'CPU' || c.content.length > 3)) {
        sessionStorage.removeItem(`mm_matched_${participant.id}`);
        sessionStorage.removeItem(`mm_score_${participant.id}`);
        sessionStorage.removeItem(`mm_moves_${participant.id}`);
        sessionStorage.removeItem(`game_start_time_${participant.id}_memorymatch`);
        
        const newCards = generateCards();
        sessionStorage.setItem(`mm_cards_${participant.id}`, JSON.stringify(newCards));
        return newCards;
      }
      return parsedCards;
    }
    return generateCards();
  });

  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>(() => {
    if (!participant) return [];
    const saved = sessionStorage.getItem(`mm_matched_${participant.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [score, setScore] = useState(() => {
    if (!participant) return 0;
    const saved = sessionStorage.getItem(`mm_score_${participant.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [moves, setMoves] = useState(() => {
    if (!participant) return 0;
    const saved = sessionStorage.getItem(`mm_moves_${participant.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const { warnings, showWarningModal, warningMessage, dismissWarning, requestFullscreen } = useAntiCheat({
    isActive: gameStarted && !gameOver && !submitted,
    onForceSubmit: () => submitFinalScore(score),
    maxWarnings: 3,
  });

  const handleStartGame = () => {
    requestFullscreen();
    setGameStarted(true);
    if (!sessionStorage.getItem(`game_start_time_${participant?.id}_memorymatch`)) {
      const now = Date.now();
      sessionStorage.setItem(`game_start_time_${participant?.id}_memorymatch`, now.toString());
      startTimeRef.current = now;
    }
  };

  useEffect(() => {
    async function checkCompletion() {
      if (!participant) return;
      const { allowed, completed } = await validateGameAccess(participant.id, 'memorymatch', navigate);
      if (!allowed) return;
      
      // Cache Desync Check: DB says not completed, but cache has all pairs matched
      // This happens if admin resets the event or removes the participant
      if (!completed && matchedPairIds.length === memoryPairs.length) {
         sessionStorage.removeItem(`mm_cards_${participant.id}`);
         sessionStorage.removeItem(`mm_matched_${participant.id}`);
         sessionStorage.removeItem(`mm_score_${participant.id}`);
         sessionStorage.removeItem(`mm_moves_${participant.id}`);
         sessionStorage.removeItem(`game_start_time_${participant.id}_memorymatch`);
         window.location.reload();
         return;
      }

      if (completed) {
        setGameOver(true);
        setSubmitted(true);
      }
    }
    checkCompletion();
  }, [participant, navigate]);

  // Persist state to session storage
  useEffect(() => {
    if (participant) {
      sessionStorage.setItem(`mm_cards_${participant.id}`, JSON.stringify(cards));
      sessionStorage.setItem(`mm_matched_${participant.id}`, JSON.stringify(matchedPairIds));
      sessionStorage.setItem(`mm_score_${participant.id}`, score.toString());
      sessionStorage.setItem(`mm_moves_${participant.id}`, moves.toString());
    }
  }, [participant, cards, matchedPairIds, score, moves]);

  const getInitialStartTime = () => {
    if (!participant) return Date.now();
    const key = `game_start_time_${participant.id}_memorymatch`;
    const saved = sessionStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
    return Date.now();
  };
  const startTimeRef = useRef(getInitialStartTime());

  const submitFinalScore = useCallback(async (finalScore: number) => {
    if (submitted || !participant) return;
    setSubmitted(true);

    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'memorymatch',
        p_score: finalScore,
        p_time_seconds: timeSeconds,
        p_completed: true,
        p_metadata: { moves },
      });
      setGameOver(true);
    } catch (err: any) {
      console.error('Failed to submit score:', err);
      alert('Error saving score: ' + err.message + '\n\nMake sure you ran the Supabase SQL migration!');
      setGameOver(true);
    }
  }, [participant, submitted]);

  const prevScoreRef = useRef(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (gameStarted && !gameOver && !submitted) {
      const interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameOver, submitted]);

  const submitLiveScore = useCallback(async (currentScore: number) => {
    if (!participant || submitted || gameOver) return;
    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'memorymatch',
        p_score: currentScore,
        p_time_seconds: timeSeconds,
        p_completed: false,
        p_metadata: { moves },
      });
    } catch (err) {
      console.error('Failed to submit live score:', err);
    }
  }, [participant, submitted, gameOver]);

  const handleCardClick = (card: MemoryCard) => {
    // Ignore if: already checking, card already flipped, card already matched, or game over
    if (isChecking || gameOver || submitted) return;
    if (flippedIds.includes(card.id)) return;
    if (matchedPairIds.includes(card.pairId)) return;

    const newFlipped = [...flippedIds, card.id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setIsChecking(true);
      setMoves(prev => prev + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId)!;
      const secondCard = cards.find(c => c.id === secondId)!;

      if (firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type) {
        // Match found!
        const newMatched = [...matchedPairIds, firstCard.pairId];
        const newScore = score + POINTS_PER_MATCH;
        
        setTimeout(() => {
          setMatchedPairIds(newMatched);
          setScore(newScore);
          setFlippedIds([]);
          setIsChecking(false);

          // Submit live score
          if (newScore !== prevScoreRef.current) {
            prevScoreRef.current = newScore;
            submitLiveScore(newScore);
          }

          // Check if all pairs matched
          if (newMatched.length === memoryPairs.length) {
            submitFinalScore(newScore);
          }
        }, 600);
      } else {
        // No match — flip back after delay
        setTimeout(() => {
          setFlippedIds([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  const isCardFlipped = (card: MemoryCard) => {
    return flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId);
  };

  const isCardMatched = (card: MemoryCard) => {
    return matchedPairIds.includes(card.pairId);
  };

  if (!participant) {
    navigate('/');
    return null;
  }


  // Game Complete screen
  if (gameOver) {
    return (
      <Layout>
        <div className="game-complete-page">
          <motion.div
            className="game-complete-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="complete-icon">🧠</div>
            <h2>Memory Match Complete!</h2>
            <div className="score-display">
              <span className="score-label">Your Score</span>
              <span className="score-value">{score}</span>
              <span className="score-max">/ {memoryPairs.length * POINTS_PER_MATCH}</span>
            </div>
            <div className="results-summary">
              <p>{matchedPairIds.length} / {memoryPairs.length} pairs found &bull; {moves} moves used</p>
            </div>
            <button onClick={() => navigate('/lobby')} className="btn-primary">
              Back to Lobby
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={!gameStarted || gameOver}>
      <AntiCheatOverlay
        hasStarted={gameStarted}
        onStart={handleStartGame}
        showWarningModal={showWarningModal}
        warningMessage={warningMessage}
        onDismissWarning={dismissWarning}
        warnings={warnings}
        maxWarnings={3}
      />
      <div className={`game-page memory-game ${gameStarted && !gameOver ? 'anti-cheat-active' : ''}`}>
        <div className="game-header">
          <div className="game-info">
            <h2>🧠 Memory Match</h2>
            <div className="game-stats">
              <span className="stat">Score: <strong>{score}</strong></span>
              <span className="stat">Pairs: <strong>{matchedPairIds.length}/{memoryPairs.length}</strong></span>
              <span className="stat">Moves: <strong>{moves}</strong></span>
            </div>
          </div>
          <Timer
            durationSeconds={MEMORY_GAME_DURATION_SECONDS}
            initialTimeLeft={Math.max(0, MEMORY_GAME_DURATION_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000))}
            onExpiry={() => submitFinalScore(score)}
            isRunning={gameStarted && !gameOver && !submitted && !showWarningModal}
          />
          {timeElapsed >= 300 && (
            <button 
              className="btn-primary" 
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-red)', fontSize: '0.9rem', marginLeft: '1rem' }}
              onClick={() => {
                if (window.confirm("Are you sure you want to submit your game early?")) {
                  setGameOver(true);
                  submitFinalScore(score);
                }
              }}
            >
              Submit Early
            </button>
          )}
        </div>

        <div className="memory-grid">
          <AnimatePresence>
            {cards.map((card) => {
              const flipped = isCardFlipped(card);
              const matched = isCardMatched(card);

              return (
                <motion.div
                  key={card.id}
                  className={`memory-card ${flipped ? 'flipped' : ''} ${matched ? 'matched' : ''} ${card.type === 'term' ? 'card-term' : 'card-definition'}`}
                  onClick={() => handleCardClick(card)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={!flipped && !matched ? { scale: 1.05 } : {}}
                  whileTap={!flipped && !matched ? { scale: 0.95 } : {}}
                >
                  <div className="card-inner">
                    <div className="card-front">
                      <span>?</span>
                    </div>
                    <div className="card-back">
                      <span className={card.type === 'term' ? 'term-text' : 'definition-text'}>
                        {card.content}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
