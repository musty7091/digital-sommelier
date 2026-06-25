// Serbest Türkçe cümleyi tarar; renk, fiyat aralığı, ülke, amaç ve tat profilini
// cümlenin neresinde geçerse geçsin yakalar. İnternet/anahtar gerektirmez.

function fold(s) {
  return String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const COLOR_KW = {
  red: ['kirmizi', 'kimizi', 'kirmizimsi'],
  white: ['beyaz'],
  rose: ['roze', 'rose', 'pembe'],
  sparkling: ['kopuklu', 'kopuk', 'sampanya', 'sparkling', 'prosecco'],
}

const COUNTRY_KW = {
  TR: ['turk', 'turkiye', 'yerli'],
  FR: ['fransa', 'fransiz'],
  IT: ['italya', 'italyan'],
  ES: ['ispanya', 'ispanyol'],
  CL: ['sili'],
  AR: ['arjantin'],
  AU: ['avustralya'],
  NZ: ['zelanda', 'yeni zelanda'],
  GE: ['gurcistan', 'gurcu'],
  ZA: ['guney afrika'],
  AZ: ['azerbaycan', 'azeri'],
  MD: ['moldova'],
  CY: ['kibris'],
  PT: ['portekiz'],
  DE: ['almanya', 'alman'],
  GR: ['yunan', 'yunanistan'],
  US: ['amerika', 'amerikan', 'kaliforniya'],
}

const PURPOSE_KW = {
  food: ['yemek', 'yemekli', 'yemekle', 'sofra', 'et', 'balik', 'peynir', 'makarna'],
  gift: ['hediye', 'hediyelik'],
  celebration: ['ozel', 'kutlama', 'kutlamak', 'dogum gunu', 'yildonumu', 'bayram', 'parti'],
  romantic: ['romantik', 'sevgili', 'yildonumu'],
  daily: ['gunluk', 'siradan', 'her gun'],
  premium: ['premium', 'luks', 'kaliteli', 'ust segment', 'iddiali'],
}

const TASTE_KW = {
  light: ['hafif', 'yumusak', 'icimi kolay'],
  intense: ['yogun', 'dolgun', 'sert', 'guclu', 'agir', 'koyu'],
  medium: ['orta', 'dengeli'],
}

// Tatlılık: kuru=light, yarı=medium, tatlı=intense (sıra önemli: medium, intense'ten önce)
const SWEETNESS_KW = {
  light: ['kuru', 'sek', 'dry'],
  medium: ['yari tatli', 'yari sek', 'demi'],
  intense: ['tatli', 'tatlimsi', 'sweet'],
}
const ACIDITY_KW = {
  light: ['az asit', 'dusuk asit', 'yumusak asit'],
  intense: ['asitli', 'asidik', 'ferah', 'canli', 'taze asit'],
}
const TANNIN_KW = {
  light: ['ipeksi', 'yumusak tanen', 'az tanen', 'dusuk tanen'],
  intense: ['tanenli', 'tanen', 'buruk', 'yuksek tanen'],
}

// Türkçe konuşma tanımanın yabancı isimleri yazma biçimi -> katalogdaki gerçek değer
const GRAPE_ALIAS = {
  chardonnay: ['sardone', 'sardonay', 'sardona'],
  'cabernet sauvignon': ['kaberne', 'kaberne soviniyon', 'kabarne'],
  merlot: ['merlo'],
  syrah: ['siraz', 'shiraz'],
  'pinot noir': ['pino nuar', 'pinonuar'],
  'sauvignon blanc': ['soviniyon blan', 'soviniyon'],
  malbec: ['malbek'],
  tempranillo: ['tempranilyo'],
  sangiovese: ['sancovese', 'sangiovese'],
  riesling: ['risling'],
  zinfandel: ['zinfandel'],
}
const REGION_ALIAS = {
  bordeaux: ['bordo'],
  toscana: ['toskana'],
  champagne: ['sampanya'],
  rioja: ['rioha'],
  'napa valley': ['napa'],
  chianti: ['kyanti'],
  burgundy: ['burgonya', 'bourgogne'],
}

const NUM_WORDS = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9,
  on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90,
  yuz: 100, bin: 1000,
}

function hasWord(text, kw) {
  const k = kw.replace(/\s+/g, '\\s+')
  // Kısa anahtarlar (et, on) tam kelime; uzunlar kök olarak (kırmızı→kırmızısı, fransız→fransızı)
  if (kw.length <= 3) return new RegExp('\\b' + k + '\\b').test(text)
  return new RegExp('\\b' + k).test(text)
}

function detectFirst(text, map) {
  for (const [val, kws] of Object.entries(map)) {
    for (const kw of kws) {
      if (hasWord(text, kw)) return val
    }
  }
  return null
}

function parseNumbers(text) {
  const nums = []
  const cleaned = text.replace(/(\d)[.\s](\d{3})\b/g, '$1$2') // 1.000 / 1 000 -> 1000
  const digits = cleaned.match(/\d{2,7}/g)
  if (digits) digits.forEach((d) => nums.push(parseInt(d, 10)))
  if (!nums.length) {
    const tokens = text.split(' ')
    let cur = 0
    let total = 0
    let active = false
    const flush = () => {
      if (active && (cur || total)) nums.push(total + cur)
      cur = 0
      total = 0
      active = false
    }
    for (const tk of tokens) {
      if (tk in NUM_WORDS) {
        active = true
        const v = NUM_WORDS[tk]
        if (v === 100) cur = (cur || 1) * 100
        else if (v === 1000) {
          total += (cur || 1) * 1000
          cur = 0
        } else cur += v
      } else {
        flush()
      }
    }
    flush()
  }
  return nums.filter((n) => n >= 10)
}

function priceRangesFromSteps(steps) {
  const step = (steps || []).find((s) => s.key === 'priceRange')
  if (!step) return []
  return (step.options || [])
    .filter((o) => o && o.value && (o.min != null || o.max != null))
    .map((o) => ({
      value: o.value,
      min: Number(o.min ?? 0),
      max: o.max == null ? Infinity : Number(o.max),
    }))
}

function pickByValue(ranges, n) {
  const hit = ranges.find((r) => n >= r.min && n <= r.max)
  if (hit) return hit.value
  let best = null
  let bd = Infinity
  for (const r of ranges) {
    const d = n < r.min ? r.min - n : n > r.max ? n - r.max : 0
    if (d < bd) {
      bd = d
      best = r
    }
  }
  return best ? best.value : null
}

function mapPrice(text, nums, ranges) {
  if (!ranges.length || !nums.length) return null
  const under = /(alti|altinda|asagi|dusuk|ucuz|ekonomik|kadar|en fazla|maksimum)/.test(text)
  const over = /(ustu|uzeri|uzerinde|yukari|pahali|en az|minimum|fazlasi)/.test(text)
  if (nums.length >= 2) {
    const a = Math.min(nums[0], nums[1])
    const b = Math.max(nums[0], nums[1])
    return pickByValue(ranges, (a + b) / 2)
  }
  const n = nums[0]
  if (under) {
    const cands = ranges.filter((r) => r.max <= n)
    if (cands.length) return cands.sort((x, y) => y.max - x.max)[0].value
  }
  if (over) {
    const cands = ranges.filter((r) => r.min >= n)
    if (cands.length) return cands.sort((x, y) => x.min - y.min)[0].value
  }
  return pickByValue(ranges, n)
}

function buildCatalogVocab(products) {
  const regions = new Map()
  const grapes = new Map()
  for (const p of products || []) {
    if (p?.region && typeof p.region === 'string') {
      const f = fold(p.region)
      if (f.length >= 3 && !regions.has(f)) regions.set(f, p.region.trim())
    }
    if (p?.grape && typeof p.grape === 'string') {
      for (const part of p.grape.split(/[,&/]/)) {
        const orig = part.trim()
        const f = fold(orig)
        if (f.length >= 3 && !grapes.has(f)) grapes.set(f, orig)
      }
    }
  }
  return { regions, grapes }
}

function detectCatalog(text, vocab, aliasMap) {
  // 1) Türkçe fonetik takma adlar -> katalog değeri
  for (const [canonical, aliases] of Object.entries(aliasMap)) {
    for (const a of aliases) {
      if (hasWord(text, a)) {
        const fc = fold(canonical)
        return vocab.has(fc) ? vocab.get(fc) : canonical
      }
    }
  }
  // 2) STT değeri doğru yazdıysa doğrudan katalog eşleşmesi
  for (const [f, orig] of vocab) {
    if (f.length >= 4 && hasWord(text, f)) return orig
  }
  return null
}

export function parseVoiceQuery(transcript, steps = [], products = []) {
  const text = fold(transcript)
  if (!text) return { selections: {}, found: [] }

  const sel = {}
  const found = []
  const add = (key, val) => {
    if (val) {
      sel[key] = val
      found.push(key)
    }
  }

  add('color', detectFirst(text, COLOR_KW))
  add('country', detectFirst(text, COUNTRY_KW))
  add('purpose', detectFirst(text, PURPOSE_KW))
  add('taste', detectFirst(text, TASTE_KW))
  add('sweetness', detectFirst(text, SWEETNESS_KW))
  add('acidity', detectFirst(text, ACIDITY_KW))
  add('tannin', detectFirst(text, TANNIN_KW))
  add('priceRange', mapPrice(text, parseNumbers(text), priceRangesFromSteps(steps)))

  const vocab = buildCatalogVocab(products)
  add('region', detectCatalog(text, vocab.regions, REGION_ALIAS))
  add('grape', detectCatalog(text, vocab.grapes, GRAPE_ALIAS))

  return { selections: sel, found }
}

// ---- Gemini ile ayrıştırma (anahtar varsa): doğal cümle + yabancı bölge/üzüm isimlerini katalog değerlerine eşler ----
const LEVELS = ['light', 'medium', 'intense']
const COLORS = ['red', 'white', 'rose', 'sparkling']
const PURPOSES = ['food', 'gift', 'celebration', 'daily', 'romantic', 'premium', 'light', 'value', 'beginner', 'sommelier']

export async function parseVoiceWithGemini(transcript, { steps = [], products = [], apiKey, model = 'gemini-3-flash-preview' } = {}) {
  if (!apiKey || !transcript) return null
  const vocab = buildCatalogVocab(products)
  const regions = [...new Set(vocab.regions.values())]
  const grapes = [...new Set(vocab.grapes.values())]
  const priceRanges = priceRangesFromSteps(steps)
  const priceList = priceRanges.map((r) => `${r.value} (${r.min}-${r.max === Infinity ? '+' : r.max} TL)`).join(', ')
  const countryStep = steps.find((s) => s.key === 'country')
  const countries = (countryStep?.options || [])
    .filter((o) => o && o.value)
    .map((o) => `${o.value}=${o.label?.tr || o.value}`)
    .join(', ')

  const prompt = `Bir şarap kiosk'unda müşteri sesli olarak ne aradığını söyledi. Cümleyi yapılandırılmış filtrelere çevir.
Cümle: "${transcript}"

İZİNLİ DEĞERLER (yalnızca bunları kullan; uymuyorsa null):
- color: ${COLORS.join(' | ')}
- priceRange: ${priceList || '(yok)'}
- country: ${countries || '(yok)'}
- taste (gövde): light | medium | intense
- sweetness (tatlılık; kuru=light, tatlı=intense): light | medium | intense
- acidity: light | medium | intense
- tannin: light | medium | intense
- purpose: ${PURPOSES.join(' | ')}
- region: SADECE şu listeden EN YAKIN olanı seç, yoksa null: ${regions.join(' | ')}
- grape: SADECE şu listeden EN YAKIN olanı seç, yoksa null: ${grapes.join(' | ')}

Türkçe söylenen yabancı isimleri listedeki gerçek yazımla eşle (örn. "şardone"->Chardonnay, "bordo"->Bordeaux, "kaberne"->Cabernet Sauvignon).
Yalnızca cümlede AÇIKÇA ima edilen alanları doldur; gerisi null olsun.
SADECE şu JSON'u döndür:
{"color":null,"priceRange":null,"country":null,"region":null,"grape":null,"taste":null,"sweetness":null,"acidity":null,"tannin":null,"purpose":null}`

  let data
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      },
    )
    if (!res.ok) return null
    data = await res.json()
  } catch {
    return null
  }

  let raw
  try {
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    raw = JSON.parse(txt.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }

  const sel = {}
  const found = []
  const put = (k, v) => {
    if (v) {
      sel[k] = v
      found.push(k)
    }
  }
  const inList = (v, list) => (v && list.includes(v) ? v : null)
  const matchCatalog = (v, vals) => {
    if (!v) return null
    const f = fold(v)
    const hit = vals.find((x) => fold(x) === f) || vals.find((x) => fold(x).includes(f) || f.includes(fold(x)))
    return hit || null
  }

  put('color', inList(raw.color, COLORS))
  put('priceRange', inList(raw.priceRange, priceRanges.map((r) => r.value)))
  put('country', inList(raw.country, (countryStep?.options || []).map((o) => o.value)))
  put('taste', inList(raw.taste, LEVELS))
  put('sweetness', inList(raw.sweetness, LEVELS))
  put('acidity', inList(raw.acidity, LEVELS))
  put('tannin', inList(raw.tannin, LEVELS))
  put('purpose', inList(raw.purpose, PURPOSES))
  put('region', matchCatalog(raw.region, regions))
  put('grape', matchCatalog(raw.grape, grapes))

  return { selections: sel, found, source: 'gemini' }
}
