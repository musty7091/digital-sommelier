import { useState, useEffect } from 'react'
import {
  DEFAULT_KIOSK_SETTINGS,
  normalizeKioskSettings,
  fetchKioskSettings,
  saveKioskSettings,
  logAuditAction,
} from '../../firebase/products'

const inputClass =
  'w-full rounded-md border border-charcoal-600 bg-ink-950 px-3 py-2 text-sm text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none transition'

const ALL_LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
]

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-charcoal-700/60 bg-ink-950/30 p-4">
      <div>
        <div className="text-sm font-medium text-cream-100">{label}</div>
        {hint && <div className="mt-1 text-xs text-cream-200/45">{hint}</div>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-wine-600' : 'bg-charcoal-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream-100 shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function Section({ title, desc, children, action }) {
  return (
    <section className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-serif text-xl text-cream-100">{title}</h3>
        {action}
      </div>

      {desc && <p className="mb-5 text-sm text-cream-200/60">{desc}</p>}

      {children}
    </section>
  )
}

function normalizeRangeForForm(range = {}, index = 0) {
  const id = String(
    range.id ||
      range.value ||
      range.key ||
      `range-${index + 1}`,
  ).trim()

  return {
    id,
    value: id,
    min: range.min ?? 0,
    max: range.max ?? null,
    label: {
      tr: range.label?.tr || '',
      en: range.label?.en || '',
    },
  }
}

function normalizeRangesForForm(priceRanges) {
  const source =
    Array.isArray(priceRanges) && priceRanges.length
      ? priceRanges
      : DEFAULT_KIOSK_SETTINGS.priceRanges || []

  return source.map((range, index) => normalizeRangeForForm(range, index))
}

function cleanNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

export default function KioskSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [defaultLanguage, setDefaultLanguage] = useState('tr')
  const [languages, setLanguages] = useState(['tr', 'en'])
  const [currency, setCurrency] = useState('TL')

  const [idleTimeout, setIdleTimeout] = useState(45)
  const [resetTimeout, setResetTimeout] = useState(120)
  const [idleScreenEnabled, setIdleScreenEnabled] = useState(true)
  const [featuredRotation, setFeaturedRotation] = useState(7)

  const [resultCount, setResultCount] = useState(5)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [hideOutOfStock, setHideOutOfStock] = useState(true)
  const [showStock, setShowStock] = useState(true)

  const [scanEnabled, setScanEnabled] = useState(true)
  const [voiceSearchEnabled, setVoiceSearchEnabled] = useState(true)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState({ tr: '', en: '' })

  const [priceRanges, setPriceRanges] = useState([])
  const [existingSettings, setExistingSettings] = useState(DEFAULT_KIOSK_SETTINGS)

  useEffect(() => {
    let alive = true

    async function loadSettings() {
      setLoading(true)
      setError(null)

      try {
        const loadedSettings = await fetchKioskSettings()
        const settings = normalizeKioskSettings(loadedSettings || {})

        if (!alive) return

        setExistingSettings(settings)

        setDefaultLanguage(settings.defaultLanguage || settings.language || 'tr')

        setLanguages(
          Array.isArray(settings.languages) && settings.languages.length
            ? settings.languages
            : ['tr', 'en'],
        )

        setCurrency(settings.currency || 'TL')

        setIdleTimeout(settings.idleTimeoutSeconds ?? 45)

        setResetTimeout(
          settings.resetTimeoutSeconds ??
            settings.autoResetSeconds ??
            120,
        )

        setIdleScreenEnabled(settings.idleScreenEnabled !== false)
        setFeaturedRotation(settings.featuredRotationSeconds ?? 7)

        setResultCount(settings.resultCount ?? settings.maxResults ?? 5)
        setLowStockThreshold(settings.lowStockThreshold ?? 10)
        setHideOutOfStock(settings.hideOutOfStock !== false)
        setShowStock(settings.showStock !== false)

        setScanEnabled(settings.scanEnabled !== false)
        setVoiceSearchEnabled(settings.voiceSearchEnabled !== false)
        setAnalyticsEnabled(settings.analyticsEnabled !== false)

        setMaintenanceMode(settings.maintenanceMode === true)

        setMaintenanceMessage({
          tr: settings.maintenanceMessage?.tr || '',
          en: settings.maintenanceMessage?.en || '',
        })

        setPriceRanges(normalizeRangesForForm(settings.priceRanges))
      } catch (err) {
        if (alive) {
          console.error('Lokal kiosk ayarları yüklenemedi:', err)
          setError(err)
        }
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      alive = false
    }
  }, [])

  const toggleLang = (code) => {
    setLanguages((prev) => {
      const has = prev.includes(code)
      let next = has ? prev.filter((item) => item !== code) : [...prev, code]

      if (next.length === 0) {
        next = [code]
      }

      return next
    })
  }

  const updateRange = (index, patch) => {
    setPriceRanges((prev) =>
      prev.map((range, itemIndex) =>
        itemIndex === index ? { ...range, ...patch } : range,
      ),
    )
  }

  const updateRangeLabel = (index, lang, value) => {
    setPriceRanges((prev) =>
      prev.map((range, itemIndex) =>
        itemIndex === index
          ? {
              ...range,
              label: {
                ...range.label,
                [lang]: value,
              },
            }
          : range,
      ),
    )
  }

  const addRange = () => {
    const id = `range-${Date.now().toString().slice(-6)}`

    setPriceRanges((prev) => [
      ...prev,
      {
        id,
        value: id,
        min: 0,
        max: null,
        label: {
          tr: '',
          en: '',
        },
      },
    ])
  }

  const removeRange = (index) => {
    setPriceRanges((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const moveRange = (index, direction) => {
    setPriceRanges((prev) => {
      const next = [...prev]
      const targetIndex = index + direction

      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev
      }

      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]

      return next
    })
  }

  const writeLog = async (action, message, details = {}) => {
    try {
      await logAuditAction({
        action,
        entityType: 'kiosk-settings',
        entityId: 'kiosk',
        message,
        details,
      })
    } catch (err) {
      console.error('Kiosk ayar logu kaydedilemedi:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const langs = languages.length ? languages : ['tr']
      const defaultLang = langs.includes(defaultLanguage) ? defaultLanguage : langs[0]

      const cleanRanges = priceRanges.map((range, index) => {
        const id = String(range.id || range.value || `range-${index + 1}`).trim()

        return {
          id,
          value: id,
          min: Math.max(0, cleanNumber(range.min, 0)),
          max:
            range.max === '' || range.max === null || range.max === undefined
              ? null
              : Math.max(0, cleanNumber(range.max, 0)),
          label: {
            tr: range.label?.tr || '',
            en: range.label?.en || '',
          },
        }
      })

      const nextSettings = normalizeKioskSettings({
        ...DEFAULT_KIOSK_SETTINGS,
        ...existingSettings,

        defaultLanguage: defaultLang,
        language: defaultLang,
        languages: langs,

        currency: (currency || 'TL').trim(),

        idleTimeoutSeconds: Math.max(5, cleanNumber(idleTimeout, 45)),
        resetTimeoutSeconds: Math.max(10, cleanNumber(resetTimeout, 120)),
        autoResetSeconds: Math.max(10, cleanNumber(resetTimeout, 120)),

        idleScreenEnabled: Boolean(idleScreenEnabled),
        featuredRotationSeconds: Math.max(2, cleanNumber(featuredRotation, 7)),

        resultCount: Math.min(12, Math.max(1, cleanNumber(resultCount, 5))),
        maxResults: Math.min(12, Math.max(1, cleanNumber(resultCount, 5))),
        lowStockThreshold: Math.max(0, cleanNumber(lowStockThreshold, 0)),
        hideOutOfStock: Boolean(hideOutOfStock),
        showStock: Boolean(showStock),

        scanEnabled: Boolean(scanEnabled),
        voiceSearchEnabled: Boolean(voiceSearchEnabled),
        analyticsEnabled: Boolean(analyticsEnabled),

        maintenanceMode: Boolean(maintenanceMode),
        maintenanceMessage: {
          tr: maintenanceMessage.tr || '',
          en: maintenanceMessage.en || '',
        },

        priceRanges: cleanRanges,
      })

      const result = await saveKioskSettings(nextSettings)

      setExistingSettings(result.settings || nextSettings)
      setSaved(true)

      await writeLog(
        'kiosk_settings_saved',
        'Kiosk ayarları lokal dosyaya kaydedildi.',
        {
          fields: [
            'language',
            'currency',
            'timers',
            'recommendation',
            'features',
            'maintenance',
            'priceRanges',
          ],
        },
      )

      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Kiosk ayarları kaydedilemedi:', err)
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-cream-200">Ayarlar lokal dosyadan yükleniyor…</div>
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-4 text-sm text-cream-200">
        Bu ekran artık Firebase kullanmaz. Ayarlar lokal olarak
        <span className="font-semibold text-gold-400"> data/kiosk-settings.json </span>
        dosyasına kaydedilir.
      </div>

      <Section title="Genel" desc="Dil ve para birimi gibi temel kiosk ayarları.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Varsayılan Dil
            </label>

            <select
              value={defaultLanguage}
              onChange={(event) => setDefaultLanguage(event.target.value)}
              className={inputClass}
            >
              {languages.map((code) => (
                <option key={code} value={code}>
                  {ALL_LANGS.find((lang) => lang.code === code)?.label || code}
                </option>
              ))}
            </select>

            <p className="mt-1.5 text-xs text-cream-200/45">
              Kiosk açıldığında bu dille başlar.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Para Birimi
            </label>

            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              placeholder="TL"
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Fiyatların yanında gösterilir. Örnek: TL, ₺, €
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-cream-200">
            Etkin Diller
          </label>

          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((lang) => {
              const enabled = languages.includes(lang.code)

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLang(lang.code)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    enabled
                      ? 'border-gold-500/60 bg-wine-800/50 text-cream-100'
                      : 'border-charcoal-600 text-cream-200/50 hover:text-cream-100'
                  }`}
                >
                  {enabled ? '✓ ' : ''}
                  {lang.label}
                </button>
              )
            })}
          </div>

          <p className="mt-2 text-xs text-cream-200/45">
            Açılış ekranındaki dil seçiminde yalnız etkin diller görünür. En az bir dil açık olmalı.
          </p>
        </div>
      </Section>

      <Section title="Zamanlayıcılar & Bekleme" desc="Kiosk hareketsizlik davranışını belirler.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Bekleme Süresi (saniye)
            </label>

            <input
              type="number"
              min="5"
              value={idleTimeout}
              onChange={(event) => setIdleTimeout(event.target.value)}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Açılış ekranında bu süre dokunulmazsa “Öne Çıkan Şaraplar” bekleme ekranına geçer.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Sıfırlama Süresi (saniye)
            </label>

            <input
              type="number"
              min="10"
              value={resetTimeout}
              onChange={(event) => setResetTimeout(event.target.value)}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Seçim akışı sırasında bu kadar hareketsizlikte otomatik olarak başa döner.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Bekleme Ekranı Dönüş Hızı (saniye)
            </label>

            <input
              type="number"
              min="2"
              value={featuredRotation}
              onChange={(event) => setFeaturedRotation(event.target.value)}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Bekleme ekranında her şarabın ekranda kalma süresi.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Toggle
            checked={idleScreenEnabled}
            onChange={setIdleScreenEnabled}
            label="Bekleme ekranı"
            hint="Kapatırsan kiosk hareketsizlikte bekleme ekranına geçmez, açılış ekranında bekler."
          />
        </div>
      </Section>

      <Section title="Öneri & Stok" desc="Sonuç sayısı ve stok davranışı.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Önerilen Ürün Sayısı
            </label>

            <input
              type="number"
              min="1"
              max="12"
              value={resultCount}
              onChange={(event) => setResultCount(event.target.value)}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Sonuç ekranında en fazla kaç şarap gösterilsin.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">
              Düşük Stok Eşiği
            </label>

            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-cream-200/45">
              Stok bu sayı ve altına inince “Son ürünler” uyarısı çıkar.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <Toggle
            checked={hideOutOfStock}
            onChange={setHideOutOfStock}
            label="Stokta olmayan ürünleri gizle"
            hint="Açıkken stoğu biten şaraplar önerilerde ve sonuçlarda görünmez."
          />
          <Toggle
            checked={showStock}
            onChange={setShowStock}
            label="Üründe stok durumunu göster"
            hint="Kapalıyken kartlarda ve detayda “Stokta Var / az kaldı / tükendi” rozetleri gizlenir."
          />
        </div>
      </Section>

      <Section title="Özellikler" desc="Açılış ekranı butonları ve lokal veri kaydı.">
        <div className="space-y-3">
          <Toggle
            checked={scanEnabled}
            onChange={setScanEnabled}
            label="“Ürün Okut” butonu"
            hint="Barkod okuyucusu olmayan kiosklarda kapatabilirsin."
          />

          <Toggle
            checked={voiceSearchEnabled}
            onChange={setVoiceSearchEnabled}
            label="“Sesli Ara” butonu"
            hint="Mikrofon/internet olmayan kiosklarda kapatabilirsin."
          />

          <Toggle
            checked={analyticsEnabled}
            onChange={setAnalyticsEnabled}
            label="Lokal analitik kaydı"
            hint="Müşteri etkileşimleri lokal audit log dosyasına kaydedilir."
          />
        </div>
      </Section>

      <Section title="Bakım Modu" desc="Açıkken müşterilere geçici olarak kapalı ekranı gösterilir.">
        <Toggle
          checked={maintenanceMode}
          onChange={setMaintenanceMode}
          label="Bakım modunu aç"
          hint="Menü güncelleme, temizlik veya teknik işlem sırasında kullan."
        />

        {maintenanceMode && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200">
                Mesaj (TR)
              </label>

              <textarea
                rows={3}
                value={maintenanceMessage.tr}
                onChange={(event) =>
                  setMaintenanceMessage((message) => ({
                    ...message,
                    tr: event.target.value,
                  }))
                }
                placeholder="Dijital sommelier şu anda bakımda."
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200">
                Mesaj (EN)
              </label>

              <textarea
                rows={3}
                value={maintenanceMessage.en}
                onChange={(event) =>
                  setMaintenanceMessage((message) => ({
                    ...message,
                    en: event.target.value,
                  }))
                }
                placeholder="The digital sommelier is currently under maintenance."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Fiyat Aralıkları"
        desc="Kiosk’taki fiyat adımında gösterilir. Üst sınırı boş bırakırsan “ve üzeri” anlamına gelir."
        action={
          <button
            type="button"
            onClick={addRange}
            className="rounded-md border border-gold-500/50 bg-wine-800/40 px-3 py-1.5 text-sm font-medium text-cream-100 transition hover:bg-wine-800/70"
          >
            + Aralık Ekle
          </button>
        }
      >
        <div className="space-y-3">
          <div className="hidden grid-cols-[50px_1fr_1fr_1.4fr_1.4fr_40px] gap-3 px-1 text-[11px] uppercase tracking-wide text-cream-200/40 md:grid">
            <span>Sıra</span>
            <span>Min</span>
            <span>Max</span>
            <span>Etiket (TR)</span>
            <span>Etiket (EN)</span>
            <span></span>
          </div>

          {priceRanges.length === 0 && (
            <p className="py-4 text-center text-sm text-cream-200/50">
              Henüz aralık yok. “Aralık Ekle” ile başlayın.
            </p>
          )}

          {priceRanges.map((range, index) => (
            <div
              key={range.id || range.value || index}
              className="grid grid-cols-2 items-center gap-3 rounded-lg border border-charcoal-700/60 bg-ink-950/30 p-3 md:grid-cols-[50px_1fr_1fr_1.4fr_1.4fr_40px]"
            >
              <div className="flex flex-col items-center text-xs leading-none">
                <button
                  type="button"
                  onClick={() => moveRange(index, -1)}
                  disabled={index === 0}
                  className="px-1 py-0.5 text-cream-200/50 transition hover:text-gold-400 disabled:opacity-20"
                  title="Yukarı"
                >
                  ▲
                </button>

                <button
                  type="button"
                  onClick={() => moveRange(index, 1)}
                  disabled={index === priceRanges.length - 1}
                  className="px-1 py-0.5 text-cream-200/50 transition hover:text-gold-400 disabled:opacity-20"
                  title="Aşağı"
                >
                  ▼
                </button>
              </div>

              <input
                type="number"
                value={range.min ?? ''}
                onChange={(event) => updateRange(index, { min: event.target.value })}
                placeholder="0"
                className={inputClass}
              />

              <input
                type="number"
                value={range.max ?? ''}
                onChange={(event) =>
                  updateRange(index, {
                    max: event.target.value === '' ? null : event.target.value,
                  })
                }
                placeholder="üst sınır yok"
                className={inputClass}
              />

              <input
                value={range.label?.tr || ''}
                onChange={(event) => updateRangeLabel(index, 'tr', event.target.value)}
                placeholder="0 - 500 TL"
                className={inputClass}
              />

              <input
                value={range.label?.en || ''}
                onChange={(event) => updateRangeLabel(index, 'en', event.target.value)}
                placeholder="0 - 500 TL"
                className={inputClass}
              />

              <button
                type="button"
                onClick={() => removeRange(index)}
                className="justify-self-end px-2 text-cream-200/50 transition hover:text-red-400"
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-4 rounded-xl border border-charcoal-700 bg-charcoal-800/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-wine-700 px-6 py-2.5 font-medium text-cream-100 shadow-md transition hover:bg-wine-800 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>

        {saved && (
          <span className="text-sm font-medium text-emerald-400">
            ✓ Ayarlar lokal dosyaya kaydedildi.
          </span>
        )}

        {error && (
          <span className="text-sm text-red-400">
            Kaydedilemedi: {error.message || 'Lütfen tekrar deneyin.'}
          </span>
        )}
      </div>
    </div>
  )
}