import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  fetchAllProducts,
  saveProduct,
  logAuditAction,
} from '../../firebase/products'
import { getLocalProductImagePath, getProductImageAlt } from '../../shared/productImage'
import QuickFill from './QuickFill'
import BulkAiFill from './BulkAiFill'
import {
  prepareProductImage,
  uploadProductImageToLocalApi,
  formatImageSize,
} from '../../shared/localImageUpload'
import {
  COLORS,
  COLOR_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  LEVELS,
  LEVEL_LABELS,
  USAGE_PURPOSES,
  USAGE_PURPOSE_LABELS,
} from '../../types/product.schema'

const emptyForm = {
  barcode: '',
  name: '',
  brand: '',
  price: '',
  stock: '',
  category: '',

  color: '',
  country: '',
  region: '',
  grape: '',

  block: '',
  shelf: '',

  shortDescription: '',
  shortDescriptionEn: '',
  tasteNotes: '',
  tasteNotesEn: '',
  foodPairing: '',
  foodPairingEn: '',

  usagePurposes: [],

  body: '',
  sweetness: '',
  acidity: '',
  tannin: '',

  sommelierPick: false,
  featured: false,
  priorityScore: 0,

  active: true,
  isActive: true,
}

function cleanText(value) {
  if (value === null || value === undefined) return ''

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim()
  }

  return ''
}

function extractText(value, preferredLang = 'tr', visited = new WeakSet()) {
  if (value === null || value === undefined) return ''

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return cleanText(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item, preferredLang, visited))
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value !== 'object') return ''

  if (visited.has(value)) return ''
  visited.add(value)

  const lang = cleanText(preferredLang)
  const lower = lang.toLowerCase()
  const upper = lang.toUpperCase()

  const candidates = [
    value[lang],
    value[lower],
    value[upper],

    value.tr,
    value.TR,
    value.en,
    value.EN,

    value.text,
    value.value,
    value.description,
    value.content,
    value.label,
    value.name,
  ]

  for (const candidate of candidates) {
    const text = extractText(candidate, preferredLang, visited)

    if (text) return text
  }

  for (const candidate of Object.values(value)) {
    const text = extractText(candidate, preferredLang, visited)

    if (text) return text
  }

  return ''
}

function getLocalizedTr(value) {
  return extractText(value, 'tr')
}

function getLocalizedEn(value) {
  return extractText(value, 'en')
}

function normalizeBarcode(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function normalizeLevelForForm(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return ''

  if (['light', 'low', 'hafif', 'az', 'dry', 'sek'].includes(text)) {
    return 'light'
  }

  if (
    [
      'medium',
      'orta',
      'dengeli',
      'semi_sweet',
      'semi sweet',
      'semi_dry',
      'semi dry',
      'yarı sek',
      'yari sek',
      'yarı tatlı',
      'yari tatli',
    ].includes(text)
  ) {
    return 'medium'
  }

  if (
    [
      'intense',
      'full',
      'full_bodied',
      'heavy',
      'high',
      'strong',
      'yoğun',
      'yogun',
      'sweet',
      'tatlı',
      'tatli',
    ].includes(text)
  ) {
    return 'intense'
  }

  return LEVELS.includes(text) ? text : ''
}

function checkIsActive(product) {
  return product?.active !== false && product?.isActive !== false
}

function checkIsSommelier(product) {
  return product?.sommelierPick === true
}

function colorLabelTr(color) {
  if (!color) return 'Eksik'
  return COLOR_LABELS[color]?.tr || color
}

function countryLabelTr(country) {
  if (!country) return ''
  return COUNTRY_LABELS[country]?.tr || country
}

function levelLabelTr(level) {
  const normalized = normalizeLevelForForm(level)
  if (!normalized) return 'Eksik'
  return LEVEL_LABELS[normalized]?.tr || normalized
}

function formatPrice(price) {
  const num = Number(price)

  return Number.isFinite(num)
    ? num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0,00'
}

function getProductStatus(product) {
  if (!checkIsActive(product)) {
    return {
      label: 'DB Pasif',
      className: 'bg-red-900/30 text-red-400 border-red-800/50',
    }
  }

  if (Number(product.stock || 0) <= 0) {
    return {
      label: 'Stok Yok',
      className: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
    }
  }

  if (product.kioskReady === true) {
    return {
      label: 'Kiosk Hazır',
      className: 'bg-green-900/30 text-green-400 border-green-800/50',
    }
  }

  return {
    label: 'Bilgi Eksik',
    className: 'bg-orange-900/30 text-orange-300 border-orange-800/50',
  }
}

function missingFieldsText(product) {
  const labels = {
    color: 'Renk',
    body: 'Gövde',
    sweetness: 'Tatlılık',
  }

  if (!Array.isArray(product?.missingFields) || product.missingFields.length === 0) {
    return ''
  }

  return product.missingFields.map((field) => labels[field] || field).join(', ')
}

function getDescriptionTr(product) {
  return (
    getLocalizedTr(product?.shortDescription) ||
    getLocalizedTr(product?.shortDescriptionTr) ||
    getLocalizedTr(product?.descriptionTr) ||
    getLocalizedTr(product?.description) ||
    getLocalizedTr(product?.KisaAciklama_TR) ||
    getLocalizedTr(product?.KisaAciklama) ||
    ''
  )
}

function getDescriptionEn(product) {
  return (
    getLocalizedEn(product?.shortDescription) ||
    getLocalizedEn(product?.shortDescriptionEn) ||
    getLocalizedEn(product?.descriptionEn) ||
    getLocalizedEn(product?.description) ||
    getLocalizedEn(product?.KisaAciklama_EN) ||
    ''
  )
}

function getTasteNotesTr(product) {
  return (
    getLocalizedTr(product?.tasteNotes) ||
    getLocalizedTr(product?.tasteNotesTr) ||
    getLocalizedTr(product?.TadimNotlari_TR) ||
    getLocalizedTr(product?.TadimNotlari) ||
    ''
  )
}

function getTasteNotesEn(product) {
  return (
    getLocalizedEn(product?.tasteNotes) ||
    getLocalizedEn(product?.tasteNotesEn) ||
    getLocalizedEn(product?.TadimNotlari_EN) ||
    ''
  )
}

function getFoodPairingTr(product) {
  return (
    getLocalizedTr(product?.foodPairing) ||
    getLocalizedTr(product?.foodPairingTr) ||
    getLocalizedTr(product?.YemekUyumu_TR) ||
    getLocalizedTr(product?.YemekUyumu) ||
    ''
  )
}

function getFoodPairingEn(product) {
  return (
    getLocalizedEn(product?.foodPairing) ||
    getLocalizedEn(product?.foodPairingEn) ||
    getLocalizedEn(product?.YemekUyumu_EN) ||
    ''
  )
}

function AdminProductImagePreview({ product, previewDataUrl }) {
  const [failedSrc, setFailedSrc] = useState('')
  const imageSrc = previewDataUrl || getLocalProductImagePath(product)

  if (!imageSrc || failedSrc === imageSrc) {
    return (
      <svg
        className="w-10 h-10 text-charcoal-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={getProductImageAlt(product)}
      className="h-full w-full object-contain"
      onError={() => setFailedSrc(imageSrc)}
    />
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quickFillOpen, setQuickFillOpen] = useState(false)
  const [bulkAiOpen, setBulkAiOpen] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)

  const [formData, setFormData] = useState(emptyForm)
  const [processingImage, setProcessingImage] = useState(false)
  const [preparedImage, setPreparedImage] = useState(null)

  const loadProducts = async () => {
    setLoading(true)

    try {
      const productsList = await fetchAllProducts()
      // DB'de pasif (IsActive=PASIF) olan ürünler admin listesine hiç girmesin.
      const activeList = (Array.isArray(productsList) ? productsList : []).filter(checkIsActive)
      setProducts(activeList)
    } catch (error) {
      console.error('Ürünler lokal API üzerinden çekilirken hata oluştu:', error)
      alert(error.message || 'Ürün listesi alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase()
    const nameMatch = product.name?.toLowerCase().includes(searchLower) || false
    const barcodeMatch = product.barcode?.includes(searchTerm) || false
    const brandMatch = product.brand?.toLowerCase().includes(searchLower) || false

    const matchesSearch = nameMatch || barcodeMatch || brandMatch

    if (!matchesSearch) return false

    if (statusFilter === 'missing') {
      return product.kioskReady !== true
    }

    if (statusFilter === 'ready') {
      return product.kioskReady === true
    }

    if (statusFilter === 'outOfStock') {
      return Number(product.stock || 0) <= 0
    }

    return true
  })

  const stats = {
    total: products.length,
    ready: products.filter((product) => product.kioskReady === true).length,
    missing: products.filter((product) => product.kioskReady !== true).length,
    outOfStock: products.filter((product) => Number(product.stock || 0) <= 0).length,
  }

  const writeLog = async (action, message, details = {}) => {
    try {
      await logAuditAction({
        action,
        entityType: 'admin-products',
        entityId: details.barcode || '',
        message,
        details,
      })
    } catch (error) {
      console.error('Lokal admin log kaydedilemedi:', error)
    }
  }

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const togglePurpose = (key) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.usagePurposes) ? prev.usagePurposes : []
      const has = current.includes(key)

      return {
        ...prev,
        usagePurposes: has
          ? current.filter((item) => item !== key)
          : [...current, key],
      }
    })
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Resim 15MB’dan küçük olmalıdır.')
      return
    }

    try {
      setProcessingImage(true)

      const prepared = await prepareProductImage(file, {
        maxDimension: 1200,
        targetMaxBytes: 300 * 1024,
      })

      setPreparedImage(prepared)
    } catch (error) {
      console.error('Resim işlenirken hata oluştu:', error)
      alert(error.message || 'Resim işlenemedi. Lütfen tekrar deneyin.')
    } finally {
      setProcessingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setPreparedImage(null)
  }

  const handleEdit = (product) => {
    setEditingId(product.id || product.barcode)
    setEditingProduct(product)

    setFormData({
      barcode: product.barcode || '',
      name: product.name || '',
      brand: product.brand || '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      category: product.category || '',

      color: product.color || '',
      country: product.country || '',
      region: product.region || '',
      grape: product.grape || '',

      block: product.block || '',
      shelf: product.shelf ?? '',

      shortDescription: getDescriptionTr(product),
      shortDescriptionEn: getDescriptionEn(product),
      tasteNotes: getTasteNotesTr(product),
      tasteNotesEn: getTasteNotesEn(product),
      foodPairing: getFoodPairingTr(product),
      foodPairingEn: getFoodPairingEn(product),

      usagePurposes: Array.isArray(product.usagePurposes) ? product.usagePurposes : [],

      body: normalizeLevelForForm(product.body),
      sweetness: normalizeLevelForForm(product.sweetness),
      acidity: normalizeLevelForForm(product.acidity),
      tannin: normalizeLevelForForm(product.tannin),

      sommelierPick: product.sommelierPick === true,
      featured: product.featured === true,
      priorityScore: Number(product.priorityScore || 0),

      active: product.active !== false,
      isActive: product.isActive !== false,
    })

    setPreparedImage(null)
    setIsModalOpen(true)
  }

  const buildMetadataPayload = () => {
    const barcode = normalizeBarcode(formData.barcode)

    if (!barcode) {
      throw new Error('Barkod bulunamadı. Ürün SQL listesinden gelmiş olmalıdır.')
    }

    const shortDescriptionTr = cleanText(formData.shortDescription)
    const shortDescriptionEn = cleanText(formData.shortDescriptionEn)
    const tasteNotesTr = cleanText(formData.tasteNotes)
    const tasteNotesEn = cleanText(formData.tasteNotesEn)
    const foodPairingTr = cleanText(formData.foodPairing)
    const foodPairingEn = cleanText(formData.foodPairingEn)

    return {
      barcode,

      color: formData.color || '',
      country: formData.country || '',
      region: cleanText(formData.region),
      grape: cleanText(formData.grape),

      block: cleanText(formData.block),
      shelf: cleanText(formData.shelf),

      body: formData.body || '',
      sweetness: formData.sweetness || '',
      taste: formData.body || '',
      acidity: formData.acidity || '',
      tannin: formData.tannin || '',

      usagePurposes: Array.isArray(formData.usagePurposes)
        ? formData.usagePurposes
        : [],

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

      shortDescriptionTr,
      shortDescriptionEn,
      tasteNotesTr,
      tasteNotesEn,
      foodPairingTr,
      foodPairingEn,

      KisaAciklama_TR: shortDescriptionTr,
      KisaAciklama_EN: shortDescriptionEn,
      TadimNotlari_TR: tasteNotesTr,
      TadimNotlari_EN: tasteNotesEn,
      YemekUyumu_TR: foodPairingTr,
      YemekUyumu_EN: foodPairingEn,

      sommelierPick: formData.sommelierPick === true,
      featured: formData.featured === true,
      priorityScore: Number(formData.priorityScore || 0),

      updatedAt: new Date().toISOString(),
      updatedBy: 'admin_products',
      source: 'admin_products',
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = buildMetadataPayload()

      if (preparedImage) {
        await uploadProductImageToLocalApi({
          barcode: payload.barcode,
          preparedImage,
        })

        payload.imagePath = `/product-images/${payload.barcode}.webp`
        payload.imageUpdatedAt = new Date().toISOString()
      }

      const result = await saveProduct(payload)

      await writeLog(
        'product_metadata_saved',
        `"${formData.name || payload.barcode}" ürünü için sommelier bilgileri kaydedildi.`,
        {
          barcode: payload.barcode,
          fields: Object.keys(payload),
          imageUpdated: Boolean(preparedImage),
          result,
        },
      )

      setIsModalOpen(false)
      setEditingId(null)
      setEditingProduct(null)
      setPreparedImage(null)

      await loadProducts()
    } catch (error) {
      console.error('Ürün metadata kaydedilirken hata oluştu:', error)
      alert(error.message || 'Ürün kaydedilirken bir sorun oluştu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportExcel = async () => {
    if (products.length === 0) {
      alert('Dışa aktarılacak ürün bulunamadı.')
      return
    }

    const dataToExport = products.map((product) => ({
      Barkod: product.barcode || '',
      UrunAdi: product.name || '',
      Marka: product.brand || '',
      Kategori: product.category || '',
      Fiyat: product.price || 0,
      Stok: product.stock || 0,

      MetadataDurumu: product.kioskReady ? 'Kiosk Hazır' : 'Bilgi Eksik',
      EksikAlanlar: missingFieldsText(product),

      Renk: colorLabelTr(product.color),
      Blok: product.block || '',
      Raf: product.shelf || '',
      Ulke: countryLabelTr(product.country),
      Bolge: product.region || '',
      UzumTuru: product.grape || '',

      KisaAciklama_TR: getDescriptionTr(product),
      KisaAciklama_EN: getDescriptionEn(product),
      TadimNotlari_TR: getTasteNotesTr(product),
      TadimNotlari_EN: getTasteNotesEn(product),
      YemekUyumu_TR: getFoodPairingTr(product),
      YemekUyumu_EN: getFoodPairingEn(product),

      KullanimAmaci: Array.isArray(product.usagePurposes)
        ? product.usagePurposes.map((key) => USAGE_PURPOSE_LABELS[key]?.tr || key).join(', ')
        : '',

      Govde: levelLabelTr(product.body),
      Tatlilik: levelLabelTr(product.sweetness),
      Asidite: levelLabelTr(product.acidity),
      Tanen: levelLabelTr(product.tannin),

      DB_Aktif: checkIsActive(product) ? 'Evet' : 'Hayır',
      SomelyeTavsiyesi: checkIsSommelier(product) ? 'Evet' : 'Hayır',
      OneCikan: product.featured ? 'Evet' : 'Hayır',
      OncelikPuani: product.priorityScore || 0,
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Saraplar')
    XLSX.writeFile(workbook, 'Ertan_Mahzen_Guncel.xlsx')

    await writeLog(
      'products_excel_exported',
      `Tüm envanter (${products.length} ürün) Excel'e dışa aktarıldı.`,
      {
        count: products.length,
      },
    )
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-wine-600 rounded-full animate-spin"></div>
        <p className="text-wine-600 font-serif text-lg animate-pulse">
          Şarap listesi lokal veritabanından getiriliyor...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl border p-4 text-left transition ${
            statusFilter === 'all'
              ? 'border-gold-500 bg-gold-500/10'
              : 'border-charcoal-700 bg-charcoal-800 hover:border-charcoal-600'
          }`}
        >
          <p className="text-sm text-cream-200">Toplam Ürün</p>
          <p className="text-2xl font-bold text-cream-100">{stats.total}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ready')}
          className={`rounded-xl border p-4 text-left transition ${
            statusFilter === 'ready'
              ? 'border-green-500 bg-green-500/10'
              : 'border-charcoal-700 bg-charcoal-800 hover:border-charcoal-600'
          }`}
        >
          <p className="text-sm text-cream-200">Kiosk Hazır</p>
          <p className="text-2xl font-bold text-green-400">{stats.ready}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('missing')}
          className={`rounded-xl border p-4 text-left transition ${
            statusFilter === 'missing'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-charcoal-700 bg-charcoal-800 hover:border-charcoal-600'
          }`}
        >
          <p className="text-sm text-cream-200">Bilgi Eksik</p>
          <p className="text-2xl font-bold text-orange-300">{stats.missing}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('outOfStock')}
          className={`rounded-xl border p-4 text-left transition ${
            statusFilter === 'outOfStock'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-charcoal-700 bg-charcoal-800 hover:border-charcoal-600'
          }`}
        >
          <p className="text-sm text-cream-200">Stok Yok</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.outOfStock}</p>
        </button>
      </div>

      <div className="rounded-xl border border-charcoal-700 bg-charcoal-800 p-4 text-sm text-cream-200">
        Ürün adı, fiyat, stok, marka ve aktiflik bilgileri SQL Server/Vega kaynağından gelir.
        Bu ekranda yalnızca sommelier bilgileri, raf konumu ve görsel bilgisi lokal olarak kaydedilir.
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 bg-charcoal-800 p-2 rounded-lg border border-charcoal-700 w-full sm:w-96 shadow-inner">
          <svg
            className="w-5 h-5 text-cream-200 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Barkod, ürün adı veya marka ile ara..."
            className="bg-transparent border-none outline-none text-cream-100 w-full placeholder-charcoal-400"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => setQuickFillOpen(true)}
            className="px-6 py-3 bg-wine-800 hover:bg-wine-700 text-cream-100 font-semibold rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap"
          >
            ⚡ Hızlı Doldur
          </button>

          <button
            onClick={() => setBulkAiOpen(true)}
            className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-semibold rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap border border-gold-500/40"
          >
            🤖 AI ile Doldur
          </button>

          <button
            onClick={loadProducts}
            className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap"
          >
            Listeyi Yenile
          </button>

          <button
            onClick={handleExportExcel}
            className="px-6 py-3 bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-100 font-medium rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap"
          >
            Excel'e Aktar
          </button>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-charcoal-700/50 text-cream-200 text-sm uppercase tracking-wider border-b border-charcoal-700">
                <th className="p-4 font-medium">Durum</th>
                <th className="p-4 font-medium">Barkod</th>
                <th className="p-4 font-medium">Ürün Adı</th>
                <th className="p-4 font-medium">Renk</th>
                <th className="p-4 font-medium">Fiyat</th>
                <th className="p-4 font-medium">Stok</th>
                <th className="p-4 font-medium">Raf Konumu</th>
                <th className="p-4 font-medium text-right">İşlem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-charcoal-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-cream-200">
                    Aradığınız kriterlere uygun ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getProductStatus(product)
                  const displayBarcode = product.barcode || '-'
                  const displayName = product.name || '-'
                  const displayColor = colorLabelTr(product.color)
                  const displayPrice = product.price ?? '0'
                  const displayStock = product.stock ?? '0'
                  const displayBlock = product.block || ''
                  const displayShelf = product.shelf ?? ''
                  const isProductActive = checkIsActive(product)
                  const missing = missingFieldsText(product)

                  return (
                    <tr
                      key={product.id || product.barcode}
                      className={`hover:bg-charcoal-700/30 transition-colors ${
                        !isProductActive ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${status.className}`}
                          title={missing ? `Eksik alanlar: ${missing}` : ''}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="p-4 text-cream-200 text-sm">{displayBarcode}</td>

                      <td className="p-4 font-medium text-cream-100">
                        {displayName}

                        {!isProductActive && (
                          <span className="ml-2 text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800">
                            DB Pasif
                          </span>
                        )}

                        {checkIsSommelier(product) && (
                          <span className="ml-2 text-xs bg-gold-900/40 text-gold-400 px-2 py-0.5 rounded border border-gold-800/50">
                            Tavsiye
                          </span>
                        )}

                        {missing && (
                          <div className="mt-1 text-xs text-orange-300">
                            Eksik: {missing}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            displayColor === 'Kırmızı'
                              ? 'bg-wine-900/50 text-wine-200 border-wine-800'
                              : displayColor === 'Beyaz'
                                ? 'bg-cream-100/10 text-cream-200 border-cream-200/20'
                                : displayColor === 'Rosé' || displayColor === 'Roze'
                                  ? 'bg-pink-900/30 text-pink-300 border-pink-800/50'
                                  : displayColor === 'Köpüklü'
                                    ? 'bg-gold-900/30 text-gold-400 border-gold-800/50'
                                    : 'bg-charcoal-600 text-cream-200 border-charcoal-500'
                          }`}
                        >
                          {displayColor}
                        </span>
                      </td>

                      <td className="p-4 text-gold-400 font-medium">
                        {formatPrice(displayPrice)} ₺
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            Number(displayStock) > 10
                              ? 'bg-green-900/30 text-green-400 border-green-800/50'
                              : Number(displayStock) > 0
                                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
                                : 'bg-red-900/30 text-red-400 border-red-800/50'
                          }`}
                        >
                          {displayStock} Adet
                        </span>
                      </td>

                      <td className="p-4 text-cream-200 text-sm">
                        {displayBlock ? `${displayBlock} Blok ` : ''}
                        {displayShelf !== '' ? `${displayShelf}. Raf` : '-'}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-gold-500 hover:text-gold-400 font-medium text-sm transition-colors"
                        >
                          Sommelier Bilgisi Düzenle
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-800/50 shrink-0">
              <h3 className="text-2xl font-serif text-gold-500">
                Sommelier Bilgilerini Düzenle
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-cream-200 hover:text-red-400 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="productMetadataForm" onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    SQL / Vega Bilgileri
                  </h4>

                  <div className="mb-6 flex items-center gap-5">
                    <div className="h-28 w-28 flex-none overflow-hidden rounded-lg border border-charcoal-600 bg-ink-950 flex items-center justify-center">
                      <AdminProductImagePreview
                        product={formData}
                        previewDataUrl={preparedImage?.dataUrl}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-cream-200">
                        Ürün Görseli
                      </label>

                      <div className="flex items-center gap-3">
                        <label
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-gold-500/50 bg-wine-800/40 px-4 py-2 text-sm font-medium text-cream-100 transition hover:bg-wine-800/70 ${
                            processingImage ? 'pointer-events-none opacity-60' : ''
                          }`}
                        >
                          {preparedImage ? 'Değiştir' : 'Resim Seç'}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleImageUpload}
                            disabled={processingImage}
                            className="hidden"
                          />
                        </label>

                        {preparedImage && !processingImage && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-sm text-cream-200/60 transition hover:text-red-400"
                          >
                            Seçimi Temizle
                          </button>
                        )}
                      </div>

                      {processingImage ? (
                        <p className="text-xs text-cream-200/60">
                          Resim WebP formatına hazırlanıyor…
                        </p>
                      ) : preparedImage ? (
                        <p className="text-xs text-emerald-400">
                          WebP hazır · {preparedImage.width}×{preparedImage.height}px ·{' '}
                          {formatImageSize(preparedImage.size)}
                        </p>
                      ) : formData.barcode ? (
                        <p className="text-xs text-cream-200/50">
                          Kayıt sırasında dosya adı: {formData.barcode}.webp
                        </p>
                      ) : (
                        <p className="text-xs text-cream-200/50">
                          PNG, JPG veya WEBP seçebilirsiniz. Kayıtta barkod.webp olarak saklanır.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Barkod</label>
                      <input
                        type="text"
                        value={formData.barcode}
                        disabled
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 opacity-70"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-cream-200">Ürün Adı</label>
                      <input
                        type="text"
                        value={formData.name}
                        disabled
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 opacity-70"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Marka</label>
                      <input
                        type="text"
                        value={formData.brand}
                        disabled
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 opacity-70"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Fiyat</label>
                      <input
                        type="text"
                        value={`${formatPrice(formData.price)} ₺`}
                        disabled
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 opacity-70"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Stok</label>
                      <input
                        type="text"
                        value={`${formData.stock || 0} Adet`}
                        disabled
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 opacity-70"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Sommelier Temel Bilgileri
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Şarap Rengi</label>
                      <select
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {COLORS.map((color) => (
                          <option key={color} value={color}>
                            {COLOR_LABELS[color].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Ülke</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {COUNTRY_LABELS[country].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Bölge</label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Bordeaux, Ege"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <label className="text-sm font-medium text-cream-200">Üzüm Türü</label>
                      <input
                        type="text"
                        name="grape"
                        value={formData.grape}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Cabernet Sauvignon"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Şarap Karakteri
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Gövde</label>
                      <select
                        name="body"
                        value={formData.body}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tatlılık</label>
                      <select
                        name="sweetness"
                        value={formData.sweetness}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Asidite</label>
                      <select
                        name="acidity"
                        value={formData.acidity}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tanen</label>
                      <select
                        name="tannin"
                        value={formData.tannin}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level].tr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Tadım Notları ve Kullanım
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kısa Açıklama (TR)
                      </label>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Türkçe metin..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kısa Açıklama (EN)
                      </label>
                      <textarea
                        name="shortDescriptionEn"
                        value={formData.shortDescriptionEn}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="English text..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Tadım Notları (TR)
                      </label>
                      <input
                        type="text"
                        name="tasteNotes"
                        value={formData.tasteNotes}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Kiraz, vanilya"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Tadım Notları (EN)
                      </label>
                      <input
                        type="text"
                        name="tasteNotesEn"
                        value={formData.tasteNotesEn}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="e.g. Cherry, vanilla"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Yemek Uyumu (TR)
                      </label>
                      <input
                        type="text"
                        name="foodPairing"
                        value={formData.foodPairing}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Izgara etler"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Yemek Uyumu (EN)
                      </label>
                      <input
                        type="text"
                        name="foodPairingEn"
                        value={formData.foodPairingEn}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="e.g. Grilled meats"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 mt-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kullanım Amaçları
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {USAGE_PURPOSES.map((key) => {
                          const selected = formData.usagePurposes.includes(key)

                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => togglePurpose(key)}
                              className={`px-3 py-2 rounded-md text-sm border text-left transition-colors ${
                                selected
                                  ? 'bg-wine-700 border-gold-500 text-cream-100'
                                  : 'bg-ink-950 border-charcoal-600 text-cream-200 hover:border-charcoal-500'
                              }`}
                            >
                              {USAGE_PURPOSE_LABELS[key].tr}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Raf ve Öne Çıkarma
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Blok</label>
                      <input
                        type="text"
                        name="block"
                        value={formData.block}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: A"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Raf</label>
                      <input
                        type="text"
                        name="shelf"
                        value={formData.shelf}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: 6"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Öncelik Puanı
                      </label>
                      <input
                        type="number"
                        name="priorityScore"
                        value={formData.priorityScore}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 mt-6 p-4 bg-ink-950 rounded-lg border border-charcoal-700">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="sommelierPick"
                        checked={formData.sommelierPick}
                        onChange={handleInputChange}
                        className="h-5 w-5"
                      />

                      <div>
                        <p className="text-cream-100 font-medium">Sommelier Tavsiyesi</p>
                        <p className="text-xs text-cream-200 opacity-70">
                          Ürünü önerilerde daha güçlü öne çıkarır.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="featured"
                        checked={formData.featured}
                        onChange={handleInputChange}
                        className="h-5 w-5"
                      />

                      <div>
                        <p className="text-cream-100 font-medium">Öne Çıkan Ürün</p>
                        <p className="text-xs text-cream-200 opacity-70">
                          Bekleme/öneri ekranlarında öncelik verir.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-charcoal-700 bg-charcoal-800/50 flex justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md transition-colors"
              >
                İptal Et
              </button>

              <button
                type="submit"
                form="productMetadataForm"
                disabled={isSubmitting || processingImage}
                className="px-8 py-2.5 bg-gold-500 hover:bg-gold-400 text-ink-950 font-bold rounded-md transition-colors shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Sommelier Bilgilerini Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quickFillOpen && (
        <QuickFill
          products={products}
          onClose={() => setQuickFillOpen(false)}
          onSaved={loadProducts}
        />
      )}

      {bulkAiOpen && (
        <BulkAiFill
          products={products}
          onClose={() => setBulkAiOpen(false)}
          onSaved={loadProducts}
        />
      )}
    </div>
  )
}