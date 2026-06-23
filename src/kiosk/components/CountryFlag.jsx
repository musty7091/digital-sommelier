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
    case 'DE':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="10.67" y="0" fill="#000000" />
          <rect width="48" height="10.67" y="10.67" fill="#DD0000" />
          <rect width="48" height="10.66" y="21.34" fill="#FFCC00" />
        </FlagFrame>
      )
    case 'AT':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="10.67" y="0" fill="#ED2939" />
          <rect width="48" height="10.67" y="10.67" fill="#FFFFFF" />
          <rect width="48" height="10.66" y="21.34" fill="#ED2939" />
        </FlagFrame>
      )
    case 'US':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#FFFFFF" />
          <rect width="48" height="2.46" y="0" fill="#B22234" />
          <rect width="48" height="2.46" y="4.92" fill="#B22234" />
          <rect width="48" height="2.46" y="9.84" fill="#B22234" />
          <rect width="48" height="2.46" y="14.76" fill="#B22234" />
          <rect width="48" height="2.46" y="19.68" fill="#B22234" />
          <rect width="48" height="2.46" y="24.6" fill="#B22234" />
          <rect width="48" height="2.46" y="29.52" fill="#B22234" />
          <rect width="21" height="17.2" fill="#3C3B6E" />
          <Star x="4" y="4" size="3" />
          <Star x="10" y="4" size="3" />
          <Star x="16" y="4" size="3" />
          <Star x="7" y="8" size="3" />
          <Star x="13" y="8" size="3" />
          <Star x="4" y="13" size="3" />
          <Star x="10" y="13" size="3" />
          <Star x="16" y="13" size="3" />
        </FlagFrame>
      )
    case 'PT':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="18" height="32" x="0" fill="#006600" />
          <rect width="30" height="32" x="18" fill="#FF0000" />
          <circle cx="18" cy="16" r="6" fill="#FFD100" />
          <rect width="8" height="10" x="14" y="11" rx="1" fill="#FFFFFF" stroke="#003399" strokeWidth="1" />
        </FlagFrame>
      )
    case 'ZA':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#E03C31" />
          <rect width="48" height="16" y="16" fill="#001489" />
          <path d="M0 0 L24 16 L48 16 L48 16 L24 16 L0 32" fill="none" stroke="#FFFFFF" strokeWidth="9" />
          <path d="M0 0 L24 16 L48 16 L48 16 L24 16 L0 32" fill="none" stroke="#007749" strokeWidth="5" />
          <polygon points="0,0 16,16 0,32" fill="#FFB81C" />
          <polygon points="0,3 12,16 0,29" fill="#000000" />
        </FlagFrame>
      )
    case 'GE':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#FFFFFF" />
          <rect x="21" width="6" height="32" fill="#FF0000" />
          <rect y="13" width="48" height="6" fill="#FF0000" />
          <rect x="8" y="5.7" width="5" height="1.6" fill="#FF0000" />
          <rect x="9.7" y="4" width="1.6" height="5" fill="#FF0000" />
          <rect x="35" y="5.7" width="5" height="1.6" fill="#FF0000" />
          <rect x="36.7" y="4" width="1.6" height="5" fill="#FF0000" />
          <rect x="8" y="24.7" width="5" height="1.6" fill="#FF0000" />
          <rect x="9.7" y="23" width="1.6" height="5" fill="#FF0000" />
          <rect x="35" y="24.7" width="5" height="1.6" fill="#FF0000" />
          <rect x="36.7" y="23" width="1.6" height="5" fill="#FF0000" />
        </FlagFrame>
      )
    case 'AZ':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="48" height="32" fill="#0092BC" />
          <rect y="10.67" width="48" height="10.66" fill="#EF3340" />
          <rect y="21.33" width="48" height="10.67" fill="#509E2F" />
          <circle cx="22" cy="16" r="4.6" fill="#FFFFFF" />
          <circle cx="23.6" cy="16" r="3.7" fill="#EF3340" />
          <Star x="29" y="16" size="6" fill="white" />
        </FlagFrame>
      )
    case 'MD':
      return (
        <FlagFrame className={sizeClass}>
          <rect width="16" height="32" x="0" fill="#0046AE" />
          <rect width="16" height="32" x="16" fill="#FFD200" />
          <rect width="16" height="32" x="32" fill="#CC092F" />
          <rect x="23.4" y="9.5" width="1.2" height="3" fill="#A77B06" />
          <rect x="22.4" y="10.3" width="3.2" height="1.2" fill="#A77B06" />
          <path d="M24 12 L28 12 L28 17 C28 19 26 20 24 21 C22 20 20 19 20 17 L20 12 Z" fill="#A77B06" stroke="#7A5A04" strokeWidth="0.5" />
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