import { useCallback, useEffect, useRef, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { fetchProduct } from '../../firebase/products'
import AtmosphereBackground from '../components/AtmosphereBackground'

function normalizeBarcode(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function isProductVisible(product) {
  if (!product) return false
  if (product.active === false || product.isActive === false) return false
  return true
}

// Ürün Okut ekranı.
// Barkod okuyucu klavye gibi davranır, hızlı tuş dizisi + Enter gönderir.
// Önce kiosk ürün havuzunda, bulunamazsa lokal API'de barkoda göre arama yapılır.
export default function ScanScreen() {
  const { products, openDetail, reset, settings } = useFlow()
  const { t } = useLanguage()

  const [status, setStatus] = useState('idle') // idle | searching | notfound | disabled
  const [lastCode, setLastCode] = useState('')

  const bufferRef = useRef('')
  const lastTimeRef = useRef(0)

  // Ürün okutulmadan belirli süre (vars. 30 sn) dokunulmazsa ana ekrana dön
  useEffect(() => {
    const ms = Number(settings?.scanTimeoutSeconds ?? 30) * 1000
    let timer
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reset(), ms)
    }
    arm()
    const events = ['pointerdown', 'touchstart', 'keydown']
    events.forEach((e) => window.addEventListener(e, arm))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [reset, settings])

  const lockRef = useRef(false)

  const handleScan = useCallback(
    async (rawCode) => {
      const barcode = normalizeBarcode(rawCode)

      if (!barcode || lockRef.current) return

      if (settings?.scanEnabled === false) {
        setStatus('disabled')
        return
      }

      lockRef.current = true
      setLastCode(barcode)
      setStatus('searching')

      try {
        let found =
          products.find((product) => {
            return (
              normalizeBarcode(product.barcode) === barcode ||
              normalizeBarcode(product.id) === barcode
            )
          }) || null

        if (!found) {
          found = await fetchProduct(barcode).catch(() => null)
        }

        if (found && isProductVisible(found)) {
          openDetail(found, 'scan')
          return
        }

        setStatus('notfound')
      } finally {
        lockRef.current = false
      }
    },
    [openDetail, products, settings],
  )

  useEffect(() => {
    const onKey = (event) => {
      const now = Date.now()

      if (now - lastTimeRef.current > 120) {
        bufferRef.current = ''
      }

      lastTimeRef.current = now

      if (event.key === 'Enter') {
        const code = bufferRef.current
        bufferRef.current = ''

        if (code.length >= 3) {
          handleScan(code)
        }

        return
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key

        if (status === 'notfound' || status === 'disabled') {
          setStatus('idle')
        }
      }
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [handleScan, status])

  return (
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-8 text-center">
      <AtmosphereBackground />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-10 flex h-40 w-72 items-center justify-center overflow-hidden rounded-2xl border border-gold-500/25 bg-charcoal-800/40">
          <svg
            className="h-24 w-56 text-cream-100/90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M3 5v14M6 5v14M9 5v14M11.5 5v14M14 5v14M16.5 5v14M19 5v14M21 5v14" />
          </svg>

          <div className="ds-scanline pointer-events-none absolute left-4 right-4 h-0.5 bg-gold-400 shadow-[0_0_12px_rgba(200,169,81,0.9)]" />
        </div>

        <h1 className="font-serif text-4xl font-semibold text-cream-100 md:text-5xl">
          {t('scanTitle')}
        </h1>

        <p className="mt-4 text-lg text-cream-200/70">
          {t('scanHint')}
        </p>

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

          {status === 'disabled' && (
            <p className="text-base text-rose-300">
              Ürün okutma özelliği şu anda kapalı.
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