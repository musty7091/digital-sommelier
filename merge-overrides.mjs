#!/usr/bin/env node
/**
 * İki product-overrides.json dosyasını ALAN BAZINDA birleştirir.
 * Kimse kimsenin verisini ezmez:
 *   - Raf konumu alanları (block, shelf)  -> KIOSK dosyası sahibidir
 *   - Diğer tüm alanlar (renk, gövde, açıklama, amaç...) -> OFIS dosyası sahibidir
 *   - Bir tarafta boş/eksikse, diğer taraftaki dolu değer kullanılır (doldurur).
 *   - İki tarafta da DOLU ve FARKLI ise (gerçek çakışma), sahibininki kazanır ve raporlanır.
 *
 * Kullanım:
 *   node merge-overrides.mjs <ofis.json> <kiosk.json> [cikti.json]
 * (cikti verilmezse: merged-overrides.json)
 */
import fs from 'node:fs'

const LOCATION_FIELDS = new Set(['block', 'shelf'])
const SKIP_DIFF = new Set(['updatedAt']) // bunlarda fark çakışma sayılmaz

const [officePath, kioskPath, outPath = 'merged-overrides.json'] = process.argv.slice(2)
if (!officePath || !kioskPath) {
  console.error('Kullanım: node merge-overrides.mjs <ofis.json> <kiosk.json> [cikti.json]')
  process.exit(1)
}

function load(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    console.error(`Okunamadı: ${p} -> ${e.message}`)
    process.exit(1)
  }
}

function hasValue(v) {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.values(v).some(hasValue)
  return true // sayı, boolean (false dahil) geçerli değer sayılır
}

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const office = load(officePath)
const kiosk = load(kioskPath)

const merged = {}
const barcodes = new Set([...Object.keys(office), ...Object.keys(kiosk)])

let onlyOffice = 0
let onlyKiosk = 0
let both = 0
const conflicts = [] // {barcode, field, owner, officeVal, kioskVal}

for (const bc of barcodes) {
  const o = office[bc]
  const k = kiosk[bc]
  if (o && !k) onlyOffice++
  else if (!o && k) onlyKiosk++
  else both++

  const oRec = o || {}
  const kRec = k || {}
  const out = {}
  const fields = new Set([...Object.keys(oRec), ...Object.keys(kRec)])

  for (const f of fields) {
    const owner = LOCATION_FIELDS.has(f) ? 'kiosk' : 'office'
    const primary = owner === 'kiosk' ? kRec[f] : oRec[f]
    const secondary = owner === 'kiosk' ? oRec[f] : kRec[f]

    // sahibinde dolu değer varsa onu al; yoksa diğerinden doldur
    out[f] = hasValue(primary) ? primary : secondary

    // gerçek çakışma raporu: iki taraf da dolu ve farklı
    if (
      !SKIP_DIFF.has(f) &&
      hasValue(oRec[f]) &&
      hasValue(kRec[f]) &&
      !eq(oRec[f], kRec[f])
    ) {
      conflicts.push({ barcode: bc, field: f, owner, office: oRec[f], kiosk: kRec[f] })
    }
  }
  merged[bc] = out
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8')

console.log('================ BİRLEŞTİRME ÖZETİ ================')
console.log(`Ofis dosyası   : ${officePath}  (${Object.keys(office).length} ürün)`)
console.log(`Kiosk dosyası  : ${kioskPath}  (${Object.keys(kiosk).length} ürün)`)
console.log(`Çıktı          : ${outPath}  (${Object.keys(merged).length} ürün)`)
console.log(`  - sadece ofiste: ${onlyOffice} | sadece kioskta: ${onlyKiosk} | her ikisinde: ${both}`)
console.log(`Gerçek çakışma (iki taraf da dolu ve farklı): ${conflicts.length}`)
if (conflicts.length) {
  const loc = conflicts.filter((c) => c.owner === 'kiosk')
  const som = conflicts.filter((c) => c.owner === 'office')
  console.log(`  -> ${loc.length} tanesi raf konumu (kiosk kazandı), ${som.length} tanesi bilgi (ofis kazandı)`)
  console.log('İlk 15 çakışma örneği:')
  for (const c of conflicts.slice(0, 15)) {
    console.log(
      `  [${c.barcode}] ${c.field}: ofis=${JSON.stringify(c.office)} | kiosk=${JSON.stringify(c.kiosk)} -> ${c.owner} kazandı`,
    )
  }
}
console.log('==================================================')
console.log('TAMAM. Bu birleşik dosyayı HER İKİ makinede data/product-overrides.json olarak kullanabilirsin.')
