import { useMemo, useRef, useState } from 'react'
import { saveProduct } from '../../firebase/products'
import { COLORS, LEVELS, COUNTRIES, USAGE_PURPOSES } from '../../types/product.schema'

const REQUIRED = ['color', 'body', 'sweetness']

function isMissing(p) {
  return REQUIRED.some((f) => !p?.[f]) || !p?.country
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fold(v) {
  return String(v ?? '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's').replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u').replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

const COLOR_MAP = { red: 'red', kirmizi: 'red', kımızı: 'red', white: 'white', beyaz: 'white', rose: 'rose', roze: 'rose', pembe: 'rose', sparkling: 'sparkling', kopuklu: 'sparkling', kopurcuklu: 'sparkling' }
const LEVEL_MAP = { light: 'light', hafif: 'light', low: 'light', dusuk: 'light', medium: 'medium', orta: 'medium', mid: 'medium', intense: 'intense', yogun: 'intense', high: 'intense', full: 'intense', agir: 'intense', yuksek: 'intense', dry: 'light', sec: 'light' }
const COUNTRY_MAP = {
  tr: 'TR', turkiye: 'TR', turkey: 'TR', cy: 'CY', kibris: 'CY', cyprus: 'CY', fr: 'FR', fransa: 'FR', france: 'FR',
  it: 'IT', italya: 'IT', italy: 'IT', italia: 'IT', es: 'ES', ispanya: 'ES', spain: 'ES', espana: 'ES',
  cl: 'CL', sili: 'CL', chile: 'CL', ar: 'AR', arjantin: 'AR', argentina: 'AR', au: 'AU', avustralya: 'AU', australia: 'AU',
  nz: 'NZ', yenizelanda: 'NZ', newzealand: 'NZ', us: 'US', usa: 'US', abd: 'US', za: 'ZA', guneyafrika: 'ZA', southafrica: 'ZA',
  pt: 'PT', portekiz: 'PT', portugal: 'PT', de: 'DE', almanya: 'DE', germany: 'DE', gr: 'GR', yunanistan: 'GR', greece: 'GR',
}

function mapEnum(value, map, allowed) {
  const f = fold(value).replace(/[^a-z]/g, '')
  if (!f) return ''
  if (map[f]) return map[f]
  if (allowed.includes(f)) return f
  return ''
}

function normalizeCountry(value) {
  const f = fold(value).replace(/[^a-z]/g, '')
  if (!f) return ''
  const code = COUNTRY_MAP[f] || (f.length === 2 ? f.toUpperCase() : '')
  return COUNTRIES.includes(code) ? code : code ? 'OTHER' : ''
}

function buildPatch(raw, product) {
  const patch = {}
  const color = mapEnum(raw.color, COLOR_MAP, COLORS)
  const country = normalizeCountry(raw.country)
  const body = mapEnum(raw.body, LEVEL_MAP, LEVELS)
  const sweetness = mapEnum(raw.sweetness, LEVEL_MAP, LEVELS)
  const acidity = mapEnum(raw.acidity, LEVEL_MAP, LEVELS)
  const tannin = mapEnum(raw.tannin, LEVEL_MAP, LEVELS)
  const region = String(raw.region ?? '').trim()
  const grape = String(raw.grape ?? '').trim()
  const purposes = Array.isArray(raw.usagePurposes)
    ? [...new Set(raw.usagePurposes.map((p) => fold(p).replace(/[^a-z]/g, '')).filter((p) => USAGE_PURPOSES.includes(p)))]
    : []

  // Yalnızca DOLU ve ürün için EKSİK olan alanları yaz (mevcut iyi veriyi ezme)
  if (color) patch.color = color
  if (country) patch.country = country
  if (body) { patch.body = body; patch.taste = body }
  if (sweetness) patch.sweetness = sweetness
  if (acidity) patch.acidity = acidity
  if (tannin) patch.tannin = tannin
  if (region && !product.region) patch.region = region
  if (grape && !product.grape) patch.grape = grape
  if (purposes.length && (!Array.isArray(product.usagePurposes) || !product.usagePurposes.length)) {
    patch.usagePurposes = purposes
  }
  return patch
}

function extractJson(text) {
  const t = String(text || '').replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(t)
  } catch {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        return null
      }
    }
    return null
  }
}

async function askGemini(product, apiKey, model) {
  const prompt = `Sen uzman bir şarap sommelierisin. Aşağıdaki şarap için bilinen ya da en olası özellikleri ver.
Şarap adı: "${product.name || ''}"
Marka: "${product.brand || ''}"

SADECE aşağıdaki JSON şemasını, VERİLEN İZİNLİ DEĞERLERLE doldur. Emin değilsen isimden çıkarım yaparak EN OLASI tahmini yaz, boş bırakma. Ek açıklama yazma, sadece JSON döndür.

İzinli değerler:
- color: red | white | rose | sparkling
- country: ISO ülke kodu (TR, CY, IT, FR, CL, AR, ES, AU, NZ, US, ZA, PT, DE, GR) veya bilinmiyorsa OTHER
- body, sweetness, acidity, tannin: light | medium | intense
- usagePurposes: şu anahtarlardan UYGUN OLAN BİRDEN FAZLASI (dizi): food, gift, celebration, daily, romantic, premium, light, value, beginner, sommelier
- region: bölge adı (serbest metin, örn. "Toscana"); bilinmiyorsa ""
- grape: üzüm türü (serbest metin, örn. "Sangiovese"); bilinmiyorsa ""

{"color":"","country":"","region":"","grape":"","body":"","sweetness":"","acidity":"","tannin":"","usagePurposes":[]}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const e = new Error(err?.error?.message || `HTTP ${res.status}`)
    e.status = res.status
    throw e
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return extractJson(text)
}

export default function BulkAiFill({ products, onClose, onSaved }) {
  const apiKey = (localStorage.getItem('gemini_api_key') || '').trim()
  const model = (localStorage.getItem('gemini_model_name') || 'gemini-3-flash-preview').trim()

  const [onlyMissing, setOnlyMissing] = useState(true)
  const [delay, setDelay] = useState(4500)
  const [status, setStatus] = useState('idle') // idle | running | paused | done
  const [idx, setIdx] = useState(0)
  const [stats, setStats] = useState({ done: 0, failed: 0, skipped: 0 })
  const [log, setLog] = useState([])

  const runningRef = useRef(false)
  const pausedRef = useRef(false)

  const queue = useMemo(
    () => (products || []).filter((p) => (onlyMissing ? isMissing(p) : true)),
    [products, onlyMissing],
  )
  const total = queue.length

  function addLog(entry) {
    setLog((l) => [entry, ...l].slice(0, 60))
  }

  async function run() {
    if (!apiKey) {
      alert('Gemini API anahtarı bulunamadı. Önce "Yapay Zekâ Açıklama" ekranından anahtarı kaydet.')
      return
    }
    runningRef.current = true
    pausedRef.current = false
    setStatus('running')
    setStats({ done: 0, failed: 0, skipped: 0 })

    for (let i = 0; i < queue.length; i++) {
      if (!runningRef.current) {
        setStatus('idle')
        return
      }
      while (pausedRef.current) {
        await sleep(300)
        if (!runningRef.current) {
          setStatus('idle')
          return
        }
      }

      setIdx(i)
      const p = queue[i]
      try {
        const raw = await askGemini(p, apiKey, model)
        if (!raw) {
          addLog({ name: p.name, kind: 'skip', text: 'AI yanıtı çözümlenemedi' })
          setStats((s) => ({ ...s, skipped: s.skipped + 1 }))
        } else {
          const patch = buildPatch(raw, p)
          if (Object.keys(patch).length === 0) {
            addLog({ name: p.name, kind: 'skip', text: 'doldurulacak alan bulunamadı' })
            setStats((s) => ({ ...s, skipped: s.skipped + 1 }))
          } else {
            await saveProduct({ barcode: p.barcode || p.id, ...patch })
            const summary = [patch.color, patch.country, patch.body && `gövde:${patch.body}`].filter(Boolean).join(' · ')
            addLog({ name: p.name, kind: 'ok', text: summary || 'güncellendi' })
            setStats((s) => ({ ...s, done: s.done + 1 }))
          }
        }
      } catch (e) {
        if (e.status === 429 || /quota|rate|too many/i.test(e.message || '')) {
          addLog({ name: p.name, kind: 'wait', text: 'hız limiti — 20 sn bekleniyor' })
          await sleep(20000)
          i -= 1 // aynı ürünü tekrar dene
          continue
        }
        addLog({ name: p.name, kind: 'fail', text: e.message || 'hata' })
        setStats((s) => ({ ...s, failed: s.failed + 1 }))
      }

      await sleep(Number(delay) || 3000)
    }

    runningRef.current = false
    setStatus('done')
    onSaved?.()
  }

  function pause() {
    pausedRef.current = true
    setStatus('paused')
  }
  function resume() {
    pausedRef.current = false
    setStatus('running')
  }
  function stop() {
    runningRef.current = false
    pausedRef.current = false
    if (stats.done > 0) onSaved?.()
  }
  function close() {
    runningRef.current = false
    if (stats.done > 0) onSaved?.()
    onClose?.()
  }

  const pct = total ? Math.round(((idx + (status === 'done' ? 1 : 0)) / total) * 100) : 0
  const etaMin = status === 'running' ? Math.ceil(((total - idx) * (Number(delay) + 1500)) / 60000) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-charcoal-700 bg-charcoal-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-cream-100">🤖 Yapay Zekâ ile Toplu Doldurma</h3>
          <button type="button" onClick={close} className="text-cream-200/60 hover:text-cream-100 text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-cream-200/70 mb-4">
          Her ürünün adı ve markası Gemini'ye gönderilir; renk, ülke, bölge, üzüm, gövde/tatlılık/asidite/tanen ve kullanım amacı doldurulur.
          Yalnızca <b>özellik</b> alanları yazılır — yazdığın açıklamalar korunur. <span className="text-gold-400">Sonuçları gözden geçir; tahmin içerebilir.</span>
        </p>

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-cream-100">
                <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
                Sadece bilgisi eksik ürünler
              </label>
              <label className="flex items-center gap-2 text-sm text-cream-100">
                İstekler arası bekleme:
                <select value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="rounded-md border border-charcoal-700 bg-ink-950 px-2 py-1 text-cream-100">
                  <option value={3000}>3 sn (hızlı)</option>
                  <option value={4500}>4.5 sn (önerilen)</option>
                  <option value={6000}>6 sn (güvenli)</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-charcoal-700 bg-ink-950/50 p-3 text-sm text-cream-200/80">
              İşlenecek ürün: <b className="text-cream-100">{total}</b>
              {total > 0 && <> · tahmini süre ~<b className="text-cream-100">{Math.ceil((total * (Number(delay) + 1500)) / 60000)} dk</b></>}
              {!apiKey && <div className="mt-1 text-rose-300">⚠ Gemini API anahtarı yok — önce "Yapay Zekâ Açıklama" ekranından kaydet.</div>}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="rounded-lg border border-charcoal-600 px-5 py-2.5 text-cream-200 hover:border-gold-500">Vazgeç</button>
              <button type="button" onClick={run} disabled={!total || !apiKey} className="rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700 disabled:opacity-40">Başlat</button>
            </div>
          </div>
        )}

        {(status === 'running' || status === 'paused' || status === 'done') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream-200/70">{status === 'done' ? 'Tamamlandı' : `İşleniyor: ${idx + 1} / ${total}`}{etaMin != null && status === 'running' ? ` · ~${etaMin} dk kaldı` : ''}</span>
              <span className="text-cream-200/70">
                <b className="text-emerald-300">{stats.done}</b> tamam · <b className="text-gold-400">{stats.skipped}</b> atlandı · <b className="text-rose-300">{stats.failed}</b> hata
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-ink-950 overflow-hidden">
              <div className="h-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} />
            </div>

            <div className="h-56 overflow-y-auto rounded-lg border border-charcoal-700 bg-ink-950/50 p-2 text-xs space-y-1">
              {log.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={
                    e.kind === 'ok' ? 'text-emerald-300' : e.kind === 'fail' ? 'text-rose-300' : e.kind === 'wait' ? 'text-gold-400' : 'text-cream-200/40'
                  }>
                    {e.kind === 'ok' ? '✓' : e.kind === 'fail' ? '✕' : e.kind === 'wait' ? '⏳' : '–'}
                  </span>
                  <span className="text-cream-200/80 truncate">{e.name}</span>
                  <span className="text-cream-200/40">— {e.text}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              {status === 'running' && <button type="button" onClick={pause} className="rounded-lg border border-charcoal-600 px-5 py-2.5 text-cream-200 hover:border-gold-500">Duraklat</button>}
              {status === 'paused' && <button type="button" onClick={resume} className="rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700">Devam</button>}
              {status !== 'done' && <button type="button" onClick={stop} className="rounded-lg border border-rose-700/60 px-5 py-2.5 text-rose-200 hover:border-rose-500">Durdur</button>}
              {status === 'done' && <button type="button" onClick={close} className="rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700">Kapat</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
