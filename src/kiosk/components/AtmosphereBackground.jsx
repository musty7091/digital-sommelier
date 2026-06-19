import { useMemo } from 'react'

// Sinematik mahzen atmosferi: derin zemin + nefes alan sıcak parıltı +
// yükselen altın ışık zerreleri + kenar karartması. Salt görsel, etkileşimsiz.
export default function AtmosphereBackground() {
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }).map(() => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 14 + Math.random() * 16,
        delay: -Math.random() * 30,
        drift: (Math.random() - 0.5) * 120,
        opacity: 0.25 + Math.random() * 0.4,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* derin mahzen zemini */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 12%, #2a1820 0%, #150d12 45%, #0a0709 100%)' }}
      />
      {/* mum ışığı gibi nefes alan sıcak parıltı */}
      <div
        className="absolute left-1/2 top-1/3 h-[60vh] w-[60vh] rounded-full blur-[90px]"
        style={{
          background: 'radial-gradient(circle, rgba(200,169,81,0.18) 0%, rgba(122,36,52,0.10) 42%, transparent 70%)',
          animation: 'ds-glow 16s ease-in-out infinite',
        }}
      />
      {/* yükselen altın ışık zerreleri */}
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-gold-400"
          style={{
            left: `${m.left}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            filter: 'blur(0.5px)',
            boxShadow: '0 0 8px rgba(200,169,81,0.6)',
            '--mote-drift': `${m.drift}px`,
            '--mote-opacity': m.opacity,
            animation: `ds-mote ${m.duration}s linear ${m.delay}s infinite`,
          }}
        />
      ))}
      {/* kenar karartması */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.55) 100%)' }}
      />
    </div>
  )
}
