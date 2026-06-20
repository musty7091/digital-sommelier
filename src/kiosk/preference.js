// Kiosk alt şeridindeki "en çok tercih edilenler" sıralaması.
// Öncelik gerçek kullanım/satış sayılarındadır. Bu alanlar yoksa ürünler
// yapay/fake sayı üretilmeden yalnızca mevcut ürün verisiyle kararlı sıralanır.

const PREFERENCE_FIELDS = [
  'preferenceCount',
  'preferredCount',
  'viewCount',
  'detailViewCount',
  'kioskViewCount',
  'productViewCount',
  'salesCount',
  'soldCount',
  'totalSales',
  'last30DaysSales',
]

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function statsValue(product, key) {
  return toNumber(product?.preferenceStats?.[key])
}

export function getPreferenceCount(product) {
  const statCount = statsValue(product, 'count')
  if (statCount > 0) return statCount

  for (const key of PREFERENCE_FIELDS) {
    const value = toNumber(product?.[key])
    if (value > 0) return value
  }

  return 0
}

export function hasPreferenceData(products) {
  return (products || []).some((product) => getPreferenceCount(product) > 0)
}

export function getPreferenceScore(product) {
  const realCount = getPreferenceCount(product)
  if (realCount > 0) return realCount

  // priorityScore gerçek tercih sayısı değildir; yalnızca tercih sayısı olmayan
  // ürünlerde stabil yedek sıralama için kullanılır. Ekranda sayı olarak gösterilmez.
  return toNumber(product?.priorityScore)
}

export function sortByPreference(products) {
  return [...(products || [])].sort((a, b) => {
    const scoreDiff = getPreferenceScore(b) - getPreferenceScore(a)
    if (scoreDiff !== 0) return scoreDiff

    const pickDiff = Number(Boolean(b?.sommelierPick)) - Number(Boolean(a?.sommelierPick))
    if (pickDiff !== 0) return pickDiff

    const stockDiff = toNumber(b?.stock) - toNumber(a?.stock)
    if (stockDiff !== 0) return stockDiff

    return String(a?.name || '').localeCompare(String(b?.name || ''), 'tr')
  })
}
