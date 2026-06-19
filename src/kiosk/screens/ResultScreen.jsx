import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import ProductCard from '../components/ProductCard'
import BackButton from '../components/BackButton'

export default function ResultScreen() {
  const { results, openDetail } = useFlow()
  const { t } = useLanguage()
  const [big, ...rest] = results

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden px-6 md:px-12 py-6 md:py-10">
      
      {/* Üst Kısım (Sabit ve Geniş) */}
      <div className="flex flex-none items-center justify-between gap-4 mb-4 md:mb-8 w-full max-w-[1400px] mx-auto">
        <h1 className="font-serif text-2xl md:text-4xl font-semibold text-cream-100 tracking-wide">
          {t('resultsTitle')}
        </h1>
        <BackButton />
      </div>

      {/* Ana Liste Alanı (Dikeyde Tam Ortalanmış) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pb-4 flex flex-col items-center">
        <div className="w-full max-w-[1400px] flex-1 flex flex-col justify-center">
          
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-4">
              <p className="text-xl md:text-3xl font-serif text-cream-100">{t('noResults')}</p>
              <p className="mt-3 text-sm md:text-lg text-cream-200/60">{t('noResultsHint')}</p>
            </div>
          ) : rest.length === 0 ? (
            
            // Sadece 1 Sonuç Varsa (Tam ortaya devasa kart)
            <div className="flex items-center justify-center w-full">
              <div className="w-full max-w-4xl">
                <ProductCard product={big} onClick={() => openDetail(big)} />
              </div>
            </div>

          ) : (
            
            // 5 Sütunlu Profesyonel Izgara (3 Birim Büyük Kart, 2 Birim Küçük Kartlar)
            <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 xl:gap-8 items-stretch w-full">
              
              {/* Büyük Kart (Sola Yaslı, Daha Geniş, Yüksekliği Eşitlenmiş) */}
              <div className="lg:col-span-3 w-full flex">
                <ProductCard product={big} onClick={() => openDetail(big)} />
              </div>

              {/* Küçük Kartlar (Sağda 2'li Izgara Olarak) */}
              <div className="lg:col-span-2 w-full grid grid-cols-2 gap-4 xl:gap-6 content-start">
                {rest.map((p) => (
                  <ProductCard key={p.barcode} product={p} onClick={() => openDetail(p)} />
                ))}
              </div>

            </div>
          )}
        </div>
      </div>
    </main>
  )
}