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

  return (
    <main className="flex min-h-screen flex-col px-8 py-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBackStep}
          className="text-sm text-cream-200/60 transition hover:text-cream-100"
        >
          ← {t('prev')}
        </button>
        <span className="text-xs uppercase tracking-widest text-cream-200/40">
          {stepIndex + 1} / {steps.length}
        </span>
        <BackButton />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <h2 className="mb-10 text-center font-serif text-4xl font-semibold text-cream-100">
          {t(`step_${step.key}`)}
        </h2>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
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
                onClick={() => chooseOption(step.key, opt.value)}
              />
            )
          })}
        </div>

        <LivePreview />

        <button
          type="button"
          onClick={finishNow}
          className="mt-8 rounded-full border border-gold-500/60 bg-wine-800 px-8 py-3 text-base font-medium text-cream-100 transition hover:bg-wine-700"
        >
          {t('showResults')} ({currentCount})
        </button>
      </div>
    </main>
  )
}
