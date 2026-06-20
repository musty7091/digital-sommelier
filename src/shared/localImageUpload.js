import { normalizeBarcode } from './productImage'

const DEFAULT_API_URL = 'http://localhost:8787'

function getLocalImageApiUrl() {
  return import.meta.env.VITE_LOCAL_IMAGE_API_URL || DEFAULT_API_URL
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Görsel dosyası okunamadı.'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Görsel WebP formatına dönüştürülemedi.'))
          return
        }

        resolve(blob)
      },
      'image/webp',
      quality,
    )
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Görsel base64 verisine çevrilemedi.'))

    reader.readAsDataURL(blob)
  })
}

function getResizedSize(width, height, maxDimension) {
  const largest = Math.max(width, height)

  if (largest <= maxDimension) {
    return { width, height }
  }

  const ratio = maxDimension / largest

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export async function prepareProductImage(file, options = {}) {
  const {
    maxDimension = 1200,
    targetMaxBytes = 300 * 1024,
    minQuality = 0.55,
    startQuality = 0.86,
  } = options

  if (!file) {
    throw new Error('Lütfen bir görsel seçin.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Seçilen dosya görsel değil.')
  }

  const image = await loadImageFromFile(file)
  const size = getResizedSize(image.naturalWidth, image.naturalHeight, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Tarayıcı görsel işleme alanı oluşturamadı.')
  }

  ctx.drawImage(image, 0, 0, size.width, size.height)

  let quality = startQuality
  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > targetMaxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.06)
    blob = await canvasToBlob(canvas, quality)
  }

  const dataUrl = await blobToDataUrl(blob)

  return {
    dataUrl,
    blob,
    size: blob.size,
    width: size.width,
    height: size.height,
    quality,
    extension: 'webp',
    contentType: 'image/webp',
  }
}

export async function uploadProductImageToLocalApi({ barcode, preparedImage }) {
  const cleanBarcode = normalizeBarcode(barcode)

  if (!cleanBarcode) {
    throw new Error('Görsel kaydetmek için barkod zorunludur.')
  }

  if (!preparedImage?.dataUrl) {
    throw new Error('Kaydedilecek görsel hazırlanmadı.')
  }

  const response = await fetch(`${getLocalImageApiUrl()}/api/product-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      barcode: cleanBarcode,
      base64: preparedImage.dataUrl,
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.ok) {
    throw new Error(result?.message || 'Görsel lokal klasöre kaydedilemedi.')
  }

  return result
}

export function formatImageSize(bytes) {
  if (!Number.isFinite(bytes)) return ''

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}