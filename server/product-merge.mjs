import fs from 'node:fs'

const REQUIRED_KIOSK_FIELDS = ['color', 'body', 'sweetness']

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeBarcode(value) {
  return String(value ?? '')
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

  if (
    [
      '1',
      'true',
      'evet',
      'yes',
      'aktif',
      'active',
      'a',
      'ok',
      'var',
    ].includes(normalized)
  ) {
    return true
  }

  if (
    [
      '0',
      'false',
      'hayır',
      'hayir',
      'no',
      'pasif',
      'inactive',
      'p',
      'yok',
    ].includes(normalized)
  ) {
    return false
  }

  return fallback
}

function firstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((item) => cleanText(item))
  }

  return Boolean(cleanText(value))
}

function normalizeColor(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['kırmızı', 'kirmizi', 'red', 'rouge', 'rosso', 'tinto'].includes(text)) {
    return 'red'
  }

  if (['beyaz', 'white', 'blanc', 'bianco', 'blanco'].includes(text)) {
    return 'white'
  }

  if (['rose', 'rosé', 'roze', 'pembe', 'pink'].includes(text)) {
    return 'rose'
  }

  if (
    [
      'köpüklü',
      'kopuklu',
      'sparkling',
      'champagne',
      'şampanya',
      'sampanya',
      'prosecco',
      'cava',
    ].includes(text)
  ) {
    return 'sparkling'
  }

  return text
}

function normalizeBody(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['hafif', 'light', 'ince'].includes(text)) {
    return 'light'
  }

  if (['orta', 'medium', 'dengeli'].includes(text)) {
    return 'medium'
  }

  if (
    [
      'yoğun',
      'yogun',
      'full',
      'full_bodied',
      'heavy',
      'güçlü',
      'guclu',
      'kuvvetli',
    ].includes(text)
  ) {
    return 'full'
  }

  return text
}

function normalizeSweetness(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['sek', 'dry', 'hafif', 'az'].includes(text)) {
    return 'dry'
  }

  if (
    [
      'yarı sek',
      'yari sek',
      'yarı tatlı',
      'yari tatli',
      'semi dry',
      'semi_dry',
      'semi sweet',
      'semi_sweet',
      'orta',
      'dengeli',
    ].includes(text)
  ) {
    return 'semi_sweet'
  }

  if (['tatlı', 'tatli', 'sweet', 'yoğun', 'yogun'].includes(text)) {
    return 'sweet'
  }

  return text
}

function normalizeIntensity(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['hafif', 'low', 'light', 'düşük', 'dusuk', 'az'].includes(text)) {
    return 'light'
  }

  if (['orta', 'medium', 'dengeli'].includes(text)) {
    return 'medium'
  }

  if (
    [
      'yoğun',
      'yogun',
      'high',
      'strong',
      'yüksek',
      'yuksek',
      'güçlü',
      'guclu',
    ].includes(text)
  ) {
    return 'full'
  }

  return text
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => cleanText(item))
      .filter(Boolean)
  }

  return []
}

function localizedText(source, trKeys, enKeys) {
  return {
    tr: cleanText(firstValue(source, trKeys, '')),
    en: cleanText(firstValue(source, enKeys, '')),
  }
}

function localizedTextWithFallback(source, trKeys, enKeys, fallbackKeys = []) {
  const fallback = cleanText(firstValue(source, fallbackKeys, ''))

  return {
    tr: cleanText(firstValue(source, trKeys, fallback)),
    en: cleanText(firstValue(source, enKeys, '')),
  }
}

function getMissingFields(product) {
  return REQUIRED_KIOSK_FIELDS.filter((field) => !hasValue(product[field]))
}

function normalizeOverride(rawOverride = {}) {
  const override = rawOverride || {}

  const color = normalizeColor(
    firstValue(override, ['color', 'Color', 'Renk']),
  )

  const body = normalizeBody(
    firstValue(override, ['body', 'Body', 'Govde', 'Gövde']),
  )

  const sweetness = normalizeSweetness(
    firstValue(override, [
      'sweetness',
      'Sweetness',
      'Tatlilik',
      'Tatlılık',
      'taste',
      'Taste',
      'Tat',
    ]),
  )

  const acidity = normalizeIntensity(
    firstValue(override, ['acidity', 'Acidity', 'Asidite']),
  )

  const tannin = normalizeIntensity(
    firstValue(override, ['tannin', 'Tannin', 'Tanen']),
  )

  const shortDescription = localizedTextWithFallback(
    override,
    ['shortDescriptionTr', 'KisaAciklama_TR', 'KısaAçıklama_TR'],
    ['shortDescriptionEn', 'KisaAciklama_EN', 'KısaAçıklama_EN'],
    ['shortDescription', 'KisaAciklama', 'KısaAçıklama'],
  )

  const tasteNotes = localizedTextWithFallback(
    override,
    ['tasteNotesTr', 'TadimNotlari_TR', 'TadımNotları_TR'],
    ['tasteNotesEn', 'TadimNotlari_EN', 'TadımNotları_EN'],
    ['tasteNotes', 'TadimNotlari', 'TadımNotları'],
  )

  const foodPairing = localizedTextWithFallback(
    override,
    ['foodPairingTr', 'YemekUyumu_TR'],
    ['foodPairingEn', 'YemekUyumu_EN'],
    ['foodPairing', 'YemekUyumu'],
  )

  return {
    barcode: normalizeBarcode(
      firstValue(override, ['barcode', 'Barcode', 'Barkod']),
    ),

    name: cleanText(
      firstValue(override, [
        'name',
        'Name',
        'UrunAdi',
        'ÜrünAdı',
        'Urun Adi',
        'Ürün Adı',
      ]),
    ),

    brand: cleanText(firstValue(override, ['brand', 'Brand', 'Marka'])),

    color,
    country: cleanText(firstValue(override, ['country', 'Country', 'Ulke', 'Ülke'])),
    region: cleanText(firstValue(override, ['region', 'Region', 'Bolge', 'Bölge'])),
    grape: cleanText(
      firstValue(override, [
        'grape',
        'Grape',
        'UzumTuru',
        'ÜzümTürü',
        'Uzum Turu',
        'Üzüm Türü',
      ]),
    ),

    body,
    sweetness,
    taste: sweetness,
    acidity,
    tannin,

    block: cleanText(firstValue(override, ['block', 'Block', 'Blok'])),
    shelf: cleanText(firstValue(override, ['shelf', 'Shelf', 'Raf'])),

    usagePurposes: toArray(
      firstValue(override, [
        'usagePurposes',
        'KullanimAmaci',
        'KullanımAmacı',
        'Kullanim Amaci',
        'Kullanım Amacı',
      ]),
    ),

    shortDescription,
    tasteNotes,
    foodPairing,

    description: cleanText(firstValue(override, ['description', 'Description'])),

    descriptionTr: cleanText(
      firstValue(
        override,
        [
          'descriptionTr',
          'DescriptionTr',
          'KisaAciklama_TR',
          'KısaAçıklama_TR',
          'KisaAciklama',
          'KısaAçıklama',
        ],
        shortDescription.tr,
      ),
    ),

    descriptionEn: cleanText(
      firstValue(
        override,
        ['descriptionEn', 'DescriptionEn', 'KisaAciklama_EN', 'KısaAçıklama_EN'],
        shortDescription.en,
      ),
    ),

    sommelierPick: toBoolean(
      firstValue(override, ['sommelierPick', 'SomelyeTavsiyesi', 'SommelierTavsiyesi']),
      false,
    ),

    featured: toBoolean(
      firstValue(override, ['featured', 'Featured', 'OneCikan', 'ÖneÇıkan']),
      false,
    ),

    priorityScore: toNumber(
      firstValue(override, ['priorityScore', 'PriorityScore', 'OncelikPuani', 'ÖncelikPuanı']),
      0,
    ),

    imageUpdatedAt: override.imageUpdatedAt || override.ImageUpdatedAt || null,
    imagePath: override.imagePath || override.ImagePath || '',

    updatedAt: override.updatedAt || override.UpdatedAt || null,
  }
}

export function loadOverrides(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim()

    if (!raw) {
      return {}
    }

    const data = JSON.parse(raw)
    const map = {}

    if (Array.isArray(data)) {
      for (const item of data) {
        const normalized = normalizeOverride(item)
        const barcode = normalized.barcode

        if (barcode) {
          map[barcode] = normalized
        }
      }

      return map
    }

    for (const [key, value] of Object.entries(data || {})) {
      const normalized = normalizeOverride({
        ...value,
        barcode: value?.barcode || value?.Barcode || value?.Barkod || key,
      })

      const barcode = normalized.barcode || normalizeBarcode(key)

      if (barcode) {
        map[barcode] = normalized
      }
    }

    return map
  } catch (error) {
    console.error('[product-merge] product-overrides.json okunamadı:', error.message)
    return {}
  }
}

export function mapDbRow(row) {
  const barcode = normalizeBarcode(
    firstValue(row, ['Barcode', 'barcode', 'Barkod']),
  )

  const stock = toNumber(firstValue(row, ['Stock', 'stock', 'Stok']), 0)

  const isActive = toBoolean(
    firstValue(row, ['IsActive', 'isActive', 'Active', 'active', 'Aktif']),
    true,
  )

  return {
    id: barcode,
    barcode,

    name: cleanText(
      firstValue(row, ['ProductName', 'productName', 'name', 'UrunAdi', 'ÜrünAdı']),
    ),

    brand: cleanText(firstValue(row, ['Brand', 'brand', 'Marka'])),

    price: toNumber(firstValue(row, ['Price', 'price', 'Fiyat']), 0),

    stock,

    active: isActive,
    isActive,

    category: cleanText(
      firstValue(row, ['Category', 'category', 'Kategori', 'Grup']),
    ),
  }
}

export function buildProduct(dbRow, override = {}) {
  const base = mapDbRow(dbRow)

  const o = normalizeOverride({
    ...override,
    barcode: override?.barcode || override?.Barcode || override?.Barkod || base.barcode,
  })

  const metadataExists =
    hasValue(o.color) ||
    hasValue(o.body) ||
    hasValue(o.sweetness) ||
    hasValue(o.country) ||
    hasValue(o.region) ||
    hasValue(o.grape) ||
    hasValue(o.shortDescription) ||
    hasValue(o.tasteNotes) ||
    hasValue(o.foodPairing)

  const product = {
    id: base.barcode,
    barcode: base.barcode,

    name: o.name || base.name,
    brand: base.brand || o.brand,
    category: base.category,

    price: base.price,
    stock: base.stock,
    active: base.active,
    isActive: base.isActive,

    color: o.color || '',
    country: o.country || '',
    region: o.region || '',
    grape: o.grape || '',

    body: o.body || '',
    sweetness: o.sweetness || '',
    taste: o.taste || o.sweetness || '',
    acidity: o.acidity || '',
    tannin: o.tannin || '',

    block: o.block || '',
    shelf: o.shelf || '',

    usagePurposes: o.usagePurposes || [],

    shortDescription: o.shortDescription || { tr: '', en: '' },
    tasteNotes: o.tasteNotes || { tr: '', en: '' },
    foodPairing: o.foodPairing || { tr: '', en: '' },

    description: o.description || '',
    descriptionTr: o.descriptionTr || o.shortDescription?.tr || '',
    descriptionEn: o.descriptionEn || o.shortDescription?.en || '',

    sommelierPick: Boolean(o.sommelierPick),
    featured: Boolean(o.featured),
    priorityScore: toNumber(o.priorityScore, 0),

    imagePath: base.barcode
      ? `/product-images/${base.barcode}.webp`
      : o.imagePath || '',

    imageUpdatedAt: o.imageUpdatedAt || null,

    metadataSource: metadataExists ? 'local-json' : '',
    metadataUpdatedAt: o.updatedAt || null,
  }

  const missingFields = getMissingFields(product)
  const hasCommercialData = Boolean(product.barcode && product.name)
  const isSellable = product.active !== false && product.isActive !== false && product.stock > 0

  return {
    ...product,

    missingFields,

    metadataStatus: missingFields.length === 0 ? 'complete' : 'missing',

    kioskReady:
      hasCommercialData &&
      isSellable &&
      missingFields.length === 0,

    needsReview: missingFields.length > 0,
  }
}

export function buildProducts(dbRows = [], overrides = {}) {
  return dbRows
    .map((row) => {
      const barcode = normalizeBarcode(
        firstValue(row, ['Barcode', 'barcode', 'Barkod']),
      )

      return buildProduct(row, overrides[barcode] || {})
    })
    .filter((product) => product.barcode)
}