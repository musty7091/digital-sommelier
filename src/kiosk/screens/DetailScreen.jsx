import { useEffect, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { COUNTRY_LABELS, LEVEL_LABELS } from '../../types/product.schema'
import WineBottle from '../components/WineBottle'
import BackButton from '../components/BackButton'
import StoreMap3D from '../components/StoreMap3D'
import { getLocalProductImagePath, getProductImageAlt } from '../../shared/productImage'

function cleanText(value) {
  if (value === null || value === undefined) return ''

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim()
  }

  return ''
}

function extractText(value, lang = 'tr', fallbackLang = 'tr', visited = new WeakSet()) {
  if (value === null || value === undefined) return ''

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return cleanText(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item, lang, fallbackLang, visited))
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value !== 'object') return ''

  if (visited.has(value)) return ''
  visited.add(value)

  const langText = cleanText(lang)
  const langLower = langText.toLowerCase()
  const langUpper = langText.toUpperCase()

  const fallbackText = cleanText(fallbackLang)
  const fallbackLower = fallbackText.toLowerCase()
  const fallbackUpper = fallbackText.toUpperCase()

  const preferredCandidates = [
    value[lang],
    value[langLower],
    value[langUpper],

    value[fallbackLang],
    value[fallbackLower],
    value[fallbackUpper],

    value.tr,
    value.TR,
    value.en,
    value.EN,

    value.text,
    value.value,
    value.description,
    value.content,
    value.label,
    value.name,
  ]

  for (const candidate of preferredCandidates) {
    const text = extractText(candidate, lang, fallbackLang, visited)

    if (text) return text
  }

  for (const candidate of Object.values(value)) {
    const text = extractText(candidate, lang, fallbackLang, visited)

    if (text) return text
  }

  return ''
}

function getLocalizedText(value, lang, fallbackLang = 'tr') {
  if (lang === 'en') {
    return (
      extractText(value, 'en', fallbackLang) ||
      extractText(value, 'tr', fallbackLang)
    )
  }

  return (
    extractText(value, 'tr', fallbackLang) ||
    extractText(value, 'en', fallbackLang)
  )
}

function getProductDescription(product, lang) {
  if (!product) return ''

  if (lang === 'en') {
    return (
      getLocalizedText(product.shortDescription, 'en') ||
      getLocalizedText(product.descriptionEn, 'en') ||
      getLocalizedText(product.description, 'en') ||
      getLocalizedText(product.descriptionTr, 'tr')
    )
  }

  return (
    getLocalizedText(product.shortDescription, 'tr') ||
    getLocalizedText(product.descriptionTr, 'tr') ||
    getLocalizedText(product.description, 'tr') ||
    getLocalizedText(product.descriptionEn, 'en')
  )
}

function normalizeLevel(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['light', 'low', 'hafif', 'az', 'düşük', 'dusuk'].includes(text)) {
    return 'light'
  }

  if (['medium', 'orta', 'dengeli'].includes(text)) {
    return 'medium'
  }

  if (
    [
      'intense',
      'full',
      'full_bodied',
      'full bodied',
      'heavy',
      'high',
      'strong',
      'yoğun',
      'yogun',
      'yüksek',
      'yuksek',
      'güçlü',
      'guclu',
    ].includes(text)
  ) {
    return 'intense'
  }

  return text
}

function getLevelLabel(value, lang) {
  const key = normalizeLevel(value)

  if (!key) return ''

  return LEVEL_LABELS[key]?.[lang] || LEVEL_LABELS[key]?.tr || cleanText(value)
}

function getCountryLabel(country, lang) {
  const key = cleanText(country)

  if (!key) return ''

  return COUNTRY_LABELS[key]?.[lang] || COUNTRY_LABELS[key]?.tr || key
}

function formatPrice(price) {
  const numberValue = Number(price)

  if (!Number.isFinite(numberValue)) {
    return cleanText(price) || '0'
  }

  return numberValue.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getShelfText(product, lang) {
  const block = cleanText(product?.block)
  const shelf = cleanText(product?.shelf)

  if (!block && !shelf) return ''

  if (lang === 'en') {
    return [
      block ? `Block ${block}` : '',
      shelf ? `Shelf ${shelf}` : '',
    ]
      .filter(Boolean)
      .join(', ')
  }

  return [
    block ? `${block} Blok` : '',
    shelf ? `${shelf}. raf` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function LocalProductImage({ product, imageClassName, fallbackClassName }) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageSrc = getLocalProductImagePath(product)
  const productKey = product?.barcode || product?.id || ''

  useEffect(() => {
    setHasImageError(false)
  }, [productKey])

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

export default function DetailScreen() {
  const { detailProduct, closeDetail, currency } = useFlow()
  const { t, lang } = useLanguage()
  const [showMap, setShowMap] = useState(false)

  if (!detailProduct) return null

  const product = detailProduct

  const country = getCountryLabel(product.country, lang)
  const shelfText = getShelfText(product, lang)
  const hasLocation = Boolean(product.block && (product.shelf || product.shelf === 0))
  const description = getProductDescription(product, lang)

  const tasteNotes = getLocalizedText(product.tasteNotes, lang)
  const foodPairing = getLocalizedText(product.foodPairing, lang)
  const whyText = getLocalizedText(product._why, lang)

  const stock = Number(product.stock || 0)

  const renderLevel = (labelKey, value) => {
    const label = getLevelLabel(value, lang)

    if (!label) return null

    return (
      <div className="flex flex-col items-center rounded-lg border border-charcoal-700/50 bg-charcoal-800/30 py-2 md:py-3">
        <span className="text-[10px] uppercase tracking-widest text-cream-200/60">
          {t(labelKey)}
        </span>

        <span className="mt-1 text-xs md:text-sm font-medium text-cream-100">
          {label}
        </span>
      </div>
    )
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden px-4 md:px-8 py-4 md:py-6">
      {showMap && (
        <StoreMap3D
          block={product.block}
          shelf={product.shelf}
          productName={product.name}
          onClose={() => setShowMap(false)}
        />
      )}
      <div className="flex flex-none flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <button
          type="button"
          onClick={closeDetail}
          className="flex items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-4 md:px-6 py-2 md:py-3 text-xs md:text-base font-medium text-cream-100 shadow-md transition-all hover:border-gold-500 hover:text-gold-400 hover:bg-charcoal-700"
        >
          <svg
            className="h-4 w-4 md:h-5 md:w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>

          {t('back')}
        </button>

        <BackButton />
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden pb-2">
        <div className="relative flex w-full h-full max-h-[85vh] max-w-6xl flex-col md:flex-row items-center gap-6 md:gap-10 rounded-3xl border border-gold-500/20 bg-charcoal-800/40 p-4 md:p-8 shadow-2xl overflow-y-auto custom-scrollbar md:overflow-hidden">
          <div className="flex w-full md:w-[44%] shrink-0 items-center justify-center h-56 md:h-full overflow-hidden">
            <LocalProductImage
              product={product}
              imageClassName="h-full w-full max-h-[40vh] md:max-h-[74vh] object-cover object-center drop-shadow-2xl"
              fallbackClassName="h-full w-auto max-h-[40vh] md:max-h-[60vh] object-contain drop-shadow-2xl"
            />
          </div>

          <div className="flex flex-col justify-center text-left w-full md:w-3/5 md:h-full md:overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <h1 className="font-serif text-2xl md:text-4xl font-semibold text-cream-100 leading-tight">
              {product.name}
            </h1>

            <p className="mt-1 md:mt-2 text-xs md:text-sm text-cream-200/60">
              {[product.brand, country, product.region].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-4 md:mt-6 flex items-center gap-3 md:gap-4">
              <span className="text-xl md:text-3xl font-bold text-gold-400">
                {formatPrice(product.price)} {currency}
              </span>

              {stock > 0 ? (
                <span className="rounded-full border border-gold-500/50 bg-gold-900/20 px-2 py-1 text-[10px] md:text-xs font-medium text-gold-400">
                  {lang === 'en' ? 'In Stock' : 'Stokta Var'}
                </span>
              ) : (
                <span className="rounded-full border border-red-500/50 bg-red-900/20 px-2 py-1 text-[10px] md:text-xs font-medium text-red-400">
                  {lang === 'en' ? 'Out of Stock' : 'Tükendi'}
                </span>
              )}
            </div>

            {shelfText && (
              <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-center gap-2 text-sm md:text-lg font-semibold text-emerald-400">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
                    <circle cx="12" cy="11" r="2" />
                  </svg>
                  {shelfText}
                </span>
                {hasLocation && (
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="rounded-full border border-gold-500/60 bg-gold-500/10 px-4 py-1.5 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/20 hover:border-gold-500"
                  >
                    {lang === 'en' ? 'Show location' : 'Yerini Göster'}
                  </button>
                )}
              </div>
            )}

            {description && (
              <p className="mt-4 md:mt-6 font-serif text-base md:text-lg italic text-cream-100/90 leading-snug">
                {description}
              </p>
            )}

            <div className="mt-5 md:mt-8 grid grid-cols-4 gap-2 md:gap-3">
              {renderLevel('body', product.body)}
              {renderLevel('sweetness', product.sweetness)}
              {renderLevel('acidity', product.acidity)}
              {renderLevel('tannin', product.tannin)}
            </div>

            <div className="mt-5 md:mt-8 space-y-2 text-xs md:text-sm">
              {tasteNotes && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">
                    {t('tasteNotes')}:
                  </span>

                  <span className="text-cream-200">{tasteNotes}</span>
                </div>
              )}

              {foodPairing && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">
                    {t('foodPairing')}:
                  </span>

                  <span className="text-cream-200">{foodPairing}</span>
                </div>
              )}

              {product.grape && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">
                    {t('grape')}:
                  </span>

                  <span className="text-cream-200">{product.grape}</span>
                </div>
              )}
            </div>

            {whyText && (
              <div className="mt-6 mb-2 rounded-xl border border-charcoal-700 bg-ink-950/50 p-3 md:p-4">
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gold-500">
                  {t('why')}
                </p>

                <p className="mt-1 md:mt-2 text-xs md:text-sm text-cream-200 leading-relaxed">
                  {whyText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}