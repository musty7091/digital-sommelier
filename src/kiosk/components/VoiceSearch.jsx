import { useEffect, useRef, useState } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { parseVoiceQuery, parseVoiceWithGemini } from '../voiceParse'

function getRecognition() {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  return SR ? new SR() : null
}

const STEP_KEYS = ['color', 'priceRange', 'country', 'purpose', 'taste']
const LEVEL_TR = { light: 'Hafif', medium: 'Orta', intense: 'Yoğun' }
const SWEET_TR = { light: 'Kuru', medium: 'Yarı tatlı', intense: 'Tatlı' }
const ORDER = ['color', 'priceRange', 'country', 'region', 'grape', 'taste', 'sweetness', 'acidity', 'tannin', 'purpose']

function stepLabel(steps, key, value, lang) {
  const step = (steps || []).find((s) => s.key === key)
  const opt = step?.options?.find((o) => o.value === value)
  const l = opt?.label
  if (l) return l[lang] || l.tr || l.en || value
  return value
}

function chipText(steps, key, value, lang) {
  if (STEP_KEYS.includes(key)) return stepLabel(steps, key, value, lang)
  if (key === 'sweetness') return 'Tatlılık: ' + (SWEET_TR[value] || value)
  if (key === 'acidity') return 'Asidite: ' + (LEVEL_TR[value] || value)
  if (key === 'tannin') return 'Tanen: ' + (LEVEL_TR[value] || value)
  return value // region / grape -> doğrudan değer
}

export default function VoiceSearch({ onClose }) {
  const { steps, products, applyVoiceSelections } = useFlow()
  const { lang } = useLanguage()
  const recRef = useRef(null)
  const finalRef = useRef('')
  const applyTimerRef = useRef(null)
  const dataRef = useRef({})
  dataRef.current = { steps, products, applyVoiceSelections }

  const [status, setStatus] = useState('init') // init|listening|thinking|understood|nomatch|denied|error|unsupported
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState({ selections: {}, found: [] })

  const stop = () => {
    try {
      recRef.current?.abort()
    } catch {
      /* yok */
    }
    recRef.current = null
  }

  const resolve = async (text) => {
    const { steps: st, products: pr, applyVoiceSelections: apply } = dataRef.current
    setStatus('thinking')
    let result = null
    const apiKey = (typeof localStorage !== 'undefined' && localStorage.getItem('gemini_api_key')) || ''
    if (apiKey) {
      const model = localStorage.getItem('gemini_model_name') || 'gemini-3-flash-preview'
      result = await parseVoiceWithGemini(text, { steps: st, products: pr, apiKey, model })
    }
    if (!result || result.found.length === 0) {
      result = parseVoiceQuery(text, st, pr)
    }
    setParsed(result)
    if (!result.found.length) {
      setStatus('nomatch')
      return
    }
    setStatus('understood')
    applyTimerRef.current = setTimeout(() => apply(result.selections), 2000)
  }

  const startListening = () => {
    clearTimeout(applyTimerRef.current)
    stop()
    const rec = getRecognition()
    if (!rec) {
      setStatus('unsupported')
      return
    }
    finalRef.current = ''
    setTranscript('')
    setParsed({ selections: {}, found: [] })
    rec.lang = 'tr-TR'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalRef.current += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript((finalRef.current + ' ' + interim).trim())
    }
    rec.onerror = (e) => {
      setStatus(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'error')
    }
    rec.onend = () => {
      const text = finalRef.current.trim()
      if (!text) {
        setStatus((s) => (s === 'denied' || s === 'error' ? s : 'nomatch'))
        return
      }
      resolve(text)
    }

    try {
      rec.start()
      recRef.current = rec
      setStatus('listening')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    startListening()
    return () => {
      clearTimeout(applyTimerRef.current)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goNow = () => {
    clearTimeout(applyTimerRef.current)
    dataRef.current.applyVoiceSelections(parsed.selections)
  }

  const listening = status === 'listening'
  const thinking = status === 'thinking'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/92 backdrop-blur-md px-6 text-center">
      <button
        type="button"
        onClick={() => {
          stop()
          onClose?.()
        }}
        className="absolute top-8 right-8 text-3xl leading-none text-cream-200/60 hover:text-cream-100"
        aria-label="Kapat"
      >
        ×
      </button>

      <div className="relative mb-8 flex items-center justify-center">
        {(listening || thinking) && <span className="absolute h-40 w-40 rounded-full bg-wine-700/30 animate-ping" />}
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full border-2 ${
            listening || thinking ? 'border-gold-500 bg-wine-800' : 'border-charcoal-600 bg-charcoal-800'
          }`}
        >
          <svg className="h-14 w-14 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      </div>

      {status === 'unsupported' && (
        <p className="max-w-xl text-xl text-cream-200/80">
          Bu cihazın tarayıcısı sesli aramayı desteklemiyor. (Microsoft Edge veya Chrome önerilir.)
        </p>
      )}

      {status !== 'unsupported' && (
        <>
          <h2 className="font-serif text-3xl md:text-4xl text-cream-100">
            {listening ? 'Dinliyorum…' : thinking ? 'Anlıyorum…' : status === 'understood' ? 'Anladım' : 'Sesli Arama'}
          </h2>
          <p className="mt-3 max-w-2xl text-lg md:text-xl text-cream-200/70">
            Aradığınız şarabı birkaç kelimeyle anlatın.
            <br />
            <span className="text-cream-200/45">örn. “Bordo bölgesinden, tanenli, 1000 lira civarı bir kırmızı”</span>
          </p>

          {transcript && <p className="mt-6 max-w-2xl text-2xl md:text-3xl font-light text-gold-300">“{transcript}”</p>}

          {status === 'understood' && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {ORDER.filter((k) => parsed.selections[k]).map((k) => (
                <span key={k} className="rounded-full border border-gold-500/50 bg-gold-900/20 px-4 py-2 text-base md:text-lg text-gold-300">
                  {chipText(steps, k, parsed.selections[k], lang)}
                </span>
              ))}
            </div>
          )}

          {status === 'understood' && (
            <button
              type="button"
              onClick={goNow}
              className="mt-8 rounded-full border border-gold-500/60 bg-wine-800 px-12 py-4 text-xl font-medium text-cream-100 hover:bg-wine-700"
            >
              Sonuçları Gör →
            </button>
          )}

          {(status === 'nomatch' || status === 'error' || status === 'denied') && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="max-w-xl text-lg text-cream-200/70">
                {status === 'denied'
                  ? 'Mikrofon izni verilmedi. Lütfen tarayıcıda mikrofona izin verin.'
                  : status === 'error'
                    ? 'Bir sorun oluştu, tekrar deneyelim.'
                    : 'Anlayamadım. Örneğin “kırmızı, bin lira civarı, tanenli” diyebilirsiniz.'}
              </p>
              <button
                type="button"
                onClick={startListening}
                className="rounded-full border border-gold-500/60 bg-wine-800 px-10 py-4 text-xl font-medium text-cream-100 hover:bg-wine-700"
              >
                Tekrar Dinle
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
