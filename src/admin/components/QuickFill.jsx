import { useEffect, useMemo, useState } from 'react'
import { saveProduct } from '../../firebase/products'
import {
  COLORS,
  COLOR_LABELS,
  LEVELS,
  LEVEL_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  USAGE_PURPOSES,
  USAGE_PURPOSE_LABELS,
} from '../../types/product.schema'

// Doldurulabilir alanlar. Ülke "value" olarak ISO kodu (IT/ES…) saklar,
// böylece veri baştan doğru/standart girilir.
const levelOpts = LEVELS.map((v) => ({ value: v, label: LEVEL_LABELS[v].tr }))
const FIELDS = [
  { key: 'color', label: 'Renk', type: 'single', options: COLORS.map((v) => ({ value: v, label: COLOR_LABELS[v].tr })) },
  { key: 'country', label: 'Ülke', type: 'single', options: COUNTRIES.map((v) => ({ value: v, label: COUNTRY_LABELS[v].tr })) },
  { key: 'body', label: 'Gövde', type: 'single', options: levelOpts },
  { key: 'sweetness', label: 'Tatlılık', type: 'single', options: levelOpts },
  { key: 'acidity', label: 'Asidite', type: 'single', options: levelOpts },
  { key: 'tannin', label: 'Tanen', type: 'single', options: levelOpts },
  { key: 'usagePurposes', label: 'Kullanım Amacı', type: 'multi', options: USAGE_PURPOSES.map((v) => ({ value: v, label: USAGE_PURPOSE_LABELS[v].tr })) },
]

function isMissing(product, field) {
  if (field.type === 'multi') {
    return !Array.isArray(product?.[field.key]) || product[field.key].length === 0
  }
  return !product?.[field.key]
}

export default function QuickFill({ products, onClose, onSaved }) {
  const [field, setField] = useState(null) // seçili alan (null = alan seçim ekranı)
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [values, setValues] = useState([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  // Her alan için kaç ürün eksik (alan seçim ekranı sayaçları)
  const counts = useMemo(() => {
    const c = {}
    for (const f of FIELDS) c[f.key] = (products || []).filter((p) => isMissing(p, f)).length
    return c
  }, [products])

  // Seçili alan için kuyruk (oturum boyunca sabit)
  const queue = useMemo(
    () => (field ? (products || []).filter((p) => isMissing(p, field)) : []),
    [field, products],
  )

  const total = queue.length
  const product = queue[idx] || null
  const finished = field && !product

  // Ürün değişince mevcut değeri ön-seç
  useEffect(() => {
    if (!product || !field) return
    if (field.type === 'multi') {
      setValues(Array.isArray(product[field.key]) ? product[field.key] : [])
    } else {
      setValue(product[field.key] || '')
    }
  }, [idx, product, field])

  function pickField(f) {
    setField(f)
    setIdx(0)
    setDone(0)
    setValue('')
    setValues([])
  }

  function backToFields() {
    if (done > 0) onSaved?.()
    setField(null)
    setIdx(0)
    setDone(0)
  }

  function advance() {
    setIdx((i) => i + 1)
  }

  function toggleMulti(v) {
    setValues((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]))
  }

  const canSave =
    !saving && (field?.type === 'multi' ? values.length > 0 : Boolean(value))

  async function saveAndNext() {
    if (!product || !field || !canSave) return
    setSaving(true)
    try {
      const patch =
        field.type === 'multi'
          ? { usagePurposes: values }
          : { [field.key]: value }
      await saveProduct({ ...product, barcode: product.barcode || product.id, ...patch })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-charcoal-700 bg-charcoal-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-cream-100">Hızlı Bilgi Doldurma</h3>
          <button type="button" onClick={close} className="text-cream-200/60 hover:text-cream-100 text-2xl leading-none">×</button>
        </div>

        {/* ALAN SECIM EKRANI */}
        {!field && (
          <>
            <p className="text-sm text-cream-200/70 mb-4">Hangi bilgiyi dolduralım? Seçtiğin alanı, o bilgisi eksik olan ürünlerde tek tek hızlıca girersin.</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => {
                const n = counts[f.key] || 0
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => pickField(f)}
                    disabled={n === 0}
                    className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                      n === 0
                        ? 'border-charcoal-700 bg-ink-950/40 text-cream-200/30 cursor-not-allowed'
                        : 'border-charcoal-700 bg-ink-950 text-cream-100 hover:border-gold-500 hover:bg-charcoal-700'
                    }`}
                  >
                    <span className="text-base font-semibold">{f.label}</span>
                    <span className={`text-xs ${n === 0 ? '' : 'text-gold-400'}`}>{n === 0 ? 'eksik yok' : `${n} eksik`}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* DOLDURMA EKRANI */}
        {field && finished && (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-cream-100 text-lg">
              {total === 0 ? `"${field.label}" eksik ürün yok.` : `"${field.label}" için ${done} ürün güncellendi.`}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button type="button" onClick={backToFields} className="rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700">Başka alan doldur</button>
              <button type="button" onClick={close} className="rounded-lg border border-charcoal-600 px-5 py-2.5 text-cream-200 hover:border-gold-500">Kapat</button>
            </div>
          </div>
        )}

        {field && !finished && (
          <>
            <div className="mb-3 flex items-center justify-between text-sm">
              <button type="button" onClick={backToFields} className="text-cream-200/70 hover:text-gold-400">← Alan değiştir</button>
              <span className="text-cream-200/70">Alan: <b className="text-cream-100">{field.label}</b></span>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-cream-200/60">Kalan: <b className="text-cream-100">{total - done}</b></span>
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

            <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">{field.label}</div>
            <div className="flex flex-wrap gap-2.5 mb-2">
              {field.options.map((o) => {
                const active = field.type === 'multi' ? values.includes(o.value) : value === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => (field.type === 'multi' ? toggleMulti(o.value) : setValue(o.value))}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'border-wine-600 bg-wine-800 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                        : 'border-charcoal-700 bg-ink-950 text-cream-200 hover:border-gold-500'
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
            {field.type === 'multi' && <p className="text-xs text-cream-200/50 mb-2">Birden fazla seçebilirsin.</p>}

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={saveAndNext}
                disabled={!canSave}
                className="flex-1 rounded-xl bg-wine-800 px-5 py-3 font-semibold text-white hover:bg-wine-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet ve Sonraki →'}
              </button>
              <button type="button" onClick={advance} disabled={saving} className="rounded-xl border border-charcoal-700 px-5 py-3 text-cream-200 hover:border-gold-500">Atla</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
