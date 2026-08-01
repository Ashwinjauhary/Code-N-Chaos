import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import { emojiQuestions, POINTS_PER_EMOJI, EMOJI_GAME_DURATION_SECONDS } from '../data/emojiData';
import { isFuzzyMatch } from '../utils/stringUtils';
import { validateGameAccess } from '../utils/gameUtils';
import { useAntiCheat } from '../hooks/useAntiCheat';
import Timer from '../components/Timer';
import Layout from '../components/Layout';
import AntiCheatOverlay from '../components/AntiCheatOverlay';
import { blastConfetti } from '../utils/confetti';

export default function EmojiGame() {
  const { participant } = useParticipant();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Store an array of answers for all 10 questions
  const [answers, setAnswers] = useState<string[]>(() => {
    if (!participant) return Array(emojiQuestions.length).fill('');
    const saved = sessionStorage.getItem(`emoji_answers_${participant.id}`);
    return saved ? JSON.parse(saved) : Array(emojiQuestions.length).fill('');
  });
  
  const [results, setResults] = useState<{ correct: boolean; userAnswer: string; correctAnswer: string }[]>([]);
  const [finalScore, setFinalScore] = useState(() => {
    if (!participant) return 0;
    const saved = sessionStorage.getItem(`emoji_score_${participant.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const { warnings, showWarningModal, warningMessage, dismissWarning, requestFullscreen } = useAntiCheat({
    isActive: gameStarted && !gameOver && !submitted,
    onForceSubmit: () => gradeAndSubmit(),
    maxWarnings: 3,
  });

  const handleStartGame = () => {
    requestFullscreen();
    setGameStarted(true);
    // Initialize start time when they actually click start
    if (!sessionStorage.getItem(`game_start_time_${participant?.id}_emoji`)) {
      const now = Date.now();
      sessionStorage.setItem(`game_start_time_${participant?.id}_emoji`, now.toString());
      startTimeRef.current = now;
    }
  };
  
  useEffect(() => {
    async function checkCompletion() {
      if (!participant) return;
      const { allowed, completed } = await validateGameAccess(participant.id, 'emoji', navigate);
      
      if (!allowed) return;
      
      if (!completed && answers.some(a => a !== '')) {
         sessionStorage.removeItem(`emoji_answers_${participant.id}`);
         sessionStorage.removeItem(`emoji_score_${participant.id}`);
         sessionStorage.removeItem(`game_start_time_${participant.id}_emoji`);
         window.location.reload();
         return;
      }

      if (completed) {
        setGameOver(true);
        setSubmitted(true);
      }
    }
    checkCompletion();
  }, [participant, navigate, answers]);
  
  useEffect(() => {
    if (participant) {
      sessionStorage.setItem(`emoji_answers_${participant.id}`, JSON.stringify(answers));
      sessionStorage.setItem(`emoji_score_${participant.id}`, finalScore.toString());
    }
  }, [participant, answers, finalScore]);
  
  // Prevent accidental reload
  useEffect(() => {
    if (gameOver || !gameStarted) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameOver, gameStarted]);

  const getInitialStartTime = () => {
    if (!participant) return Date.now();
    const key = `game_start_time_${participant.id}_emoji`;
    const saved = sessionStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
    return Date.now(); // We don't save it yet
  };
  const startTimeRef = useRef(getInitialStartTime());
  const inputRef = useRef<HTMLInputElement>(null);

  const gradeAndSubmit = useCallback(async () => {
    if (submitted || !participant) return;
    setSubmitted(true);

    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    let calculatedScore = 0;
    const calculatedResults = emojiQuestions.map((q, idx) => {
      const userAnswer = answers[idx];
      // 0.80 threshold ensures answers must be very close to the correct spelling
      const correct = q.acceptedAnswers.some(a => isFuzzyMatch(userAnswer, a, 0.80));
      if (correct) {
        calculatedScore += POINTS_PER_EMOJI;
      }
      return {
        correct,
        userAnswer: answers[idx].trim(),
        correctAnswer: q.answer
      };
    });

    setFinalScore(calculatedScore);
    setResults(calculatedResults);

    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'emoji',
        p_score: calculatedScore,
        p_time_seconds: timeSeconds,
        p_completed: true,
        p_metadata: { correct: (calculatedScore / POINTS_PER_EMOJI) || 0, total: emojiQuestions.length },
      });
      blastConfetti();
      setGameOver(true);
    } catch (err: any) {
      console.error('Failed to submit score:', err);
      alert('Error saving score: ' + (err.message || 'Unknown Error') + '\n\nPlease verify your Supabase database has the latest submit_score function.');
      // Still show game over if offline/failed so they don't get stuck
      setGameOver(true);
    }
  }, [answers, participant, submitted]);

  const prevScoreRef = useRef(0);

  const submitLiveScore = useCallback(async (currentScore: number) => {
    if (!participant || submitted || gameOver) return;
    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'emoji',
        p_score: currentScore,
        p_time_seconds: timeSeconds,
        p_completed: false,
        p_metadata: { correct: (currentScore / POINTS_PER_EMOJI) || 0, total: emojiQuestions.length },
      });
    } catch (err) {
      console.error('Failed to submit live score:', err);
    }
  }, [participant, submitted, gameOver]);

  useEffect(() => {
    let calculatedScore = 0;
    emojiQuestions.forEach((q, idx) => {
      const userAnswer = answers[idx].trim().toLowerCase();
      const correct = q.acceptedAnswers.some(a => a.toLowerCase() === userAnswer);
      if (correct) {
        calculatedScore += POINTS_PER_EMOJI;
      }
    });
    
    if (calculatedScore !== prevScoreRef.current && !gameOver) {
      prevScoreRef.current = calculatedScore;
      submitLiveScore(calculatedScore);
    }
  }, [answers, gameOver, submitLiveScore]);

  const handleNext = () => {
    if (currentIndex < emojiQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (currentIndex === emojiQuestions.length - 1) {
        // If last question, confirm or submit
        if (window.confirm("Are you sure you want to submit your answers?")) {
          gradeAndSubmit();
        }
      } else {
        handleNext();
      }
    }
  };

  const handleAnswerChange = (val: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = val;
    setAnswers(newAnswers);
  };

  const handleTimeExpiry = () => {
    if (!gameOver) {
      gradeAndSubmit();
    }
  };

  if (gameOver) {
    return (
      <Layout>
        <div className="game-complete-page">
          <motion.div
            className="game-complete-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="complete-icon">🎉</div>
            <h2>Emoji Challenge Complete!</h2>
            <div className="score-display">
              <span className="score-label">Your Score</span>
              <span className="score-value">{finalScore}</span>
              <span className="score-max">/ {emojiQuestions.length * POINTS_PER_EMOJI}</span>
            </div>
            <div className="results-summary">
              <p>{results.filter(r => r.correct).length} / {results.length} correct answers</p>
            </div>
            <div className="results-list">
              {results.map((r, i) => (
                <div key={i} className={`result-item ${r.correct ? 'correct' : 'wrong'}`}>
                  <span className="result-emoji">{emojiQuestions[i].emojis}</span>
                  <span className="result-answer">
                    {r.correct ? r.userAnswer : `${r.userAnswer} → ${r.correctAnswer}`}
                  </span>
                  <span className="result-icon">{r.correct ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/lobby')} className="btn-primary">
              Back to Lobby
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = emojiQuestions[currentIndex];
  const isLastQuestion = currentIndex === emojiQuestions.length - 1;

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
      <div className={`game-page emoji-game ${gameStarted && !gameOver ? 'anti-cheat-active' : ''}`}>
        <div className="game-header">
          <div className="game-info">
            <h2>Emoji → Tech Word</h2>
            <div className="game-progress">
              Question {currentIndex + 1} of {emojiQuestions.length}
            </div>
          </div>
          <Timer 
          durationSeconds={EMOJI_GAME_DURATION_SECONDS} 
          initialTimeLeft={Math.max(0, EMOJI_GAME_DURATION_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000))}
          onExpiry={handleTimeExpiry} 
          isRunning={gameStarted && !gameOver && !submitted && !showWarningModal} 
        /><div className="game-score">
            <span className="score-label">Pending</span>
            <span className="score-value">...</span>
          </div>
        </div>

        <div className="game-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="emoji-question"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '500px' }}
            >
              <div className="emoji-display" style={{ fontSize: '4rem', textAlign: 'center' }}>
                {currentQuestion.emojis}
              </div>
              <p className="emoji-hint" style={{ textAlign: 'center' }}>What tech term do these emojis represent?</p>

              <div className="answer-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={answers[currentIndex]}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  autoFocus
                  className="answer-input"
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    width: '100%'
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button 
                    onClick={handlePrev} 
                    disabled={currentIndex === 0}
                    className="btn-secondary"
                  >
                    ← Back
                  </button>
                  
                  {isLastQuestion ? (
                    <button 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to submit your answers?")) {
                          gradeAndSubmit();
                        }
                      }} 
                      className="btn-primary"
                    >
                      Submit Game
                    </button>
                  ) : (
                    <button 
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="progress-bar-container" style={{ marginTop: '2rem' }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / emojiQuestions.length) * 100}%` }}
          />
        </div>
      </div>
    </Layout>
  );
}
