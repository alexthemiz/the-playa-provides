// Shared background motif for opengraph-image.tsx routes and profile-icon
// generation. Echoes Black Rock City's real radial street layout, including
// its actual gap at the top (the "trash fence" opening onto open playa) --
// a closed compass-style ring read as generic AI-startup iconography, so
// the outer ring is deliberately left open across the top two wedges rather
// than forming a full circle. Small node dots mark the 7 remaining spoke/
// ring intersections, like survey stakes at a street corner.
export function RadialPlayaMotif({ color = '#1C1610' }: { color?: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 120">
      <path d="M 23.2 23.2 A 52 52 0 1 0 96.8 23.2" fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx="60" cy="60" r="36" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="60" cy="60" r="20" fill="none" stroke={color} strokeWidth="1" />
      <line x1="60" y1="60" x2="60" y2="112" stroke={color} strokeWidth="1" />
      <line x1="8" y1="60" x2="112" y2="60" stroke={color} strokeWidth="1" />
      <line x1="23" y1="23" x2="97" y2="97" stroke={color} strokeWidth="1" />
      <line x1="97" y1="23" x2="23" y2="97" stroke={color} strokeWidth="1" />
      <circle cx="23" cy="23" r="2.4" fill={color} />
      <circle cx="97" cy="23" r="2.4" fill={color} />
      <circle cx="8" cy="60" r="2.4" fill={color} />
      <circle cx="112" cy="60" r="2.4" fill={color} />
      <circle cx="23" cy="97" r="2.4" fill={color} />
      <circle cx="97" cy="97" r="2.4" fill={color} />
      <circle cx="60" cy="112" r="2.4" fill={color} />
    </svg>
  )
}
