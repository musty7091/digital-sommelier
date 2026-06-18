import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import WineBottle from './WineBottle'

export default function LivePreview() {
  const { products, selections } = useFlow()
  const { t } = useLanguage()
  if (!products.length) return null
  const matches = filterProducts(products, selections)
  return (
    <div className="mt-8 w-full max-w-4xl">
      <p className="mb-4 text-center text-sm text-cream-200/50">
        {matches.length} {t('matchCount')}
      </p>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">
        {matches.slice(0, 7).map((p) => (
          <div key={p.barcode} className="flex w-20 flex-col items-center">
            <WineBottle color={p.color} className="h-16 w-auto" />
            <span className="mt-1 line-clamp-2 text-center text-[11px] leading-tight text-cream-200/70">
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
