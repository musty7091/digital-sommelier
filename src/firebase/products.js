// Kiosk veri okuma yardımcıları.
// Kiosk anonimdir; güvenlik kuralları yalnızca aktif ürünlerin okunmasına izin verir.
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from './config'
import {
  COLORS,
  COLOR_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  USAGE_PURPOSES,
  USAGE_PURPOSE_LABELS,
} from '../types/product.schema'



export const DEFAULT_KIOSK_SETTINGS = {
  languages: ['tr', 'en'],
  defaultLanguage: 'tr',
  idleScreenEnabled: true,
  idleTimeoutSeconds: 45,
  resetTimeoutSeconds: 120,
  colors: COLORS.map((key) => ({ key, label: COLOR_LABELS[key] })),
  priceRanges: [
    { id: 'r1', min: 0, max: 500, label: { tr: '0 - 500 TL', en: '0 - 500 TL' } },
    { id: 'r2', min: 500, max: 1000, label: { tr: '500 - 1000 TL', en: '500 - 1000 TL' } },
    { id: 'r3', min: 1000, max: 2000, label: { tr: '1000 - 2000 TL', en: '1000 - 2000 TL' } },
    { id: 'r4', min: 2000, max: 4000, label: { tr: '2000 - 4000 TL', en: '2000 - 4000 TL' } },
    { id: 'r5', min: 4000, max: null, label: { tr: '4000 TL üzeri', en: 'Over 4000 TL' } },
  ],
  usagePurposes: USAGE_PURPOSES.map((key) => ({ key, label: USAGE_PURPOSE_LABELS[key] })),
  countries: COUNTRIES.map((code) => ({ code, label: COUNTRY_LABELS[code] })),
}

export function normalizeKioskSettings(settings = {}) {
  return {
    ...DEFAULT_KIOSK_SETTINGS,
    ...settings,
    colors: Array.isArray(settings.colors) && settings.colors.length ? settings.colors : DEFAULT_KIOSK_SETTINGS.colors,
    priceRanges:
      Array.isArray(settings.priceRanges) && settings.priceRanges.length
        ? settings.priceRanges
        : DEFAULT_KIOSK_SETTINGS.priceRanges,
    usagePurposes:
      Array.isArray(settings.usagePurposes) && settings.usagePurposes.length
        ? settings.usagePurposes
        : DEFAULT_KIOSK_SETTINGS.usagePurposes,
    countries:
      Array.isArray(settings.countries) && settings.countries.length
        ? settings.countries
        : DEFAULT_KIOSK_SETTINGS.countries,
  }
}

// Yalnızca aktif ürünleri getirir (güvenlik kuralıyla uyumlu sorgu).
export async function fetchActiveProducts() {
  const q = query(collection(db, 'products'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Tek ürün — barkod, doküman kimliğidir.
export async function fetchProduct(barcode) {
  const snap = await getDoc(doc(db, 'products', barcode))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Kiosk ayarları (filtre seçenekleri, diller, sıfırlama süresi, fiyat aralıkları).
export async function fetchKioskSettings() {
  const snap = await getDoc(doc(db, 'kioskSettings', 'default'))
  return normalizeKioskSettings(snap.exists() ? snap.data() : {})
}
