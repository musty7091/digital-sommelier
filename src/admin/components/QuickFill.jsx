import { useEffect, useMemo, useState } from 'react'
import { saveProduct } from '../../firebase/products'

const COLOR_OPTS = [
  { value: 'red', label: 'Kırmızı' },
  { value: 'white', label: 'Beyaz' },
  { value: 'rose', label: 'Roze' },
  { value: 'sparkling', label: 'Köpüklü' },
]

const LEVEL_OPTS = [
  { value: 'light', label: 'Hafif' },
  { value: 'medium', label: 'Orta' },
  { value: 'intense', label: 'Yoğun' },
]

const REQUIRED = ['color', 'body', 'sweetness']

function isMissing(p) {
  if (Array.isArray(p?.missingFields) && p.missingFields.length) {
    return p.missingFields.some((f) => REQUIRED.includes(f))
  }
  return REQUIRED.some((f) => !p?.[f])
}

function ButtonRow({ label, options, value, onChange }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-5 py-3 text-base font-semibold transition ${
              value === o.value
                ? 'border-wine-600 bg-wine-800 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                : 'border-charcoal-700 bg-ink-950 text-cream-200 hover:border-gold-500'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function QuickFill({ products, onClose, onSaved }) {
  const queue = useMemo(() => (products || []).filter(isMissing), [products])
  const [idx, setIdx] = useState(0)
  const [color, setColor] = useState('')
  const [body, setBody] = useState('')
  const [sweetness, setSweetness] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  const total = queue.length
  const product = queue[idx] || null

  // Ürün değişince mevcut değerleri ön-seç
  useEffect(() => {
    if (!product) return
    setColor(product.color || '')
    setBody(product.body || '')
    setSweetness(product.sweetness || product.taste || '')
  }, [idx, product])

  const canSave = color && body && sweetness && !saving
  const finished = !product

  function advance() {
    if (idx + 1 < total) {
      setIdx(idx + 1)
    } else {
      setIdx(total) // queue bitti -> finished
    }
  }

  async function saveAndNext() {
    if (!product || !canSave) return
    setSaving(true)
    try {
      await saveProduct({
        ...product,
        barcode: product.barcode || product.id,
        color,
        body,
        sweetness,
        taste: body,
      })
      setDone((d) => d + 1)
      advance()
    } catch (e) {
      alert('Kaydedilemedi: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  function close() {
    if (done > 0) onSaved?.()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-charcoal-700 bg-charcoal-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-cream-100">Hızlı Bilgi Doldurma</h3>
          <button type="button" onClick={close} className="text-cream-200/60 hover:text-cream-100 text-2xl leading-none">×</button>
        </div>

        {finished ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-cream-100 text-lg">
              {total === 0 ? 'Eksik bilgili ürün kalmadı.' : `${done} ürün güncellendi. Sıradaki eksik kalmadı.`}
            </p>
            <button type="button" onClick={close} className="mt-5 rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700">Kapat</button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-cream-200/60">Kalan eksik: <b className="text-cream-100">{total - done}</b></span>
              <span className="text-cream-200/60">Bu oturumda: <b className="text-emerald-300">{done}</b></span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-ink-950 mb-5 overflow-hidden">
              <div className="h-full bg-gold-500 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>

            <div className="rounded-xl border border-charcoal-700 bg-ink-950/50 p-4 mb-5">
              <div className="text-lg font-semibold text-cream-100">{product.name || '(isimsiz)'}</div>
              <div className="text-sm text-cream-200/60 mt-1">
                Barkod: {product.barcode || product.id}
                {product.brand ? ` · ${product.brand}` : ''}
                {product.price ? ` · ${product.price} ₺` : ''}
                {` · Stok: ${product.stock ?? 0}`}
              </div>
            </div>

            <ButtonRow label="Renk" options={COLOR_OPTS} value={color} onChange={setColor} />
            <ButtonRow label="Gövde" options={LEVEL_OPTS} value={body} onChange={setBody} />
            <ButtonRow label="Tatlılık" options={LEVEL_OPTS} value={sweetness} onChange={setSweetness} />

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={saveAndNext}
                disabled={!canSave}
                className="flex-1 rounded-xl bg-wine-800 px-5 py-3 font-semibold text-white hover:bg-wine-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet ve Sonraki →'}
              </button>
              <button
                type="button"
                onClick={advance}
                disabled={saving}
                className="rounded-xl border border-charcoal-700 px-5 py-3 text-cream-200 hover:border-gold-500"
              >
                Atla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
