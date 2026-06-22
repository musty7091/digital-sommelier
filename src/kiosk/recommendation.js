// Lokal öneri motoru.
// Firebase yoktur.
// Ürünler SQL + local product-overrides.json birleşiminden gelir.
// Filtreler mümkün olduğunca net çalışır ama değer formatı farklarını normalize eder.

import {
  COLOR_LABELS,
  COUNTRY_LABELS,
  LEVEL_LABELS,
  USAGE_PURPOSE_LABELS,
} from '../types/product.schema'

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeText(value) {
  return cleanText(value).toLowerCase()
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

function isProductActive(product) {
  const active = product?.active ?? product?.isActive ?? true
  return active !== false
}

function isInStock(product) {
  return toNumber(product?.stock, 0) > 0
}

function normalizeColor(value) {
  const text = normalizeText(value)

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

function normalizeLevel(value) {
  const text = normalizeText(value)

  if (!text) return ''

  if (['hafif', 'light', 'low', 'az', 'düşük', 'dusuk'].includes(text)) {
    return 'light'
  }

  if (['orta', 'medium', 'dengeli'].includes(text)) {
    return 'medium'
  }

  if (
    [
      'yoğun',
      'yogun',
      'intense',
      'full',
      'full_bodied',
      'heavy',
      'high',
      'strong',
      'yüksek',
      'yuksek',
      'güçlü',
      'guclu',
      'kuvvetli',
    ].includes(text)
  ) {
    return 'intense'
  }

  return text
}

const COUNTRY_CODE_MAP = {
  tr: 'TR', turkiye: 'TR', turkey: 'TR',
  cy: 'CY', kibris: 'CY', cyprus: 'CY',
  fr: 'FR', fransa: 'FR', france: 'FR',
  it: 'IT', italya: 'IT', italy: 'IT', italia: 'IT',
  es: 'ES', ispanya: 'ES', spain: 'ES', espana: 'ES',
  cl: 'CL', sili: 'CL', chile: 'CL',
  ar: 'AR', arjantin: 'AR', argentina: 'AR',
  au: 'AU', avustralya: 'AU', australia: 'AU',
  nz: 'NZ', yenizelanda: 'NZ', newzealand: 'NZ',
  us: 'US', usa: 'US', abd: 'US', america: 'US',
  za: 'ZA', guneyafrika: 'ZA', southafrica: 'ZA',
  pt: 'PT', portekiz: 'PT', portugal: 'PT',
  de: 'DE', almanya: 'DE', germany: 'DE',
  gr: 'GR', yunanistan: 'GR', greece: 'GR',
}

function foldCountry(value) {
  return String(value ?? '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

// Ülkeyi ISO koduna indirger: "İtalya" / "italy" / "IT" hepsi -> "IT".
function normalizeCountry(value) {
  const folded = foldCountry(value)
  if (!folded) return ''
  return COUNTRY_CODE_MAP[folded] || folded.toUpperCase()
}

function normalizePurpose(value) {
  return normalizeText(value)
}

function normalizePriceRange(priceRange) {
  if (!priceRange) {
    return null
  }

  if (typeof priceRange === 'object') {
    return {
      id: cleanText(priceRange.id || priceRange.value || ''),
      min: priceRange.min === null || priceRange.min === undefined || priceRange.min === ''
        ? 0
        : toNumber(priceRange.min, 0),
      max: priceRange.max === null || priceRange.max === undefined || priceRange.max === ''
        ? null
        : toNumber(priceRange.max, null),
    }
  }

  return null
}

function normalizePurposeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePurpose(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => normalizePurpose(item))
      .filter(Boolean)
  }

  return []
}

function getProductBodyLevel(product) {
  return normalizeLevel(product?.body || product?.taste || product?.sweetness)
}

function getSafeLabel(labels, value, fallback) {
  const key = cleanText(value)

  if (labels?.[key]?.tr || labels?.[key]?.en) {
    return {
      tr: labels[key].tr || fallback || key,
      en: labels[key].en || fallback || key,
    }
  }

  return {
    tr: fallback || key || '',
    en: fallback || key || '',
  }
}

function matchesColor(product, selectedColor) {
  if (!selectedColor) return true

  return normalizeColor(product?.color) === normalizeColor(selectedColor)
}

function matchesPrice(product, selectedPriceRange) {
  const priceRange = normalizePriceRange(selectedPriceRange)

  if (!priceRange) return true

  const price = toNumber(product?.price, 0)

  if (price < (priceRange.min ?? 0)) {
    return false
  }

  if (priceRange.max !== null && priceRange.max !== undefined && price > priceRange.max) {
    return false
  }

  return true
}

function matchesPurpose(product, selectedPurpose) {
  if (!selectedPurpose) return true

  const selected = normalizePurpose(selectedPurpose)
  const purposes = normalizePurposeList(product?.usagePurposes)

  return purposes.includes(selected)
}

function matchesTaste(product, selectedTaste) {
  if (!selectedTaste) return true

  return getProductBodyLevel(product) === normalizeLevel(selectedTaste)
}

function matchesCountry(product, selectedCountry) {
  if (!selectedCountry) return true

  return normalizeCountry(product?.country) === normalizeCountry(selectedCountry)
}

function isKioskCandidate(product, opts = {}) {
  const hideOutOfStock = opts.hideOutOfStock !== false

  if (!product) return false
  if (!isProductActive(product)) return false
  if (hideOutOfStock && !isInStock(product)) return false

  return true
}

// Aktif + stokta olan ürünler içinde, seçili tüm filtreleri uygular.
export function filterProducts(products, selections = {}, opts = {}) {
  return (products || []).filter((product) => {
    if (!isKioskCandidate(product, opts)) return false

    if (!matchesColor(product, selections.color)) return false
    if (!matchesPrice(product, selections.priceRange)) return false
    if (!matchesPurpose(product, selections.purpose)) return false
    if (!matchesTaste(product, selections.taste)) return false
    if (!matchesCountry(product, selections.country)) return false

    return true
  })
}

function buildWhy(product, selections = {}, opts = {}) {
  if (opts.quick) {
    if (product?.sommelierPick) {
      return {
        tr: 'Sommelier tavsiyesi olduğu için öne çıkardık.',
        en: 'Featured as a sommelier pick.',
      }
    }

    if (product?.featured) {
      return {
        tr: 'Öne çıkan ürün olduğu için önerildi.',
        en: 'Recommended as a featured product.',
      }
    }

    return {
      tr: 'Stokta olan uygun seçeneklerden biri olduğu için önerildi.',
      en: 'Recommended as an available matching option.',
    }
  }

  const tr = []
  const en = []

  if (selections.color && matchesColor(product, selections.color)) {
    const color = normalizeColor(product.color)
    const label = getSafeLabel(COLOR_LABELS, color, color)

    tr.push(`${label.tr.toLowerCase()} şarap`)
    en.push(`${label.en.toLowerCase()} wine`)
  }

  if (selections.purpose && matchesPurpose(product, selections.purpose)) {
    const purpose = normalizePurpose(selections.purpose)
    const label = getSafeLabel(USAGE_PURPOSE_LABELS, purpose, purpose)

    tr.push(`"${label.tr.toLowerCase()}"`)
    en.push(`"${label.en.toLowerCase()}"`)
  }

  if (selections.taste && matchesTaste(product, selections.taste)) {
    const level = normalizeLevel(selections.taste)
    const label = getSafeLabel(LEVEL_LABELS, level, level)

    tr.push(`${label.tr.toLowerCase()} gövde`)
    en.push(`${label.en.toLowerCase()} body`)
  }

  if (selections.country && matchesCountry(product, selections.country)) {
    const country = cleanText(product.country)
    const label = getSafeLabel(COUNTRY_LABELS, country, country)

    tr.push(label.tr)
    en.push(label.en)
  }

  if (tr.length === 0) {
    return {
      tr: 'Seçimlerinize uygun, kaliteli bir seçenek olduğu için önerildi.',
      en: 'Recommended as a quality match for your choices.',
    }
  }

  return {
    tr: `${tr.join(', ')} tercihinize uygun olduğu için önerildi.`,
    en: `Recommended because it matches your preference for ${en.join(', ')}.`,
  }
}

function scoreProduct(product) {
  return (
    toNumber(product?.priorityScore, 0) +
    (product?.sommelierPick ? 20 : 0) +
    (product?.featured ? 10 : 0) +
    (product?.metadataStatus === 'complete' ? 5 : 0)
  )
}

function sortProducts(products = []) {
  return [...products].sort((a, b) => {
    const scoreDiff = scoreProduct(b) - scoreProduct(a)

    if (scoreDiff !== 0) {
      return scoreDiff
    }

    const stockDiff = toNumber(b.stock, 0) - toNumber(a.stock, 0)

    if (stockDiff !== 0) {
      return stockDiff
    }

    return cleanText(a.name).localeCompare(cleanText(b.name), 'tr')
  })
}

export function recommend(products, selections = {}, opts = {}) {
  const hideOutOfStock = opts.hideOutOfStock !== false

  let pool

  if (opts.quick) {
    pool = (products || []).filter((product) => {
      return (
        isKioskCandidate(product, { hideOutOfStock }) &&
        (product.sommelierPick || product.featured)
      )
    })

    if (!pool.length) {
      pool = (products || []).filter((product) => {
        return isKioskCandidate(product, { hideOutOfStock })
      })
    }
  } else {
    pool = filterProducts(products, selections, { hideOutOfStock })
  }

  const list = sortProducts(pool)
  const count = Number(opts.resultCount || 5)

  return list.slice(0, count).map((product, index) => ({
    ...product,
    _big: index === 0,
    _pick: index === 0 && Boolean(product.sommelierPick),
    _why: buildWhy(product, selections, opts),
  }))
}