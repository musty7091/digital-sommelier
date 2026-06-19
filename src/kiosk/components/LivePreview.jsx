import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import WineBottle from './WineBottle'

export default function LivePreview({ compact = false }) {
  const { products, selections } = useFlow()
  const { t } = useLanguage()

  if (!products.length) return null

  const matches = filterProducts(products, selections)
  const previewItems = compact ? matches.slice(0, 5) : matches.slice(0, 7)

  return (
    <div className={`w-full max-w-6xl ${compact ? 'mt-5' : 'mt-9'}`}>
      <p
        className={`text-center font-medium text-cream-200/55 ${
          compact ? 'mb-2 text-sm' : 'mb-5 text-lg'
        }`}
      >
        {matches.length} {t('matchCount')}
      </p>

      <div
        className={`flex flex-wrap justify-center ${
          compact ? 'gap-x-5 gap-y-2' : 'gap-x-8 gap-y-5'
        }`}
      >
        {previewItems.map((p) => (
          <div
            key={p.barcode}
            className={`flex flex-col items-center rounded-2xl border border-transparent transition hover:border-charcoal-700/80 hover:bg-charcoal-900/30 ${
              compact ? 'w-24 px-2 py-1' : 'w-32 px-3 py-2'
            }`}
          >
            <WineBottle
              color={p.color}
              className={`w-auto ${compact ? 'h-14' : 'h-24'}`}
            />

            <span
              className={`mt-1 line-clamp-2 text-center font-medium leading-tight text-cream-200/75 ${
                compact ? 'text-[11px]' : 'text-sm'
              }`}
            >
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}