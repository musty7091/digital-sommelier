import { useMemo } from 'react'

// Flu, sinematik şarap dokusu: alt yarıda yavaşça süzülen, ağır bulanık
// şarap/altın tonlu ışık lekeleri — "odak dışı şarap barı" hissi. Salt görsel.
const TONES = [
  'rgba(122,36,52,0.55)',
  'rgba(90,20,35,0.50)',
  'rgba(150,40,55,0.45)',
  'rgba(200,169,81,0.28)',
]

export default function WineBokeh() {
  const blobs = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        left: 4 + Math.random() * 90,
        top: 45 + Math.random() * 48, // ekranın alt yarısı
        size: 180 + Math.random() * 220,
        tone: TONES[i % TONES.length],
        dur: 14 + Math.random() * 12,
        delay: -Math.random() * 16,
        x: (Math.random() - 0.5) * 60,
        y: -(10 + Math.random() * 28),
        o: 0.16 + Math.random() * 0.18,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {blobs.map((b, i) => (
        <span
          key={i}
          data-bokeh
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            background: b.tone,
            filter: 'blur(70px)',
            '--bokeh-x': `${b.x}px`,
            '--bokeh-y': `${b.y}px`,
            '--bokeh-o': b.o,
            animation: `ds-bokeh ${b.dur}s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
