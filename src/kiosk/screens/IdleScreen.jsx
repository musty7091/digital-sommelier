import { useEffect, useMemo, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AtmosphereBackground from '../components/AtmosphereBackground'
import CountryFlag from '../components/CountryFlag'
import { COUNTRY_LABELS, LEVEL_LABELS } from '../../types/product.schema'

const SERVE = {
  red: { temp: '16–18°C', glassTr: 'Büyük balon kadeh', glassEn: 'Large bowl glass' },
  white: { temp: '8–10°C', glassTr: 'Beyaz şarap kadehi', glassEn: 'White wine glass' },
  rose: { temp: '8–10°C', glassTr: 'Roze kadehi', glassEn: 'Rosé glass' },
  sparkling: { temp: '6–8°C', glassTr: 'Flüt kadeh', glassEn: 'Flute glass' },
}
const levelN = (v) => (v === 'intense' ? 3 : v === 'medium' ? 2 : v === 'light' ? 1 : 0)

// Bekleme (attract) ekranı: arkada bulanık şarap videosu; üstünde öne çıkan şarap.
// Karta dokununca o şarabın detayı açılır (ürün kaybolmaz); boşluğa dokununca açılışa gider.
export default function IdleScreen() {
  const { products, wakeFromIdle, openDetail, settings, currency } = useFlow()
  const { t, tl, lang } = useLanguage()
  const rotateMs = (settings?.featuredRotationSeconds || 7) * 1000

  const featured = useMemo(() => {
    const active = products.filter((p) => p.active !== false && p.stock > 0)
    let list = active.filter((p) => p.featured)
    if (!list.length) list = active.filter((p) => p.sommelierPick)
    if (!list.length) list = active
    return [...list].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).slice(0, 8)
  }, [products])

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    setIdx(0)
  }, [featured.length])
  useEffect(() => {
    if (featured.length <= 1) return
    const id = setInterval(() => setIdx((i) => (i + 1) % featured.length), rotateMs)
    return () => clearInterval(id)
  }, [featured, rotateMs])

  const wine = featured[idx]
  const country = wine && COUNTRY_LABELS[wine.country] ? COUNTRY_LABELS[wine.country][lang] : ''
  const note = wine ? tl(wine.shortDescription) || tl(wine.tasteNotes) : ''
  const pairing = wine ? tl(wine.foodPairing) : ''
  const serve = wine ? SERVE[wine.color] : null
  const serveGlass = serve ? (lang === 'en' ? serve.glassEn : serve.glassTr) : ''

  const axes = []
  if (wine) {
    const add = (key, val) => {
      if (val && LEVEL_LABELS[val]) axes.push({ key, label: t(key), n: levelN(val), val: LEVEL_LABELS[val][lang] })
    }
    add('body', wine.body)
    add('sweetness', wine.sweetness)
    add('acidity', wine.acidity)
    if (wine.color === 'red' || wine.color === 'rose') add('tannin', wine.tannin)
  }

  return (
    <main
      onClick={wakeFromIdle}
      className="relative flex h-[100dvh] w-full cursor-pointer flex-col items-center justify-center overflow-hidden px-8"
    >
      <AtmosphereBackground />
      <video
        src="/ambient-wine.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: 'blur(14px) brightness(0.5)', transform: 'scale(1.12)' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(80% 80% at 50% 45%, rgba(10,6,9,0.30) 0%, rgba(10,6,9,0.85) 100%)' }}
      />

      {wine ? (
        <div
          key={wine.barcode}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            openDetail(wine, 'welcome')
          }}
          className="ds-fade-up relative z-10 flex max-w-3xl cursor-pointer flex-col items-center rounded-[2rem] px-6 py-5 text-center transition hover:bg-white/[0.03] active:scale-[0.99]"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.45em] text-gold-500">{t('featuredEyebrow')}</p>

          {wine.sommelierPick && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-500/50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold-300">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" />
              </svg>
              {t('sommelierPick')}
            </span>
          )}

          <h1
            className="font-serif text-5xl font-semibold leading-tight text-cream-100 md:text-7xl"
            style={{ textShadow: '0 2px 30px rgba(0,0,0,0.6)' }}
          >
            {wine.name}
          </h1>

          <div className="mt-4 flex items-center gap-3 text-cream-200/80">
            {wine.country && <CountryFlag code={wine.country} compact />}
            <span className="text-xl">{[country, wine.region].filter(Boolean).join(' · ')}</span>
          </div>

          {wine.grape && (
            <div className="mt-2 text-sm uppercase tracking-[0.12em] text-cream-200/55">{wine.grape}</div>
          )}

          {note && <p className="mt-4 max-w-xl text-xl leading-relaxed text-cream-200/85">{note}</p>}

          {axes.length > 0 && (
            <div className="mt-6 flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
              {axes.map((a) => (
                <div key={a.key} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-cream-200/55">{a.label}</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-1 w-5 rounded-full ${i < a.n ? 'bg-gold-500' : 'bg-cream-100/15'}`} />
                    ))}
                  </span>
                  <span className="text-sm text-cream-200/85">{a.val}</span>
                </div>
              ))}
            </div>
          )}

          {(pairing || serve) && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-cream-200/75">
              {pairing && (
                <span className="flex items-center gap-2 text-base">
                  <svg className="h-4 w-4 text-gold-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3v7M8 3v7M6.5 10v11M16 3c-1.5 0-2 2-2 5s.5 4 2 4m0 0v9" />
                  </svg>
                  {pairing}
                </span>
              )}
              {serve && (
                <span className="flex items-center gap-2 text-base">
                  <svg className="h-4 w-4 text-gold-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4a2 2 0 0 0-2 2v8a3.5 3.5 0 1 0 4 0V6a2 2 0 0 0-2-2z" />
                  </svg>
                  {serve.temp} · {serveGlass}
                </span>
              )}
            </div>
          )}

          <span className="mt-6 text-4xl font-semibold text-gold-400" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>
            {wine.price} {currency}
          </span>

          <span className="mt-5 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.28em] text-cream-200/50">
            {t('idleTapView')}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </span>
        </div>
      ) : (
        <h1 className="relative z-10 font-serif text-6xl text-cream-100">{t('title')}</h1>
      )}

      <div className="relative z-10 mt-12 flex flex-col items-center gap-5">
        {featured.length > 1 && (
          <div className="flex gap-2">
            {featured.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-gold-500' : 'w-1.5 bg-cream-100/25'}`}
              />
            ))}
          </div>
        )}
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-cream-200/65">{t('touchToStart')}</p>
      </div>
    </main>
  )
}
