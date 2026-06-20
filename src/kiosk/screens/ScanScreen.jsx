import { useEffect, useRef, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { fetchProduct } from '../../firebase/products'
import AtmosphereBackground from '../components/AtmosphereBackground'

// Ürün Okut ekranı. Barkod okuyucu (klavye gibi davranır) hızlı tuş dizisi
// + Enter gönderir; bunu yakalayıp barkodu Firestore'da buluruz.
export default function ScanScreen() {
  const { products, openDetail, reset } = useFlow()
  const { t } = useLanguage()
  const [status, setStatus] = useState('idle') // idle | searching | notfound
  const [lastCode, setLastCode] = useState('')

  const bufferRef = useRef('')
  const lastTimeRef = useRef(0)
  const lockRef = useRef(false)

  const handleScan = async (raw) => {
    const barcode = String(raw).trim()
    if (!barcode || lockRef.current) return
    lockRef.current = true
    setLastCode(barcode)
    setStatus('searching')

    let found =
      products.find((p) => String(p.barcode) === barcode || p.id === barcode) || null
    if (!found) {
      try {
        found = await fetchProduct(barcode)
      } catch {
        found = null
      }
    }

    if (found) {
      openDetail(found, 'scan')
    } else {
      setStatus('notfound')
    }
    lockRef.current = false
  }

  useEffect(() => {
    const onKey = (e) => {
      const now = Date.now()
      if (now - lastTimeRef.current > 120) bufferRef.current = '' // yavaş giriş -> sıfırla
      lastTimeRef.current = now

      if (e.key === 'Enter') {
        const code = bufferRef.current
        bufferRef.current = ''
        if (code.length >= 3) handleScan(code)
        return
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key
        if (status === 'notfound') setStatus('idle')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, status])

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <AtmosphereBackground />

      <div className="relative z-10 flex flex-col items-center">
        {/* Barkod görseli + tarama çizgisi */}
        <div className="relative mb-10 flex h-40 w-72 items-center justify-center overflow-hidden rounded-2xl border border-gold-500/25 bg-charcoal-800/40">
          <svg className="h-24 w-56 text-cream-100/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 5v14M6 5v14M9 5v14M11.5 5v14M14 5v14M16.5 5v14M19 5v14M21 5v14" />
          </svg>
          <div className="ds-scanline pointer-events-none absolute left-4 right-4 h-0.5 bg-gold-400 shadow-[0_0_12px_rgba(200,169,81,0.9)]" />
        </div>

        <h1 className="font-serif text-4xl font-semibold text-cream-100 md:text-5xl">{t('scanTitle')}</h1>
        <p className="mt-4 text-lg text-cream-200/70">{t('scanHint')}</p>

        <div className="mt-6 h-7">
          {status === 'searching' && (
            <p className="animate-pulse text-base text-gold-400">
              {t('scanSearching')} {lastCode}
            </p>
          )}
          {status === 'notfound' && (
            <p className="text-base text-rose-300">
              {t('scanNotFound')} {lastCode && `(${lastCode})`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-10 rounded-full border border-charcoal-600 px-8 py-3 text-base font-medium text-cream-200/70 transition hover:border-gold-500/50 hover:text-cream-100"
        >
          ← {t('backHome')}
        </button>
      </div>
    </main>
  )
}
