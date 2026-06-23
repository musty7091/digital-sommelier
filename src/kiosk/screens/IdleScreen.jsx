import { useEffect, useMemo, useState, useRef } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AtmosphereBackground from '../components/AtmosphereBackground'
import CountryFlag from '../components/CountryFlag'
import { COUNTRY_LABELS, LEVEL_LABELS } from '../../types/product.schema'

// Fiyatı tr-TR ondalık biçiminde gösterir: 799.9 -> "799,90"
function formatPrice(price) {
  const numberValue = Number(price)
  if (!Number.isFinite(numberValue)) {
    return String(price ?? '0')
  }
  return numberValue.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const SERVE = {
  red: { temp: '16–18°C', glassTr: 'Büyük balon kadeh', glassEn: 'Large bowl glass' },
  white: { temp: '8–10°C', glassTr: 'Beyaz şarap kadehi', glassEn: 'White wine glass' },
  rose: { temp: '8–10°C', glassTr: 'Roze kadehi', glassEn: 'Rosé glass' },
  sparkling: { temp: '6–8°C', glassTr: 'Flüt kadeh', glassEn: 'Flute glass' },
}
const levelN = (v) => (v === 'intense' ? 3 : v === 'medium' ? 2 : v === 'light' ? 1 : 0)

// Videoların doğru anda başlayıp durması için özel oynatıcı
function AdVideo({ src, isActive, onEnded }) {
  const videoRef = useRef(null)
  
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(e => console.log('Video oynatılamadı:', e))
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isActive])

  return (
    <video 
      ref={videoRef} 
      src={src} 
      muted={true} 
      playsInline 
      onEnded={onEnded} 
      className="w-full h-full object-cover" 
    />
  )
}

export default function IdleScreen() {
  const { products, wakeFromIdle, openDetail, settings, currency } = useFlow()
  const { t, tl, lang } = useLanguage()
  const rotateMs = (settings?.featuredRotationSeconds || 7) * 1000

  // 1. ADIM: Admin panelden gelen Aktif Reklamları kontrol et
  const activeAds = useMemo(() => {
    return (settings?.ads || []).filter(ad => ad.isActive);
  }, [settings?.ads]);

  const isAdMode = activeAds.length > 0;
  const [adIdx, setAdIdx] = useState(0);

  // Reklam Modu Döngüsü (Sadece resimler için süre işler, videolar kendi bitince geçer)
  useEffect(() => {
    if (!isAdMode || activeAds.length === 0) return;

    const currentAd = activeAds[adIdx];
    let timer;

    if (currentAd && currentAd.type === 'image') {
      timer = setTimeout(() => {
        setAdIdx((prev) => (prev + 1) % activeAds.length);
      }, 8000); // Resimler 8 saniye ekranda kalır
    }

    return () => clearTimeout(timer);
  }, [isAdMode, activeAds, adIdx]);

  const handleVideoEnd = () => {
    setAdIdx((prev) => (prev + 1) % activeAds.length);
  };


  // 2. ADIM: Eğer reklam YOKSA çalışacak olan eski Öne Çıkan Şaraplar sistemi
  const featured = useMemo(() => {
    if (isAdMode) return []; // Reklam varsa hesaplama yapma
    const active = products.filter((p) => p.active !== false && p.stock > 0)
    let list = active.filter((p) => p.featured)
    if (!list.length) list = active.filter((p) => p.sommelierPick)
    if (!list.length) list = active
    return [...list].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).slice(0, 8)
  }, [products, isAdMode])

  const [wineIdx, setWineIdx] = useState(0)
  
  useEffect(() => {
    setWineIdx(0)
  }, [featured.length])
  
  useEffect(() => {
    if (isAdMode || featured.length <= 1) return
    const id = setInterval(() => setWineIdx((i) => (i + 1) % featured.length), rotateMs)
    return () => clearInterval(id)
  }, [featured, rotateMs, isAdMode])

  const wine = featured[wineIdx]

  const country = wine && COUNTRY_LABELS[wine.country] ? COUNTRY_LABELS[wine.country][lang] : ''
  const note = wine ? tl(wine.shortDescription) || tl(wine.tasteNotes) : ''
  const pairing = wine ? tl(wine.foodPairing) : ''
  const serve = wine ? SERVE[wine.color] : null
  const serveGlass = serve ? (lang === 'en' ? serve.glassEn : serve.glassTr) : ''

  const axes = []
  if (wine) {
    const add = (key, val) => {
      if (val && LEVEL_LABELS[val]) axes.push({ key, label: t(key), n: levelN(val), val: LEVEL_LABELS[val][lang] })
    }
    add('body', wine.body)
    add('sweetness', wine.sweetness)
    add('acidity', wine.acidity)
    if (wine.color === 'red' || wine.color === 'rose') add('tannin', wine.tannin)
  }

  // --- REKLAM MODU GÖRÜNÜMÜ ---
  if (isAdMode) {
    return (
      <main onClick={wakeFromIdle} className="relative flex h-[100dvh] w-full cursor-pointer overflow-hidden bg-black">
        {activeAds.map((ad, index) => {
          const isActive = index === adIdx;
          return (
            <div 
              key={ad.id} 
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              {ad.type === 'video' ? (
                <AdVideo src={ad.url} isActive={isActive} onEnded={handleVideoEnd} />
              ) : (
                <img 
                  src={ad.url} 
                  alt="Sponsor" 
                  className={`w-full h-full object-cover origin-center ${isActive ? 'animate-kenburns' : ''}`} 
                />
              )}
            </div>
          )
        })}
        {/* Görünmez Tıklama Katmanı */}
        <div className="absolute inset-0 z-50" />
      </main>
    )
  }

  // --- ÖNE ÇIKAN ŞARAPLAR GÖRÜNÜMÜ (ESKİ SİSTEM) ---
  return (
    <main
      onClick={wakeFromIdle}
      className="relative flex h-[100dvh] w-full cursor-pointer flex-col items-center justify-center overflow-hidden px-8"
    >
      <AtmosphereBackground />
      <video
        src="/ambient-wine.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: 'blur(14px) brightness(0.5)', transform: 'scale(1.12)' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(80% 80% at 50% 45%, rgba(10,6,9,0.30) 0%, rgba(10,6,9,0.85) 100%)' }}
      />

      {wine ? (
        <div
          key={wine.barcode}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            openDetail(wine, 'welcome')
          }}
          className="ds-fade-up relative z-10 flex max-w-3xl cursor-pointer flex-col items-center rounded-[2rem] px-6 py-5 text-center transition hover:bg-white/[0.03] active:scale-[0.99]"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.45em] text-gold-500">{t('featuredEyebrow')}</p>

          {wine.sommelierPick && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-500/50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" />
              </svg>
              {t('sommelierPick')}
            </span>
          )}

          <h1
            className="font-serif text-5xl font-semibold leading-tight text-cream-100 md:text-7xl"
            style={{ textShadow: '0 2px 30px rgba(0,0,0,0.6)' }}
          >
            {wine.name}
          </h1>

          <div className="mt-4 flex items-center gap-3 text-cream-200/80">
            {wine.country && <CountryFlag code={wine.country} compact />}
            <span className="text-xl">{[country, wine.region].filter(Boolean).join(' · ')}</span>
          </div>

          {wine.grape && (
            <div className="mt-2 text-sm uppercase tracking-[0.12em] text-cream-200/55">{wine.grape}</div>
          )}

          {note && <p className="mt-4 max-w-xl text-xl leading-relaxed text-cream-200/85">{note}</p>}

          {axes.length > 0 && (
            <div className="mt-6 flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
              {axes.map((a) => (
                <div key={a.key} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-cream-200/55">{a.label}</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-1 w-5 rounded-full ${i < a.n ? 'bg-gold-500' : 'bg-cream-100/15'}`} />
                    ))}
                  </span>
                  <span className="text-sm text-cream-200/85">{a.val}</span>
                </div>
              ))}
            </div>
          )}

          {(pairing || serve) && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-cream-200/75">
              {pairing && (
                <span className="flex items-center gap-2 text-base">
                  <svg className="h-4 w-4 text-gold-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3v7M8 3v7M6.5 10v11M16 3c-1.5 0-2 2-2 5s.5 4 2 4m0 0v9" />
                  </svg>
                  {pairing}
                </span>
              )}
              {serve && (
                <span className="flex items-center gap-2 text-base">
                  <svg className="h-4 w-4 text-gold-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4a2 2 0 0 0-2 2v8a3.5 3.5 0 1 0 4 0V6a2 2 0 0 0-2-2z" />
                  </svg>
                  {serve.temp} · {serveGlass}
                </span>
              )}
            </div>
          )}

          <span className="mt-6 text-4xl font-semibold text-gold-400" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>
            {formatPrice(wine.price)} {currency}
          </span>

          <span className="mt-5 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.28em] text-cream-200/50">
            {t('idleTapView')}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </span>
        </div>
      ) : (
        <h1 className="relative z-10 font-serif text-6xl text-cream-100">{t('title')}</h1>
      )}

      <div className="relative z-10 mt-12 flex flex-col items-center gap-5">
        {featured.length > 1 && (
          <div className="flex gap-2">
            {featured.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === wineIdx ? 'w-6 bg-gold-500' : 'w-1.5 bg-cream-100/25'}`}
              />
            ))}
          </div>
        )}
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-cream-200/65">{t('touchToStart')}</p>
      </div>
    </main>
  )
}