import { useEffect, useState } from 'react'
import { fetchAllProducts } from '../../firebase/products'

function isActiveProduct(product) {
  return product?.active !== false && product?.isActive !== false
}

function isOutOfStock(product) {
  return Number(product?.stock || 0) <= 0
}

function StatCard({ title, value, hint, tone = 'gold' }) {
  const toneClass = {
    gold: 'bg-gold-500/10',
    wine: 'bg-wine-600/10',
    red: 'bg-red-500/10',
    green: 'bg-green-500/10',
    orange: 'bg-orange-500/10',
    blue: 'bg-blue-500/10',
  }[tone] || 'bg-gold-500/10'

  return (
    <div className="bg-charcoal-800 p-6 rounded-xl border border-charcoal-700 shadow-lg relative overflow-hidden group">
      <div
        className={`absolute top-0 right-0 w-16 h-16 ${toneClass} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}
      />

      <p className="text-sm text-cream-200 mb-2 font-medium">{title}</p>

      <p className="text-4xl font-sans font-bold text-cream-100">
        {value}
      </p>

      {hint && (
        <p className="text-xs text-cream-200/50 mt-2">
          {hint}
        </p>
      )}
    </div>
  )
}

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    sommelierPicks: 0,
    kioskReadyProducts: 0,
    missingMetadata: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const products = await fetchAllProducts()
      const list = Array.isArray(products) ? products : []

      const activeProducts = list.filter(isActiveProduct)
      const outOfStock = list.filter(isOutOfStock)
      const sommelierPicks = list.filter((product) => product.sommelierPick === true)
      const kioskReadyProducts = list.filter((product) => product.kioskReady === true)
      const missingMetadata = list.filter((product) => product.kioskReady !== true)

      setStats({
        totalProducts: list.length,
        activeProducts: activeProducts.length,
        outOfStock: outOfStock.length,
        sommelierPicks: sommelierPicks.length,
        kioskReadyProducts: kioskReadyProducts.length,
        missingMetadata: missingMetadata.length,
      })
    } catch (err) {
      console.error('Lokal dashboard verileri çekilirken hata oluştu:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>

        <p className="text-gold-500 font-serif text-lg animate-pulse">
          Lokal mahzen verileri yükleniyor...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {error && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          Dashboard verileri yüklenemedi: {error.message || 'Bilinmeyen hata'}
        </div>
      )}

      <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-4 text-sm text-cream-200">
        Dashboard verileri artık Firebase’den değil, lokal API üzerinden
        <span className="font-semibold text-gold-400"> SQL Server + product-overrides.json </span>
        birleşik ürün listesinden hesaplanır.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Toplam Ürün"
          value={stats.totalProducts}
          hint="SQL/Vega ürün listesi"
          tone="gold"
        />

        <StatCard
          title="DB Aktif Ürün"
          value={stats.activeProducts}
          hint="SQL kaynağında aktif görünen ürünler"
          tone="wine"
        />

        <StatCard
          title="Stokta Olmayan"
          value={stats.outOfStock}
          hint="Stok değeri 0 veya altında olan ürünler"
          tone="red"
        />

        <StatCard
          title="Kiosk Hazır"
          value={stats.kioskReadyProducts}
          hint="Zorunlu sommelier bilgileri tamamlanmış ürünler"
          tone="green"
        />

        <StatCard
          title="Bilgi Eksik"
          value={stats.missingMetadata}
          hint="Renk, gövde veya tatlılık bilgisi eksik olanlar"
          tone="orange"
        />

        <StatCard
          title="Sommelier Tavsiyesi"
          value={stats.sommelierPicks}
          hint="Önerilerde öncelikli gösterilecek ürünler"
          tone="blue"
        />
      </div>

      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-8 shadow-lg">
        <h3 className="text-xl font-serif text-gold-500 mb-6 flex items-center gap-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Hızlı İşlemler
        </h3>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setActiveTab('products')}
            className="px-6 py-3.5 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md transition-colors shadow-md flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              />
            </svg>
            Sommelier Bilgilerini Tamamla
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className="px-6 py-3.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md border border-charcoal-600 transition-colors shadow-md flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Excel ile Metadata İçe Aktar
          </button>

          <button
            onClick={loadStats}
            className="px-6 py-3.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md border border-charcoal-600 transition-colors shadow-md flex items-center gap-2"
          >
            Verileri Yenile
          </button>
        </div>
      </div>
    </div>
  )
}