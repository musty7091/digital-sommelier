import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AtmosphereBackground from '../components/AtmosphereBackground'

export default function WelcomeScreen() {
  const { startFlow, quickRecommend } = useFlow()
  const { lang, setLang, t } = useLanguage()

  const toggleBtn = (code, label) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      className={`rounded-full px-6 py-2 text-sm font-medium tracking-wide transition ${
        lang === code ? 'bg-wine-800 text-cream-100' : 'text-cream-200/60 hover:text-cream-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-8 text-center">
      <AtmosphereBackground />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="ds-fade-up mb-12 inline-flex rounded-full border border-charcoal-700/80 bg-ink-950/40 p-1 backdrop-blur"
          style={{ animationDelay: '0.1s' }}
        >
          {toggleBtn('tr', 'Türkçe')}
          {toggleBtn('en', 'English')}
        </div>

        <p
          className="ds-fade-up mb-6 text-sm uppercase tracking-[0.45em] text-gold-500"
          style={{ animationDelay: '0.25s' }}
        >
          {t('brand')}
        </p>

        <div className="ds-fade-up" style={{ animationDelay: '0.35s' }}>
          <h1 className="ds-shimmer bg-gradient-to-r from-gold-500 via-cream-100 to-gold-500 bg-clip-text font-serif text-7xl font-semibold leading-none text-transparent md:text-8xl">
            {t('title')}
          </h1>
        </div>

        <div
          className="ds-fade-up mt-8 h-px w-44 bg-gradient-to-r from-transparent via-gold-500/70 to-transparent"
          style={{ animationDelay: '0.5s' }}
        />

        <p
          className="ds-fade-up mt-8 max-w-xl text-lg text-cream-200/90"
          style={{ animationDelay: '0.6s' }}
        >
          {t('tagline')}
        </p>

        <div
          className="ds-fade-up mt-12 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: '0.75s' }}
        >
          <button
            type="button"
            onClick={startFlow}
            className="rounded-full border border-gold-500/60 bg-wine-800 px-12 py-4 text-lg font-medium text-cream-100 shadow-[0_0_30px_rgba(122,36,52,0.5)] transition hover:bg-wine-700 hover:shadow-[0_0_45px_rgba(200,169,81,0.35)]"
          >
            {t('start')}
          </button>
          <button
            type="button"
            onClick={quickRecommend}
            className="rounded-full border border-gold-500/40 px-12 py-4 text-lg font-medium text-gold-400 transition hover:border-gold-500"
          >
            {t('quick')}
          </button>
        </div>
      </div>
    </main>
  )
}
