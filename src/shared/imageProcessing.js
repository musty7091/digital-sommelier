// "Toplu Görsel" sekmesiyle BİREBİR aynı arka plan silme + ölçek/pad mantığı.
// Tek kaynak: hem BulkImages hem BulkImagePaste aynı sonucu üretsin diye.

const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'

export const DEFAULT_IMAGE_SETTINGS = {
  w: 800,
  h: 1000,
  pad: 8,
  bg: 'transparent',
  removeBg: true,
}

let _removeFn = null

export async function ensureBgRemover() {
  if (_removeFn) return _removeFn
  const mod = await import(/* @vite-ignore */ LIB)
  _removeFn = mod.removeBackground || mod.default
  return _removeFn
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = URL.createObjectURL(blob)
  })
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = () => rej(new Error('Görsel base64 verisine çevrilemedi.'))
    r.readAsDataURL(blob)
  })
}

// BulkImages.compose ile aynı: şeffaf bbox kırp, W×H'ye ortala, webp döndür
function compose(img, cfg) {
  const tmp = document.createElement('canvas')
  tmp.width = img.naturalWidth
  tmp.height = img.naturalHeight
  const tctx = tmp.getContext('2d')
  tctx.drawImage(img, 0, 0)
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data

  let minX = tmp.width
  let minY = tmp.height
  let maxX = 0
  let maxY = 0
  let found = false
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
  if (!found) {
    minX = 0
    minY = 0
    maxX = tmp.width - 1
    maxY = tmp.height - 1
  }
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const W = cfg.w || 800
  const H = cfg.h || 1000
  const pad = (cfg.pad || 0) / 100
  const availW = W * (1 - pad * 2)
  const availH = H * (1 - pad * 2)
  const scale = Math.min(availW / cropW, availH / cropH)
  const dw = cropW * scale
  const dh = cropH * scale
  const dx = (W - dw) / 2
  const dy = (H - dh) / 2

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const octx = out.getContext('2d')
  if (cfg.bg !== 'transparent') {
    octx.fillStyle = cfg.bg
    octx.fillRect(0, 0, W, H)
  }
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(tmp, minX, minY, cropW, cropH, dx, dy, dw, dh)

  return new Promise((res) => out.toBlob((b) => res(b), 'image/webp', 0.85))
}

// blob (yapıştırılan/sürüklenen görsel) -> arka plan silinmiş, ölçeklenmiş webp
// onPhase: 'removing' | 'scaling' aşamalarını bildirmek için (opsiyonel)
export async function processImageBlob(blob, settings = DEFAULT_IMAGE_SETTINGS, onPhase) {
  if (!blob) throw new Error('Görsel yok.')
  const cfg = { ...DEFAULT_IMAGE_SETTINGS, ...settings }

  let srcBlob = blob
  if (cfg.removeBg) {
    onPhase?.('removing')
    const remove = await ensureBgRemover()
    srcBlob = await remove(blob, { output: { format: 'image/png' } })
  }

  onPhase?.('scaling')
  const img = await blobToImage(srcBlob)
  const webp = await compose(img, cfg)
  const dataUrl = await blobToDataUrl(webp)

  return {
    dataUrl,
    blob: webp,
    size: webp.size,
    width: cfg.w,
    height: cfg.h,
    extension: 'webp',
    contentType: 'image/webp',
  }
}
