const DEFAULT_LOCAL_API_URL = 'http://localhost:8788'

export const DEFAULT_KIOSK_SETTINGS = {
  idleTimeoutSeconds: 120,
  autoResetSeconds: 120,
  showPopularProducts: true,
  showStock: true,
  showPrice: true,
  maxResults: 12,
  maxLivePreviewProducts: 30,
  language: 'tr',
  isKioskEnabled: true,

  colors: [
    { value: 'red', label: { tr: 'Kırmızı', en: 'Red' } },
    { value: 'white', label: { tr: 'Beyaz', en: 'White' } },
    { value: 'rose', label: { tr: 'Roze', en: 'Rosé' } },
    { value: 'sparkling', label: { tr: 'Köpüklü', en: 'Sparkling' } },
  ],

  priceRanges: [
    { value: 'budget', label: { tr: 'Ekonomik', en: 'Budget' }, min: 0, max: 500 },
    { value: 'mid', label: { tr: 'Orta Seviye', en: 'Mid range' }, min: 500, max: 1000 },
    { value: 'premium', label: { tr: 'Premium', en: 'Premium' }, min: 1000, max: 2000 },
    { value: 'luxury', label: { tr: 'Üst Segment', en: 'Luxury' }, min: 2000, max: null },
  ],

  usagePurposes: [
    { value: 'daily', label: { tr: 'Günlük tüketim', en: 'Everyday' } },
    { value: 'gift', label: { tr: 'Hediye', en: 'Gift' } },
    { value: 'dinner', label: { tr: 'Yemek eşliği', en: 'Dinner pairing' } },
    { value: 'special', label: { tr: 'Özel gün', en: 'Special occasion' } },
  ],

  countries: [],
}

function getLocalApiUrl() {
  return import.meta.env.VITE_PRODUCT_DB_API_URL || DEFAULT_LOCAL_API_URL
}

function cleanText(value) {
  return String(value || '').trim()
}

function normalizeBarcode(value) {
  return String(value || '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  const normalized = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value, fallback = true) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const normalized = String(value).trim().toLowerCase()

  if (['1', 'true', 'evet', 'yes', 'aktif', 'active', 'a'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'hayır', 'hayir', 'no', 'pasif', 'inactive', 'p'].includes(normalized)) {
    return false
  }

  return fallback
}

function getFirstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

function normalizeLocalizedText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      tr: cleanText(value.tr || value.TR || value.tr_TR || ''),
      en: cleanText(value.en || value.EN || value.en_US || ''),
    }
  }

  return {
    tr: cleanText(value),
    en: '',
  }
}

function normalizeProduct(rawProduct = {}, fallbackId = '') {
  const barcode = normalizeBarcode(
    getFirstValue(
      rawProduct,
      ['barcode', 'Barcode', 'BARCODE', 'barkod', 'Barkod'],
      fallbackId,
    ),
  )

  const id = normalizeBarcode(rawProduct.id || barcode || fallbackId)

  const shortDescription = normalizeLocalizedText(
    rawProduct.shortDescription || {
      tr: rawProduct.descriptionTr || rawProduct.description || '',
      en: rawProduct.descriptionEn || '',
    },
  )

  const tasteNotes = normalizeLocalizedText(rawProduct.tasteNotes || '')
  const foodPairing = normalizeLocalizedText(rawProduct.foodPairing || '')

  const active = toBoolean(
    getFirstValue(rawProduct, ['active', 'isActive', 'Active', 'IsActive'], true),
    true,
  )

  return {
    ...rawProduct,

    id: id || barcode,
    barcode,

    name: cleanText(
      getFirstValue(rawProduct, ['name', 'productName', 'ProductName', 'UrunAdi', 'ÜrünAdı']),
    ),

    brand: cleanText(getFirstValue(rawProduct, ['brand', 'Brand', 'Marka'])),

    category: cleanText(
      getFirstValue(rawProduct, ['category', 'Category', 'Kategori', 'Grup']),
    ),

    price: toNumber(getFirstValue(rawProduct, ['price', 'Price', 'Fiyat']), 0),
    stock: toNumber(getFirstValue(rawProduct, ['stock', 'Stock', 'Stok']), 0),

    active,
    isActive: active,

    color: cleanText(getFirstValue(rawProduct, ['color', 'Color', 'Renk'])),
    country: cleanText(getFirstValue(rawProduct, ['country', 'Country', 'Ulke', 'Ülke'])),
    region: cleanText(getFirstValue(rawProduct, ['region', 'Region', 'Bolge', 'Bölge'])),
    grape: cleanText(getFirstValue(rawProduct, ['grape', 'Grape', 'UzumTuru', 'ÜzümTürü'])),

    body: cleanText(getFirstValue(rawProduct, ['body', 'Body', 'Govde', 'Gövde'])),
    sweetness: cleanText(
      getFirstValue(rawProduct, ['sweetness', 'Sweetness', 'Tatlilik', 'Tatlılık']),
    ),
    taste: cleanText(getFirstValue(rawProduct, ['taste', 'Taste'])) ||
      cleanText(getFirstValue(rawProduct, ['sweetness', 'Sweetness', 'Tatlilik', 'Tatlılık'])),
    acidity: cleanText(getFirstValue(rawProduct, ['acidity', 'Acidity', 'Asidite'])),
    tannin: cleanText(getFirstValue(rawProduct, ['tannin', 'Tannin', 'Tanen'])),

    block: cleanText(getFirstValue(rawProduct, ['block', 'Block', 'Blok'])),
    shelf: cleanText(getFirstValue(rawProduct, ['shelf', 'Shelf', 'Raf'])),

    usagePurposes: Array.isArray(rawProduct.usagePurposes)
      ? rawProduct.usagePurposes
      : [],

    shortDescription,
    tasteNotes,
    foodPairing,

    description: cleanText(rawProduct.description || shortDescription.tr || ''),
    descriptionTr: cleanText(rawProduct.descriptionTr || shortDescription.tr || ''),
    descriptionEn: cleanText(rawProduct.descriptionEn || shortDescription.en || ''),

    sommelierPick: Boolean(rawProduct.sommelierPick),
    featured: Boolean(rawProduct.featured),
    priorityScore: toNumber(rawProduct.priorityScore, 0),

    imagePath: rawProduct.imagePath || (barcode ? `/product-images/${barcode}.webp` : ''),
    imageUpdatedAt: rawProduct.imageUpdatedAt || null,

    missingFields: Array.isArray(rawProduct.missingFields) ? rawProduct.missingFields : [],
    metadataStatus: rawProduct.metadataStatus || '',
    kioskReady: Boolean(rawProduct.kioskReady),
    needsReview: Boolean(rawProduct.needsReview),
  }
}

function extractProductsFromResponse(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.products)) {
    return payload.products
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows
  }

  return []
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${getLocalApiUrl()}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || `Lokal API hatası. HTTP ${response.status}`)
  }

  return payload
}

export function normalizeKioskSettings(settings = {}) {
  return {
    ...DEFAULT_KIOSK_SETTINGS,
    ...settings,

    idleTimeoutSeconds: Number(
      settings.idleTimeoutSeconds ??
        settings.autoResetSeconds ??
        DEFAULT_KIOSK_SETTINGS.idleTimeoutSeconds,
    ),

    autoResetSeconds: Number(
      settings.autoResetSeconds ??
        settings.idleTimeoutSeconds ??
        DEFAULT_KIOSK_SETTINGS.autoResetSeconds,
    ),

    maxResults: Number(settings.maxResults ?? DEFAULT_KIOSK_SETTINGS.maxResults),

    maxLivePreviewProducts: Number(
      settings.maxLivePreviewProducts ??
        DEFAULT_KIOSK_SETTINGS.maxLivePreviewProducts,
    ),

    showPopularProducts:
      settings.showPopularProducts ?? DEFAULT_KIOSK_SETTINGS.showPopularProducts,

    showStock: settings.showStock ?? DEFAULT_KIOSK_SETTINGS.showStock,
    showPrice: settings.showPrice ?? DEFAULT_KIOSK_SETTINGS.showPrice,
    language: settings.language || DEFAULT_KIOSK_SETTINGS.language,
    isKioskEnabled: settings.isKioskEnabled ?? DEFAULT_KIOSK_SETTINGS.isKioskEnabled,

    colors: Array.isArray(settings.colors) && settings.colors.length
      ? settings.colors
      : DEFAULT_KIOSK_SETTINGS.colors,

    priceRanges: Array.isArray(settings.priceRanges) && settings.priceRanges.length
      ? settings.priceRanges
      : DEFAULT_KIOSK_SETTINGS.priceRanges,

    usagePurposes: Array.isArray(settings.usagePurposes) && settings.usagePurposes.length
      ? settings.usagePurposes
      : DEFAULT_KIOSK_SETTINGS.usagePurposes,

    countries: Array.isArray(settings.countries)
      ? settings.countries
      : DEFAULT_KIOSK_SETTINGS.countries,
  }
}

export async function fetchKioskSettings() {
  try {
    const payload = await requestJson('/api/kiosk-settings')
    return normalizeKioskSettings(payload.settings || payload)
  } catch (error) {
    console.error('Lokal kiosk ayarları alınamadı:', error)
    return DEFAULT_KIOSK_SETTINGS
  }
}

export async function saveKioskSettings(settings = {}) {
  const normalizedSettings = normalizeKioskSettings(settings)

  const payload = await requestJson('/api/kiosk-settings', {
    method: 'PUT',
    body: JSON.stringify({
      settings: normalizedSettings,
    }),
  })

  return {
    ok: true,
    settings: normalizeKioskSettings(payload.settings || normalizedSettings),
  }
}

export async function fetchAllProducts() {
  const payload = await requestJson('/api/products')
  const products = extractProductsFromResponse(payload)

  return products.map((product, index) => normalizeProduct(product, `product-${index}`))
}

export async function fetchProducts() {
  return fetchAllProducts()
}

export async function fetchActiveProducts() {
  const payload = await requestJson('/api/products?activeOnly=1&inStockOnly=1&kioskReadyOnly=1')
  const products = extractProductsFromResponse(payload)

  return products.map((product, index) => normalizeProduct(product, `active-product-${index}`))
}

export async function fetchAllProductsBrief() {
  const products = await fetchAllProducts()

  return products.map((product) => ({
    id: product.id,
    barcode: product.barcode || product.id,
    name: product.name || product.barcode || product.id,
    brand: product.brand || '',
    category: product.category || '',
    stock: product.stock ?? 0,
    price: product.price ?? 0,

    color: product.color || '',
    country: product.country || '',
    region: product.region || '',
    grape: product.grape || '',
    body: product.body || '',
    sweetness: product.sweetness || '',
    taste: product.taste || '',
    acidity: product.acidity || '',
    tannin: product.tannin || '',

    metadataStatus: product.metadataStatus || '',
    missingFields: product.missingFields || [],
    kioskReady: Boolean(product.kioskReady),
    needsReview: Boolean(product.needsReview),

    imagePath: product.imagePath || '',
    imageUpdatedAt: product.imageUpdatedAt || null,

    active: product.active,
    isActive: product.isActive,
  }))
}

export async function getProductById(productIdOrBarcode) {
  return fetchProduct(productIdOrBarcode)
}

export async function fetchProduct(productIdOrBarcode) {
  const cleanId = normalizeBarcode(productIdOrBarcode)

  if (!cleanId) {
    return null
  }

  const payload = await requestJson(`/api/products/${encodeURIComponent(cleanId)}`)
  const product = payload.product || payload

  return normalizeProduct(product, cleanId)
}

function buildMetadataPayload(product = {}) {
  return {
    barcode: normalizeBarcode(product.barcode || product.id),

    name: product.name,
    brand: product.brand,

    color: product.color,
    country: product.country,
    region: product.region,
    grape: product.grape,

    body: product.body,
    sweetness: product.sweetness,
    taste: product.taste || product.sweetness,
    acidity: product.acidity,
    tannin: product.tannin,

    block: product.block,
    shelf: product.shelf,

    usagePurposes: Array.isArray(product.usagePurposes)
      ? product.usagePurposes
      : [],

    shortDescription: product.shortDescription,
    tasteNotes: product.tasteNotes,
    foodPairing: product.foodPairing,

    description: product.description,
    descriptionTr: product.descriptionTr,
    descriptionEn: product.descriptionEn,

    sommelierPick: Boolean(product.sommelierPick),
    featured: Boolean(product.featured),
    priorityScore: toNumber(product.priorityScore, 0),

    imagePath: product.imagePath,
    imageUpdatedAt: product.imageUpdatedAt,
  }
}

export async function saveProduct(product = {}) {
  const barcode = normalizeBarcode(product.barcode || product.id)

  if (!barcode) {
    throw new Error('Ürün kaydetmek için barkod zorunludur.')
  }

  const payload = await requestJson(`/api/products/${encodeURIComponent(barcode)}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(buildMetadataPayload({
      ...product,
      barcode,
    })),
  })

  return {
    ok: true,
    id: barcode,
    barcode,
    product: payload.product ? normalizeProduct(payload.product, barcode) : null,
  }
}

export async function createProduct(product = {}) {
  return saveProduct(product)
}

export async function updateProduct(productIdOrBarcode, updates = {}) {
  const barcode = normalizeBarcode(productIdOrBarcode || updates.id || updates.barcode)

  if (!barcode) {
    throw new Error('Güncellenecek ürün ID veya barkod zorunludur.')
  }

  const payload = await requestJson(`/api/products/${encodeURIComponent(barcode)}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(buildMetadataPayload({
      ...updates,
      barcode,
    })),
  })

  return {
    ok: true,
    id: barcode,
    barcode,
    product: payload.product ? normalizeProduct(payload.product, barcode) : null,
  }
}

export async function updateProductFields(productIdOrBarcode, updates = {}) {
  return updateProduct(productIdOrBarcode, updates)
}

export async function updateProductImage(productIdOrBarcode, payload = {}) {
  const barcode = normalizeBarcode(productIdOrBarcode || payload.id || payload.barcode)

  if (!barcode) {
    throw new Error('Ürün görseli güncellemek için ürün ID veya barkod zorunludur.')
  }

  const imagePayload = {
    barcode,
    imagePath: payload.imagePath || `/product-images/${barcode}.webp`,
    imageUpdatedAt: new Date().toISOString(),
  }

  const responsePayload = await requestJson(`/api/products/${encodeURIComponent(barcode)}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(imagePayload),
  })

  return {
    ok: true,
    id: barcode,
    barcode,
    imagePath: imagePayload.imagePath,
    imageUpdatedAt: imagePayload.imageUpdatedAt,
    product: responsePayload.product
      ? normalizeProduct(responsePayload.product, barcode)
      : null,
  }
}

export async function deleteProduct(productIdOrBarcode) {
  const barcode = normalizeBarcode(productIdOrBarcode)

  if (!barcode) {
    throw new Error('Silinecek ürün ID veya barkod zorunludur.')
  }

  /**
   * Ürünler SQL Server / Vega tarafından geldiği için frontend'den ürün silinmez.
   * Bu fonksiyon eski admin ekranları kırılmasın diye tutulur.
   */
  throw new Error('Lokal sistemde ürün silme işlemi yapılmaz. Ürünler SQL Server/Vega kaynağından gelir.')
}

export async function bulkSaveProducts(products = []) {
  if (!Array.isArray(products)) {
    throw new Error('Ürün listesi dizi formatında olmalıdır.')
  }

  const items = products
    .map((product) => buildMetadataPayload(product))
    .filter((product) => normalizeBarcode(product.barcode))

  const payload = await requestJson('/api/products/bulk-metadata', {
    method: 'POST',
    body: JSON.stringify({
      items,
    }),
  })

  return {
    ok: true,
    count: payload.success || items.length,
    total: payload.total || items.length,
    failed: payload.failed || 0,
    results: payload.results || [],
  }
}

export async function fetchAuditLogs(limit = 200) {
  const payload = await requestJson(`/api/audit-logs?limit=${Number(limit) || 200}`)
  return payload.logs || []
}

export async function logAuditAction(entry = {}) {
  const payload = await requestJson('/api/audit-logs', {
    method: 'POST',
    body: JSON.stringify(entry),
  })

  return payload.log || payload
}

export default {
  DEFAULT_KIOSK_SETTINGS,
  normalizeKioskSettings,
  fetchKioskSettings,
  saveKioskSettings,
  fetchAllProducts,
  fetchProducts,
  fetchActiveProducts,
  fetchAllProductsBrief,
  fetchProduct,
  getProductById,
  saveProduct,
  createProduct,
  updateProduct,
  updateProductFields,
  updateProductImage,
  deleteProduct,
  bulkSaveProducts,
  fetchAuditLogs,
  logAuditAction,
}