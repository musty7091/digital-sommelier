import { useEffect, useRef, useState } from 'react'
import { fetchAllProductsBrief, updateProductImage } from '../../firebase/products'

const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'
const ZIPLIB = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'

const PRESETS = [
  { label: 'Şişe 800×1000', w: 800, h: 1000 },
  { label: 'Kare 1000', w: 1000, h: 1000 },
  { label: 'Küçük 600×800', w: 600, h: 800 },
]

const FS_OK = typeof window !== 'undefined' && 'showDirectoryPicker' in window

export default function BulkImages() {
  const [ready, setReady] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [items, setItems] = useState([])
  const [modelMsg, setModelMsg] = useState('Model ilk resimde bir kez indirilecek (~40MB), sonra çevrimdışı çalışır.')
  const [dirName, setDirName] = useState('')
  const [s, setS] = useState({ w: 800, h: 1000, pad: 8, bg: 'transparent', removeBg: true, skipExisting: false, folder: 'products' })

  const mapRef = useRef({})
  const fnRef = useRef(null)
  const dirRef = useRef(null)
  const zipFilesRef = useRef([])
  const queueRef = useRef([])
  const workingRef = useRef(false)
  const idRef = useRef(0)
  const sRef = useRef(s)
  sRef.current = s

  useEffect(() => {
    fetchAllProductsBrief()
      .then((list) => {
        const m = {}
        list.forEach((p) => { m[String(p.id).trim()] = { name: p.name, hasImage: p.hasImage } })
        mapRef.current = m
        setReady(true)
      })
      .catch((e) => setLoadErr('Ürünler okunamadı: ' + e.message))
  }, [])

  const update = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  async function pickFolder() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      dirRef.current = handle
      setDirName(handle.name)
    } catch (_) { /* iptal */ }
  }

  function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    const news = files.map((f) => {
      const barcode = f.name.replace(/\.[^.]+$/, '').trim()
      const prod = mapRef.current[barcode]
      return {
        id: ++idRef.current, file: f, barcode,
        name: prod ? prod.name : null, matched: !!prod,
        srcURL: URL.createObjectURL(f), outURL: null,
        status: prod ? 'sırada' : 'barkod bulunamadı', badge: prod ? 'queued' : 'err',
      }
    })
    setItems((prev) => [...prev, ...news])
    news.forEach((n) => { if (n.matched) queueRef.current.push(n) })
    pump()
  }

  async function ensureModel() {
    if (fnRef.current) return
    setModelMsg('Kütüphane ve model yükleniyor…')
    const mod = await import(/* @vite-ignore */ LIB)
    fnRef.current = mod.removeBackground || mod.default
    setModelMsg('Model hazır.')
  }

  async function pump() {
    if (workingRef.current) return
    workingRef.current = true
    try {
      if (sRef.current.removeBg) await ensureModel()
      while (queueRef.current.length) {
        const it = queueRef.current.shift()
        await processItem(it)
      }
      setModelMsg(dirRef.current
        ? 'Bitti. Dosyalar seçtiğin klasöre yazıldı.'
        : 'Bitti. Dosyaları “Tümünü ZIP indir” ile alıp public/products içine çıkar.')
    } catch (e) {
      setModelMsg('Hata: ' + (e.message || e) + ' — internet bağlantısını kontrol et (model ilk sefer indirilir).')
    } finally {
      workingRef.current = false
    }
  }

  async function writeFile(name, blob) {
    if (dirRef.current) {
      const fh = await dirRef.current.getFileHandle(name, { create: true })
      const w = await fh.createWritable()
      await w.write(blob)
      await w.close()
    } else {
      zipFilesRef.current.push({ name, blob })
    }
  }

  async function processItem(it) {
    const cfg = sRef.current
    const prod = mapRef.current[it.barcode]
    try {
      if (cfg.skipExisting && prod && prod.hasImage) {
        update(it.id, { status: 'atlandı (görseli var)', badge: 'skip' })
        return
      }
      update(it.id, { status: cfg.removeBg ? 'arka plan siliniyor…' : 'işleniyor…', badge: 'work' })
      let srcBlob = it.file
      if (cfg.removeBg) srcBlob = await fnRef.current(it.file, { output: { format: 'image/png' } })

      update(it.id, { status: 'ölçekleniyor…', badge: 'work' })
      const img = await blobToImage(srcBlob)
      const blob = await compose(img, cfg)
      const fileName = `${it.barcode}.webp`
      const outURL = URL.createObjectURL(blob)

      update(it.id, { status: 'kaydediliyor…', badge: 'work', outURL })
      await writeFile(fileName, blob)
      await updateProductImage(it.barcode, `/${cfg.folder}/${fileName}`)
      if (prod) prod.hasImage = true
      update(it.id, { status: dirRef.current ? 'kaydedildi ✓' : 'hazır (ZIP) ✓', badge: 'ok' })
    } catch (e) {
      update(it.id, { status: 'hata: ' + (e.message || e), badge: 'err' })
    }
  }

  async function downloadZip() {
    if (!zipFilesRef.current.length) return
    const mod = await import(/* @vite-ignore */ ZIPLIB)
    const JSZip = mod.default || mod
    const zip = new JSZip()
    zipFilesRef.current.forEach(({ name, blob }) => zip.file(name, blob))
    const out = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(out)
    a.download = `${s.folder}.zip`
    a.click()
  }

  function setPreset(p) { setS((v) => ({ ...v, w: p.w, h: p.h })) }
  function removeItem(id) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id)
      if (it && it.srcURL) URL.revokeObjectURL(it.srcURL)
      return prev.filter((x) => x.id !== id)
    })
  }

  const counts = items.reduce((a, it) => {
    if (it.badge === 'ok') a.ok++
    else if (it.badge === 'err' && !it.matched) a.nf++
    else if (it.badge === 'err') a.err++
    else if (it.badge === 'skip') a.skip++
    return a
  }, { ok: 0, nf: 0, err: 0, skip: 0 })

  return (
    <div className="text-cream-100">
      <div className="mb-5">
        <h2 className="font-serif text-2xl text-cream-100">Toplu Görsel</h2>
        <p className="text-sm text-cream-200/60 mt-1">
          Dosya adı <b>barkod</b> olan resimleri sürükle. Arka plan silinir, ölçeklenir ve
          <b> public/{s.folder}/&lt;barkod&gt;.webp</b> olarak diske yazılır. Firestore'a yalnızca yol kaydedilir; görsel lokalde kalır.
        </p>
      </div>

      {loadErr && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">{loadErr}</div>
      )}

      <div className="mb-4 rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-4">
        {FS_OK ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={pickFolder}
              className="rounded-lg bg-wine-800 px-4 py-2 text-sm font-semibold text-white hover:bg-wine-700">
              📁 Çıktı klasörünü seç
            </button>
            <span className="text-sm text-cream-200/70">
              {dirName ? <>Seçili: <b className="text-gold-400">{dirName}</b></> : 'Projendeki public/products klasörünü seç (yoksa oluştur).'}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm text-cream-200/70">
            <span>Tarayıcın klasöre doğrudan yazmayı desteklemiyor. İşlenenleri ZIP indirip public/{s.folder} içine çıkar:</span>
            <button type="button" onClick={downloadZip}
              className="rounded-lg bg-wine-800 px-4 py-2 font-semibold text-white hover:bg-wine-700">⬇ Tümünü ZIP indir</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 md:gap-6 rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-4 mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-1.5">Boyut (px)</div>
          <div className="flex items-center gap-2">
            <input type="number" value={s.w} onChange={(e) => setS({ ...s, w: +e.target.value || 0 })}
              className="w-20 rounded-lg border border-charcoal-700 bg-ink-950 px-2.5 py-1.5 text-sm text-cream-100" />
            <span className="text-cream-200/50">×</span>
            <input type="number" value={s.h} onChange={(e) => setS({ ...s, h: +e.target.value || 0 })}
              className="w-20 rounded-lg border border-charcoal-700 bg-ink-950 px-2.5 py-1.5 text-sm text-cream-100" />
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-1.5">Hazır</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setPreset(p)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  s.w === p.w && s.h === p.h ? 'border-wine-700 bg-wine-800 text-white' : 'border-charcoal-700 bg-ink-950 text-cream-200 hover:border-gold-500'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-1.5">Kenar boşluğu: {s.pad}%</div>
          <input type="range" min="0" max="25" value={s.pad} onChange={(e) => setS({ ...s, pad: +e.target.value })} className="w-36 accent-gold-500" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-1.5">Arka plan</div>
          <div className="flex gap-2">
            {[{ k: 'transparent', t: 'Şeffaf' }, { k: '#ffffff', t: 'Beyaz' }, { k: '#efe7d6', t: 'Krem' }].map((b) => (
              <button key={b.k} type="button" onClick={() => setS({ ...s, bg: b.k })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  s.bg === b.k ? 'border-wine-700 bg-wine-800 text-white' : 'border-charcoal-700 bg-ink-950 text-cream-200 hover:border-gold-500'
                }`}>{b.t}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-cream-200 cursor-pointer">
          <input type="checkbox" checked={s.removeBg} onChange={(e) => setS({ ...s, removeBg: e.target.checked })} className="accent-wine-700" />
          Arka planı sil
        </label>
        <label className="flex items-center gap-2 text-sm text-cream-200 cursor-pointer">
          <input type="checkbox" checked={s.skipExisting} onChange={(e) => setS({ ...s, skipExisting: e.target.checked })} className="accent-wine-700" />
          Görseli olanları atla
        </label>
      </div>

      <div
        onClick={() => document.getElementById('bulk-file').click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-charcoal-700 bg-charcoal-800/30 px-6 py-10 text-center transition hover:border-gold-500 hover:bg-charcoal-800/50"
      >
        <div className="text-3xl mb-2">🍷</div>
        <div className="text-cream-100">Resimleri buraya <b className="text-gold-400">sürükle-bırak</b> &nbsp;veya&nbsp; <b className="text-gold-400">tıkla seç</b></div>
        <div className="text-xs text-cream-200/50 mt-2">
          Dosya adı barkod olmalı (ör. <span className="text-cream-200">8690000000001.jpg</span>). {ready ? '' : 'Ürünler yükleniyor…'}
        </div>
        <input id="bulk-file" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      <div className="mt-3 text-sm text-cream-200/60">{modelMsg}</div>

      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span className="text-emerald-300">Tamam: {counts.ok}</span>
          <span className="text-red-300">Bulunamadı: {counts.nf}</span>
          {counts.err > 0 && <span className="text-red-300">Hata: {counts.err}</span>}
          {counts.skip > 0 && <span className="text-cream-200/60">Atlandı: {counts.skip}</span>}
          {!FS_OK && counts.ok > 0 && (
            <button type="button" onClick={downloadZip} className="ml-auto rounded-lg bg-wine-800 px-3 py-1 text-white hover:bg-wine-700">⬇ Tümünü ZIP indir</button>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-ink-950/60">
              <div className="flex-1 h-24 rounded-lg overflow-hidden flex items-center justify-center bg-ink-950">
                <img src={it.srcURL} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-gold-400">→</div>
              <div className="flex-1 h-24 rounded-lg overflow-hidden flex items-center justify-center bulk-checker">
                {it.outURL ? <img src={it.outURL} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-cream-200/40">—</span>}
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-cream-200/50">Barkod: <span className="text-cream-100">{it.barcode || '—'}</span></div>
              <div className="text-sm text-cream-100 truncate">{it.matched ? it.name : <span className="text-red-300">eşleşen ürün yok</span>}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs rounded-full px-2.5 py-1 border ${badgeCls(it.badge)}`}>{it.status}</span>
                <button type="button" onClick={() => removeItem(it.id)} className="text-xs text-cream-200/50 hover:text-red-300">kaldır</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`.bulk-checker{background-image:linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%);background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0;background-color:#3a3a3a;}`}</style>
    </div>
  )
}

function badgeCls(b) {
  if (b === 'ok') return 'border-emerald-600/60 text-emerald-300'
  if (b === 'err') return 'border-red-700/60 text-red-300'
  if (b === 'work') return 'border-gold-500/60 text-gold-400'
  if (b === 'skip') return 'border-charcoal-600 text-cream-200/60'
  return 'border-charcoal-600 text-cream-200/60'
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = URL.createObjectURL(blob)
  })
}

function compose(img, cfg) {
  const tmp = document.createElement('canvas')
  tmp.width = img.naturalWidth
  tmp.height = img.naturalHeight
  const tctx = tmp.getContext('2d')
  tctx.drawImage(img, 0, 0)
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data

  let minX = tmp.width, minY = tmp.height, maxX = 0, maxY = 0, found = false
  for (let y = 0; y < tmp.height; y++) {
    for (let x = 0; x < tmp.width; x++) {
      if (data[(y * tmp.width + x) * 4 + 3] > 12) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) { minX = 0; minY = 0; maxX = tmp.width - 1; maxY = tmp.height - 1 }
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const W = cfg.w || 800, H = cfg.h || 1000, pad = (cfg.pad || 0) / 100
  const availW = W * (1 - pad * 2), availH = H * (1 - pad * 2)
  const scale = Math.min(availW / cropW, availH / cropH)
  const dw = cropW * scale, dh = cropH * scale
  const dx = (W - dw) / 2, dy = (H - dh) / 2

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const octx = out.getContext('2d')
  if (cfg.bg !== 'transparent') { octx.fillStyle = cfg.bg; octx.fillRect(0, 0, W, H) }
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(tmp, minX, minY, cropW, cropH, dx, dy, dw, dh)

  return new Promise((res) => out.toBlob((b) => res(b), 'image/webp', 0.85))
}
