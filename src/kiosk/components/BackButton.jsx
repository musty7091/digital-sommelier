import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'

export default function BackButton() {
  const { reset } = useFlow()
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={reset}
      className="rounded-full border border-charcoal-700 px-5 py-2 text-sm font-medium text-cream-200/70 transition hover:border-gold-500/60 hover:text-cream-100"
    >
      ↺ {t('backToStart')}
    </button>
  )
}
