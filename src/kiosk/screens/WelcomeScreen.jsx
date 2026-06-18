import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'

export default function WelcomeScreen() {
  const { startFlow, quickRecommend } = useFlow()
  const { lang, setLang, t } = useLanguage()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      {/* Dil seçimi — karşılama ekranında her zaman görünür */}
      <div className="mb-12 inline-flex rounded-full border border-charcoal-700 p-1">
        <button
          type="button"
          onClick={() => setLang('tr')}
          aria-pressed={lang === 'tr'}
          className={`rounded-full px-6 py-2 text-sm font-medium tracking-wide transition ${
            lang === 'tr' ? 'bg-wine-800 text-cream-100' : 'text-cream-200/60 hover:text-cream-100'
          }`}
        >
          Türkçe
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={`rounded-full px-6 py-2 text-sm font-medium tracking-wide transition ${
            lang === 'en' ? 'bg-wine-800 text-cream-100' : 'text-cream-200/60 hover:text-cream-100'
          }`}
        >
          English
        </button>
      </div>

      <p className="mb-6 text-sm uppercase tracking-[0.3em] text-gold-500">{t('brand')}</p>

      <h1 className="font-serif text-6xl font-semibold leading-none text-cream-100 md:text-7xl">
        {t('title')}
      </h1>

      <p className="mt-6 max-w-xl text-lg text-cream-200">{t('tagline')}</p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={startFlow}
          className="rounded-full border border-gold-500/60 bg-wine-800 px-10 py-4 text-lg font-medium text-cream-100 transition hover:bg-wine-700"
        >
          {t('start')}
        </button>
        <button
          type="button"
          onClick={quickRecommend}
          className="rounded-full border border-gold-500/40 px-10 py-4 text-lg font-medium text-gold-400 transition hover:border-gold-500"
        >
          {t('quick')}
        </button>
      </div>
    </main>
  )
}
