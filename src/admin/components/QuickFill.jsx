import { useEffect, useMemo, useState } from 'react'
import { saveProduct } from '../../firebase/products'

const COLOR_OPTS = [
  { value: 'red', label: 'Kırmızı' },
  { value: 'white', label: 'Beyaz' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Köpüklü' },
]

const LEVEL_OPTS = [
  { value: 'light', label: 'Hafif' },
  { value: 'medium', label: 'Orta' },
  { value: 'intense', label: 'Yoğun' },
]

// product.schema.js dosyasındaki tüm ülkeler eklendi
const COUNTRY_OPTS = [
  { value: 'TR', label: 'Türkiye' },
  { value: 'CY', label: 'Kıbrıs' },
  { value: 'IT', label: 'İtalya' },
  { value: 'FR', label: 'Fransa' },
  { value: 'CL', label: 'Şili' },
  { value: 'AR', label: 'Arjantin' },
  { value: 'ES', label: 'İspanya' },
  { value: 'AU', label: 'Avustralya' },
  { value: 'NZ', label: 'Yeni Zelanda' },
  { value: 'OTHER', label: 'Diğer' },
]

// product.schema.js dosyasındaki tüm kullanım amaçları eklendi
const PURPOSE_OPTS = [
  { value: 'food', label: 'Yemek için' },
  { value: 'gift', label: 'Hediye için' },
  { value: 'celebration', label: 'Kutlama için' },
  { value: 'daily', label: 'Günlük içim' },
  { value: 'romantic', label: 'Romantik akşam' },
  { value: 'premium', label: 'Premium seçim' },
  { value: 'light', label: 'Hafif içim' },
  { value: 'value', label: 'Fiyat / performans' },
  { value: 'beginner', label: 'Yeni başlayanlar için' },
  
]

const BOOL_OPTS = [
  { value: true, label: 'Evet' },
  { value: false, label: 'Hayır' },
]

// Eksik bilgileri tararken ülkeyi de zorunlu alanlara ekledik
const REQUIRED = ['color', 'body', 'sweetness', 'country']

function isMissing(p) {
  if (Array.isArray(p?.missingFields) && p.missingFields.length) {
    return p.missingFields.some((f) => REQUIRED.includes(f))
  }
  return REQUIRED.some((f) => !p?.[f])
}

// Tekli seçim butonu
function ButtonRow({ label, options, value, onChange }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
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

// Çoklu seçim butonu (Kullanım Amacı gibi birden fazla seçilebilen alanlar için)
function MultiButtonRow({ label, options, values = [], onChange }) {
  const toggle = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const isActive = values.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`rounded-xl border px-5 py-3 text-base font-semibold transition ${
                isActive
                  ? 'border-wine-600 bg-wine-800 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                  : 'border-charcoal-700 bg-ink-950 text-cream-200 hover:border-gold-500'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Serbest metin girişi 
function TextInputRow({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-charcoal-700 bg-ink-950 px-5 py-3 text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
      />
    </div>
  )
}

// Raf ve Blok için özel çiftli giriş alanı
function BlockShelfRow({ blockValue, onBlockChange, shelfValue, onShelfChange }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-2">Raftaki Konumu</div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs text-cream-200/60 mb-1 ml-1">Blok (Örn: C)</label>
          <input
            type="text"
            value={blockValue}
            onChange={(e) => onBlockChange(e.target.value.toUpperCase())}
            placeholder="A, B, C..."
            maxLength={3}
            className="w-full rounded-xl border border-charcoal-700 bg-ink-950 px-5 py-3 text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-cream-200/60 mb-1 ml-1">Raf Sırası (Örn: 8)</label>
          <input
            type="number"
            value={shelfValue}
            onChange={(e) => onShelfChange(e.target.value)}
            placeholder="1, 2, 3..."
            min="0"
            className="w-full rounded-xl border border-charcoal-700 bg-ink-950 px-5 py-3 text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
  )
}

export default function QuickFill({ products, onClose, onSaved }) {
  const queue = useMemo(() => (products || []).filter(isMissing), [products])
  const [idx, setIdx] = useState(0)
  
  // Ürün Bilgi Durumları (State)
  const [color, setColor] = useState('')
  const [body, setBody] = useState('')
  const [sweetness, setSweetness] = useState('')
  const [country, setCountry] = useState('')
  const [usagePurposes, setUsagePurposes] = useState([])
  const [block, setBlock] = useState('')
  const [shelf, setShelf] = useState('')
  const [featured, setFeatured] = useState(false)
  const [sommelierPick, setSommelierPick] = useState(false)

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  const total = queue.length
  const product = queue[idx] || null

  // Ürün değişince mevcut değerleri sisteme yükle
  useEffect(() => {
    if (!product) return
    setColor(product.color || '')
    setBody(product.body || '')
    setSweetness(product.sweetness || product.taste || '')
    setCountry(product.country || '')
    
    // Kullanım amaçları bir dizi olarak gelebilir, düzeltip yükleyelim
    let purposes = []
    if (Array.isArray(product.usagePurposes)) {
      purposes = product.usagePurposes
    } else if (typeof product.usagePurposes === 'string') {
      purposes = product.usagePurposes.split(',').map(s => s.trim())
    }
    setUsagePurposes(purposes)
    
    setBlock(product.block || '')
    setShelf(product.shelf || product.shelfPosition || '')
    setFeatured(product.featured || false)
    setSommelierPick(product.sommelierPick || false)
  }, [idx, product])

  // Kaydetmek için sadece temel özellikleri zorunlu tuttuk
  const canSave = color && body && sweetness && country && !saving
  const finished = !product

  function advance() {
    if (idx + 1 < total) {
      setIdx(idx + 1)
    } else {
      setIdx(total) // Sırada ürün bitti
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
        taste: body, // Eski sistemle uyumlu olması için
        country,
        usagePurposes,
        block,
        shelf,
        featured,
        sommelierPick
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
    // Z-index artırıldı, arka plan rengi tamamen kapalı yapıldı ve bulanıklık (blur) efekti verildi
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Pencere daha fazla bilgi sığdırmak için genişletildi, taşıyorsa içeriden kaydırılacak (overflow-y-auto) */}
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-charcoal-700 bg-ink-950 p-6 shadow-2xl relative scrollbar-thin scrollbar-thumb-charcoal-700 scrollbar-track-transparent">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-ink-950 z-10 pb-2">
          <h3 className="font-serif text-xl text-cream-100">Hızlı Bilgi Doldurma</h3>
          <button type="button" onClick={close} className="text-cream-200/60 hover:text-cream-100 text-2xl leading-none">×</button>
        </div>

        {finished ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3 text-emerald-400">✓</div>
            <p className="text-cream-100 text-lg">
              {total === 0 ? 'Eksik bilgili ürün kalmadı.' : `${done} ürün güncellendi. Sıradaki eksik kalmadı.`}
            </p>
            <button type="button" onClick={close} className="mt-5 rounded-lg bg-wine-800 px-5 py-2.5 font-semibold text-white hover:bg-wine-700 transition">
              Kapat
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-cream-200/60">Kalan eksik: <b className="text-cream-100">{total - done}</b></span>
              <span className="text-cream-200/60">Bu oturumda: <b className="text-emerald-400">{done}</b></span>
            </div>
            
            <div className="h-1.5 w-full rounded-full bg-charcoal-800 mb-5 overflow-hidden">
              <div className="h-full bg-gold-500 transition-all duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>

            <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/50 p-4 mb-6">
              <div className="text-lg font-semibold text-cream-100">{product.name || '(isimsiz)'}</div>
              <div className="text-sm text-cream-200/60 mt-1">
                Barkod: {product.barcode || product.id}
                {product.brand ? ` · ${product.brand}` : ''}
                {product.price ? ` · ${product.price} ₺` : ''}
                {` · Stok: ${product.stock ?? 0}`}
              </div>
            </div>

            <ButtonRow label="Renk (Zorunlu)" options={COLOR_OPTS} value={color} onChange={setColor} />
            <ButtonRow label="Gövde (Zorunlu)" options={LEVEL_OPTS} value={body} onChange={setBody} />
            <ButtonRow label="Tatlılık (Zorunlu)" options={LEVEL_OPTS} value={sweetness} onChange={setSweetness} />
            <ButtonRow label="Ülke (Zorunlu)" options={COUNTRY_OPTS} value={country} onChange={setCountry} />
            
            <MultiButtonRow label="Kullanım Amacı (Birden fazla seçilebilir)" options={PURPOSE_OPTS} values={usagePurposes} onChange={setUsagePurposes} />
            
            <BlockShelfRow 
              blockValue={block} 
              onBlockChange={setBlock} 
              shelfValue={shelf} 
              onShelfChange={setShelf} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <ButtonRow label="Öne Çıkan?" options={BOOL_OPTS} value={featured} onChange={setFeatured} />
              <ButtonRow label="Sömelye Tavsiyesi?" options={BOOL_OPTS} value={sommelierPick} onChange={setSommelierPick} />
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-charcoal-700 sticky bottom-0 bg-ink-950 pb-2">
              <button
                type="button"
                onClick={saveAndNext}
                disabled={!canSave}
                className="flex-1 rounded-xl bg-wine-800 px-5 py-3 font-semibold text-white hover:bg-wine-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet ve Sonraki →'}
              </button>
              <button
                type="button"
                onClick={advance}
                disabled={saving}
                className="rounded-xl border border-charcoal-700 bg-charcoal-800 px-5 py-3 text-cream-200 hover:border-gold-500 transition"
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