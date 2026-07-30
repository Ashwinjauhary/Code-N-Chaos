export interface CrosswordClue {
  id: string;
  direction: 'across' | 'down';
  number: number;
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
}

export const crosswordClues: CrosswordClue[] = [
  // Across
  {
    id: 'a1',
    direction: 'across',
    number: 3,
    clue: 'Styling language for webpages',
    answer: 'CSS',
    startRow: 3,
    startCol: 5,
  },
  {
    id: 'a2',
    direction: 'across',
    number: 4,
    clue: 'LIFO Data Structure',
    answer: 'STACK',
    startRow: 5,
    startCol: 2,
  },
  {
    id: 'a3',
    direction: 'across',
    number: 5,
    clue: 'Database Query Language',
    answer: 'SQL',
    startRow: 5,
    startCol: 8,
  },
  {
    id: 'a4',
    direction: 'across',
    number: 8,
    clue: 'Version Control System',
    answer: 'GIT',
    startRow: 9,
    startCol: 6,
  },
  {
    id: 'a5',
    direction: 'across',
    number: 9,
    clue: 'Programming language developed by Google',
    answer: 'GO',
    startRow: 10,
    startCol: 0,
  },
  // Down
  {
    id: 'd1',
    direction: 'down',
    number: 1,
    clue: 'Frontend JavaScript Library',
    answer: 'REACT',
    startRow: 1,
    startCol: 3,
  },
  {
    id: 'd2',
    direction: 'down',
    number: 2,
    clue: 'HyperText Markup Language',
    answer: 'HTML',
    startRow: 2,
    startCol: 10,
  },
  {
    id: 'd3',
    direction: 'down',
    number: 3,
    clue: 'Temporary high-speed storage',
    answer: 'CACHE',
    startRow: 3,
    startCol: 5,
  },
  {
    id: 'd4',
    direction: 'down',
    number: 6,
    clue: 'Collection of instructions executed by the CPU',
    answer: 'PROGRAM',
    startRow: 7,
    startCol: 0,
  },
  {
    id: 'd5',
    direction: 'down',
    number: 7,
    clue: 'Open-source Operating System',
    answer: 'LINUX',
    startRow: 8,
    startCol: 7,
  }
];

export const GRID_ROWS = 14;
export const GRID_COLS = 11;

export interface GridCell {
  letter: string | null;
  number?: number;
  clueIds: string[];
}

export const crosswordGrid: GridCell[][] = Array(GRID_ROWS).fill(null).map(() =>
  Array(GRID_COLS).fill(null).map(() => ({ letter: null, clueIds: [] }))
);

crosswordClues.forEach((clue) => {
  const dx = clue.direction === 'across' ? 1 : 0;
  const dy = clue.direction === 'down' ? 1 : 0;

  if (crosswordGrid[clue.startRow][clue.startCol].number === undefined) {
    crosswordGrid[clue.startRow][clue.startCol].number = clue.number;
  }

  for (let i = 0; i < clue.answer.length; i++) {
    const row = clue.startRow + i * dy;
    const col = clue.startCol + i * dx;
    crosswordGrid[row][col].letter = clue.answer[i];
    if (!crosswordGrid[row][col].clueIds.includes(clue.id)) {
      crosswordGrid[row][col].clueIds.push(clue.id);
    }
  }
});

export const CROSSWORD_GAME_DURATION_SECONDS = 20 * 60;
export const POINTS_PER_CROSSWORD_WORD = 5;
