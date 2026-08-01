export const WORD_LIST = [
  'PYTHON', 'JAVA', 'HTML', 'CSS', 'JAVASCRIPT', 'REACT', 'NODE', 'EXPRESS',
  'MONGODB', 'GITHUB', 'API', 'ARRAY', 'STACK', 'QUEUE', 'COMPILER', 'BINARY',
  'ALGORITHM', 'CLOUD', 'DATABASE', 'DOCKER', 'THREAD', 'KERNEL', 'NETWORK', 'DEBUG', 'CACHE',
];

export const GRID_SIZE = 18;

type Direction = [number, number];

const DIRECTIONS: Direction[] = [
  [0, 1],   // right
  [0, -1],  // left
  [1, 0],   // down
  [-1, 0],  // up
  [1, 1],   // down-right
  [-1, -1], // up-left
  [1, -1],  // down-left
  [-1, 1],  // up-right
];

export interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  endRow: number;
  endCol: number;
  cells: { row: number; col: number }[];
}

function generateGrid(): { grid: string[][]; placements: PlacedWord[] } {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => '')
  );
  const placements: PlacedWord[] = [];

  // Sort words by length (longest first for better placement)
  const sortedWords = [...WORD_LIST].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;

    // Try random placements
    for (let attempt = 0; attempt < 2000; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

      const startRow = Math.floor(Math.random() * GRID_SIZE);
      const startCol = Math.floor(Math.random() * GRID_SIZE);

      // Ensure the word fits
      const endRow = startRow + dir[0] * (word.length - 1);
      const endCol = startCol + dir[1] * (word.length - 1);

      if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;
      if (startRow < 0 || startRow >= GRID_SIZE || startCol < 0 || startCol >= GRID_SIZE) continue;

      // Check if placement is valid
      let valid = true;
      const cells: { row: number; col: number }[] = [];
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir[0] * i;
        const c = startCol + dir[1] * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          valid = false;
          break;
        }
        cells.push({ row: r, col: c });
      }

      if (valid) {
        // Place the word
        for (let i = 0; i < word.length; i++) {
          const r = startRow + dir[0] * i;
          const c = startCol + dir[1] * i;
          grid[r][c] = word[i];
        }
        placements.push({
          word,
          startRow,
          startCol,
          direction: dir,
          endRow,
          endCol,
          cells,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Force place — find any empty stretch
      for (let r = 0; r < GRID_SIZE && !placed; r++) {
        for (let c = 0; c <= GRID_SIZE - word.length && !placed; c++) {
          let valid = true;
          const cells: { row: number; col: number }[] = [];
          for (let i = 0; i < word.length; i++) {
            if (grid[r][c + i] !== '' && grid[r][c + i] !== word[i]) {
              valid = false;
              break;
            }
            cells.push({ row: r, col: c + i });
          }
          if (valid) {
            for (let i = 0; i < word.length; i++) {
              grid[r][c + i] = word[i];
            }
            placements.push({
              word,
              startRow: r,
              startCol: c,
              direction: [0, 1],
              endRow: r,
              endCol: c + word.length - 1,
              cells,
            });
            placed = true;
          }
        }
      }
    }
  }

  // Fill empty cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, placements };
}

// Use a seeded approach: generate once and export as constant
// We use a deterministic seed by setting Math.random replacement
// For simplicity, we generate at module load time (same grid for all users in same build)

// Actually, let's use a pre-seeded PRNG for deterministic results
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Override Math.random temporarily for deterministic grid
const originalRandom = Math.random;
Math.random = mulberry32(42); // seed = 42

const generated = generateGrid();
export const wordSearchGrid = generated.grid;
export const wordSearchPlacements = generated.placements;

Math.random = originalRandom;

export const POINTS_PER_WORD = 2;
export const WORDSEARCH_GAME_DURATION_SECONDS = 1500;
