import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import { getPreferenceCount } from '../preference'
import WineBottle from './WineBottle'

const CAP = 30 // marquee'de gösterilecek azami ürün (performans için)

export default function LivePreview({ compact = false }) {
  const { products, selections, openDetail } = useFlow()
  const { t } = useLanguage()

  if (!products.length) return null

  // Seçimlere uyan ürünler — "en çok tercih edilenler" önce (veri yoksa kararlı sıra)
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
          <div className="ds-marquee flex w-max gap-3" style={{ animationDuration: `${duration}s` }}>
            {loop.map((p, i) => (
              <button
                key={`${p.barcode}-${i}`}
                type="button"
                onClick={() => openDetail(p, 'flow')}
                className={`flex flex-none flex-col items-center rounded-2xl px-3 py-1.5 transition hover:bg-charcoal-900/40 active:scale-95 ${
                  compact ? 'w-20' : 'w-28'
                }`}
              >
                <WineBottle color={p.color} className={`w-auto ${compact ? 'h-12' : 'h-20'}`} />
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
