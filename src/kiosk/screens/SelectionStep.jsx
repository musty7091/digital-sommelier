import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import SelectionCard from '../components/SelectionCard'
import LivePreview from '../components/LivePreview'
import BackButton from '../components/BackButton'

export default function SelectionStep() {
  const { products, steps, stepIndex, selections, chooseOption, goBackStep, finishNow, settings } = useFlow()
  const { t, tl, lang } = useLanguage()
  const step = steps[stepIndex]

  if (!step) return null

  const stockOpts = { hideOutOfStock: settings?.hideOutOfStock !== false }
  const currentCount = filterProducts(products, selections, stockOpts).length
  const showExtras = stepIndex >= 1 // tercih şeridi + buton 2. adımdan itibaren

  const n = step.options.length
  const isFour = n === 4
  const isDense = n > 8
  const isMid = n >= 5 && n <= 8
  const compact = isDense || isMid

  // Sabit sütun → satır sayısı kesin → grid şablonu AÇIKÇA verilir (binme imkânsız)
  const cols = isFour ? 2 : isDense ? 4 : isMid ? 3 : Math.min(Math.max(n, 1), 3)
  const rows = Math.ceil(n / cols)
  const maxW = isFour ? 'max-w-3xl' : isMid ? 'max-w-5xl' : isDense ? 'max-w-7xl' : 'max-w-6xl'

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden px-4 md:px-8 py-3 md:py-4">
      {/* Üst çubuk */}
      <div className="flex flex-none items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBackStep}
          className="flex items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-base font-medium text-cream-100 shadow-md transition-all hover:border-gold-500 hover:text-gold-400 hover:bg-charcoal-700"
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

      {/* İçerik */}
      <div className="flex flex-1 min-h-0 w-full flex-col items-center mt-2 md:mt-3">
        <h2 className="flex-none text-center font-serif font-semibold text-cream-100 text-lg sm:text-2xl md:text-3xl">
          {t(`step_${step.key}`)}
        </h2>

        {/* Blok sarmalayıcı (kesin yükseklik) → içinde h-full grid + AÇIK şablon satır/sütun */}
        <div className="w-full flex-1 min-h-0 overflow-hidden my-2 md:my-3">
          <div
            className={`grid h-full w-full mx-auto ${maxW}`}
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              gap: compact ? '0.6rem' : '1rem',
            }}
          >
            {step.options.map((opt, i) => {
              const count = filterProducts(products, { ...selections, [step.key]: opt.value }, stockOpts).length
              const isAny = opt.value === null
              return (
                <SelectionCard
                  key={i}
                  label={tl(opt.label)}
                  count={count}
                  color={step.key === 'color' ? opt.value : undefined}
                  countryCode={step.key === 'country' ? opt.value : undefined}
                  disabled={!isAny && count === 0}
                  compact={compact}
                  onClick={() => chooseOption(step.key, opt.value)}
                />
              )
            })}
          </div>
        </div>

        {showExtras && (
          <div className="flex-none w-full flex flex-col items-center gap-2 md:gap-3">
            <div className="w-full flex flex-col items-center">
              <h3 className="text-[10px] md:text-xs font-semibold text-gold-500 mb-1 uppercase tracking-[0.2em]">
                {lang === 'en' ? 'Most Preferred' : 'En Çok Tercih Edilenler'}
              </h3>
              <LivePreview compact={compact} />
            </div>
            <button
              type="button"
              onClick={finishNow}
              className="rounded-full border border-gold-500/70 bg-wine-800 px-7 md:px-10 py-2 md:py-2.5 text-sm md:text-lg font-semibold text-cream-100 shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition hover:bg-wine-700 w-full sm:w-auto"
            >
              {t('showResults')} ({currentCount})
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
