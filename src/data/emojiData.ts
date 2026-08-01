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
    emojis: '💻 + 🧠',
    answer: 'CPU',
    acceptedAnswers: ['cpu', 'central processing unit', 'processor'],
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
  {
    id: 11,
    emojis: '🧱 + ⛓️',
    answer: 'Blockchain',
    acceptedAnswers: ['blockchain', 'block chain'],
  }
];

export const POINTS_PER_EMOJI = 10;
export const EMOJI_GAME_DURATION_SECONDS = 420;
