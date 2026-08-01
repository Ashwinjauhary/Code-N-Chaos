import confetti from 'canvas-confetti';

export const blastConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#00E5FF', '#FF0055', '#FFEA00'],
    disableForReducedMotion: true
  });
};
