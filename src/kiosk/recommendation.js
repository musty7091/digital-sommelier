// Öneri motoru (S2-07). filterProducts: tüm seçili boyutları SERT filtreler.
// Böylece her adımda eşleşme sayısı anlamlı daralır ve kullanıcı erken bitirebilir.
import {
  COLOR_LABELS,
  COUNTRY_LABELS,
  LEVEL_LABELS,
  USAGE_PURPOSE_LABELS,
} from '../types/product.schema'

// Aktif + stokta olan ürünler içinde, seçili tüm filtreleri uygular.
export function filterProducts(products, sel = {}) {
  return (products || []).filter((p) => {
    if (!p.active || Number(p.stock) <= 0) return false
    if (sel.color && p.color !== sel.color) return false
    if (sel.priceRange) {
      const { min, max } = sel.priceRange
      if (p.price < (min ?? 0)) return false
      if (max != null && p.price > max) return false
    }
    if (sel.purpose && !(p.usagePurposes || []).includes(sel.purpose)) return false
    if (sel.taste && p.body !== sel.taste) return false
    if (sel.country && p.country !== sel.country) return false
    return true
  })
}

function buildWhy(p, sel, opts) {
  if (opts.quick) {
    return { tr: 'Uzman tavsiyesi olduğu için öne çıkardık.', en: 'Featured as a sommelier pick.' }
  }
  const tr = []
  const en = []
  if (sel.color && p.color === sel.color) {
    tr.push(`${COLOR_LABELS[p.color].tr.toLowerCase()} şarap`)
    en.push(`${COLOR_LABELS[p.color].en.toLowerCase()} wine`)
  }
  if (sel.purpose && p.usagePurposes?.includes(sel.purpose)) {
    tr.push(`"${USAGE_PURPOSE_LABELS[sel.purpose].tr.toLowerCase()}"`)
    en.push(`"${USAGE_PURPOSE_LABELS[sel.purpose].en.toLowerCase()}"`)
  }
  if (sel.taste && p.body === sel.taste) {
    tr.push(`${LEVEL_LABELS[sel.taste].tr.toLowerCase()} gövde`)
    en.push(`${LEVEL_LABELS[sel.taste].en.toLowerCase()} body`)
  }
  if (sel.country && p.country === sel.country) {
    tr.push(COUNTRY_LABELS[p.country].tr)
    en.push(COUNTRY_LABELS[p.country].en)
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

export function recommend(products, selections = {}, opts = {}) {
  let pool
  if (opts.quick) {
    pool = (products || []).filter((p) => p.active && Number(p.stock) > 0 && p.sommelierPick)
  } else {
    pool = filterProducts(products, selections)
  }

  const scored = pool.map((p) => ({
    p,
    score: (p.priorityScore || 0) + (p.sommelierPick ? 20 : 0),
  }))
  scored.sort((a, b) => b.score - a.score)
  let list = scored.map((s) => s.p)

  const pick = list.find((p) => p.sommelierPick)
  if (pick) list = [pick, ...list.filter((x) => x !== pick)]

  return list.slice(0, 5).map((p, i) => ({
    ...p,
    _big: i === 0,
    _pick: i === 0 && !!p.sommelierPick,
    _why: buildWhy(p, selections, opts),
  }))
}
