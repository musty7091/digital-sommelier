import { useEffect, useState } from 'react'
import { fetchAllProducts } from '../../firebase/products'
import { logAdminAction } from '../utils/logger'
import { LEVEL_LABELS, COUNTRY_LABELS } from '../../types/product.schema'

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

function extractAnyText(value, preferredLang = 'tr', visited = new WeakSet()) {
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
      .map((item) => extractAnyText(item, preferredLang, visited))
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
    const text = extractAnyText(candidate, preferredLang, visited)
    if (text) return text
  }

  for (const candidate of Object.values(value)) {
    const text = extractAnyText(candidate, preferredLang, visited)
    if (text) return text
  }

  return ''
}

function getProductKey(product) {
  return cleanText(product?.barcode || product?.id)
}

function getLocalizedTr(value) {
  return extractAnyText(value, 'tr')
}

function normalizeLevel(value) {
  const text = cleanText(value).toLowerCase()

  if (!text) return 'medium'

  if (['light', 'low', 'hafif', 'az'].includes(text)) return 'light'
  if (['medium', 'orta', 'dengeli'].includes(text)) return 'medium'

  if (
    [
      'intense',
      'full',
      'full_bodied',
      'full bodied',
      'heavy',
      'high',
      'yoğun',
      'yogun',
      'yüksek',
      'yuksek',
    ].includes(text)
  ) {
    return 'intense'
  }

  return LEVEL_LABELS[text] ? text : 'medium'
}

function getLevelLabelTr(value) {
  const key = normalizeLevel(value)
  return LEVEL_LABELS[key]?.tr || key || 'Orta'
}

function getCountryLabelTr(value) {
  const key = cleanText(value)
  return COUNTRY_LABELS[key]?.tr || key || 'Belirtilmemiş'
}

function extractJsonObject(text) {
  const raw = cleanText(text)

  if (!raw) {
    throw new Error('Yapay zekâ boş cevap döndürdü.')
  }

  try {
    return JSON.parse(raw)
  } catch {
    const cleaned = raw
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim()

    try {
      return JSON.parse(cleaned)
    } catch {
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
      }

      throw new Error('Yapay zekâ JSON formatında cevap vermedi.')
    }
  }
}

function emptyGeneratedData() {
  return {
    shortDescriptionTr: '',
    shortDescriptionEn: '',
    tasteNotesTr: '',
    tasteNotesEn: '',
    foodPairingTr: '',
    foodPairingEn: '',
  }
}

function getLocalApiUrl() {
  return (
    import.meta.env.VITE_PRODUCT_DB_API_URL ||
    'http://localhost:8788'
  ).replace(/\/$/, '')
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `HTTP hata kodu: ${response.status}`

    throw new Error(message)
  }

  return data
}

async function saveAiMetadataDirectly(barcode, metadata) {
  const apiUrl = getLocalApiUrl()

  return requestJson(`${apiUrl}/api/products/${encodeURIComponent(barcode)}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify(metadata),
  })
}

async function fetchProductDirectly(barcode) {
  const apiUrl = getLocalApiUrl()

  const result = await requestJson(
    `${apiUrl}/api/products/${encodeURIComponent(barcode)}`,
  )

  return result?.product || result
}

function hasSavedAiText(product, expectedText) {
  const expected = cleanText(expectedText)

  if (!expected) return false

  const candidates = [
    product?.shortDescription,
    product?.shortDescription?.tr,
    product?.shortDescription?.TR,
    product?.description,
    product?.descriptionTr,
    product?.shortDescriptionTr,
    product?.KisaAciklama,
    product?.KisaAciklama_TR,
  ]

  return candidates.some((candidate) => {
    const text = extractAnyText(candidate, 'tr')
    return cleanText(text) === expected
  })
}

export default function AiExplanation() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProductKey, setSelectedProductKey] = useState('')

  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [modelName, setModelName] = useState(
    localStorage.getItem('gemini_model_name') || 'gemini-3-flash-preview',
  )

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedData, setGeneratedData] = useState(emptyGeneratedData())

  const fetchProducts = async () => {
    setLoading(true)

    try {
      const list = await fetchAllProducts()

      const activeProducts = Array.isArray(list)
        ? list.filter((product) => product.active !== false && product.isActive !== false)
        : []

      setProducts(activeProducts)
    } catch (error) {
      console.error('Lokal ürünler çekilirken hata oluştu:', error)
      alert(error.message || 'Ürünler lokal API’den alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const selectedProduct = products.find((product) => {
    return getProductKey(product) === selectedProductKey
  })

  const handleApiKeyChange = (event) => {
    const key = event.target.value

    setApiKey(key)
    localStorage.setItem('gemini_api_key', key)
  }

  const handleModelNameChange = (event) => {
    const value = event.target.value

    setModelName(value)
    localStorage.setItem('gemini_model_name', value)
  }

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      alert('Lütfen önce bir Gemini API anahtarı girin.')
      return
    }

    if (!selectedProduct) {
      alert('Lütfen listeden bir şarap seçin.')
      return
    }

    setIsGenerating(true)
    setGeneratedData(emptyGeneratedData())

    const countryTr = getCountryLabelTr(selectedProduct.country)
    const bodyTr = getLevelLabelTr(selectedProduct.body)
    const sweetnessTr = getLevelLabelTr(selectedProduct.sweetness)

    const prompt = `
Sen dünyaca ünlü, uzman bir şarap sommelierisin.
Aşağıdaki şarap için müşteriyi satın almaya ikna edecek profesyonel ama kısa içerik üret.
İçeriği hem Türkçe hem İngilizce ayrı ayrı hazırla.

Şarap Bilgileri:
Adı: ${selectedProduct.name || 'Belirtilmemiş'}
Marka: ${selectedProduct.brand || 'Belirtilmemiş'}
Üzüm Türü: ${selectedProduct.grape || 'Belirtilmemiş'}
Ülke ve Bölge: ${countryTr} - ${selectedProduct.region || 'Belirtilmemiş'}
Gövde: ${bodyTr}
Tatlılık: ${sweetnessTr}

Aşağıdaki JSON şemasını doldur.
Hiçbir ek metin yazma.
Sadece geçerli JSON döndür.

{
  "shortDescriptionTr": "Müşterinin kiosk ekranında okuyacağı, kısa, net ve iştah açıcı Türkçe açıklama. En fazla 1-2 kısa cümle.",
  "shortDescriptionEn": "Aynı açıklamanın doğal ve satış odaklı İngilizce karşılığı.",
  "tasteNotesTr": "Virgülle ayrılmış en fazla 3 belirgin aroma/tat notu.",
  "tasteNotesEn": "Aynı aroma/tat notlarının İngilizce karşılığı.",
  "foodPairingTr": "Bu şarapla iyi gidecek 2 yemek veya peynir eşleşmesi.",
  "foodPairingEn": "Aynı yemek/peynir eşleşmesinin İngilizce karşılığı."
}
`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName.trim(),
        )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
            },
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage =
          errorData?.error?.message || `HTTP hata kodu: ${response.status}`

        throw new Error(errorMessage)
      }

      const data = await response.json()
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const parsedData = extractJsonObject(aiText)

      setGeneratedData({
        shortDescriptionTr: cleanText(parsedData.shortDescriptionTr),
        shortDescriptionEn: cleanText(parsedData.shortDescriptionEn),
        tasteNotesTr: cleanText(parsedData.tasteNotesTr),
        tasteNotesEn: cleanText(parsedData.tasteNotesEn),
        foodPairingTr: cleanText(parsedData.foodPairingTr),
        foodPairingEn: cleanText(parsedData.foodPairingEn),
      })
    } catch (error) {
      console.error('Yapay zekâ hatası:', error)
      alert(
        `Bir hata oluştu:\n\n${error.message}\n\nAPI anahtarını ve model adını kontrol edin.`,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToProduct = async () => {
    if (!selectedProduct) {
      alert('Lütfen önce bir ürün seçin.')
      return
    }

    if (!generatedData.shortDescriptionTr.trim()) {
      alert('Kaydedilecek Türkçe kısa açıklama bulunamadı.')
      return
    }

    const barcode = getProductKey(selectedProduct)

    if (!barcode) {
      alert('Bu ürünün barkodu bulunamadı. Kayıt yapılamaz.')
      return
    }

    setIsSaving(true)

    try {
      const now = new Date().toISOString()

      const metadata = {
        barcode,

        // Yapay zekâ ekranı YALNIZCA açıklama alanlarını kaydeder.
        // Renk/ülke/bölge/üzüm/raf/karakteristik gibi alanlar burada GÖNDERİLMEZ;
        // gönderilirse boş değerlerle önceki verinin üzerine yazıp siler.
        // Server, gönderilmeyen alanları mevcut override'dan koruyarak birleştirir.

        shortDescription: {
          tr: generatedData.shortDescriptionTr,
          en: generatedData.shortDescriptionEn,
        },

        tasteNotes: {
          tr: generatedData.tasteNotesTr,
          en: generatedData.tasteNotesEn,
        },

        foodPairing: {
          tr: generatedData.foodPairingTr,
          en: generatedData.foodPairingEn,
        },

        description: generatedData.shortDescriptionTr,
        descriptionTr: generatedData.shortDescriptionTr,
        descriptionEn: generatedData.shortDescriptionEn,

        shortDescriptionTr: generatedData.shortDescriptionTr,
        shortDescriptionEn: generatedData.shortDescriptionEn,
        tasteNotesTr: generatedData.tasteNotesTr,
        tasteNotesEn: generatedData.tasteNotesEn,
        foodPairingTr: generatedData.foodPairingTr,
        foodPairingEn: generatedData.foodPairingEn,

        KisaAciklama_TR: generatedData.shortDescriptionTr,
        KisaAciklama_EN: generatedData.shortDescriptionEn,
        TadimNotlari_TR: generatedData.tasteNotesTr,
        TadimNotlari_EN: generatedData.tasteNotesEn,
        YemekUyumu_TR: generatedData.foodPairingTr,
        YemekUyumu_EN: generatedData.foodPairingEn,

        updatedAt: now,
        updatedBy: 'ai_explanation',
        source: 'ai_explanation',
      }

      await saveAiMetadataDirectly(barcode, metadata)

      const freshProduct = await fetchProductDirectly(barcode)

      if (!hasSavedAiText(freshProduct, generatedData.shortDescriptionTr)) {
        console.error('AI kayıt doğrulaması başarısız. API’den dönen ürün:', freshProduct)

        throw new Error(
          'Kayıt API’ye gönderildi fakat ürün tekrar okunduğunda açıklama görünmedi. product-overrides.json yazımı kontrol edilmeli.',
        )
      }

      await logAdminAction(
        'Yapay Zekâ',
        'GÜNCELLEME',
        `"${selectedProduct.name || barcode}" ürünü için çift dilli yapay zekâ açıklaması lokal ürüne kaydedildi ve doğrulandı.`,
      )

      alert('Açıklama ürüne kaydedildi ve doğrulandı.')

      setGeneratedData(emptyGeneratedData())
      setSelectedProductKey('')
      await fetchProducts()
    } catch (error) {
      console.error('Yapay zekâ içeriği kaydedilemedi:', error)
      alert(error.message || 'Açıklama ürüne kaydedilirken bir hata oluştu.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-gold-500 font-serif text-lg animate-pulse">
          Lokal ürün listesi hazırlanıyor...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal-700 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-500 flex items-center gap-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Yapay Zekâ Sommelier
          </h2>

          <p className="text-cream-200/70 text-sm mt-1">
            Şaraplarınız için otomatik, çift dilli ve üründe doğrudan görünen içerikler üretin.
          </p>

          <p className="text-cream-200/40 text-xs mt-1">
            Kayıt hedefi: data/product-overrides.json
          </p>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg max-w-3xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-cream-200 mb-2">
            Google Gemini API Anahtarı
          </label>

          <input
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="AI_xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none focus:border-gold-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cream-200 mb-2">
            Gemini Model Adı
          </label>

          <input
            type="text"
            value={modelName}
            onChange={handleModelNameChange}
            placeholder="gemini-3-flash-preview"
            className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none focus:border-gold-500"
          />

          <p className="mt-1 text-xs text-cream-200/45">
            Model çalışmazsa buradan farklı Gemini model adını deneyebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg">
            <h3 className="text-lg font-serif text-cream-100 mb-4 border-b border-charcoal-700 pb-2">
              1. Şarap Seçin
            </h3>

            <select
              value={selectedProductKey}
              onChange={(event) => {
                setSelectedProductKey(event.target.value)
                setGeneratedData(emptyGeneratedData())
              }}
              className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none focus:border-gold-500"
            >
              <option value="">-- Şarap Seçiniz --</option>

              {products.map((product) => {
                const key = getProductKey(product)

                return (
                  <option key={key} value={key}>
                    {product.name || 'İsimsiz Ürün'} ({product.barcode || product.id})
                  </option>
                )
              })}
            </select>

            {selectedProduct && (
              <div className="mt-6 p-4 bg-ink-950 rounded-lg border border-charcoal-700 space-y-3">
                <p className="text-sm text-cream-200">
                  <strong className="text-gold-400">Ürün:</strong>{' '}
                  {selectedProduct.name || '-'}
                </p>

                <p className="text-sm text-cream-200">
                  <strong className="text-gold-400">Üzüm:</strong>{' '}
                  {selectedProduct.grape || '-'}
                </p>

                <p className="text-sm text-cream-200">
                  <strong className="text-gold-400">Bölge:</strong>{' '}
                  {selectedProduct.region || '-'}
                </p>

                <p className="text-sm text-cream-200">
                  <strong className="text-gold-400">Mevcut TR:</strong>{' '}
                  {getLocalizedTr(selectedProduct.shortDescription) ||
                    selectedProduct.descriptionTr ||
                    selectedProduct.description ||
                    'Yok'}
                </p>

                <p className="text-xs text-cream-200/45">
                  Barkod: {selectedProduct.barcode || selectedProduct.id}
                </p>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-wine-700 hover:bg-wine-600 disabled:bg-charcoal-600 text-cream-100 font-medium rounded-lg transition-colors shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-cream-100 border-t-transparent rounded-full animate-spin"></div>
                      Düşünüyor...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                      Çift Dilli Üret
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-lg font-serif text-cream-100 mb-4 border-b border-charcoal-700 pb-2">
              2. Yapay Zekâ Çift Dilli Öneri
            </h3>

            {!generatedData.shortDescriptionTr && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <svg
                  className="w-16 h-16 text-charcoal-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>

                <p className="text-cream-200">
                  Henüz bir açıklama üretilmedi.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">
                    Kısa Açıklama
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        Türkçe
                      </label>

                      <textarea
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        rows="3"
                        value={generatedData.shortDescriptionTr}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            shortDescriptionTr: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        İngilizce
                      </label>

                      <textarea
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        rows="3"
                        value={generatedData.shortDescriptionEn}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            shortDescriptionEn: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">
                    Tat Notları
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        Türkçe
                      </label>

                      <input
                        type="text"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        value={generatedData.tasteNotesTr}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            tasteNotesTr: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        İngilizce
                      </label>

                      <input
                        type="text"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        value={generatedData.tasteNotesEn}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            tasteNotesEn: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">
                    Yemek & Peynir Uyumu
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        Türkçe
                      </label>

                      <input
                        type="text"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        value={generatedData.foodPairingTr}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            foodPairingTr: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-cream-200 mb-1">
                        İngilizce
                      </label>

                      <input
                        type="text"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none"
                        value={generatedData.foodPairingEn}
                        onChange={(event) =>
                          setGeneratedData((prev) => ({
                            ...prev,
                            foodPairingEn: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveToProduct}
                  disabled={isSaving}
                  className="w-full mt-6 px-6 py-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-ink-950 font-bold text-lg rounded-lg transition-colors shadow-md"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Tümünü Onayla ve Ürüne Kaydet'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}