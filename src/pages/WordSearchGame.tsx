import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useParticipant } from '../context/ParticipantContext';
import {
  wordSearchGrid,
  wordSearchPlacements,
  WORD_LIST,
  POINTS_PER_WORD,
  WORDSEARCH_GAME_DURATION_SECONDS,
} from '../data/wordSearchData';
import { validateGameAccess } from '../utils/gameUtils';
import { useAntiCheat } from '../hooks/useAntiCheat';
import Timer from '../components/Timer';
import Layout from '../components/Layout';
import AntiCheatOverlay from '../components/AntiCheatOverlay';
import { blastConfetti } from '../utils/confetti';

export default function WordSearchGame() {
  const { participant } = useParticipant();
  const navigate = useNavigate();

  const [foundWords, setFoundWords] = useState<Set<string>>(() => {
    if (!participant) return new Set();
    const saved = sessionStorage.getItem(`wordsearch_found_words_${participant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectStart, setSelectStart] = useState<{ row: number; col: number } | null>(null);
  const [selectEnd, setSelectEnd] = useState<{ row: number; col: number } | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(() => {
    if (!participant) return new Set();
    const saved = sessionStorage.getItem(`wordsearch_found_cells_${participant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  useEffect(() => {
    async function checkCompletion() {
      if (!participant) return;
      const { allowed, completed } = await validateGameAccess(participant.id, 'wordsearch', navigate);
      
      if (!allowed) return;
      
      if (!completed && foundWords.size > 0) {
         sessionStorage.removeItem(`wordsearch_found_words_${participant.id}`);
         sessionStorage.removeItem(`wordsearch_score_${participant.id}`);
         sessionStorage.removeItem(`game_start_time_${participant.id}_wordsearch`);
         window.location.reload();
         return;
      }

      if (completed) {
        setGameOver(true);
        setSubmitted(true);
      }
    }
    checkCompletion();
  }, [participant, navigate, foundWords.size]);
  const [score, setScore] = useState(() => {
    if (!participant) return 0;
    const saved = sessionStorage.getItem(`wordsearch_score_${participant.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const getInitialStartTime = () => {
    if (!participant) return Date.now();
    const key = `game_start_time_${participant.id}_wordsearch`;
    const saved = sessionStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
    return Date.now();
  };
  const startTimeRef = useRef(getInitialStartTime());
  const isSelectingRef = useRef(false);

  const cellKey = (r: number, c: number) => `${r}-${c}`;

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (participant && foundWords.size > 0) {
      sessionStorage.setItem(`wordsearch_found_words_${participant.id}`, JSON.stringify(Array.from(foundWords)));
      sessionStorage.setItem(`wordsearch_found_cells_${participant.id}`, JSON.stringify(Array.from(foundCells)));
      sessionStorage.setItem(`wordsearch_score_${participant.id}`, score.toString());
    }
  }, [participant, foundWords, foundCells, score]);

  // Prevent accidental reload
  useEffect(() => {
    if (gameOver) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameOver]);

  const submitFinalScore = useCallback(async (finalScore: number) => {
    if (submitted || !participant) return;
    setSubmitted(true);

    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'wordsearch',
        p_score: finalScore,
        p_time_seconds: timeSeconds,
        p_completed: true,
        p_metadata: { correct: foundWords.size, total: WORD_LIST.length },
      });
      setGameOver(true);
    } catch (err) {
      console.error('Failed to submit score:', err);
      setGameOver(true);
    }
  }, [participant, submitted, foundWords.size]);

  const submitLiveScore = async (currentScore: number) => {
    if (!participant || submitted || gameOver) return;
    const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await supabase.rpc('submit_score', {
        p_participant_id: participant.id,
        p_game: 'wordsearch',
        p_score: currentScore,
        p_time_seconds: timeSeconds,
        p_completed: false,
        p_metadata: { correct: foundWords.size, total: WORD_LIST.length },
      });
    } catch (err) {
      console.error('Failed to submit live score:', err);
    }
  };

  const getCellsBetween = (
    start: { row: number; col: number },
    end: { row: number; col: number }
  ): { row: number; col: number }[] => {
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));

    if (steps === 0) return [start];

    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    // Only allow straight lines (horizontal, vertical, diagonal)
    if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) {
      return [];
    }

    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      cells.push({ row: start.row + stepR * i, col: start.col + stepC * i });
    }
    return cells;
  };

  const handleCellMouseDown = (row: number, col: number) => {
    isSelectingRef.current = true;
    setSelectStart({ row, col });
    setSelectEnd({ row, col });
    setHighlightedCells(new Set([cellKey(row, col)]));
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelectingRef.current || !selectStart) return;
    setSelectEnd({ row, col });

    const cells = getCellsBetween(selectStart, { row, col });
    setHighlightedCells(new Set(cells.map((c) => cellKey(c.row, c.col))));
  };

  const handleCellMouseUp = () => {
    isSelectingRef.current = false;

    if (!selectStart || !selectEnd) return;

    const cells = getCellsBetween(selectStart, selectEnd);
    if (cells.length === 0) {
      setHighlightedCells(new Set());
      setSelectStart(null);
      setSelectEnd(null);
      return;
    }

    // Extract the word from selected cells
    const selectedWord = cells.map((c) => wordSearchGrid[c.row][c.col]).join('');
    const reversedWord = [...selectedWord].reverse().join('');

    // Check if it matches any placement
    const matchedPlacement = wordSearchPlacements.find((p) => {
      if (foundWords.has(p.word)) return false;
      return p.word === selectedWord || p.word === reversedWord;
    });

    if (matchedPlacement) {
      const newFound = new Set(foundWords);
      newFound.add(matchedPlacement.word);
      setFoundWords(newFound);

      const newFoundCells = new Set(foundCells);
      cells.forEach((c) => newFoundCells.add(cellKey(c.row, c.col)));
      setFoundCells(newFoundCells);

      const newScore = newFound.size * POINTS_PER_WORD;
      setScore(newScore);

      // Check if all words found
      if (newFound.size === WORD_LIST.length && !gameOver) {
        blastConfetti();
        setGameOver(true);
        submitFinalScore(newScore);
      } else if (!gameOver) {
        submitLiveScore(newScore);
      }
    } else if (selectedWord.length >= 3) {
    }

    setHighlightedCells(new Set());
    setSelectStart(null);
    setSelectEnd(null);
  };

  const handleManualSubmit = () => {
    if (foundWords.size < WORD_LIST.length) {
      if (window.confirm(`You have only found ${foundWords.size} out of ${WORD_LIST.length} words. Are you sure you want to submit?`)) {
        setGameOver(true);
        submitFinalScore(score);
      }
    } else {
      setGameOver(true);
      submitFinalScore(score);
    }
  };

  const handleTimeExpiry = () => {
    if (!gameOver) {
      setGameOver(true);
      submitFinalScore(score);
    }
  };

  const { warnings, showWarningModal, warningMessage, dismissWarning, requestFullscreen } = useAntiCheat({
    isActive: gameStarted && !gameOver && !submitted,
    onForceSubmit: () => submitFinalScore(score),
    maxWarnings: 3,
  });

  const handleStartGame = () => {
    requestFullscreen();
    setGameStarted(true);
    // Initialize start time when they actually click start
    if (!sessionStorage.getItem(`game_start_time_${participant?.id}_wordsearch`)) {
      const now = Date.now();
      sessionStorage.setItem(`game_start_time_${participant?.id}_wordsearch`, now.toString());
      startTimeRef.current = now;
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
            <div className="complete-icon">🔍</div>
            <h2>Word Search Complete!</h2>
            <div className="score-display">
              <span className="score-label">Your Score</span>
              <span className="score-value">{score}</span>
              <span className="score-max">/ {WORD_LIST.length * POINTS_PER_WORD}</span>
            </div>
            <div className="results-summary">
              <p>{foundWords.size} / {WORD_LIST.length} words found</p>
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
      <div className={`game-page wordsearch-game ${gameStarted && !gameOver ? 'anti-cheat-active' : ''}`}>
        <div className="game-header">
          <div className="game-info">
            <h2>Word Search</h2>
            <div className="game-progress">
              {foundWords.size} / {WORD_LIST.length} words found
            </div>
          </div>
          <Timer
            durationSeconds={WORDSEARCH_GAME_DURATION_SECONDS}
            initialTimeLeft={Math.max(0, WORDSEARCH_GAME_DURATION_SECONDS - Math.floor((Date.now() - startTimeRef.current) / 1000))}
            onExpiry={handleTimeExpiry}
            isRunning={gameStarted && !gameOver && !submitted && !showWarningModal}
          />
          <div className="game-score">
            <span className="score-label">Score</span>
            <span className="score-value">{score}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button onClick={handleManualSubmit} className="btn-primary">
            Submit Game
          </button>
        </div>

        <div className="wordsearch-layout">
          <div
            className="wordsearch-grid"
            onMouseLeave={() => {
              if (isSelectingRef.current) {
                isSelectingRef.current = false;
                setHighlightedCells(new Set());
                setSelectStart(null);
                setSelectEnd(null);
              }
            }}
          >
            {wordSearchGrid.map((row, r) => (
              <div key={r} className="wordsearch-row">
                {row.map((letter, c) => (
                  <div
                    key={c}
                    className={`wordsearch-cell ${
                      highlightedCells.has(cellKey(r, c)) ? 'selecting' : ''
                    } ${foundCells.has(cellKey(r, c)) ? 'found' : ''}`}
                    onMouseDown={() => handleCellMouseDown(r, c)}
                    onMouseEnter={() => handleCellMouseEnter(r, c)}
                    onMouseUp={handleCellMouseUp}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="word-list-panel">
            <h3>Words to Find</h3>
            <div className="word-list-grid">
              {WORD_LIST.map((word) => (
                <div
                  key={word}
                  className={`word-list-item ${foundWords.has(word) ? 'found' : ''}`}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
