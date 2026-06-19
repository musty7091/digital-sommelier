import { LanguageProvider, useLanguage } from '../i18n/LanguageContext'
import { FlowProvider, useFlow } from './state/FlowContext'
import WelcomeScreen from './screens/WelcomeScreen'
import SelectionStep from './screens/SelectionStep'
import ResultScreen from './screens/ResultScreen'
import DetailScreen from './screens/DetailScreen'

function Centered({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 md:px-8 text-center text-base md:text-lg text-cream-200">
      {children}
    </main>
  )
}

function KioskScreens() {
  const { phase, loading, error } = useFlow()
  const { t } = useLanguage()
  if (error) return <Centered>{t('errorLoad')}</Centered>
  if (phase === 'welcome') return <WelcomeScreen />
  if (loading) return <Centered>{t('loading')}</Centered>
  if (phase === 'flow') return <SelectionStep />
  if (phase === 'results') return <ResultScreen />
  if (phase === 'detail') return <DetailScreen />
  return <WelcomeScreen />
}

export default function KioskApp() {
  return (
    <LanguageProvider>
      <FlowProvider>
        <KioskScreens />
      </FlowProvider>
    </LanguageProvider>
  )
}