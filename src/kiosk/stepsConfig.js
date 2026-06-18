// Seçim akışı adımları. Seçenekler kioskSettings'ten; tat sabit seviyelerden.
import { LEVEL_LABELS } from '../types/product.schema'

const ANY = { value: null, label: { tr: 'Farketmez', en: 'Any' } }

export function getSteps(settings) {
  if (!settings) return []
  return [
    {
      key: 'color',
      options: [...settings.colors.map((c) => ({ value: c.key, label: c.label })), ANY],
    },
    {
      key: 'priceRange',
      options: [
        ...settings.priceRanges.map((r) => ({
          value: { id: r.id, min: r.min, max: r.max },
          label: r.label,
        })),
        ANY,
      ],
    },
    {
      key: 'purpose',
      options: [...settings.usagePurposes.map((u) => ({ value: u.key, label: u.label })), ANY],
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
      options: [...settings.countries.map((c) => ({ value: c.code, label: c.label })), ANY],
    },
  ]
}
