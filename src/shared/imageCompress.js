// Tarayıcıda resmi küçültüp sıkıştırarak base64 data URL döndürür.
// Ekstra servis/Storage gerektirmez; sonuç doğrudan Firestore'daki `image` alanına yazılır.
// Firestore doküman sınırı ~1MB olduğundan boyut küçük tutulur.

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Resim yüklenemedi'))
    img.src = src
  })
}

function drawToDataUrl(img, maxDim, quality) {
  let { width, height } = img
  if (width >= height && width > maxDim) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else if (height > width && height > maxDim) {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  // WebP daha küçük; desteklenmeyen tarayıcıda otomatik JPEG'e düşer.
  let out = canvas.toDataURL('image/webp', quality)
  if (!out.startsWith('data:image/webp')) {
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return out
}

// Yaklaşık byte boyutu (base64'ün ham karşılığı).
export function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  return Math.ceil((dataUrl.length - comma - 1) * 0.75)
}

// Resmi sıkıştırır. Sonuç hâlâ büyükse kademeli olarak daha çok küçültür.
export async function compressImageToDataUrl(file) {
  const original = await readAsDataUrl(file)
  const img = await loadImage(original)

  const attempts = [
    { maxDim: 800, quality: 0.72 },
    { maxDim: 640, quality: 0.62 },
    { maxDim: 480, quality: 0.55 },
  ]
  const limit = 900 * 1024 // ~0.9MB güvenli üst sınır (Firestore 1MB/doküman)

  let result = drawToDataUrl(img, attempts[0].maxDim, attempts[0].quality)
  for (let i = 1; i < attempts.length && dataUrlBytes(result) > limit; i++) {
    result = drawToDataUrl(img, attempts[i].maxDim, attempts[i].quality)
  }
  return result
}
