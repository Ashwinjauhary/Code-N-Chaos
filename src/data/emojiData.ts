export interface EmojiQuestion {
  id: number;
  emojis: string;
  answer: string;
  acceptedAnswers: string[]; // case-insensitive alternatives
}

export const emojiQuestions: EmojiQuestion[] = [
  {
    id: 1,
    emojis: '🐞 + 🔧',
    answer: 'Debug',
    acceptedAnswers: ['debug', 'debugging'],
  },
  {
    id: 2,
    emojis: '🌐 + 🕷️',
    answer: 'Web Crawler',
    acceptedAnswers: ['web crawler', 'webcrawler'],
  },
  {
    id: 3,
    emojis: '🤖 + 🧠',
    answer: 'Artificial Intelligence',
    acceptedAnswers: ['artificial intelligence', 'ai', 'a.i.', 'a.i'],
  },
  {
    id: 4,
    emojis: '🗄️ + 📊',
    answer: 'Database',
    acceptedAnswers: ['database', 'db'],
  },
  {
    id: 5,
    emojis: '☁️ + 💻',
    answer: 'Cloud Computing',
    acceptedAnswers: ['cloud computing', 'cloud'],
  },
  {
    id: 6,
    emojis: '🔒 + 🌍',
    answer: 'HTTPS',
    acceptedAnswers: ['https', 'http secure', 'ssl'],
  },
  {
    id: 7,
    emojis: '🔐 + 🔑',
    answer: 'Encryption',
    acceptedAnswers: ['encryption', 'encrypt', 'cryptography'],
  },
  {
    id: 8,
    emojis: '🐍 + 💻',
    answer: 'Python',
    acceptedAnswers: ['python'],
  },
  {
    id: 9,
    emojis: '☕ + 💻',
    answer: 'Java',
    acceptedAnswers: ['java'],
  },
  {
    id: 10,
    emojis: '📦 + 🚢',
    answer: 'Docker',
    acceptedAnswers: ['docker'],
  },
];

export const POINTS_PER_EMOJI = 10;
export const EMOJI_GAME_DURATION_SECONDS = 20 * 60; // 20 minutes
