import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { createPortal } from 'react-dom'
import { fetchAllProducts, fetchAuditLogs } from '../../firebase/products'

const LOW_STOCK_THRESHOLD = 10

function formatPrice(price) {
  const num = Number(price)

  return Number.isFinite(num)
    ? num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0,00'
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function translateTerm(term) {
  if (!term) return 'Belirtilmemiş'

  const dict = {
    red: 'Kırmızı',
    white: 'Beyaz',
    rose: 'Roze',
    rosé: 'Roze',
    sparkling: 'Köpüklü',

    light: 'Hafif',
    medium: 'Orta',
    intense: 'Yoğun',
    full: 'Yoğun',
    dry: 'Sek',
    semi_sweet: 'Yarı Tatlı',
    sweet: 'Tatlı',

    food: 'Yemek İçin',
    dinner: 'Yemek Eşliği',
    gift: 'Hediye İçin',
    celebration: 'Kutlama',
    special: 'Özel Gün',
    daily: 'Günlük İçim',
    everyday: 'Günlük İçim',
    romantic: 'Romantik Akşam',
    premium: 'Premium Seçim',
    beginner: 'Yeni Başlayanlar',
    sommelier: 'Sommelier Önerisi',
    value: 'Fiyat / Performans',

    TR: 'Türkiye',
    FR: 'Fransa',
    IT: 'İtalya',
    ES: 'İspanya',
    CL: 'Şili',
    AR: 'Arjantin',
    US: 'ABD',
    CY: 'Kıbrıs',
    GR: 'Yunanistan',
    DE: 'Almanya',
    PT: 'Portekiz',
    AU: 'Avustralya',
    NZ: 'Yeni Zelanda',
    ZA: 'Güney Afrika',
  }

  return dict[term] || dict[String(term).toLowerCase()] || term
}

function getLogTimestamp(log) {
  return (
    log.createdAt ||
    log.timestamp ||
    log.details?.timestamp ||
    log.date ||
    log.time ||
    ''
  )
}

function getLogAction(log) {
  return log.action || log.type || log.details?.type || ''
}

function isKioskLog(log) {
  const entityType = cleanText(log.entityType)
  const action = getLogAction(log)

  const kioskActions = [
    'flow_start',
    'session_start',
    'quickRecommend',
    'filter_selected',
    'step_completed',
    'product_viewed',
    'detail_opened',
    'scan_started',
    'finish_now',
  ]

  return entityType === 'kiosk-session' || kioskActions.includes(action)
}

function formatAndSort(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function buildAnalyticsFromLogs(logs = []) {
  let sessionCount = 0
  let totalClicks = 0

  const counts = {
    color: {},
    purpose: {},
    taste: {},
    country: {},
    products: {},
  }

  const hoursCount = Array(24).fill(0)

  logs.forEach((log) => {
    if (!isKioskLog(log)) return

    totalClicks += 1

    const action = getLogAction(log)
    const details = log.details || {}
    const dateStr = getLogTimestamp(log)

    if (dateStr) {
      const dateObj = new Date(dateStr)

      if (!Number.isNaN(dateObj.getTime())) {
        const hour = dateObj.getHours()
        hoursCount[hour] += 1
      }
    }

    if (action === 'session_start' || action === 'flow_start') {
      sessionCount += 1
      return
    }

    if (action === 'filter_selected' || action === 'step_completed') {
      const key = details.filterKey || details.stepKey
      const value = details.filterValue || details.selectedValue

      if (key && value && counts[key]) {
        counts[key][value] = (counts[key][value] || 0) + 1
      }

      return
    }

    if (action === 'product_viewed' || action === 'detail_opened') {
      const productName =
        details.productName ||
        details.productId ||
        details.barcode ||
        log.entityId ||
        ''

      if (productName) {
        counts.products[productName] = (counts.products[productName] || 0) + 1
      }
    }
  })

  const peakHours = hoursCount
    .map((count, index) => {
      const currentHour = index.toString().padStart(2, '0')
      const nextHour = ((index + 1) % 24).toString().padStart(2, '0')

      return {
        label: `${currentHour}:00 - ${nextHour}:00`,
        count,
      }
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)

  return {
    totalUsages: sessionCount,
    totalClicks,
    colors: formatAndSort(counts.color),
    purposes: formatAndSort(counts.purpose),
    tastes: formatAndSort(counts.taste),
    countries: formatAndSort(counts.country),
    topProducts: formatAndSort(counts.products),
    peakHours,
  }
}

function PrintBar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0

  return (
    <div className="pr-row">
      <div className="pr-row-top">
        <span className="pr-label">{translateTerm(label)}</span>
        <span className="pr-count">{count} işlem</span>
      </div>

      <div className="pr-track">
        <div className="pr-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PrintSection({ title, items }) {
  const max = items && items.length ? Math.max(...items.map((item) => item.count)) : 0

  return (
    <section className="pr-section">
      <h3 className="pr-h3">{title}</h3>

      {!items || items.length === 0 ? (
        <p className="pr-empty">Bu dönem için veri toplanmadı.</p>
      ) : (
        items.slice(0, 5).map((item, index) => (
          <PrintBar key={index} label={item.label} count={item.count} max={max} />
        ))
      )}
    </section>
  )
}

function PrintableReport({ analytics }) {
  const now = new Date()

  return (
    <div className="pr-page">
      <header className="pr-header">
        <div className="pr-brand">ERTAN MARKET</div>
        <div className="pr-sub">Kiosk Performans Analizi Raporu</div>
        <div className="pr-meta">
          {now.toLocaleDateString('tr-TR')} ·{' '}
          {now.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div className="pr-rule" />
      </header>

      <div className="pr-summary">
        <div className="pr-summary-num">{analytics.totalUsages}</div>

        <div className="pr-summary-text">
          <strong>Toplam Oturum</strong>
          <span>
            Müşterilerin uygulamayı başlatma sayısı · toplam {analytics.totalClicks} kiosk etkileşimi
          </span>
        </div>
      </div>

      <div className="pr-grid">
        <PrintSection title="En Yoğun Kullanım Saatleri" items={analytics.peakHours} />
        <PrintSection title="En Çok İncelenen Şaraplar" items={analytics.topProducts} />
        <PrintSection title="Müşterilerin Kullanım Amaçları" items={analytics.purposes} />
        <PrintSection title="En Çok Aranan Renkler" items={analytics.colors} />
        <PrintSection title="Tat Profili Eğilimi" items={analytics.tastes} />
        <PrintSection title="Popüler Şarap Ülkeleri" items={analytics.countries} />
      </div>

      <footer className="pr-footer">
        Ertan Market · Lokal Kiosk Analiz Raporu · {now.toLocaleDateString('tr-TR')}
      </footer>
    </div>
  )
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [products, setProducts] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])

  const [inventoryStats, setInventoryStats] = useState({
    totalUniqueWines: 0,
    totalBottles: 0,
    totalValue: 0,
    activeWines: 0,
    kioskReadyWines: 0,
  })

  const [analytics, setAnalytics] = useState({
    totalUsages: 0,
    totalClicks: 0,
    colors: [],
    purposes: [],
    tastes: [],
    countries: [],
    peakHours: [],
    topProducts: [],
  })

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [productList, auditLogs] = await Promise.all([
        fetchAllProducts(),
        fetchAuditLogs(2000),
      ])

      const prods = Array.isArray(productList) ? productList : []

      let totalBottles = 0
      let totalValue = 0
      let activeCount = 0
      let kioskReadyCount = 0

      prods.forEach((product) => {
        const stock = Number(product.stock) || 0
        const price = Number(product.price) || 0
        const isActive = product.active !== false && product.isActive !== false

        totalBottles += stock
        totalValue += stock * price

        if (isActive) activeCount += 1
        if (product.kioskReady === true) kioskReadyCount += 1
      })

      const lowStock = prods
        .filter((product) => {
          const isActive = product.active !== false && product.isActive !== false
          return isActive && Number(product.stock || 0) <= LOW_STOCK_THRESHOLD
        })
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))

      setProducts(prods)
      setLowStockProducts(lowStock)

      setInventoryStats({
        totalUniqueWines: prods.length,
        totalBottles,
        totalValue,
        activeWines: activeCount,
        kioskReadyWines: kioskReadyCount,
      })

      setAnalytics(buildAnalyticsFromLogs(auditLogs))
    } catch (err) {
      console.error('Lokal rapor verileri çekilirken hata oluştu:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const exportToExcel = (dataList, fileName) => {
    if (!dataList.length) {
      alert('Dışa aktarılacak veri bulunamadı.')
      return
    }

    const dataToExport = dataList.map((product) => ({
      Barkod: product.barcode || product.id || '',
      UrunAdi: product.name || '',
      Marka: product.brand || '',
      Kategori: product.category || '',
      Renk: translateTerm(product.color),
      Fiyat: product.price || 0,
      Stok: product.stock || 0,
      ToplamDeger: (Number(product.price) || 0) * (Number(product.stock) || 0),
      Raf: `${product.block || ''} Blok ${product.shelf || ''}. Raf`.trim(),
      DB_Aktif: product.active !== false && product.isActive !== false ? 'Evet' : 'Hayır',
      KioskHazir: product.kioskReady ? 'Evet' : 'Hayır',
      EksikAlanlar: Array.isArray(product.missingFields)
        ? product.missingFields.join(', ')
        : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
  }

  const renderProgressBar = (items, title, emptyMessage = 'Yeterli veri yok.') => {
    if (!items || items.length === 0) {
      return (
        <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg">
          <h3 className="font-serif text-xl text-gold-500 mb-6 border-b border-charcoal-700 pb-2">
            {title}
          </h3>
          <p className="text-sm text-cream-200/50 italic">{emptyMessage}</p>
        </div>
      )
    }

    const maxCount = Math.max(...items.map((item) => item.count))

    return (
      <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col">
        <h3 className="font-serif text-xl text-gold-500 mb-6 border-b border-charcoal-700 pb-2">
          {title}
        </h3>

        <div className="space-y-5 flex-1">
          {items.slice(0, 5).map((item, index) => {
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0

            return (
              <div key={index} className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span
                    className="text-sm font-medium text-cream-100 truncate pr-4"
                    title={translateTerm(item.label)}
                  >
                    {translateTerm(item.label)}
                  </span>

                  <span className="text-xs font-bold text-gold-400 shrink-0">
                    {item.count} İşlem
                  </span>
                </div>

                <div className="w-full bg-ink-950 rounded-full h-2 shadow-inner overflow-hidden mt-1">
                  <div
                    className="bg-gold-500 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${percentage}%`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-gold-500 font-serif text-lg animate-pulse">
          Lokal raporlar derleniyor...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto print:m-0 print:p-0">
      {createPortal(
        <div id="ertan-print-root">
          <PrintableReport analytics={analytics} />
        </div>,
        document.body,
      )}

      <style>{`
        #ertan-print-root { display: none; }

        #ertan-print-root .pr-page {
          color: #2b2320; background: #ffffff;
          font-family: 'Hanken Grotesk', Arial, sans-serif;
          font-size: 11px; line-height: 1.5;
        }
        #ertan-print-root .pr-header { text-align: center; margin-bottom: 12px; }
        #ertan-print-root .pr-brand {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 30px; font-weight: 700; letter-spacing: 0.18em; color: #6e1f2d;
        }
        #ertan-print-root .pr-sub {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 15px; color: #2b2320; margin-top: 3px;
        }
        #ertan-print-root .pr-meta { font-size: 10px; color: #8a7f76; margin-top: 4px; letter-spacing: .05em; }
        #ertan-print-root .pr-rule {
          height: 2px; margin: 12px auto 0; width: 100%;
          background: linear-gradient(90deg, transparent, #b8923f, transparent);
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #ertan-print-root .pr-summary {
          display: flex; align-items: center; gap: 16px;
          border: 1px solid #e6ddd2; border-radius: 10px;
          padding: 14px 18px; margin: 16px 0 18px; background: #faf7f2;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #ertan-print-root .pr-summary-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 44px; font-weight: 700; color: #6e1f2d; line-height: 1;
        }
        #ertan-print-root .pr-summary-text strong { display:block; font-size: 13px; color:#2b2320; }
        #ertan-print-root .pr-summary-text span { font-size: 10px; color:#8a7f76; }
        #ertan-print-root .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; }
        #ertan-print-root .pr-section { break-inside: avoid; }
        #ertan-print-root .pr-h3 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 15px; font-weight: 700; color: #6e1f2d;
          border-bottom: 1px solid #e6ddd2; padding-bottom: 4px; margin-bottom: 8px;
        }
        #ertan-print-root .pr-row { margin-bottom: 7px; }
        #ertan-print-root .pr-row-top { display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:3px; }
        #ertan-print-root .pr-label { color:#2b2320; font-weight:500; }
        #ertan-print-root .pr-count { color:#8a7f76; font-variant-numeric: tabular-nums; white-space:nowrap; padding-left:8px; }
        #ertan-print-root .pr-track {
          height:5px; background:#ece5db; border-radius:9999px; overflow:hidden;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #ertan-print-root .pr-fill {
          height:100%; background:#b8923f; border-radius:9999px;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #ertan-print-root .pr-empty { font-size:10px; color:#8a7f76; font-style:italic; }
        #ertan-print-root .pr-footer {
          margin-top: 18px; padding-top: 8px; border-top:1px solid #e6ddd2;
          text-align:center; font-size:9px; color:#8a7f76; letter-spacing:.08em;
        }

        @media print {
          @page { size: A4 portrait; margin: 15mm 14mm; }
          html, body { background:#ffffff !important; }
          #root { display: none !important; }
          #ertan-print-root { display: block !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal-700 pb-4 print-hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-500">
            Raporlar ve Analizler
          </h2>

          <p className="text-cream-200/70 text-sm mt-1">
            SQL/Vega envanterini ve lokal kiosk etkileşimlerini buradan takip edin.
          </p>

          <p className="text-cream-200/40 text-xs mt-1">
            Kaynaklar: SQL Server + data/product-overrides.json + data/audit-logs.json
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-ink-950 hover:bg-gold-400 transition-colors bg-gold-500 px-4 py-2 rounded-lg shadow-sm font-bold"
          >
            Analiz Raporunu Yazdır (A4)
          </button>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-cream-200 hover:text-gold-400 transition-colors bg-charcoal-800 px-4 py-2 rounded-lg border border-charcoal-700 shadow-sm"
          >
            Verileri Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          Rapor verileri yüklenemedi: {error.message || 'Bilinmeyen hata'}
        </div>
      )}

      <div className="print-hidden">
        <h2 className="font-serif text-2xl text-cream-100 border-l-4 border-wine-600 pl-3">
          Envanter Durumu
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-4">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">
              Farklı Şarap Çeşidi
            </span>
            <span className="text-3xl font-bold text-cream-100">
              {inventoryStats.totalUniqueWines}
            </span>
            <span className="text-xs text-green-400 mt-2">
              {inventoryStats.activeWines} tanesi DB aktif
            </span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">
              Kiosk Hazır
            </span>
            <span className="text-3xl font-bold text-green-400">
              {inventoryStats.kioskReadyWines}
            </span>
            <span className="text-xs text-cream-200/50 mt-2">
              Metadata tamamlanmış ürünler
            </span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">
              Toplam Şişe Stoğu
            </span>
            <span className="text-3xl font-bold text-cream-100">
              {inventoryStats.totalBottles}
            </span>
            <span className="text-xs text-cream-200/50 mt-2">
              SQL stok toplamı
            </span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">
              Toplam Envanter Değeri
            </span>
            <span className="text-3xl font-bold text-gold-400">
              {formatPrice(inventoryStats.totalValue)} ₺
            </span>
            <span className="text-xs text-cream-200/50 mt-2">
              SQL fiyat × stok
            </span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">
              Kritik Stok
            </span>
            <span className="text-3xl font-bold text-red-400">
              {lowStockProducts.length}
            </span>
            <span className="text-xs text-cream-200/50 mt-2">
              {LOW_STOCK_THRESHOLD} şişe ve altı
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-800/50">
              <h3 className="font-serif text-xl text-cream-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                Stoğu Tükenmek Üzere Olanlar
              </h3>

              <button
                onClick={() => exportToExcel(lowStockProducts, 'Kritik_Stok_Raporu')}
                className="text-xs font-medium bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-200 px-3 py-1.5 rounded transition-colors"
              >
                Excel İndir
              </button>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-charcoal-800 z-10">
                  <tr className="text-cream-200/60 text-xs uppercase tracking-wider border-b border-charcoal-700">
                    <th className="p-4 font-medium">Ürün Adı</th>
                    <th className="p-4 font-medium">Renk</th>
                    <th className="p-4 font-medium">Raf</th>
                    <th className="p-4 font-medium text-right">Kalan Stok</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-charcoal-700/50">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-cream-200/50 text-sm">
                        Harika! Şu an kritik seviyede azalan bir ürününüz yok.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((product) => (
                      <tr
                        key={product.id || product.barcode}
                        className="hover:bg-charcoal-700/30 transition-colors"
                      >
                        <td className="p-4 text-sm font-medium text-cream-100">
                          {product.name || '-'}
                        </td>

                        <td className="p-4 text-sm text-cream-200/80">
                          {translateTerm(product.color)}
                        </td>

                        <td className="p-4 text-sm text-cream-200/80">
                          {product.block || '-'} {product.shelf || ''}
                        </td>

                        <td className="p-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                              Number(product.stock || 0) === 0
                                ? 'bg-red-900/50 text-red-400 border border-red-800/50'
                                : 'bg-yellow-900/30 text-yellow-500 border border-yellow-800/50'
                            }`}
                          >
                            {product.stock || 0} Adet
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex-1">
            <h3 className="font-serif text-lg text-gold-500 mb-4 border-b border-charcoal-700 pb-2">
              Dışa Aktarım İşlemleri
            </h3>

            <p className="text-sm text-cream-200/70 mb-5">
              SQL’den gelen tüm ürün listenizi stok ve güncel fiyatlarıyla birlikte yedekleyebilirsiniz.
            </p>

            <button
              onClick={() => exportToExcel(products, 'Ertan_Tum_Envanter_Raporu')}
              className="w-full flex items-center justify-center gap-2 bg-wine-700 hover:bg-wine-600 text-cream-100 py-3 px-4 rounded-lg font-medium transition-colors shadow-md border border-wine-600/50"
            >
              Tüm Envanteri Excel'e Aktar
            </button>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-charcoal-700 mt-12 print-hidden"></div>

      <h2 className="font-serif text-2xl text-cream-100 border-l-4 border-gold-500 pl-3">
        Kiosk Kullanım Analizi
      </h2>

      <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-8 shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden group">
        <span className="text-sm font-medium text-cream-200/60 uppercase tracking-widest mb-3 z-10">
          Kiosk Toplam Oturum Sayısı
        </span>

        <span className="text-5xl md:text-7xl font-bold text-cream-100 z-10">
          {analytics.totalUsages}
        </span>

        <span className="text-sm text-gold-400 mt-4 z-10">
          Müşterilerin uygulamayı başlatma sayısı.
        </span>

        <span className="text-xs text-cream-200/50 mt-1 z-10">
          Toplam {analytics.totalClicks} lokal kiosk etkileşimi kaydedildi.
        </span>
      </div>

      {analytics.totalClicks === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 border border-dashed border-charcoal-700 rounded-2xl bg-charcoal-800/30">
          <p className="text-cream-200 text-lg">Henüz Yeterli Veri Yok</p>

          <p className="text-cream-200/50 text-sm mt-1">
            Müşteriler kiosk cihazını kullandıkça grafikler burada belirecektir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderProgressBar(
            analytics.peakHours,
            'En Yoğun Kullanım Saatleri',
            'Saat verisi henüz toplanmadı.',
          )}

          {renderProgressBar(
            analytics.topProducts,
            'En Çok İncelenen Şaraplar',
            'Henüz bir şarabın detayına bakılmadı.',
          )}

          {renderProgressBar(analytics.purposes, 'Müşterilerin Kullanım Amaçları')}
          {renderProgressBar(analytics.colors, 'En Çok Aranan Renkler')}
          {renderProgressBar(analytics.tastes, 'Tat Profili Eğilimi')}
          {renderProgressBar(analytics.countries, 'Popüler Şarap Ülkeleri')}
        </div>
      )}
    </div>
  )
}