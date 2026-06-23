import {
  COUNTRIES,
  COUNTRY_LABELS,
  LEVEL_LABELS,
} from '../types/product.schema'

const ANY = {
  value: null,
  label: {
    tr: 'Fark etmez',
    en: 'Any',
  },
}

const COUNTRY_FLAGS = {
  TR: '🇹🇷',
  CY: '🇨🇾',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  CL: '🇨🇱',
  AR: '🇦🇷',
  US: '🇺🇸',
  AU: '🇦🇺',
  NZ: '🇳🇿',
  ZA: '🇿🇦',
  GE: '🇬🇪',
  AZ: '🇦🇿',
  MD: '🇲🇩',
  PT: '🇵🇹',
  DE: '🇩🇪',
  GR: '🇬🇷',
}

const FALLBACK_COLORS = [
  {
    value: 'red',
    label: {
      tr: 'Kırmızı',
      en: 'Red',
    },
  },
  {
    value: 'white',
    label: {
      tr: 'Beyaz',
      en: 'White',
    },
  },
  {
    value: 'rose',
    label: {
      tr: 'Roze',
      en: 'Rosé',
    },
  },
  {
    value: 'sparkling',
    label: {
      tr: 'Köpüklü',
      en: 'Sparkling',
    },
  },
]

const FALLBACK_PRICE_RANGES = [
  {
    value: 'budget',
    id: 'budget',
    min: 0,
    max: 500,
    label: {
      tr: '0 - 500 TL',
      en: '0 - 500 TL',
    },
  },
  {
    value: 'mid',
    id: 'mid',
    min: 500,
    max: 1000,
    label: {
      tr: '500 - 1000 TL',
      en: '500 - 1000 TL',
    },
  },
  {
    value: 'premium',
    id: 'premium',
    min: 1000,
    max: 2000,
    label: {
      tr: '1000 - 2000 TL',
      en: '1000 - 2000 TL',
    },
  },
  {
    value: 'luxury',
    id: 'luxury',
    min: 2000,
    max: null,
    label: {
      tr: '2000 TL ve üzeri',
      en: '2000 TL and above',
    },
  },
]

const FALLBACK_USAGE_PURPOSES = [
  {
    value: 'daily',
    label: {
      tr: 'Günlük içim',
      en: 'Daily drinking',
    },
  },
  {
    value: 'gift',
    label: {
      tr: 'Hediye',
      en: 'Gift',
    },
  },
  {
    value: 'dinner',
    label: {
      tr: 'Yemek eşliği',
      en: 'Dinner pairing',
    },
  },
  {
    value: 'special',
    label: {
      tr: 'Özel gün',
      en: 'Special occasion',
    },
  },
]

function cleanText(value) {
  return String(value ?? '').trim()
}

function getOptionValue(option, fallback = '') {
  if (option === null || option === undefined) {
    return fallback
  }

  if (typeof option === 'string' || typeof option === 'number') {
    return String(option)
  }

  return cleanText(
    option.value ??
      option.key ??
      option.id ??
      option.code ??
      option.slug ??
      fallback,
  )
}

function getOptionLabel(option, fallbackText = '') {
  if (option === null || option === undefined) {
    return {
      tr: fallbackText,
      en: fallbackText,
    }
  }

  if (typeof option === 'string' || typeof option === 'number') {
    const text = String(option)

    return {
      tr: text,
      en: text,
    }
  }

  if (typeof option.label === 'string') {
    return {
      tr: option.label,
      en: option.label,
    }
  }

  if (option.label && typeof option.label === 'object') {
    return {
      tr: option.label.tr || option.label.TR || fallbackText,
      en: option.label.en || option.label.EN || option.label.tr || fallbackText,
    }
  }

  const text =
    option.name ||
    option.title ||
    option.text ||
    option.value ||
    option.key ||
    option.id ||
    option.code ||
    fallbackText

  return {
    tr: String(text),
    en: String(text),
  }
}

function normalizeSimpleOptions(options, fallbackOptions = []) {
  const source = Array.isArray(options) && options.length ? options : fallbackOptions

  return source
    .map((option, index) => {
      const value = getOptionValue(option, `option-${index + 1}`)

      if (!value) return null

      return {
        value,
        label: getOptionLabel(option, value),
      }
    })
    .filter(Boolean)
}

function normalizePriceRanges(options, fallbackOptions = []) {
  const source = Array.isArray(options) && options.length ? options : fallbackOptions

  return source
    .map((range, index) => {
      const id = getOptionValue(range, `range-${index + 1}`)
      const min = Number(range?.min ?? 0)
      const rawMax = range?.max
      const max =
        rawMax === null || rawMax === undefined || rawMax === ''
          ? null
          : Number(rawMax)

      if (!id) return null

      return {
        value: {
          id,
          min: Number.isFinite(min) ? min : 0,
          max: Number.isFinite(max) ? max : null,
        },
        label: getOptionLabel(range, id),
      }
    })
    .filter(Boolean)
}

function normalizeCountryOptions(settingsCountries) {
  const settingsHasCountries =
    Array.isArray(settingsCountries) && settingsCountries.length > 0

  if (settingsHasCountries) {
    return settingsCountries
      .map((country, index) => {
        const code = getOptionValue(country, `country-${index + 1}`)

        if (!code) return null

        const flag = country.flag || country.emoji || COUNTRY_FLAGS[code] || '🌍'
        const label = getOptionLabel(country, code)

        return {
          value: code,
          label: {
            tr: `${flag} ${label.tr}`,
            en: `${flag} ${label.en}`,
          },
        }
      })
      .filter(Boolean)
  }

  const schemaCountries = Array.isArray(COUNTRIES) && COUNTRIES.length
    ? COUNTRIES
    : Object.keys(COUNTRY_LABELS || {})

  return schemaCountries
    .map((code) => {
      const label = COUNTRY_LABELS[code]
      const flag = COUNTRY_FLAGS[code] || '🌍'

      return {
        value: code,
        label: {
          tr: `${flag} ${label?.tr || code}`,
          en: `${flag} ${label?.en || label?.tr || code}`,
        },
      }
    })
    .filter(Boolean)
}

function getLevelLabel(key, fallbackTr, fallbackEn) {
  return {
    tr: LEVEL_LABELS?.[key]?.tr || fallbackTr,
    en: LEVEL_LABELS?.[key]?.en || fallbackEn,
  }
}

export function getSteps(settings = {}) {
  const colors = normalizeSimpleOptions(settings?.colors, FALLBACK_COLORS)
  const priceRanges = normalizePriceRanges(settings?.priceRanges, FALLBACK_PRICE_RANGES)
  const usagePurposes = normalizeSimpleOptions(
    settings?.usagePurposes,
    FALLBACK_USAGE_PURPOSES,
  )
  const countries = normalizeCountryOptions(settings?.countries)

  return [
    {
      key: 'color',
      title: {
        tr: 'Hangi renk şarap?',
        en: 'Which wine color?',
      },
      options: colors,
    },
    {
      key: 'priceRange',
      title: {
        tr: 'Fiyat aralığı?',
        en: 'Price range?',
      },
      options: [...priceRanges, ANY],
    },
    {
      key: 'purpose',
      title: {
        tr: 'Ne için arıyorsunuz?',
        en: 'What is it for?',
      },
      options: [...usagePurposes, ANY],
    },
    {
      key: 'taste',
      title: {
        tr: 'Tat profili?',
        en: 'Taste profile?',
      },
      options: [
        {
          value: 'light',
          label: getLevelLabel('light', 'Hafif', 'Light'),
        },
        {
          value: 'medium',
          label: getLevelLabel('medium', 'Orta', 'Medium'),
        },
        {
          value: 'intense',
          label: getLevelLabel('intense', 'Yoğun', 'Intense'),
        },
        ANY,
      ],
    },
    {
      key: 'country',
      title: {
        tr: 'Hangi ülkeden?',
        en: 'Which country?',
      },
      options: [...countries, ANY],
    },
  ]
}