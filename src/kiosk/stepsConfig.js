// Seçim akışı adımları. Seçenekler kioskSettings'ten; tat sabit seviyelerden.
import { LEVEL_LABELS } from '../types/product.schema'

const ANY = { value: null, label: { tr: 'Farketmez', en: 'Any' } }

export function getSteps(settings) {
  if (!settings) return []
  const colors = Array.isArray(settings.colors) ? settings.colors : []
  const priceRanges = Array.isArray(settings.priceRanges) ? settings.priceRanges : []
  const usagePurposes = Array.isArray(settings.usagePurposes) ? settings.usagePurposes : []
  const countries = Array.isArray(settings.countries) ? settings.countries : []

  return [
    {
      key: 'color',
      // Birinci adım (Renk seçimi) için "Farketmez" (ANY) seçeneği kaldırıldı. Sadece 4 ana renk gelecek.
      options: [...colors.map((c) => ({ value: c.key, label: c.label }))],
    },
    {
      key: 'priceRange',
      options: [
        ...priceRanges.map((r) => ({
          value: { id: r.id, min: r.min, max: r.max },
          label: r.label,
        })),
        ANY,
      ],
    },
    {
      key: 'purpose',
      options: [...usagePurposes.map((u) => ({ value: u.key, label: u.label })), ANY],
    },
    {
      key: 'taste',
      options: [
        { value: 'light', label: LEVEL_LABELS.light },
        { value: 'medium', label: LEVEL_LABELS.medium },
        { value: 'intense', label: LEVEL_LABELS.intense },
        ANY,
      ],
    },
    {
      key: 'country',
      options: [...countries.map((c) => ({ value: c.code, label: c.label })), ANY],
    },
  ]
}