import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { filterProducts } from '../recommendation'
import SelectionCard from '../components/SelectionCard'
import LivePreview from '../components/LivePreview'
import BackButton from '../components/BackButton'

export default function SelectionStep() {
  const { products, steps, stepIndex, selections, chooseOption, goBackStep, finishNow } = useFlow()
  const { t, tl } = useLanguage()
  const step = steps[stepIndex]

  if (!step) return null

  const currentCount = filterProducts(products, selections).length
  const isDenseStep = step.options.length > 6

  return (
    <main className="flex h-screen flex-col overflow-hidden px-8 py-5">
      <div className="flex flex-none items-center justify-between">
        <button
          type="button"
          onClick={goBackStep}
          className="rounded-full px-4 py-2 text-base font-medium text-cream-200/70 transition hover:bg-cream-100/5 hover:text-cream-100"
        >
          ← {t('prev')}
        </button>

        <span className="rounded-full border border-charcoal-700/80 px-4 py-2 text-sm uppercase tracking-widest text-cream-200/50">
          {stepIndex + 1} / {steps.length}
        </span>

        <BackButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <h2
          className={`text-center font-serif font-semibold text-cream-100 ${
            isDenseStep
              ? 'mb-6 text-4xl xl:text-5xl'
              : 'mb-10 text-5xl xl:text-6xl'
          }`}
        >
          {t(`step_${step.key}`)}
        </h2>

        <div
          className={`grid w-full ${
            isDenseStep
              ? 'max-w-7xl grid-cols-5 gap-4'
              : 'max-w-7xl grid-cols-2 gap-6 lg:grid-cols-3 xl:gap-8'
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
                disabled={!isAny && count === 0}
                compact={isDenseStep}
                onClick={() => chooseOption(step.key, opt.value)}
              />
            )
          })}
        </div>

        <LivePreview compact={isDenseStep} />

        <button
          type="button"
          onClick={finishNow}
          className={`rounded-full border border-gold-500/70 bg-wine-800 font-semibold text-cream-100 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:bg-wine-700 ${
            isDenseStep
              ? 'mt-5 px-9 py-3 text-lg'
              : 'mt-9 px-12 py-5 text-xl'
          }`}
        >
          {t('showResults')} ({currentCount})
        </button>
      </div>
    </main>
  )
}