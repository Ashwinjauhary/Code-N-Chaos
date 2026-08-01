export interface MemoryCard {
  id: number;
  type: 'term' | 'definition';
  pairId: number;
  content: string;
}

export interface MemoryPair {
  id: number;
  term: string;
  definition: string;
}

export const memoryPairs: MemoryPair[] = [
  { id: 1, term: '🐞', definition: '🐞' },
  { id: 2, term: '🕷️', definition: '🕷️' },
  { id: 3, term: '🧠', definition: '🧠' },
  { id: 4, term: '🗄️', definition: '🗄️' },
  { id: 5, term: '☁️', definition: '☁️' },
  { id: 6, term: '🔐', definition: '🔐' },
  { id: 7, term: '🐍', definition: '🐍' },
  { id: 8, term: '☕', definition: '☕' },
  { id: 9, term: '🍎', definition: '🍎' },
  { id: 10, term: '🤖', definition: '🤖' },
  { id: 11, term: '🕸️', definition: '🕸️' },
  { id: 12, term: '🎨', definition: '🎨' },
  { id: 13, term: '🎮', definition: '🎮' },
  { id: 14, term: '🐧', definition: '🐧' },
  { id: 15, term: '♻️', definition: '♻️' },
  { id: 16, term: '🌍', definition: '🌍' },
];

export function generateCards(): MemoryCard[] {
  const cards: MemoryCard[] = [];

  memoryPairs.forEach((pair) => {
    cards.push({
      id: pair.id * 2 - 1,
      type: 'term',
      pairId: pair.id,
      content: pair.term,
    });
    cards.push({
      id: pair.id * 2,
      type: 'definition',
      pairId: pair.id,
      content: pair.definition,
    });
  });

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

export const MEMORY_GAME_DURATION_SECONDS = 480;
export const POINTS_PER_MATCH = 5;
