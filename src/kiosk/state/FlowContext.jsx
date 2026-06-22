import { createContext, useContext, useState, useEffect } from 'react'
import {
  fetchActiveProducts,
  fetchKioskSettings,
  logAuditAction,
} from '../../firebase/products'
import { getSteps } from '../stepsConfig'
import { recommend } from '../recommendation'

const FlowContext = createContext(null)

const emptySelections = {
  color: null,
  priceRange: null,
  purpose: null,
  taste: null,
  country: null,
}

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

  const logEvent = (type, payload = {}) => {
    if (settings?.analyticsEnabled === false) return

    try {
      logAuditAction({
        action: type,
        entityType: 'kiosk-session',
        entityId: payload.productId || payload.barcode || '',
        message: `Kiosk event: ${type}`,
        details: {
          ...payload,
          phase,
          stepIndex,
          selections,
          timestamp: new Date().toISOString(),
        },
      }).catch((err) => {
        console.error('Lokal analitik kaydedilemedi:', err)
      })
    } catch (err) {
      console.error('Lokal analitik hatası:', err)
    }
  }

  useEffect(() => {
    let alive = true

    setLoading(true)
    setError(null)

    Promise.all([fetchActiveProducts(), fetchKioskSettings()])
      .then(([prods, sett]) => {
        if (!alive) return

        setProducts(Array.isArray(prods) ? prods : [])
        setSettings(sett || null)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return

        console.error('Kiosk verileri yüklenemedi:', err)
        setError(err)
        setProducts([])
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (phase === 'welcome' || phase === 'idle') return

    const timeoutSeconds =
      settings?.resetTimeoutSeconds ??
      settings?.autoResetSeconds ??
      settings?.idleResetSeconds ??
      120

    const ms = Number(timeoutSeconds || 120) * 1000

    let timer

    const doReset = () => {
      setSelections(emptySelections)
      setResults([])
      setStepIndex(0)
      setDetailProduct(null)
      setDetailOrigin('results')
      setPhase('welcome')
    }

    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(doReset, ms)
    }

    arm()

    const events = ['pointerdown', 'keydown', 'touchstart']

    events.forEach((eventName) => window.addEventListener(eventName, arm))

    return () => {
      clearTimeout(timer)
      events.forEach((eventName) => window.removeEventListener(eventName, arm))
    }
  }, [phase, settings])

  useEffect(() => {
    if (phase !== 'welcome') return
    if (settings?.idleScreenEnabled === false) return

    const timeoutSeconds = settings?.idleTimeoutSeconds ?? 45
    const ms = Number(timeoutSeconds || 45) * 1000

    let timer

    const arm = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setPhase('idle'), ms)
    }

    arm()

    const events = ['pointerdown', 'keydown', 'touchstart']

    events.forEach((eventName) => window.addEventListener(eventName, arm))

    return () => {
      clearTimeout(timer)
      events.forEach((eventName) => window.removeEventListener(eventName, arm))
    }
  }, [phase, settings])

  const steps = getSteps(settings)

  const recOpts = (extra = {}) => ({
    resultCount: settings?.resultCount || settings?.maxResults || 5,
    hideOutOfStock: settings?.hideOutOfStock !== false,
    ...extra,
  })

  const reset = () => {
    setSelections(emptySelections)
    setResults([])
    setStepIndex(0)
    setDetailProduct(null)
    setDetailOrigin('results')
    setPhase('welcome')
  }

  const startFlow = () => {
    logEvent('flow_start')

    setSelections(emptySelections)
    setResults([])
    setStepIndex(0)
    setDetailProduct(null)
    setDetailOrigin('results')
    setPhase('flow')
  }

  const chooseOption = (key, value) => {
    logEvent('filter_selected', {
      filterKey: key,
      filterValue: value,
    })

    const next = {
      ...selections,
      [key]: value,
    }

    setSelections(next)

    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }

    setResults(recommend(products, next, recOpts()))
    setPhase('results')
  }

  const finishNow = () => {
    logEvent('finish_now', {
      selections,
    })

    setResults(recommend(products, selections, recOpts()))
    setPhase('results')
  }

  const goBackStep = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
      return
    }

    setPhase('welcome')
  }

  const quickRecommend = () => {
    if (!products.length) return

    logEvent('session_start', {
      method: 'quickRecommend',
    })

    setSelections(emptySelections)
    setResults(recommend(products, emptySelections, recOpts({ quick: true })))
    setDetailProduct(null)
    setDetailOrigin('results')
    setPhase('results')
  }

  const openDetail = (product, origin = 'results') => {
    if (!product) return

    logEvent('product_viewed', {
      productId: product.id || '',
      productName: product.name || '',
      barcode: product.barcode || '',
    })

    setDetailOrigin(origin)
    setDetailProduct(product)
    setPhase('detail')
  }

  const closeDetail = () => {
    setDetailProduct(null)
    setPhase(detailOrigin || 'results')
  }

  const startScan = () => {
    logEvent('scan_started')
    setPhase('scan')
  }

  const wakeFromIdle = () => {
    setPhase('welcome')
  }

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

    currency: settings?.currency || 'TL',
    maintenance: settings?.maintenanceMode === true,
  }

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)

  if (!ctx) {
    throw new Error('useFlow, FlowProvider içinde kullanılmalı')
  }

  return ctx
}

export function useFlowSafe() {
  return useContext(FlowContext)
}