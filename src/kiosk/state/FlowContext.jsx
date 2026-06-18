import { createContext, useContext, useState, useEffect } from 'react'
import { fetchActiveProducts, fetchKioskSettings } from '../../firebase/products'
import { getSteps } from '../stepsConfig'
import { recommend } from '../recommendation'

const FlowContext = createContext(null)
const emptySelections = { color: null, priceRange: null, purpose: null, taste: null, country: null }

export function FlowProvider({ children }) {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [phase, setPhase] = useState('welcome') // welcome | flow | results
  const [stepIndex, setStepIndex] = useState(0)
  const [selections, setSelections] = useState(emptySelections)
  const [results, setResults] = useState([])

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

  const steps = getSteps(settings)

  const reset = () => {
    setSelections(emptySelections)
    setResults([])
    setStepIndex(0)
    setPhase('welcome')
  }
  const startFlow = () => {
    setSelections(emptySelections)
    setStepIndex(0)
    setPhase('flow')
  }
  const chooseOption = (key, value) => {
    const next = { ...selections, [key]: value }
    setSelections(next)
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setResults(recommend(products, next))
      setPhase('results')
    }
  }
  // Herhangi bir adımda erken bitirme
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
    setResults(recommend(products, emptySelections, { quick: true }))
    setPhase('results')
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
    reset,
    startFlow,
    chooseOption,
    finishNow,
    goBackStep,
    quickRecommend,
  }
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow, FlowProvider içinde kullanılmalı')
  return ctx
}
