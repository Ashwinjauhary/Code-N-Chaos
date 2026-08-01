import React from 'react';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export default function Avatar({ seed, size = 40, className = '' }: AvatarProps) {
  // We use DiceBear Pixel Art API for retro 8-bit avatars
  // URL encode the seed to handle spaces/special characters
  const encodedSeed = encodeURIComponent(seed);
  const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodedSeed}`;

  return (
    <img 
      src={avatarUrl} 
      alt={`${seed} Avatar`} 
      width={size} 
      height={size} 
      className={`avatar-img ${className}`}
      style={{
        borderRadius: '4px',
        backgroundColor: 'var(--surface-color)',
        border: '2px solid var(--border-color)',
        imageRendering: 'pixelated'
      }}
    />
  );
}
