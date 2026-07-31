import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import {
  crosswordClues,
  crosswordGrid,
  GRID_ROWS,
  GRID_COLS,
  POINTS_PER_CROSSWORD_WORD,
  CROSSWORD_GAME_DURATION_SECONDS,
} from '../data/crosswordData';
import { validateGameAccess } from '../utils/gameUtils';
import { useAntiCheat } from '../hooks/useAntiCheat';
import Timer from '../components/Timer';
import Layout from '../components/Layout';
import AntiCheatOverlay from '../components/AntiCheatOverlay';

export default function CrosswordGame() {
  const { participant } = useParticipant();
  const navigate = useNavigate();

  // User input grid
  const [userGrid, setUserGrid] = useState<string[][]>(() => {
    if (!participant) return Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ''));
    const saved = sessionStorage.getItem(`crossword_grid_${participant.id}`);
    if (saved) return JSON.parse(saved);
    return Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ''));
  });

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedClue, setSelectedClue] = useState<string | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [correctWords, setCorrectWords] = useState<Set<string>>(() => {
    if (!participant) return new Set();
    const saved = sessionStorage.getItem(`crossword_correct_words_${participant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  useEffect(() => {
    async function checkCompletion() {
      if (!participant) return;
      const { allowed, completed } = await validateGameAccess(participant.id, 'crossword', navigate);
      
      if (!allowed) return;
      
      if (!completed && userGrid.some(row => row.some(cell => cell !== ''))) {
         sessionStorage.removeItem(`crossword_grid_${participant.id}`);
         sessionStorage.removeItem(`crossword_correct_words_${participant.id}`);
         sessionStorage.removeItem(`crossword_score_${participant.id}`);
         sessionStorage.removeItem(`game_start_time_${participant.id}_crossword`);
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
  const [score, setScore] = useState(() => {
    if (!participant) return 0;
    const saved = sessionStorage.getItem(`crossword_score_${participant.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  useEffect(() => {
    if (participant) {
      sessionStorage.setItem(`crossword_grid_${participant.id}`, JSON.stringify(userGrid));
      sessionStorage.setItem(`crossword_correct_words_${participant.id}`, JSON.stringify(Array.from(correctWords)));
      sessionStorage.setItem(`crossword_score_${participant.id}`, score.toString());
    }
  }, [participant, userGrid, correctWords, score]);

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
    const key = `game_start_time_${participant.id}_crossword`;
    const saved = sessionStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
    return Date.now();
  };
  const startTimeRef = useRef(getInitialStartTime());
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null))
  );

  const acrossClues = crosswordClues.filter((c) => c.direction === 'across');
  const downClues = crosswordClues.filter((c) => c.direction === 'down');

  const submitFinalScore = useCallback(async (finalScore: number) => {
    if (submitted || !participant) return;
    setSubmitted(true);

    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'crossword',
        p_score: finalScore,
        p_time_seconds: timeSeconds,
        p_completed: true,
      });
      setGameOver(true);
    } catch (err) {
      console.error('Failed to submit score:', err);
      setGameOver(true);
    }
  }, [participant, submitted]);

  const { warnings, showWarningModal, warningMessage, dismissWarning, requestFullscreen } = useAntiCheat({
    isActive: gameStarted && !gameOver && !submitted,
    onForceSubmit: () => submitFinalScore(score),
    maxWarnings: 3,
  });

  const handleStartGame = () => {
    requestFullscreen();
    setGameStarted(true);
    // Initialize start time when they actually click start
    if (!sessionStorage.getItem(`game_start_time_${participant?.id}_crossword`)) {
      const now = Date.now();
      sessionStorage.setItem(`game_start_time_${participant?.id}_crossword`, now.toString());
      startTimeRef.current = now;
    }
  };

  const submitLiveScore = useCallback(async (currentScore: number) => {
    if (!participant || submitted || gameOver) return;
    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'crossword',
        p_score: currentScore,
        p_time_seconds: timeSeconds,
        p_completed: false,
      });
    } catch (err) {
      console.error('Failed to submit live score:', err);
    }
  }, [participant, submitted, gameOver]);

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

  // Check words whenever the grid changes
  useEffect(() => {
    const newCorrect = new Set<string>();
    let newScore = 0;

    for (const clue of crosswordClues) {
      const { answer, startRow, startCol, direction: dir, id } = clue;
      let wordCorrect = true;

      for (let i = 0; i < answer.length; i++) {
        const r = dir === 'across' ? startRow : startRow + i;
        const c = dir === 'across' ? startCol + i : startCol;
        if (userGrid[r][c].toUpperCase() !== answer[i]) {
          wordCorrect = false;
          break;
        }
      }

      if (wordCorrect) {
        newCorrect.add(id);
        newScore += POINTS_PER_CROSSWORD_WORD;
      }
    }

    setCorrectWords(newCorrect);
    setScore(newScore);

    // Auto-finish if all words correct
    if (newCorrect.size === crosswordClues.length && !gameOver) {
      setGameOver(true);
      submitFinalScore(newScore);
    } else if (newScore !== prevScoreRef.current && !gameOver) {
      prevScoreRef.current = newScore;
      submitLiveScore(newScore);
    }
  }, [userGrid, gameOver, submitFinalScore, submitLiveScore]);

  const handleCellChange = (row: number, col: number, value: string) => {
    if (crosswordGrid[row][col].letter === null) return;

    const char = value.slice(-1).toUpperCase();
    const newGrid = userGrid.map((r) => [...r]);
    newGrid[row][col] = char;
    setUserGrid(newGrid);

    // Auto-advance to next cell
    if (char) {
      const clue = selectedClue ? crosswordClues.find((c) => c.id === selectedClue) : null;
      if (clue) {
        const nextRow = clue.direction === 'across' ? row : row + 1;
        const nextCol = clue.direction === 'across' ? col + 1 : col;
        if (
          nextRow < GRID_ROWS &&
          nextCol < GRID_COLS &&
          crosswordGrid[nextRow]?.[nextCol]?.letter !== null
        ) {
          inputRefs.current[nextRow]?.[nextCol]?.focus();
          setSelectedCell({ row: nextRow, col: nextCol });
        }
      }
    }
  };

  const handleCellKeyDown = (row: number, col: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !userGrid[row][col]) {
      const clue = selectedClue ? crosswordClues.find((c) => c.id === selectedClue) : null;
      if (clue) {
        const prevRow = clue.direction === 'across' ? row : row - 1;
        const prevCol = clue.direction === 'across' ? col - 1 : col;
        if (prevRow >= 0 && prevCol >= 0 && crosswordGrid[prevRow]?.[prevCol]?.letter !== null) {
          inputRefs.current[prevRow]?.[prevCol]?.focus();
          setSelectedCell({ row: prevRow, col: prevCol });
        }
      }
    }
  };

  const handleCellClick = (row: number, col: number) => {
    const cell = crosswordGrid[row][col];
    if (cell.letter === null) return;

    // Toggle direction if clicking same cell
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    }

    setSelectedCell({ row, col });

    // Find the clue for this cell
    const matchingClue = crosswordClues.find(
      (c) =>
        c.direction === direction &&
        cell.clueIds.includes(c.id)
    ) || crosswordClues.find((c) => cell.clueIds.includes(c.id));

    if (matchingClue) {
      setSelectedClue(matchingClue.id);
      setDirection(matchingClue.direction);
    }

    inputRefs.current[row]?.[col]?.focus();
  };

  const handleClueClick = (clueId: string) => {
    const clue = crosswordClues.find((c) => c.id === clueId);
    if (!clue) return;

    setSelectedClue(clueId);
    setDirection(clue.direction);
    setSelectedCell({ row: clue.startRow, col: clue.startCol });
    inputRefs.current[clue.startRow]?.[clue.startCol]?.focus();
  };

  const handleTimeExpiry = () => {
    if (!gameOver) {
      setGameOver(true);
      submitFinalScore(score);
    }
  };

  const isCellHighlighted = (row: number, col: number) => {
    if (!selectedClue) return false;
    const clue = crosswordClues.find((c) => c.id === selectedClue);
    if (!clue) return false;

    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      if (r === row && c === col) return true;
    }
    return false;
  };

  const isCellInCorrectWord = (row: number, col: number) => {
    const cell = crosswordGrid[row][col];
    return cell.clueIds.some((id) => correctWords.has(id));
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
            <div className="complete-icon">📝</div>
            <h2>Crossword Complete!</h2>
            <div className="score-display">
              <span className="score-label">Your Score</span>
              <span className="score-value">{score}</span>
              <span className="score-max">/ {crosswordClues.length * POINTS_PER_CROSSWORD_WORD}</span>
            </div>
            <div className="results-summary">
              <p>{correctWords.size} / {crosswordClues.length} words correct</p>
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
      <div className={`game-page crossword-game ${gameStarted && !gameOver ? 'anti-cheat-active' : ''}`}>
        <div className="game-header">
          <div className="game-info">
            <h2>Tech Crossword</h2>
            <div className="game-progress">
              {correctWords.size} / {crosswordClues.length} words found
            </div>
          </div>
          <Timer 
            durationSeconds={CROSSWORD_GAME_DURATION_SECONDS} 
            initialTimeLeft={Math.max(0, CROSSWORD_GAME_DURATION_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000))}
            onExpiry={handleTimeExpiry} 
            isRunning={gameStarted && !gameOver && !submitted && !showWarningModal} 
          />
          <div className="game-score">
            <span className="score-label">Score</span>
            <span className="score-value">{score}</span>
          </div>
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

        <div className="crossword-layout">
          <div className="crossword-grid-container">
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
                    } ${selectedCell?.row === r && selectedCell?.col === c ? 'selected' : ''
                    } ${isCellHighlighted(r, c) ? 'highlighted' : ''
                    } ${isCellInCorrectWord(r, c) ? 'correct-word' : ''}`}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {cell.number && <span className="cell-number">{cell.number}</span>}
                    {cell.letter !== null && (
                      <input
                        ref={(el) => {
                          if (!inputRefs.current[r]) inputRefs.current[r] = [];
                          inputRefs.current[r][c] = el;
                        }}
                        type="text"
                        maxLength={2}
                        value={userGrid[r][c]}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                        className="cell-input"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="crossword-clues">
            <div className="clues-section">
              <h3>Across</h3>
              {acrossClues.map((clue) => (
                <div
                  key={clue.id}
                  className={`clue-item ${selectedClue === clue.id ? 'active' : ''} ${
                    correctWords.has(clue.id) ? 'solved' : ''
                  }`}
                  onClick={() => handleClueClick(clue.id)}
                >
                  <span className="clue-number">{clue.number}.</span>
                  <span className="clue-text">{clue.clue}</span>
                  {correctWords.has(clue.id) && <span className="clue-check">✓</span>}
                </div>
              ))}
            </div>
            <div className="clues-section">
              <h3>Down</h3>
              {downClues.map((clue) => (
                <div
                  key={clue.id}
                  className={`clue-item ${selectedClue === clue.id ? 'active' : ''} ${
                    correctWords.has(clue.id) ? 'solved' : ''
                  }`}
                  onClick={() => handleClueClick(clue.id)}
                >
                  <span className="clue-number">{clue.number}.</span>
                  <span className="clue-text">{clue.clue}</span>
                  {correctWords.has(clue.id) && <span className="clue-check">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
