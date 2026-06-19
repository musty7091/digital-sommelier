const baseClass = 'overflow-hidden rounded-[6px] border border-cream-100/25 shadow-[0_6px_16px_rgba(0,0,0,0.28)] ring-1 ring-black/20'

function FlagFrame({ children, className = '' }) {
  return (
    <svg
      viewBox="0 0 48 32"
      aria-hidden="true"
      className={`${baseClass} ${className}`}
      focusable="false"
    >
      {children}
    </svg>
  )
}

function Star({ x, y, size = 4, fill = 'white' }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fill={fill}
      fontFamily="Arial, sans-serif"
    >
      ★
    </text>
  )
}

export default function CountryFlag({ code, compact = false }) {
  const sizeClass = compact ? 'h-8 w-12' : 'h-10 w-16'

  switch (code) {
    case 'TR':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#E30A17" />
          <circle cx="20" cy="16" r="8" fill="white" />
          <circle cx="23" cy="16" r="6.5" fill="#E30A17" />
          <Star x="31" y="16" size="8" />
        </FlagFrame>
      )
    case 'CY':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#F8F6EF" />
          <ellipse cx="24" cy="13" rx="9" ry="5" fill="#D18439" />
          <path d="M17 22 C22 18, 26 18, 31 22" fill="none" stroke="#4B8A4B" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M18 24 C23 20, 25 20, 30 24" fill="none" stroke="#4B8A4B" strokeWidth="1.4" strokeLinecap="round" />
        </FlagFrame>
      )
    case 'IT':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="16" height="32" x="0" fill="#009246" />
          <rect width="16" height="32" x="16" fill="#F1F2F1" />
          <rect width="16" height="32" x="32" fill="#CE2B37" />
        </FlagFrame>
      )
    case 'FR':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="16" height="32" x="0" fill="#0055A4" />
          <rect width="16" height="32" x="16" fill="#FFFFFF" />
          <rect width="16" height="32" x="32" fill="#EF4135" />
        </FlagFrame>
      )
    case 'CL':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="16" y="0" fill="#FFFFFF" />
          <rect width="48" height="16" y="16" fill="#D52B1E" />
          <rect width="18" height="16" x="0" y="0" fill="#0039A6" />
          <Star x="9" y="8" size="7" />
        </FlagFrame>
      )
    case 'AR':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="10.67" y="0" fill="#74ACDF" />
          <rect width="48" height="10.67" y="10.67" fill="#FFFFFF" />
          <rect width="48" height="10.66" y="21.34" fill="#74ACDF" />
          <circle cx="24" cy="16" r="3.3" fill="#F6B40E" />
        </FlagFrame>
      )
    case 'ES':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="8" y="0" fill="#AA151B" />
          <rect width="48" height="16" y="8" fill="#F1BF00" />
          <rect width="48" height="8" y="24" fill="#AA151B" />
          <rect x="12" y="13" width="4" height="7" rx="0.7" fill="#AA151B" opacity="0.75" />
        </FlagFrame>
      )
    case 'AU':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#012169" />
          <rect x="0" y="0" width="21" height="15" fill="#012169" />
          <path d="M0 0 L21 15 M21 0 L0 15" stroke="white" strokeWidth="3" />
          <path d="M0 0 L21 15 M21 0 L0 15" stroke="#C8102E" strokeWidth="1.4" />
          <path d="M10.5 0 V15 M0 7.5 H21" stroke="white" strokeWidth="4" />
          <path d="M10.5 0 V15 M0 7.5 H21" stroke="#C8102E" strokeWidth="2" />
          <Star x="32" y="10" size="5" />
          <Star x="38" y="17" size="4" />
          <Star x="29" y="23" size="4" />
          <Star x="40" y="25" size="3.5" />
        </FlagFrame>
      )
    case 'NZ':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#00247D" />
          <rect x="0" y="0" width="21" height="15" fill="#012169" />
          <path d="M0 0 L21 15 M21 0 L0 15" stroke="white" strokeWidth="3" />
          <path d="M0 0 L21 15 M21 0 L0 15" stroke="#C8102E" strokeWidth="1.4" />
          <path d="M10.5 0 V15 M0 7.5 H21" stroke="white" strokeWidth="4" />
          <path d="M10.5 0 V15 M0 7.5 H21" stroke="#C8102E" strokeWidth="2" />
          <Star x="34" y="10" size="5" fill="#CC142B" />
          <Star x="40" y="16" size="4.5" fill="#CC142B" />
          <Star x="31" y="21" size="4.5" fill="#CC142B" />
          <Star x="38" y="25" size="4" fill="#CC142B" />
        </FlagFrame>
      )
    case 'OTHER':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#1F2937" />
          <circle cx="24" cy="16" r="9" fill="none" stroke="#D6B56D" strokeWidth="2" />
          <path d="M15 16 H33 M24 7 C20 11,20 21,24 25 M24 7 C28 11,28 21,24 25" fill="none" stroke="#D6B56D" strokeWidth="1.5" strokeLinecap="round" />
        </FlagFrame>
      )
    default:
      return null
  }
}
