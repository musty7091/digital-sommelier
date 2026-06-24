import { useState, lazy, Suspense } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { getLocalProductImagePath, getProductImageAlt } from '../../shared/productImage'
import { useFlow } from '../state/FlowContext'
import { COUNTRY_LABELS, LEVEL_LABELS, USAGE_PURPOSE_LABELS } from '../../types/product.schema'
import StockBadge from './StockBadge'
import WineBottle from './WineBottle'

const StoreMap3D = lazy(() => import('./StoreMap3D'))

// Fiyatı tr-TR ondalık biçiminde gösterir: 799.9 -> "799,90"
function formatPrice(price) {
  const numberValue = Number(price)
  if (!Number.isFinite(numberValue)) {
    return String(price ?? '0')
  }
  return numberValue.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}


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
    serveTitle: 'Servis önerisi',
    serveTemp: 'Servis sıcaklığı',
    serveGlass: 'Kadeh',
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
    serveTitle: 'Serving suggestion',
    serveTemp: 'Serve at',
    serveGlass: 'Glass',
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

// Şarap rengine göre servis önerisi
const SERVE = {
  red: { temp: '16–18°C', glassTr: 'Büyük balon kadeh', glassEn: 'Large bowl glass' },
  white: { temp: '8–10°C', glassTr: 'Beyaz şarap kadehi', glassEn: 'White wine glass' },
  rose: { temp: '8–10°C', glassTr: 'Roze kadehi', glassEn: 'Rosé glass' },
  sparkling: { temp: '6–8°C', glassTr: 'Flüt kadeh', glassEn: 'Flute glass' },
}

function IconThermo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4 4 0 1 1-4 0z" />
      <path d="M12 9v5.8" />
    </svg>
  )
}
function IconGlass() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 3h9l-1 7.2a3.5 3.5 0 0 1-7 0L7.5 3z" />
      <path d="M12 14v6" />
      <path d="M8.5 21h7" />
    </svg>
  )
}
function IconFork() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a2 2 0 0 0 2 2v10" />
      <path d="M8 3v6" />
      <path d="M16 3c-1.4 0-2.4 1.6-2.4 4.2S15 11 16 11v10" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  )
}
function ServeItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-charcoal-700/70 bg-ink-950/30 px-3 py-2">
      <span className="mt-0.5 text-gold-500">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-cream-200/45">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-cream-100">{value}</p>
      </div>
    </div>
  )
}

function ProductImage({ product, imageClassName, fallbackClassName }) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageSrc = getLocalProductImagePath(product)

  if (!imageSrc || hasImageError) {
    return (
      <WineBottle
        color={product?.color}
        className={fallbackClassName || imageClassName}
      />
    )
  }

  return (
    <img
      src={imageSrc}
      alt={getProductImageAlt(product)}
      className={imageClassName}
      onError={() => setHasImageError(true)}
    />
  )
}

export default function ProductCard({ product, onClick }) {
  const { t, lang } = useLanguage()
  const { currency } = useFlow()
  const [showMap, setShowMap] = useState(false)
  const hasLocation = Boolean(product.block && (product.shelf || product.shelf === 0))
  const labels = CARD_LABELS[lang] || CARD_LABELS.tr
  const shelfShort =
    lang === 'en'
      ? `Block ${product.block}, Shelf ${product.shelf}`
      : `${product.block} Blok ${product.shelf}. raf`
  const country = COUNTRY_LABELS[product.country] ? COUNTRY_LABELS[product.country][lang] : ''
  const description = localizedText(product.shortDescription, lang)
  const tasteNotes = localizedText(product.tasteNotes, lang)
  const foodPairing = localizedText(product.foodPairing, lang)
  const serve = SERVE[product.color] || SERVE.red
  const serveGlass = lang === 'en' ? serve.glassEn : serve.glassTr

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
        className="relative grid h-full w-full cursor-pointer grid-cols-1 gap-5 overflow-hidden rounded-2xl border border-gold-500/30 bg-charcoal-800/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:border-gold-500/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:rounded-3xl sm:p-6 md:grid-cols-[minmax(180px,0.62fr)_minmax(0,1.7fr)] md:gap-6 md:p-8"
      >
        {showMap && (
          <Suspense fallback={null}>
            <StoreMap3D
              block={product.block}
              shelf={product.shelf}
              productName={product.name}
              onClose={() => setShowMap(false)}
            />
          </Suspense>
        )}

        {product._pick && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-950 shadow-lg sm:left-6 sm:px-4 sm:text-xs">
            {t('pickLabel')}
          </span>
        )}

        <div className="relative flex h-full min-h-[320px] max-h-[640px] items-center justify-center overflow-hidden rounded-2xl border border-charcoal-700/60 bg-ink-950/20">
          <div className="pointer-events-none absolute inset-6 rounded-full bg-gold-500/5 blur-2xl" />
          <ProductImage
            product={product}
            imageClassName="relative h-full w-full object-cover object-center drop-shadow-2xl"
            fallbackClassName="relative h-full w-auto max-h-full object-contain drop-shadow-2xl p-4"
          />
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
                {formatPrice(product.price)} {currency}
              </span>
              <StockBadge stock={product.stock} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex items-center gap-2 text-base font-semibold text-emerald-400 sm:text-lg">
                <PinIcon />
                {shelfShort}
              </span>
              {hasLocation && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMap(true)
                  }}
                  className="rounded-full border border-gold-500/60 bg-gold-500/10 px-4 py-1.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20 hover:border-gold-500"
                >
                  {lang === 'en' ? 'Show location' : 'Yerini Göster'}
                </button>
              )}
            </div>
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
            <div className="mt-4 grid gap-2 text-xs sm:text-sm [@media(max-height:900px)]:hidden">
              {infoItems.slice(0, 3).map((item) => (
                <div key={item.label} className="flex gap-3 rounded-xl border border-charcoal-700/60 bg-ink-950/20 px-3 py-2">
                  <span className="w-20 shrink-0 font-medium text-gold-500">{item.label}</span>
                  <span className="line-clamp-2 text-cream-200">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 [@media(max-height:900px)]:hidden">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-200/45">
              {labels.serveTitle}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <ServeItem icon={<IconThermo />} label={labels.serveTemp} value={serve.temp} />
              <ServeItem icon={<IconGlass />} label={labels.serveGlass} value={serveGlass} />
              {foodPairing && <ServeItem icon={<IconFork />} label={labels.foodPairing} value={foodPairing} />}
            </div>
          </div>

          {purposeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 [@media(max-height:900px)]:hidden">
              {purposeChips.map((chip) => (
                <span key={chip} className="rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-[11px] font-medium text-gold-400">
                  {chip}
                </span>
              ))}
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
      <ProductImage
        product={product}
        imageClassName="h-20 sm:h-24 md:h-28 w-auto object-contain"
        fallbackClassName="h-20 sm:h-24 md:h-28 w-auto"
      />

      <div className="mt-3 flex flex-col items-center flex-1 w-full">
        <h3 className="text-sm sm:text-base font-medium text-cream-100 line-clamp-2 leading-tight" title={product.name}>
          {product.name}
        </h3>
        <span className="mt-1 text-base sm:text-lg font-semibold text-gold-400">
          {formatPrice(product.price)} {currency}
        </span>
      </div>

      <div className="mt-2 w-full flex flex-col items-center gap-1">
        <StockBadge stock={product.stock} />
        <p className="text-[10px] sm:text-xs font-medium text-emerald-400/80 truncate w-full px-1" title={shelfShort}>
          {shelfShort}
        </p>
      </div>
    </div>
  )
}
