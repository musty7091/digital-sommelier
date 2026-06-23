import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeBarcode } from '../../shared/productImage'
import { uploadProductImageToLocalApi, formatImageSize } from '../../shared/localImageUpload'
import { processImageBlob, DEFAULT_IMAGE_SETTINGS } from '../../shared/imageProcessing'

const IMG_API = import.meta.env.VITE_LOCAL_IMAGE_API_URL || 'http://localhost:8787'

export default function BulkImagePaste({ products, onClose, onSaved }) {
  const [existing, setExisting] = useState(null) // Set<barcode> | null (yükleniyor)
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [idx, setIdx] = useState(0)
  const [preview, setPreview] = useState(null) // hazırlanmış görsel
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [settings, setSettings] = useState(DEFAULT_IMAGE_SETTINGS)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const fileRef = useRef(null)

  // Mevcut resim barkodlarını çek
  useEffect(() => {
    let alive = true
    fetch(`${IMG_API}/api/product-images`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setExisting(new Set((d?.barcodes || []).map((b) => normalizeBarcode(b))))
      })
      .catch(() => {
        if (alive) setExisting(new Set())
      })
    return () => {
      alive = false
    }
  }, [])

  const queue = useMemo(() => {
    const list = (products || []).filter((p) => normalizeBarcode(p.barcode))
    if (!onlyMissing || !existing) return list
    return list.filter((p) => !existing.has(normalizeBarcode(p.barcode)))
  }, [products, onlyMissing, existing])

  const total = queue.length
  const current = queue[idx]

  async function handleBlob(blob) {
    if (!blob) return
    setError('')
    setBusy(true)
    setPhase(settings.removeBg ? 'Arka plan siliniyor…' : 'İşleniyor…')
    try {
      const prepared = await processImageBlob(blob, settings, (ph) =>
        setPhase(ph === 'removing' ? 'Arka plan siliniyor…' : 'Ölçekleniyor…'),
      )
      setPreview(prepared)
    } catch (e) {
      setError((e.message || 'Görsel işlenemedi.') + ' (Model ilk kullanımda ~40MB indirilir; internet gerekir.)')
      setPreview(null)
    } finally {
      setBusy(false)
      setPhase('')
    }
  }

  // Pano yapıştırma (Ctrl+V)
  useEffect(() => {
    function onPaste(e) {
      const items = e.clipboardData?.items || []
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const blob = it.getAsFile()
          if (blob) {
            e.preventDefault()
            handleBlob(blob)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  function goNext() {
    setPreview(null)
    setError('')
    setIdx((i) => Math.min(i + 1, total))
  }
  function goBack() {
    setPreview(null)
    setError('')
    setIdx((i) => Math.max(i - 1, 0))
  }
  function skip() {
    setSkipped((s) => s + 1)
    goNext()
  }

  async function saveAndNext() {
    if (!preview || !current) return
    setBusy(true)
    setError('')
    try {
      const barcode = normalizeBarcode(current.barcode)
      await uploadProductImageToLocalApi({ barcode, preparedImage: preview })
      setExisting((prev) => {
        const n = new Set(prev || [])
        n.add(barcode)
        return n
      })
      setSaved((s) => s + 1)
      // "sadece eksikler" modunda kaydedilen sıradan düşer; idx'i sabit tutmak sıradakine getirir
      setPreview(null)
      if (onlyMissing) {
        setIdx((i) => Math.min(i, total - 2 < 0 ? 0 : total - 1))
      } else {
        setIdx((i) => Math.min(i + 1, total))
      }
    } catch (e) {
      setError(e.message || 'Kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  // Klavye: Enter = kaydet & sıradaki, ok tuşları gez
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter' && preview && !busy) {
        e.preventDefault()
        saveAndNext()
      } else if (e.key === 'ArrowRight') {
        skip()
      } else if (e.key === 'ArrowLeft') {
        goBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function searchUrl(engine) {
    const q = encodeURIComponent(`${current?.name || ''} ${current?.brand || ''} şarap şişesi`.trim())
    return engine === 'bing'
      ? `https://www.bing.com/images/search?q=${q}`
      : `https://www.google.com/search?tbm=isch&q=${q}`
  }

  function close() {
    if (saved > 0) onSaved?.()
    onClose?.()
  }

  const done = existing !== null && idx >= total
  const barcode = normalizeBarcode(current?.barcode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-charcoal-700 bg-charcoal-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-xl text-cream-100">📷 Hızlı Resim Yapıştırma</h3>
          <button type="button" onClick={close} className="text-cream-200/60 hover:text-cream-100 text-2xl leading-none">×</button>
        </div>

        {existing === null && <p className="text-cream-200/70 py-10 text-center">Mevcut resimler yükleniyor…</p>}

        {existing !== null && total === 0 && (
          <p className="text-cream-100 py-10 text-center">Bu listedeki tüm ürünlerin resmi mevcut 🎉</p>
        )}

        {existing !== null && done && total > 0 && (
          <div className="py-10 text-center space-y-3">
            <p className="text-cream-100 text-lg">Bitti! <b className="text-emerald-300">{saved}</b> resim kaydedildi.</p>
            <button type="button" onClick={close} className="rounded-lg bg-wine-800 px-6 py-2.5 font-semibold text-white hover:bg-wine-700">Kapat</button>
          </div>
        )}

        {existing !== null && !done && current && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-cream-100">
                <input type="checkbox" checked={onlyMissing} onChange={(e) => { setOnlyMissing(e.target.checked); setIdx(0); setPreview(null) }} />
                Sadece resmi olmayanlar
              </label>
              <span className="text-cream-200/70">
                {idx + 1} / {total} · <b className="text-emerald-300">{saved}</b> kaydedildi · <b className="text-gold-400">{skipped}</b> geçildi
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-ink-950 overflow-hidden">
              <div className="h-full bg-gold-500 transition-all" style={{ width: `${total ? Math.round((idx / total) * 100) : 0}%` }} />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-charcoal-700 bg-ink-950/40 px-3 py-2 text-sm">
              <label className="flex items-center gap-2 text-cream-100">
                <input type="checkbox" checked={settings.removeBg} onChange={(e) => setSettings((p) => ({ ...p, removeBg: e.target.checked }))} className="accent-wine-700" />
                Arka planı sil
              </label>
              <span className="text-cream-200/50">Arka plan:</span>
              <div className="flex gap-1.5">
                {[{ k: 'transparent', t: 'Şeffaf' }, { k: '#ffffff', t: 'Beyaz' }, { k: '#efe7d6', t: 'Krem' }].map((b) => (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => setSettings((p) => ({ ...p, bg: b.k }))}
                    className={`rounded-md border px-2.5 py-1 text-xs ${settings.bg === b.k ? 'border-wine-700 bg-wine-800 text-white' : 'border-charcoal-600 bg-ink-950 text-cream-200 hover:border-gold-500'}`}
                  >
                    {b.t}
                  </button>
                ))}
              </div>
              <span className="text-cream-200/40 text-xs ml-auto">800×1000 · Toplu Görsel ile aynı</span>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* SOL: ürün + arama */}
              <div className="space-y-3">
                <div className="rounded-xl border border-charcoal-700 bg-ink-950/40 p-4">
                  <p className="font-serif text-lg text-cream-100 leading-tight">{current.name}</p>
                  <p className="text-cream-200/60 text-sm mt-0.5">{current.brand || '—'} · {barcode}</p>
                </div>
                <div className="flex gap-2">
                  <a href={searchUrl('google')} target="_blank" rel="noreferrer" className="flex-1 text-center rounded-lg bg-wine-800 hover:bg-wine-700 text-white font-semibold py-2.5">🔍 Google Görsel</a>
                  <a href={searchUrl('bing')} target="_blank" rel="noreferrer" className="flex-1 text-center rounded-lg border border-charcoal-600 hover:border-gold-500 text-cream-100 py-2.5">Bing</a>
                </div>
                {existing.has(barcode) && (
                  <div className="rounded-lg border border-charcoal-700 bg-ink-950/40 p-2 flex items-center gap-3">
                    <img src={`/product-images/${barcode}.webp?t=${saved}`} alt="" className="h-16 w-16 object-contain rounded" />
                    <span className="text-xs text-gold-400">Bu üründe zaten resim var — yenisini yapıştırırsan değiştirilir.</span>
                  </div>
                )}
                <p className="text-xs text-cream-200/50 leading-relaxed">
                  İpucu: Aramada doğru şişeyi bulunca görsele <b>sağ tık → Resmi kopyala</b>, sonra buraya dönüp <b>Ctrl+V</b>. Arka plan otomatik silinir; beyaz/karışık arka planlı görseller bile kullanılabilir. <span className="text-gold-400">İlk görselde model bir kez (~40MB) indirilir; sonrası hızlıdır.</span>
                </p>
              </div>

              {/* SAĞ: yapıştır / önizleme */}
              <div className="space-y-3">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleBlob(f) }}
                  className="rounded-xl border-2 border-dashed border-charcoal-600 bg-ink-950/40 min-h-[220px] flex items-center justify-center p-3 text-center"
                >
                  {busy && <span className="text-cream-200/70">{phase || 'İşleniyor…'}</span>}
                  {!busy && preview && (
                    <img src={preview.dataUrl} alt="" className="max-h-[220px] object-contain" />
                  )}
                  {!busy && !preview && (
                    <span className="text-cream-200/50 text-sm">Görseli buraya <b>Ctrl+V</b> ile yapıştır<br />ya da sürükle-bırak / dosya seç</span>
                  )}
                </div>
                {preview && (
                  <p className="text-xs text-cream-200/50 text-center">{preview.width}×{preview.height} · {formatImageSize(preview.size)} · webp</p>
                )}
                {error && <p className="text-rose-300 text-sm text-center">{error}</p>}

                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-charcoal-600 px-3 py-2.5 text-cream-200 hover:border-gold-500 text-sm">Dosya…</button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBlob(f); e.target.value = '' }} />
                  <button type="button" onClick={skip} className="rounded-lg border border-charcoal-600 px-3 py-2.5 text-cream-200 hover:border-gold-500 text-sm">Geç →</button>
                  <button
                    type="button"
                    onClick={saveAndNext}
                    disabled={!preview || busy}
                    className="flex-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-40"
                  >
                    Kaydet ve Sıradaki ⏎
                  </button>
                </div>
                <div className="flex justify-between text-xs text-cream-200/40">
                  <button type="button" onClick={goBack} className="hover:text-cream-100">← Geri</button>
                  <button type="button" onClick={close} className="hover:text-cream-100">Kapat</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
