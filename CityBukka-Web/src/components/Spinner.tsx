export function Spinner({ size = 28, color = 'currentColor', label = 'Loading' }: { size?: number; color?: string; label?: string }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${Math.max(2, size / 11)}px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderTopColor: color,
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
