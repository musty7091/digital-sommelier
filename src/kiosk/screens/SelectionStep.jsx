import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import SelectionCard from '../components/SelectionCard'
import LivePreview from '../components/LivePreview'
import BackButton from '../components/BackButton'

export default function SelectionStep() {
  const { products, steps, stepIndex, selections, chooseOption, goBackStep, finishNow } = useFlow()
  const { t, tl, lang } = useLanguage()
  const step = steps[stepIndex]

  if (!step) return null

  const currentCount = filterProducts(products, selections).length
  const isDenseStep = step.options.length > 6
  // Eğer tam 4 seçenek varsa (birinci ekran gibi) simetrik 2x2 dizilim uygula
  const isFourItems = step.options.length === 4 

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden px-4 md:px-8 py-4">
      {/* Üst Yönlendirme Çubuğu (Sabit) */}
      <div className="flex flex-none items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBackStep}
          className="flex items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-4 md:px-6 py-2 md:py-3 text-xs md:text-base font-medium text-cream-100 shadow-md transition-all hover:border-gold-500 hover:text-gold-400 hover:bg-charcoal-700"
        >
          <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('prev')}
        </button>

        <span className="rounded-full border border-charcoal-700/80 bg-ink-950/50 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base font-medium uppercase tracking-widest text-cream-200">
          {stepIndex + 1} / {steps.length}
        </span>

        <BackButton />
      </div>

      {/* Ana İçerik (Ekrana sığacak şekilde sıkışır) */}
      <div className="flex flex-1 flex-col items-center justify-between min-h-0 w-full mt-3 md:mt-4 pb-2">
        <h2 className="flex-none text-center font-serif font-semibold text-cream-100 text-xl sm:text-3xl md:text-4xl">
          {t(`step_${step.key}`)}
        </h2>

        {/* Esnek Izgara Yapısı */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center my-3 md:my-4 overflow-hidden">
          <div
            className={`grid w-full h-full max-h-[60vh] md:max-h-[65vh] mx-auto ${
              isDenseStep
                ? 'max-w-7xl grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4'
                : isFourItems
                ? 'max-w-3xl grid-cols-2 gap-4 md:gap-6' // 4 seçenek için özel 2x2 kare dizilim
                : 'max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6'
            }`}
          >
            {step.options.map((opt, i) => {
              const count = filterProducts(products, { ...selections, [step.key]: opt.value }).length
              const isAny = opt.value === null

              return (
                <SelectionCard
                  key={i}
                  label={tl(opt.label)}
                  count={count}
                  color={step.key === 'color' ? opt.value : undefined}
                  countryCode={step.key === 'country' ? opt.value : undefined}
                  disabled={!isAny && count === 0}
                  compact={isDenseStep}
                  onClick={() => chooseOption(step.key, opt.value)}
                />
              )
            })}
          </div>
        </div>

        {/* Alt Kısım (Canlı Önizleme ve Buton) */}
        <div className="flex-none w-full flex flex-col items-center gap-3 md:gap-4">
          <div className="w-full flex flex-col items-center">
            {/* Şişelerin Üzerindeki Yeni Başlık */}
            <h3 className="text-[10px] md:text-xs font-semibold text-gold-500 mb-1.5 md:mb-2 uppercase tracking-[0.2em]">
              {lang === 'en' ? 'Most Preferred' : 'En Çok Tercih Edilenler'}
            </h3>
            <LivePreview compact={isDenseStep} />
          </div>
          <button
            type="button"
            onClick={finishNow}
            className={`rounded-full border border-gold-500/70 bg-wine-800 font-semibold text-cream-100 shadow-[0_15px_35px_rgba(0,0,0,0.3)] transition hover:bg-wine-700 w-full sm:w-auto ${
              isDenseStep ? 'px-6 md:px-9 py-2.5 md:py-3 text-sm md:text-lg' : 'px-8 md:px-12 py-3 md:py-4 text-base md:text-xl'
            }`}
          >
            {t('showResults')} ({currentCount})
          </button>
        </div>
      </div>
    </main>
  )
}