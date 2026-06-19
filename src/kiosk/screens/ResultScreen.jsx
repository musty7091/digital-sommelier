import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import ProductCard from '../components/ProductCard'
import BackButton from '../components/BackButton'

export default function ResultScreen() {
  const { results, openDetail } = useFlow()
  const { t } = useLanguage()
  const [big, ...rest] = results

  return (
    <main className="flex min-h-screen flex-col px-8 py-8">
      <div className="flex flex-none items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-cream-100">{t('resultsTitle')}</h1>
        <BackButton />
      </div>

      {results.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-xl text-cream-200">{t('noResults')}</p>
          <p className="mt-2 text-sm text-cream-200/60">{t('noResultsHint')}</p>
        </div>
      ) : rest.length === 0 ? (
        // Tek sonuç: kartı kalan alanda ortala (boşluğu dengele)
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-3xl">
            <ProductCard product={big} onClick={() => openDetail(big)} />
          </div>
        </div>
      ) : (
        // Çok sonuç: 1 büyük + küçükler, üstten hizalı, içerik kadar yükseklik
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProductCard product={big} onClick={() => openDetail(big)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {rest.map((p) => (
              <ProductCard key={p.barcode} product={p} onClick={() => openDetail(p)} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
