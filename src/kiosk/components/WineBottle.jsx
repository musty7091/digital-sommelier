// Renge göre tonlanmış şarap şişesi silüeti (gerçek görsel yoksa premium yer tutucu).
const GLASS = {
  red: '#5c1a27',
  white: '#c7c19c',
  rose: '#d49aa6',
  sparkling: '#c2a85a',
}

export default function WineBottle({ color = 'red', className = '' }) {
  const glass = GLASS[color] || GLASS.red
  return (
    <svg viewBox="0 0 60 180" className={className} role="img" aria-hidden="true">
      <rect x="24" y="4" width="12" height="13" rx="1.5" fill="#26262c" />
      <rect x="26.5" y="16" width="7" height="28" fill={glass} />
      <path
        d="M26.5 42 C26.5 54 16 60 16 80 L16 162 C16 169 20 173 26 173 L34 173 C40 173 44 169 44 162 L44 80 C44 60 33.5 54 33.5 42 Z"
        fill={glass}
      />
      <rect x="20" y="70" width="3" height="92" rx="1.5" fill="#ffffff" opacity="0.12" />
      <rect x="17.5" y="112" width="25" height="36" rx="2" fill="#f4eee0" opacity="0.92" />
      <rect x="20.5" y="120" width="19" height="2.5" rx="1" fill="#7a2434" opacity="0.55" />
      <rect x="20.5" y="126" width="13" height="2" rx="1" fill="#26262c" opacity="0.35" />
    </svg>
  )
}
