// Simple Retro 8-bit AudioContext Synthesizer

class RetroSynth {
  ctx: AudioContext;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playOscillator(type: OscillatorType, frequency: number, duration: number, vol = 0.5, slideFreq = 0) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    if (slideFreq !== 0) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number, vol = 0.5) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }
}

let synth: RetroSynth | null = null;
const getSynth = () => {
  if (typeof window === 'undefined') return null;
  if (!synth) synth = new RetroSynth();
  return synth;
};

export const playClick = () => {
  try { getSynth()?.playOscillator('square', 600, 0.05, 0.05, 800); } catch {}
};

export const playCorrect = () => {
  try { 
    const s = getSynth();
    if (!s) return;
    s.playOscillator('square', 440, 0.1, 0.1, 880);
    setTimeout(() => s.playOscillator('square', 880, 0.15, 0.1, 1200), 100);
  } catch {}
};

export const playWrong = () => {
  try { 
    const s = getSynth();
    if (!s) return;
    s.playOscillator('sawtooth', 200, 0.2, 0.1, 100);
    s.playNoise(0.2, 0.2);
  } catch {}
};

import confetti from 'canvas-confetti';

export const playSuccess = () => {
  try {
    const s = getSynth();
    if (!s) return;
    s.playOscillator('square', 440, 0.1, 0.1);
    setTimeout(() => s.playOscillator('square', 554, 0.1, 0.1), 100);
    setTimeout(() => s.playOscillator('square', 659, 0.1, 0.1), 200);
    setTimeout(() => s.playOscillator('square', 880, 0.4, 0.1), 300);
  } catch {}

  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#00E5FF', '#FF0055', '#FFEA00'],
    disableForReducedMotion: true
  });
};

export const playWarning = () => {
  try {
    const s = getSynth();
    if (!s) return;
    s.playOscillator('sawtooth', 300, 0.1, 0.15, 150);
    setTimeout(() => s.playOscillator('sawtooth', 300, 0.15, 0.15, 150), 150);
  } catch {}
};
