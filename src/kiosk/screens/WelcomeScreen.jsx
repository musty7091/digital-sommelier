import { useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import VoiceSearch from '../components/VoiceSearch'
import AtmosphereBackground from '../components/AtmosphereBackground'

export default function WelcomeScreen() {
  const { startFlow, startScan, settings } = useFlow()
  const { lang, setLang, t, enabledLangs } = useLanguage()
  const [showVoice, setShowVoice] = useState(false)
  const langLabels = { tr: 'Türkçe', en: 'English', ru: 'Русский' }

  const toggleBtn = (code, label) => (
    <button
      key={code}
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      className={`rounded-full px-6 py-3 text-sm md:text-base font-medium tracking-wide transition-all ${
        lang === code ? 'bg-wine-800 text-cream-100 shadow-lg' : 'text-cream-200/60 hover:text-cream-100 hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )

  // Dil dosyasından gelen başlıkları kontrol edip en mantıklı olanı devasa puntolarla yazdırıyoruz
  const mainText = t('title') && t('title').trim() !== '' ? t('title') : t('tagline');
  const subText = t('title') && t('title').trim() !== '' ? t('tagline') : '';

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 md:px-12 py-10 text-center">
      <AtmosphereBackground />

      {/* Dil Seçimi - Ekranın En Üstünde Sabit */}
      <div className="absolute top-8 md:top-12 z-20 flex gap-2 rounded-full border border-charcoal-700/80 bg-ink-950/60 p-1.5 backdrop-blur-md ds-fade-up">
        {enabledLangs.map((code) => toggleBtn(code, langLabels[code] || code.toUpperCase()))}
      </div>

      {/* Ana İçerik */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-6xl mx-auto h-full gap-10 md:gap-16">
        
        <div className="flex flex-col items-center justify-center w-full mt-10 md:mt-0">
          <p className="ds-fade-up mb-6 md:mb-10 text-base sm:text-lg md:text-2xl uppercase tracking-[0.4em] md:tracking-[0.6em] text-gold-500 font-medium" style={{ animationDelay: '0.2s' }}>
            {t('brand')}
          </p>

          <h1 className="ds-fade-up font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold leading-tight text-cream-100 drop-shadow-2xl px-4" style={{ animationDelay: '0.3s' }}>
            {mainText}
          </h1>

          {subText && (
             <p className="ds-fade-up mt-8 max-w-4xl text-xl md:text-3xl text-cream-200/90 px-4 font-light leading-relaxed" style={{ animationDelay: '0.4s' }}>
              {subText}
            </p>
          )}
          
          <div className="ds-fade-up mt-10 md:mt-14 h-1 w-32 md:w-64 rounded-full bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Butonlar - Alt Kısımda Büyük ve Belirgin */}
        <div className="ds-fade-up mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-6" style={{ animationDelay: '0.6s' }}>
          <button
            type="button"
            onClick={startFlow}
            className="w-full sm:w-auto rounded-full border border-gold-500/60 bg-wine-800 px-10 md:px-16 py-5 md:py-6 text-xl md:text-2xl lg:text-3xl font-medium text-cream-100 shadow-[0_0_40px_rgba(122,36,52,0.6)] transition-all hover:bg-wine-700 hover:shadow-[0_0_60px_rgba(200,169,81,0.5)] hover:-translate-y-2"
          >
            {t('start')}
          </button>
          {settings?.scanEnabled !== false && (
            <button
              type="button"
              onClick={startScan}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full border-2 border-gold-500/40 px-10 md:px-16 py-5 md:py-6 text-xl md:text-2xl lg:text-3xl font-medium text-gold-400 transition-all hover:border-gold-500 hover:bg-gold-500/15 hover:-translate-y-2"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" />
              </svg>
              {t('scanButton')}
            </button>
          )}
          {settings?.voiceSearchEnabled !== false && (
            <button
              type="button"
              onClick={() => setShowVoice(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full border-2 border-gold-500/40 px-10 md:px-16 py-5 md:py-6 text-xl md:text-2xl lg:text-3xl font-medium text-gold-400 transition-all hover:border-gold-500 hover:bg-gold-500/15 hover:-translate-y-2"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              Sesli Ara
            </button>
          )}
        </div>
        
      </div>

      {showVoice && <VoiceSearch onClose={() => setShowVoice(false)} />}
    </main>
  )
}