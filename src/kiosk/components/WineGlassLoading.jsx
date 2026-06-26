// Dolan kadeh yükleme animasyonu (saf SVG/SMIL — ek kütüphane yok)
export default function WineGlassLoading({ label = 'Şaraplar hazırlanıyor…' }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-ink-950">
      <svg width="150" height="210" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="wgl-bowl">
            <path d="M50,50 C46,120 72,158 100,158 C128,158 154,120 150,50 A50,13 0 0 1 50,50 Z" />
          </clipPath>
          <linearGradient id="wgl-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#efc56a" stopOpacity="0.25" />
            <stop offset="0.5" stopColor="#efc56a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#efc56a" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Şarap (kadehin içine kırpılmış, aşağıdan dolan) */}
        <g clipPath="url(#wgl-bowl)">
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 115; 0 14; 0 14; 0 115"
              keyTimes="0; 0.5; 0.82; 1"
              dur="3.6s"
              calcMode="spline"
              keySplines="0.4 0 0.2 1; 0 0 1 1; 0.5 0 0.3 1"
              repeatCount="indefinite"
            />
            {/* arka dalga */}
            <path d="M-40,74 q20,-9 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 L260,210 L-40,210 Z" fill="#5a1320">
              <animateTransform attributeName="transform" type="translate" values="0 0; -40 0; 0 0" dur="3.1s" repeatCount="indefinite" />
            </path>
            {/* ön dalga */}
            <path d="M-40,78 q20,8 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 L260,210 L-40,210 Z" fill="#7d1b2e" opacity="0.92">
              <animateTransform attributeName="transform" type="translate" values="0 0; 40 0; 0 0" dur="2.4s" repeatCount="indefinite" />
            </path>
            {/* yüzey parıltısı */}
            <ellipse cx="100" cy="76" rx="46" ry="5" fill="#b94a5e" opacity="0.5" />
          </g>
        </g>

        {/* Yükselen kabarcıklar (kadehe kırpılı) */}
        <g clipPath="url(#wgl-bowl)" fill="#efc56a" opacity="0.55">
          <circle cx="86" cy="150" r="2">
            <animate attributeName="cy" values="150;70" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.6;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="108" cy="150" r="1.6">
            <animate attributeName="cy" values="150;72" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.5;0" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="118" cy="150" r="1.3">
            <animate attributeName="cy" values="150;82" dur="2.5s" begin="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.5;0" dur="2.5s" begin="1.1s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Kadeh camı (şarabın üstünde, net kenar) */}
        <g fill="none" stroke="url(#wgl-glass)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M50,50 C46,120 72,158 100,158 C128,158 154,120 150,50" />
          <ellipse cx="100" cy="50" rx="50" ry="13" />
        </g>
        {/* Ayak ve taban */}
        <line x1="100" y1="158" x2="100" y2="250" stroke="url(#wgl-glass)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M64,256 Q100,242 136,256" fill="none" stroke="url(#wgl-glass)" strokeWidth="2.4" strokeLinecap="round" />
        {/* cam parlaması */}
        <path d="M64,58 C62,108 78,140 96,148" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <p className="font-serif text-lg tracking-wide text-cream-200/80">{label}</p>
    </div>
  )
}
