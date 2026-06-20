import { createContext, useContext, useState, useEffect } from 'react'
import { fetchActiveProducts, fetchKioskSettings } from '../../firebase/products'
import { getSteps } from '../stepsConfig'
import { recommend } from '../recommendation'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'

const FlowContext = createContext(null)
const emptySelections = { color: null, priceRange: null, purpose: null, taste: null, country: null }

export function FlowProvider({ children }) {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [phase, setPhase] = useState('welcome') // welcome | idle | scan | flow | results | detail
  const [stepIndex, setStepIndex] = useState(0)
  const [selections, setSelections] = useState(emptySelections)
  const [results, setResults] = useState([])
  const [detailProduct, setDetailProduct] = useState(null)
  const [detailOrigin, setDetailOrigin] = useState('results')

  // Arka planda Firebase'e analitik verisi gönderen görünmez haberci
  const logEvent = (type, payload = {}) => {
    try {
      addDoc(collection(db, 'analyticsEvents'), {
        type,
        ...payload,
        timestamp: new Date().toISOString()
      }).catch(err => console.error("Analitik kaydedilemedi:", err));
    } catch (err) {
      console.error("Analitik hatası:", err);
    }
  }

  useEffect(() => {
    let alive = true
    Promise.all([fetchActiveProducts(), fetchKioskSettings()])
      .then(([prods, sett]) => {
        if (!alive) return
        setProducts(prods)
        setSettings(sett)
        setLoading(false)
      })
      .catch((e) => {
        if (alive) {
          setError(e)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  // Otomatik sıfırlama: hareketsizlik sonrası başa dön (doküman 6.13)
  useEffect(() => {
    if (phase === 'welcome' || phase === 'idle') return
    const ms = (settings?.resetTimeoutSeconds || 120) * 1000
    let timer
    const doReset = () => {
      setSelections(emptySelections)
      setResults([])
      setStepIndex(0)
      setDetailProduct(null)
      setPhase('welcome')
    }
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(doReset, ms)
    }
    arm()
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((e) => window.addEventListener(e, arm))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [phase, settings])

  // Bekleme (attract) modu: açılışta hareketsiz kalınınca "Öne Çıkan Şaraplar"
  useEffect(() => {
    if (phase !== 'welcome') return
    if (settings?.idleScreenEnabled === false) return
    const ms = (settings?.idleTimeoutSeconds || 45) * 1000
    let timer
    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setPhase('idle'), ms)
    }
    arm()
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((e) => window.addEventListener(e, arm))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [phase, settings])

  const steps = getSteps(settings)

  const reset = () => {
    setSelections(emptySelections)
    setResults([])
    setStepIndex(0)
    setDetailProduct(null)
    setPhase('welcome')
  }
  const startFlow = () => {
    logEvent('flow_start'); // Müşteri akışa başladı
    setSelections(emptySelections)
    setStepIndex(0)
    setPhase('flow')
  }
  const chooseOption = (key, value) => {
    // Müşterinin ekrandaki seçimi kaydedilir
    logEvent('filter_selected', { filterKey: key, filterValue: value });
    const next = { ...selections, [key]: value }
    setSelections(next)
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setResults(recommend(products, next))
      setPhase('results')
    }
  }
  const finishNow = () => {
    setResults(recommend(products, selections))
    setPhase('results')
  }
  const goBackStep = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
    else setPhase('welcome')
  }
  const quickRecommend = () => {
    if (!products.length) return
    logEvent('session_start', { method: 'quickRecommend' }); // Hızlı öneri butonuna basıldı
    setResults(recommend(products, emptySelections, { quick: true }))
    setPhase('results')
  }
  const openDetail = (p, origin = 'results') => {
    // Müşterinin hangi şarabı incelediği kaydedilir
    logEvent('product_viewed', { 
      productId: p.id || '', 
      productName: p.name || '', 
      barcode: p.barcode || '' 
    });
    setDetailOrigin(origin)
    setDetailProduct(p)
    setPhase('detail')
  }
  const closeDetail = () => {
    setDetailProduct(null)
    setPhase(detailOrigin === 'scan' ? 'scan' : 'results')
  }
  const startScan = () => {
    logEvent('scan_started');
    setPhase('scan')
  }
  const wakeFromIdle = () => setPhase('welcome')

  const value = {
    products,
    settings,
    loading,
    error,
    phase,
    stepIndex,
    steps,
    selections,
    results,
    detailProduct,
    reset,
    startFlow,
    chooseOption,
    finishNow,
    goBackStep,
    quickRecommend,
    openDetail,
    closeDetail,
    wakeFromIdle,
    startScan,
  }
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow, FlowProvider içinde kullanılmalı')
  return ctx
}