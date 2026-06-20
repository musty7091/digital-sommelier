import { useEffect, useMemo, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AtmosphereBackground from '../components/AtmosphereBackground'
import WineBokeh from '../components/WineBokeh'
import WineBottle from '../components/WineBottle'
import CountryFlag from '../components/CountryFlag'
import { COUNTRY_LABELS } from '../../types/product.schema'

// Bekleme (attract) ekranı: featured şaraplar sinematik atmosferde tek tek döner.
// Ekrana dokununca açılışa döner.
export default function IdleScreen() {
  const { products, wakeFromIdle, settings, currency } = useFlow()
  const { t, tl, lang } = useLanguage()
  const rotateMs = (settings?.featuredRotationSeconds || 7) * 1000

  const featured = useMemo(() => {
    const active = products.filter((p) => p.active !== false && p.stock > 0)
    let list = active.filter((p) => p.featured)
    if (!list.length) list = active.filter((p) => p.sommelierPick)
    if (!list.length) list = active
    return [...list]
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 8)
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

  return (
    <main
      onClick={wakeFromIdle}
      className="relative flex h-[100dvh] w-full cursor-pointer flex-col items-center justify-center overflow-hidden px-8"
    >
      <AtmosphereBackground />
      <WineBokeh />

      <p className="ds-fade-up relative z-10 mb-4 text-xs uppercase tracking-[0.45em] text-gold-500">
        {t('featuredEyebrow')}
      </p>

      {wine ? (
        <div
          key={wine.barcode}
          className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:justify-center"
        >
          <div className="flex shrink-0 items-center justify-center">
            {wine.image ? (
              <img
                src={wine.image}
                alt={wine.name}
                className="ds-kenburns h-[40vh] w-auto max-w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)] md:h-[46vh]"
              />
            ) : (
              <WineBottle color={wine.color} className="ds-kenburns h-[40vh] w-auto md:h-[46vh]" />
            )}
          </div>

          <div className="ds-fade-up flex max-w-md flex-col items-center text-center md:items-start md:text-left">
            <h1 className="font-serif text-5xl font-semibold leading-tight text-cream-100 md:text-6xl">
              {wine.name}
            </h1>
            <div className="mt-4 flex items-center gap-3 text-cream-200/70">
              {wine.country && <CountryFlag code={wine.country} compact />}
              <span className="text-lg">{[country, wine.region].filter(Boolean).join(' · ')}</span>
            </div>
            {note && <p className="mt-5 text-lg leading-relaxed text-cream-200/85">{note}</p>}
            <span className="mt-6 text-3xl font-semibold text-gold-400">
              {wine.price} {currency}
            </span>
          </div>
        </div>
      ) : (
        <h1 className="relative z-10 font-serif text-5xl text-cream-100">{t('title')}</h1>
      )}

      <div className="relative z-10 mt-14 flex flex-col items-center gap-5">
        {featured.length > 1 && (
          <div className="flex gap-2">
            {featured.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === idx ? 'w-6 bg-gold-500' : 'w-1.5 bg-cream-100/25'
                }`}
              />
            ))}
          </div>
        )}
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-cream-200/60">
          {t('touchToStart')}
        </p>
      </div>
    </main>
  )
}
