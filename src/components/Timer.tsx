import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  durationSeconds: number;
  initialTimeLeft?: number;
  onExpiry: () => void;
  isRunning?: boolean;
}

export default function Timer({ durationSeconds, initialTimeLeft, onExpiry, isRunning = true }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft ?? durationSeconds);
  const onExpiryRef = useRef(onExpiry);
  onExpiryRef.current = onExpiry;
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasExpiredRef.current) {
            hasExpiredRef.current = true;
            setTimeout(() => onExpiryRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft <= 120; // 2 minutes warning
  const isCritical = timeLeft <= 30;
  const progress = timeLeft / durationSeconds;

  return (
    <div className="timer-container">
      <motion.div
        className={`timer-display ${isCritical ? 'critical' : isLow ? 'warning' : ''}`}
        animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
        transition={isCritical ? { repeat: Infinity, duration: 1 } : {}}
      >
        <svg className="timer-ring" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <motion.circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={isCritical ? '#ff4444' : isLow ? '#ffaa00' : '#00f0ff'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="timer-text">
          <span className="timer-digits">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
