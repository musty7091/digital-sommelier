import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AtmosphereBackground from '../components/AtmosphereBackground'

// Bakım modu: settings.maintenanceMode true iken tüm kiosk yerine bu ekran gösterilir.
export default function MaintenanceScreen() {
  const { settings } = useFlow()
  const { lang, t } = useLanguage()
  const msg =
    settings?.maintenanceMessage?.[lang] ||
    settings?.maintenanceMessage?.tr ||
    t('maintenanceText')

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <AtmosphereBackground />

      <div className="relative z-10 flex max-w-2xl flex-col items-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-gold-500/30 bg-charcoal-800/50">
          <svg className="h-12 w-12 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10l-1 7a4 4 0 0 1-8 0L7 4Z" />
            <path d="M5 4h14" />
          </svg>
        </div>

        <h1 className="font-serif text-4xl font-semibold text-cream-100 md:text-6xl">
          {t('maintenanceTitle')}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-cream-200/75 md:text-2xl">{msg}</p>

        <p className="mt-12 text-sm uppercase tracking-[0.4em] text-gold-500/70">Ertan Market</p>
      </div>
    </main>
  )
}
