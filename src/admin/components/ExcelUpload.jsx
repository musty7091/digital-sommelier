import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { bulkSaveProducts, logAuditAction } from '../../firebase/products'

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeBarcode(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('Ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('Ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('Ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('Ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('Ç', 'c')
    .replace(/[^a-z0-9]/g, '')
}

function getRowValue(row, aliases, fallback = '') {
  const normalizedMap = new Map()

  Object.entries(row || {}).forEach(([key, value]) => {
    normalizedMap.set(normalizeHeader(key), value)
  })

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias)

    if (normalizedMap.has(normalizedAlias)) {
      const value = normalizedMap.get(normalizedAlias)

      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }
  }

  return fallback
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

function toBoolean(value, fallback = false) {
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

  if (['1', 'true', 'evet', 'yes', 'aktif', 'active', 'var'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'hayır', 'hayir', 'no', 'pasif', 'inactive', 'yok'].includes(normalized)) {
    return false
  }

  return fallback
}

function colorToDb(value) {
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
      'şampanya',
      'sampanya',
      'champagne',
      'prosecco',
      'cava',
    ].includes(text)
  ) {
    return 'sparkling'
  }

  return text
}

function levelToDb(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['light', 'hafif', 'az', 'düşük', 'dusuk', 'low'].includes(text)) {
    return 'light'
  }

  if (
    [
      'medium',
      'orta',
      'dengeli',
      'yarı',
      'yari',
      'yarı sek',
      'yari sek',
      'yarı tatlı',
      'yari tatli',
      'semi',
      'semi dry',
      'semi sweet',
      'semi_dry',
      'semi_sweet',
    ].includes(text)
  ) {
    return 'medium'
  }

  if (
    [
      'intense',
      'full',
      'full bodied',
      'full_bodied',
      'yoğun',
      'yogun',
      'yüksek',
      'yuksek',
      'güçlü',
      'guclu',
      'high',
      'heavy',
      'strong',
      'tatlı',
      'tatli',
      'sweet',
    ].includes(text)
  ) {
    return 'intense'
  }

  if (text.includes('hafif') || text.includes('düşük') || text.includes('dusuk')) {
    return 'light'
  }

  if (text.includes('yoğun') || text.includes('yogun') || text.includes('yüksek') || text.includes('yuksek')) {
    return 'intense'
  }

  return 'medium'
}

function purposeToDb(value) {
  if (!value) return []

  const map = {
    'günlük içim': 'daily',
    'gunluk icim': 'daily',
    'günlük tüketim': 'daily',
    'gunluk tuketim': 'daily',
    daily: 'daily',
    everyday: 'daily',

    'hediye için': 'gift',
    'hediye icin': 'gift',
    hediye: 'gift',
    gift: 'gift',

    'yemek için': 'dinner',
    'yemek icin': 'dinner',
    'yemek eşliği': 'dinner',
    'yemek esligi': 'dinner',
    food: 'dinner',
    dinner: 'dinner',

    'özel gün': 'special',
    'ozel gun': 'special',
    kutlama: 'special',
    'kutlama için': 'special',
    'kutlama icin': 'special',
    celebration: 'special',
    special: 'special',
    premium: 'special',
  }

  const parts = String(value)
    .split(',')
    .map((item) => cleanText(item).toLowerCase())
    .filter(Boolean)

  const result = parts
    .map((part) => map[part] || part)
    .filter(Boolean)

  return Array.from(new Set(result))
}

function countryToDb(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  const map = {
    tr: 'TR',
    türkiye: 'TR',
    turkiye: 'TR',
    turkey: 'TR',

    cy: 'CY',
    kıbrıs: 'CY',
    kibris: 'CY',
    cyprus: 'CY',

    fr: 'FR',
    fransa: 'FR',
    france: 'FR',

    it: 'IT',
    italya: 'IT',
    italy: 'IT',

    es: 'ES',
    ispanya: 'ES',
    spain: 'ES',

    cl: 'CL',
    şili: 'CL',
    sili: 'CL',
    chile: 'CL',

    ar: 'AR',
    arjantin: 'AR',
    argentina: 'AR',

    au: 'AU',
    avustralya: 'AU',
    australia: 'AU',

    nz: 'NZ',
    'yeni zelanda': 'NZ',
    'new zealand': 'NZ',

    za: 'ZA',
    'güney afrika': 'ZA',
    'guney afrika': 'ZA',
    'south africa': 'ZA',

    us: 'US',
    abd: 'US',
    amerika: 'US',
    usa: 'US',
  }

  return map[text] || value
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => resolve(event.target.result)
    reader.onerror = () => reject(new Error('Dosya okunamadı.'))

    reader.readAsArrayBuffer(file)
  })
}

function chunkArray(items, size) {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function buildMetadataFromRow(row, rowNumber) {
  const barcode = normalizeBarcode(
    getRowValue(row, ['Barkod', 'Barcode', 'barcode']),
  )

  if (!barcode) {
    return {
      ok: false,
      reason: 'Barkod boş',
      rowNumber,
    }
  }

  const shortDescriptionTr = cleanText(
    getRowValue(row, ['KisaAciklama_TR', 'KisaAciklama', 'Kısa Açıklama TR', 'Kısa Açıklama']),
  )

  const shortDescriptionEn = cleanText(
    getRowValue(row, ['KisaAciklama_EN', 'ShortDescription_EN', 'Short Description EN']),
  )

  const tasteNotesTr = cleanText(
    getRowValue(row, ['TadimNotlari_TR', 'TadimNotlari', 'Tadım Notları TR', 'Tadım Notları']),
  )

  const tasteNotesEn = cleanText(
    getRowValue(row, ['TadimNotlari_EN', 'TasteNotes_EN', 'Taste Notes EN']),
  )

  const foodPairingTr = cleanText(
    getRowValue(row, ['YemekUyumu_TR', 'YemekUyumu', 'Yemek Uyumu TR', 'Yemek Uyumu']),
  )

  const foodPairingEn = cleanText(
    getRowValue(row, ['YemekUyumu_EN', 'FoodPairing_EN', 'Food Pairing EN']),
  )

  const sommelierPickValue = getRowValue(
    row,
    ['SomelyeTavsiyesi', 'SommelierPick', 'Sommelier Tavsiyesi'],
    false,
  )

  const featuredValue = getRowValue(
    row,
    ['OneCikan', 'Öne Çıkan', 'Featured'],
    false,
  )

  return {
    ok: true,
    item: {
      barcode,

      color: colorToDb(getRowValue(row, ['Renk', 'Color'])),
      country: countryToDb(getRowValue(row, ['Ulke', 'Ülke', 'Country'])),
      region: cleanText(getRowValue(row, ['Bolge', 'Bölge', 'Region'])),
      grape: cleanText(getRowValue(row, ['UzumTuru', 'Üzüm Türü', 'Uzum Turu', 'Grape'])),

      block: cleanText(getRowValue(row, ['Blok', 'Block'])),
      shelf: cleanText(getRowValue(row, ['Raf', 'Shelf'])),

      body: levelToDb(getRowValue(row, ['Govde', 'Gövde', 'Body'])),
      sweetness: levelToDb(getRowValue(row, ['Tatlilik', 'Tatlılık', 'Sweetness'])),
      taste: levelToDb(getRowValue(row, ['Govde', 'Gövde', 'Body'])),
      acidity: levelToDb(getRowValue(row, ['Asidite', 'Acidity'])),
      tannin: levelToDb(getRowValue(row, ['Tanen', 'Tannin'])),

      usagePurposes: purposeToDb(
        getRowValue(row, ['KullanimAmaci', 'Kullanım Amacı', 'UsagePurposes', 'Usage Purposes']),
      ),

      shortDescription: {
        tr: shortDescriptionTr,
        en: shortDescriptionEn,
      },

      tasteNotes: {
        tr: tasteNotesTr,
        en: tasteNotesEn,
      },

      foodPairing: {
        tr: foodPairingTr,
        en: foodPairingEn,
      },

      description: shortDescriptionTr,
      descriptionTr: shortDescriptionTr,
      descriptionEn: shortDescriptionEn,

      sommelierPick: toBoolean(sommelierPickValue, false),
      featured: toBoolean(featuredValue, false),
      priorityScore: toNumber(
        getRowValue(row, ['OncelikPuani', 'Öncelik Puanı', 'PriorityScore']),
        0,
      ),

      updatedAt: new Date().toISOString(),
      updatedBy: 'excel_upload',
      source: 'excel_upload',
    },
  }
}

export default function ExcelUpload() {
  const fileInputRef = useRef(null)

  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState(null)

  const handleDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    }

    if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setDragActive(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      setFileName(file.name)
      processFile(file)
    }
  }

  const processFile = async (file) => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setSummary(null)

    try {
      const data = await readFileAsArrayBuffer(file)
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (!rows.length) {
        alert('Excel dosyası boş görünüyor.')
        return
      }

      const converted = rows.map((row, index) => buildMetadataFromRow(row, index + 2))

      const skipped = converted.filter((result) => !result.ok)
      const items = converted
        .filter((result) => result.ok)
        .map((result) => result.item)

      if (!items.length) {
        alert('İçe aktarılacak geçerli barkod bulunamadı.')
        setSummary({
          totalRows: rows.length,
          imported: 0,
          skipped: skipped.length,
          failed: 0,
        })
        return
      }

      const chunks = chunkArray(items, 250)
      let imported = 0
      let failed = 0

      for (const chunk of chunks) {
        const result = await bulkSaveProducts(chunk)

        imported += Number(result.count || chunk.length || 0)
        failed += Number(result.failed || 0)

        setProgress(Math.round(((imported + failed) / items.length) * 100))
      }

      const nextSummary = {
        totalRows: rows.length,
        imported,
        skipped: skipped.length,
        failed,
      }

      setSummary(nextSummary)

      await logAuditAction({
        action: 'product_metadata_bulk_updated',
        entityType: 'admin-products',
        entityId: 'excel-upload',
        message: `${imported} ürün için Excel üzerinden sommelier metadata aktarıldı.`,
        details: {
          fileName: file.name,
          totalRows: rows.length,
          imported,
          skipped: skipped.length,
          failed,
          skippedRows: skipped.slice(0, 20),
        },
      })

      alert(
        `${imported} ürün için sommelier bilgisi aktarıldı.` +
          (skipped.length ? `\n${skipped.length} satır barkod eksik olduğu için atlandı.` : '') +
          (failed ? `\n${failed} satırda hata oluştu.` : ''),
      )

      setFileName(null)
    } catch (error) {
      console.error('Excel yükleme sırasında hata oluştu:', error)
      alert(error.message || 'Excel dosyası işlenirken bir sorun yaşandı. Lütfen formatı kontrol edin.')
    } finally {
      setIsProcessing(false)
      setProgress(0)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-8 shadow-lg">
        <h3 className="text-xl font-serif text-gold-500 mb-4">
          Excel ile Toplu Metadata Aktarımı
        </h3>

        <p className="text-cream-200 mb-4">
          Bu ekran artık Firebase’e ürün yazmaz. Excel dosyasındaki bilgiler lokal olarak
          <span className="font-semibold text-gold-400"> data/product-overrides.json </span>
          dosyasına aktarılır.
        </p>

        <div className="rounded-lg border border-gold-800/40 bg-gold-900/10 p-4 text-sm text-cream-200 mb-6">
          Ürün adı, fiyat, stok ve aktiflik bilgileri SQL Server/Vega kaynağından gelir.
          Excel içe aktarımı sadece barkodu eşleşen ürünlerin sommelier bilgilerini,
          raf konumunu, açıklamalarını ve öne çıkarma ayarlarını günceller.
        </div>

        <a
          href="/sarap-sablon.xlsx"
          download="sarap-sablon.xlsx"
          className="px-6 py-3 bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-100 font-medium rounded-md transition-colors border border-charcoal-600 inline-flex items-center gap-2"
        >
          Excel Şablonunu İndir (.xlsx)
        </a>
      </div>

      <div
        className={`border-4 border-dashed rounded-xl p-12 text-center transition-all ${
          dragActive
            ? 'border-gold-500 bg-gold-500/5'
            : isProcessing
              ? 'border-wine-600 bg-wine-900/20'
              : 'border-charcoal-700 bg-charcoal-800'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-16 h-16 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>

            <p className="text-xl text-gold-400 font-medium">
              İşleniyor... %{progress}
            </p>

            <p className="text-sm text-cream-200 opacity-60">
              Lütfen sayfayı kapatmayın. Sommelier metadata kayıtları lokal dosyaya aktarılıyor.
            </p>
          </div>
        ) : (
          <>
            <svg
              className="w-16 h-16 mx-auto text-charcoal-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <p className="text-lg text-cream-100 font-medium mb-2">
              {fileName || 'Dosyayı buraya sürükleyip bırakın'}
            </p>

            <p className="text-sm text-cream-200 opacity-60">
              veya bilgisayarınızdan seçmek için tıklayın
            </p>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              id="fileInput"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0]

                if (file) {
                  setFileName(file.name)
                  processFile(file)
                }
              }}
            />

            <label
              htmlFor="fileInput"
              className="mt-6 inline-block px-8 py-3 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md cursor-pointer transition-colors"
            >
              Dosya Seç ve Yükle
            </label>
          </>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-charcoal-700 bg-charcoal-800 p-4">
            <p className="text-sm text-cream-200/60">Toplam Satır</p>
            <p className="text-2xl font-bold text-cream-100">{summary.totalRows}</p>
          </div>

          <div className="rounded-xl border border-green-800/50 bg-green-900/20 p-4">
            <p className="text-sm text-green-300/80">Aktarılan</p>
            <p className="text-2xl font-bold text-green-400">{summary.imported}</p>
          </div>

          <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4">
            <p className="text-sm text-yellow-300/80">Atlanan</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.skipped}</p>
          </div>

          <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4">
            <p className="text-sm text-red-300/80">Hatalı</p>
            <p className="text-2xl font-bold text-red-400">{summary.failed}</p>
          </div>
        </div>
      )}
    </div>
  )
}