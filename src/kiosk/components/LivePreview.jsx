import { useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import { getPreferenceCount } from '../preference'
import WineBottle from './WineBottle'
import { getLocalProductImagePath, getProductImageAlt } from '../../shared/productImage'

const CAP = 30 // marquee'de gösterilecek azami ürün (performans için)

function PreviewProductImage({ product, compact }) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageSrc = getLocalProductImagePath(product)

  const imageClassName = `w-auto object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110 ${
    compact ? 'h-12' : 'h-20'
  }`

  const fallbackClassName = `w-auto drop-shadow-lg transition-transform duration-300 group-hover:scale-110 ${
    compact ? 'h-12' : 'h-20'
  }`

  if (!imageSrc || hasImageError) {
    return (
      <WineBottle
        color={product?.color}
        className={fallbackClassName}
      />
    )
  }

  return (
    <img
      src={imageSrc}
      alt={getProductImageAlt(product)}
      className={imageClassName}
      loading="lazy"
      onError={() => setHasImageError(true)}
    />
  )
}

export default function LivePreview({ compact = false }) {
  const { products, selections, openDetail } = useFlow()
  const { t } = useLanguage()

  if (!products.length) return null

  // Seçimlere uyan ürünler — "en çok tercih edilenler" önce
  const matches = filterProducts(products, selections)
    .slice()
    .sort((a, b) => getPreferenceCount(b) - getPreferenceCount(a))

  const sample = matches.slice(0, CAP)

  // Şeridi ekranı dolduracak kadar tekrarla, sonra kesintisiz döngü için ikiye katla
  let unit = sample
  if (sample.length > 0) {
    const reps = Math.ceil(16 / sample.length)
    unit = Array.from({ length: reps }, () => sample).flat()
  }

  const loop = [...unit, ...unit]
  const duration = Math.max(16, unit.length * 2.6) // saniye — sabit hız hissi

  return (
    <div className={`w-full ${compact ? 'mt-2' : 'mt-4'}`}>
      <p
        className={`text-center font-medium text-cream-200/55 ${
          compact ? 'mb-1.5 text-sm' : 'mb-3 text-base'
        }`}
      >
        {matches.length} {t('matchCount')}
      </p>

      {sample.length > 0 && (
        <div className="ds-marquee-mask relative w-full overflow-hidden">
          <div
            className="ds-marquee flex w-max gap-3"
            style={{ animationDuration: `${duration}s` }}
          >
            {loop.map((p, i) => (
              <button
                key={`${p.barcode}-${i}`}
                type="button"
                onClick={() => openDetail(p, 'flow')}
                className={`group flex flex-none flex-col items-center rounded-2xl px-3 py-1.5 transition hover:bg-ink-950/40 active:scale-95 ${
                  compact ? 'w-20' : 'w-28'
                }`}
              >
                <PreviewProductImage product={p} compact={compact} />

                <span
                  className={`mt-1 line-clamp-1 w-full text-center font-medium leading-tight text-cream-200/70 ${
                    compact ? 'text-[10px]' : 'text-xs'
                  }`}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}