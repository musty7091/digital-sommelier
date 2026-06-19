import { useLanguage } from '../../i18n/LanguageContext'
import { COUNTRY_LABELS, LEVEL_LABELS, USAGE_PURPOSE_LABELS } from '../../types/product.schema'
import StockBadge from './StockBadge'
import WineBottle from './WineBottle'

const CARD_LABELS = {
  tr: {
    featured: 'Öne çıkan öneri',
    detailsHint: 'Ürün detaylarını görmek için karta dokunun',
    examine: 'İncele',
    profile: 'Profil',
    body: 'Gövde',
    sweetness: 'Tatlılık',
    acidity: 'Asidite',
    tannin: 'Tanen',
    grape: 'Üzüm',
    region: 'Bölge',
    tasteNotes: 'Tadım',
    foodPairing: 'Eşleşme',
  },
  en: {
    featured: 'Featured recommendation',
    detailsHint: 'Tap the card to see product details',
    examine: 'View',
    profile: 'Profile',
    body: 'Body',
    sweetness: 'Sweetness',
    acidity: 'Acidity',
    tannin: 'Tannin',
    grape: 'Grape',
    region: 'Region',
    tasteNotes: 'Tasting',
    foodPairing: 'Pairing',
  },
}

function localizedText(value, lang) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.tr || value.en || ''
}

function levelText(value, lang) {
  return LEVEL_LABELS[value] ? LEVEL_LABELS[value][lang] : value
}

export default function ProductCard({ product, onClick }) {
  const { t, lang } = useLanguage()
  const labels = CARD_LABELS[lang] || CARD_LABELS.tr
  const shelfShort =
    lang === 'en'
      ? `Block ${product.block}, Shelf ${product.shelf}`
      : `${product.block} Blok ${product.shelf}. raf`
  const country = COUNTRY_LABELS[product.country] ? COUNTRY_LABELS[product.country][lang] : ''
  const description = localizedText(product.shortDescription, lang)
  const tasteNotes = localizedText(product.tasteNotes, lang)
  const foodPairing = localizedText(product.foodPairing, lang)
  const why = localizedText(product._why, lang)

  const profileItems = [
    { label: labels.body, value: levelText(product.body, lang) },
    { label: labels.sweetness, value: levelText(product.sweetness, lang) },
    { label: labels.acidity, value: levelText(product.acidity, lang) },
    { label: labels.tannin, value: levelText(product.tannin, lang) },
  ].filter((item) => item.value)

  const infoItems = [
    { label: labels.grape, value: product.grape },
    { label: labels.region, value: product.region },
    { label: labels.tasteNotes, value: tasteNotes },
    { label: labels.foodPairing, value: foodPairing },
  ].filter((item) => item.value)

  const purposeChips = (product.usagePurposes || [])
    .slice(0, 3)
    .map((purpose) => USAGE_PURPOSE_LABELS[purpose]?.[lang])
    .filter(Boolean)

  // BÜYÜK KART TASARIMI
  if (product._big) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="relative grid h-full w-full cursor-pointer grid-cols-1 gap-5 overflow-hidden rounded-2xl border border-gold-500/30 bg-charcoal-800/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:border-gold-500/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:rounded-3xl sm:p-6 md:grid-cols-[minmax(190px,0.85fr)_minmax(0,1.35fr)] md:p-8"
      >
        {product._pick && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-950 shadow-lg sm:left-6 sm:px-4 sm:text-xs">
            {t('pickLabel')}
          </span>
        )}

        <div className="relative flex min-h-[220px] items-center justify-center rounded-2xl border border-charcoal-700/60 bg-ink-950/20 p-4 md:min-h-[420px]">
          <div className="pointer-events-none absolute inset-6 rounded-full bg-gold-500/5 blur-2xl" />
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="relative h-56 w-auto max-w-full object-contain drop-shadow-2xl sm:h-64 md:h-[360px] xl:h-[420px]"
            />
          ) : (
            <WineBottle color={product.color} className="relative h-56 w-auto drop-shadow-2xl sm:h-64 md:h-[360px] xl:h-[420px]" />
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-500/90">
              {labels.featured}
            </p>
            <h2 className="font-serif text-2xl font-semibold leading-tight text-cream-100 md:text-3xl xl:text-4xl">
              {product.name}
            </h2>
            <p className="mt-2 text-xs text-cream-200/60 sm:text-sm">
              {[product.brand, country].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-2xl font-semibold text-gold-400 sm:text-3xl">
                {product.price} {t('priceUnit')}
              </span>
              <StockBadge stock={product.stock} />
            </div>

            <p className="mt-3 text-xs text-cream-200/80 sm:text-sm">
              {lang === 'en'
                ? `You can find this at ${shelfShort}.`
                : `Bu ürünü ${shelfShort}ta bulabilirsiniz.`}
            </p>
          </div>

          {description && (
            <p className="mt-4 line-clamp-3 font-serif text-base italic leading-snug text-cream-100/90 md:text-lg">
              {description}
            </p>
          )}

          {profileItems.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-200/45">
                {labels.profile}
              </p>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {profileItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-charcoal-700/70 bg-ink-950/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-cream-200/45">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-cream-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {infoItems.length > 0 && (
            <div className="mt-4 grid gap-2 text-xs sm:text-sm">
              {infoItems.slice(0, 3).map((item) => (
                <div key={item.label} className="flex gap-3 rounded-xl border border-charcoal-700/60 bg-ink-950/20 px-3 py-2">
                  <span className="w-20 shrink-0 font-medium text-gold-500">{item.label}</span>
                  <span className="line-clamp-2 text-cream-200">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {purposeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {purposeChips.map((chip) => (
                <span key={chip} className="rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-[11px] font-medium text-gold-300">
                  {chip}
                </span>
              ))}
            </div>
          )}

          {why && (
            <div className="mt-4 rounded-xl border border-charcoal-700 bg-ink-900/50 p-3 sm:p-4">
              <p className="text-[10px] uppercase tracking-wide text-gold-500">{t('why')}</p>
              <p className="mt-1 text-xs text-cream-200 sm:text-sm">{why}</p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-charcoal-700/70 pt-4 text-xs text-cream-200/60 sm:text-sm">
            <span>{labels.detailsHint}</span>
            <span className="shrink-0 rounded-full border border-gold-500/40 px-4 py-2 font-semibold text-gold-400">
              {labels.examine}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // KÜÇÜK KART TASARIMI
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="flex h-full cursor-pointer flex-col items-center justify-between rounded-xl sm:rounded-2xl border border-charcoal-700 bg-charcoal-800/40 p-3 sm:p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-20 sm:h-24 md:h-28 w-auto object-contain" />
      ) : (
        <WineBottle color={product.color} className="h-20 sm:h-24 md:h-28 w-auto" />
      )}

      <div className="mt-3 flex flex-col items-center flex-1 w-full">
        <h3 className="text-sm sm:text-base font-medium text-cream-100 line-clamp-2 leading-tight" title={product.name}>
          {product.name}
        </h3>
        <span className="mt-1 text-base sm:text-lg font-semibold text-gold-400">
          {product.price} {t('priceUnit')}
        </span>
      </div>

      <div className="mt-2 w-full flex flex-col items-center gap-1">
        <StockBadge stock={product.stock} />
        <p className="text-[10px] sm:text-xs text-cream-200/60 truncate w-full px-1" title={shelfShort}>
          {shelfShort}
        </p>
      </div>
    </div>
  )
}
