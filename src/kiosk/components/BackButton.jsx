import { useLanguage } from '../../i18n/LanguageContext'

export default function BackButton() {
  const { lang } = useLanguage()

  const handleRestart = () => {
    // Kiosk ekranları için en güvenli sıfırlama yöntemi:
    // Tüm state'leri temizler, belleği rahatlatır ve ana ekrana döner.
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={handleRestart}
      className="flex items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-base font-medium text-cream-100 shadow-md transition-all hover:border-gold-500 hover:text-gold-400 hover:bg-charcoal-700"
    >
      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {lang === 'en' ? 'Start Over' : 'Başa Dön'}
    </button>
  )
}