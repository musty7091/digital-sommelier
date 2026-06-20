// Bekleme ekranı için kendi kendine dolan şarap kadehi (saf SVG/CSS).
// Dolum rengi şarabın rengine göre değişir.
const WINE_COLORS = {
  red: { body: '#6f1b2a', top: '#8a2335', surface: '#a83247' },
  white: { body: '#caa94e', top: '#d8c172', surface: '#e7d493' },
  rose: { body: '#c25e7a', top: '#d27a93', surface: '#df93a8' },
  sparkling: { body: '#c9b36a', top: '#dcc87f', surface: '#ebd998' },
}

export default function WineGlass({ color = 'red', className = '' }) {
  const c = WINE_COLORS[color] || WINE_COLORS.red
  const fizzy = color === 'sparkling' || color === 'white'
  const clip = `dsGlassBowl-${color}`

  return (
    <svg viewBox="0 0 200 320" className={className} role="img" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d="M52 46 C52 130 76 174 100 174 C124 174 148 130 148 46 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <g className="ds-glassfill">
          <rect x="38" y="44" width="124" height="152" fill={c.body} />
          <rect x="38" y="44" width="124" height="38" fill={c.top} />
          <ellipse className="ds-glasswobble" cx="100" cy="46" rx="62" ry="7" fill={c.surface} />
          {fizzy && (
            <g>
              <circle className="ds-bubble" cx="86" cy="150" r="2" fill="#fff" opacity="0.5" />
              <circle className="ds-bubble" cx="110" cy="158" r="1.6" fill="#fff" opacity="0.45" style={{ animationDelay: '1.2s' }} />
              <circle className="ds-bubble" cx="98" cy="142" r="1.8" fill="#fff" opacity="0.4" style={{ animationDelay: '2.1s' }} />
            </g>
          )}
        </g>
      </g>

      {/* Cam gövde */}
      <path
        d="M52 46 C52 130 76 174 100 174 C124 174 148 130 148 46 Z"
        fill="rgba(255,255,255,.045)"
        stroke="rgba(255,255,255,.28)"
        strokeWidth="1.6"
      />
      <ellipse cx="100" cy="46" rx="48" ry="8.5" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.6" />
      <path d="M64 60 C66 110 80 150 96 164" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" strokeLinecap="round" />
      <rect x="96.5" y="174" width="7" height="74" rx="3" fill="rgba(255,255,255,.14)" />
      <ellipse cx="100" cy="250" rx="40" ry="8" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.18)" strokeWidth="1.4" />
    </svg>
  )
}
