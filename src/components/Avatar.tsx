interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

// Generate a consistent color from a string seed
function seedToColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

// Get initials from name (max 2 chars)
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.slice(0, 2)).toUpperCase();
}

export default function Avatar({ seed, size = 40, className = '' }: AvatarProps) {
  const bgColor = seedToColor(seed);
  const initials = getInitials(seed);

  return (
    <div
      className={`avatar-img ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        backgroundColor: bgColor,
        border: '2px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.4,
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        lineHeight: 1,
        userSelect: 'none',
        flexShrink: 0,
      }}
      title={`${seed} Avatar`}
    >
      {initials}
    </div>
  );
}

