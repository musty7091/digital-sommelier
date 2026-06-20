import { z } from 'zod'

// ---------------------------------------------------------------------------
// Veri modeli sabitleri + zod şemaları (Sprint 1 / S1-03, S1-04)
// Amaç: bozuk verinin girebileceği sınırlarda (Excel import, admin formları)
// çalışma zamanı doğrulaması. UI etiketleri TR/EN olarak burada tutulur.
// ---------------------------------------------------------------------------

// Renkler
export const COLORS = ['red', 'white', 'rose', 'sparkling']
export const COLOR_LABELS = {
  red: { tr: 'Kırmızı', en: 'Red' },
  white: { tr: 'Beyaz', en: 'White' },
  rose: { tr: 'Rosé', en: 'Rosé' },
  sparkling: { tr: 'Köpüklü', en: 'Sparkling' },
}

// Tat profili seviyeleri (gövde, tatlılık, asidite, tanen) — Hafif/Orta/Yoğun
export const LEVELS = ['light', 'medium', 'intense']
export const LEVEL_LABELS = {
  light: { tr: 'Hafif', en: 'Light' },
  medium: { tr: 'Orta', en: 'Medium' },
  intense: { tr: 'Yoğun', en: 'Intense' },
}

// Ülkeler (kod + etiket)
export const COUNTRIES = ['TR', 'CY', 'IT', 'FR', 'CL', 'AR', 'ES', 'AU', 'NZ', 'OTHER']
export const COUNTRY_LABELS = {
  TR: { tr: 'Türkiye', en: 'Turkey' },
  CY: { tr: 'Kıbrıs', en: 'Cyprus' },
  IT: { tr: 'İtalya', en: 'Italy' },
  FR: { tr: 'Fransa', en: 'France' },
  CL: { tr: 'Şili', en: 'Chile' },
  AR: { tr: 'Arjantin', en: 'Argentina' },
  ES: { tr: 'İspanya', en: 'Spain' },
  AU: { tr: 'Avustralya', en: 'Australia' },
  NZ: { tr: 'Yeni Zelanda', en: 'New Zealand' },
  OTHER: { tr: 'Diğer', en: 'Other' },
}

// Kullanım amaçları (doküman 6.6)
export const USAGE_PURPOSES = [
  'food', 'gift', 'celebration', 'daily', 'romantic',
  'premium', 'light', 'value', 'beginner', 'sommelier',
]
export const USAGE_PURPOSE_LABELS = {
  food: { tr: 'Yemek için', en: 'For food' },
  gift: { tr: 'Hediye için', en: 'As a gift' },
  celebration: { tr: 'Kutlama için', en: 'For celebration' },
  daily: { tr: 'Günlük içim', en: 'Everyday' },
  romantic: { tr: 'Romantik akşam', en: 'Romantic evening' },
  premium: { tr: 'Premium seçim', en: 'Premium choice' },
  light: { tr: 'Hafif içim', en: 'Light & easy' },
  value: { tr: 'Fiyat / performans', en: 'Value for money' },
  beginner: { tr: 'Yeni başlayanlar için', en: 'For beginners' },
  sommelier: { tr: 'Somelye önerisi', en: "Sommelier's pick" },
}

// İki dilli metin alanı
const localized = z.object({
  tr: z.string().default(''),
  en: z.string().default(''),
})

// ---------------------------------------------------------------------------
// Ürün şeması
// İçerik alanları ile fiyat/stok katmanı mantıksal olarak ayrılmıştır;
// ileride fiyat/stok Vega'dan gelebilir (doküman 19).
// ---------------------------------------------------------------------------
export const productSchema = z.object({
  // Kimlik
  barcode: z.string().min(6, 'Barkod en az 6 karakter olmalı'),
  name: z.string().min(1, 'Ürün adı zorunlu'),
  brand: z.string().default(''),

  // Sınıflandırma
  color: z.enum(COLORS),
  country: z.enum(COUNTRIES),
  region: z.string().default(''),
  grape: z.string().default(''),

  // --- Fiyat/stok katmanı (içerikten ayrı; ileride Vega kaynaklı olabilir) ---
  price: z.number().nonnegative('Fiyat negatif olamaz'),
  stock: z.number().int().nonnegative().default(0),

  // Reyon konumu
  block: z.string().default(''),
  shelf: z.union([z.number(), z.string()]).default(''),

  // Durum
  active: z.boolean().default(true),

  // İçerik
  image: z.string().default(''),
  shortDescription: localized.default({ tr: '', en: '' }),
  tasteNotes: localized.default({ tr: '', en: '' }),
  foodPairing: localized.default({ tr: '', en: '' }),
  usagePurposes: z.array(z.enum(USAGE_PURPOSES)).default([]),

  // Tat profili
  body: z.enum(LEVELS).optional(),
  sweetness: z.enum(LEVELS).optional(),
  acidity: z.enum(LEVELS).optional(),
  tannin: z.enum(LEVELS).optional(),

  // Ticari
  sommelierPick: z.boolean().default(false),
  priorityScore: z.number().int().default(0),
  featured: z.boolean().default(false),

  // Sistem
  createdAt: z.union([z.number(), z.string()]).optional(),
  updatedAt: z.union([z.number(), z.string()]).optional(),
  updatedBy: z.string().optional(),
})

// Boş bir ürün taslağı (admin formu için varsayılanlar)
export function emptyProduct() {
  return productSchema.parse({
    barcode: '000000',
    name: '',
    color: 'red',
    country: 'OTHER',
    price: 0,
  })
}

// Stok durumu (doküman 10.5): 0 -> yok, 1-10 -> az, 11+ -> var
export function stockStatus(stock, lowThreshold = 10) {
  const n = Number(stock) || 0
  if (n <= 0) return 'out'
  if (n <= lowThreshold) return 'low'
  return 'in'
}
export const STOCK_LABELS = {
  in: { tr: 'Stokta var', en: 'In stock' },
  low: { tr: 'Az kaldı', en: 'Low stock' },
  out: { tr: 'Stokta yok', en: 'Out of stock' },
}

// Raf konumu kısa metni: "A Blok 6. Raf"
export function shelfText(block, shelf, lang = 'tr') {
  if (!block && !shelf) return ''
  return lang === 'en'
    ? `Block ${block}, Shelf ${shelf}`
    : `${block} Blok ${shelf}. Raf`
}
