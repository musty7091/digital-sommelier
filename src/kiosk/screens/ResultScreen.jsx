import { useMemo } from 'react'
import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import ProductCard from '../components/ProductCard'
import BackButton from '../components/BackButton'
import AtmosphereBackground from '../components/AtmosphereBackground'
import WineBokeh from '../components/WineBokeh'

const MAX_RESULT_COUNT = 5
const MAX_ALTERNATIVE_COUNT = 4

function getProductKey(product, index) {
  return product?.barcode || product?.id || `${product?.name || 'product'}-${index}`
}

function sortForResultScreen(products = []) {
  return [...products].sort((a, b) => {
    const aPick = a?.sommelierPick === true ? 1 : 0
    const bPick = b?.sommelierPick === true ? 1 : 0

    if (aPick !== bPick) {
      return bPick - aPick
    }

    const aScore = Number(a?.priorityScore || 0)
    const bScore = Number(b?.priorityScore || 0)

    if (aScore !== bScore) {
      return bScore - aScore
    }

    const aFeatured = a?.featured === true ? 1 : 0
    const bFeatured = b?.featured === true ? 1 : 0

    if (aFeatured !== bFeatured) {
      return bFeatured - aFeatured
    }

    return String(a?.name || '').localeCompare(String(b?.name || ''), 'tr')
  })
}

function normalizeResultList(results = []) {
  const seen = new Set()
  const unique = []

  for (const product of results || []) {
    const key = String(product?.barcode || product?.id || '').trim()

    if (!key) {
      unique.push(product)
      continue
    }

    if (seen.has(key)) continue

    seen.add(key)
    unique.push(product)
  }

  return sortForResultScreen(unique).slice(0, MAX_RESULT_COUNT)
}

export default function ResultScreen() {
  const { results, openDetail } = useFlow()
  const { t } = useLanguage()

  const visibleResults = useMemo(() => normalizeResultList(results), [results])
  const [mainProduct, ...alternativeProductsRaw] = visibleResults
  const alternativeProducts = alternativeProductsRaw.slice(0, MAX_ALTERNATIVE_COUNT)

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden px-6 md:px-12 py-6 md:py-10">
      <AtmosphereBackground />
      <WineBokeh />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        <div className="flex flex-none items-center justify-between gap-4 mb-4 md:mb-8 w-full max-w-[1400px] mx-auto">
          <div>
            <h1 className="font-serif text-2xl md:text-4xl font-semibold text-cream-100 tracking-wide">
              {t('resultsTitle')}
            </h1>

            {visibleResults.length > 0 && (
              <p className="mt-2 text-xs md:text-sm text-cream-200/50">
                {visibleResults.length} ürün önerildi
              </p>
            )}
          </div>

          <BackButton />
        </div>

        <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pb-4 flex flex-col items-center">
          <div className="w-full max-w-[1400px] flex-1 flex flex-col justify-center">
            {visibleResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-4">
                <p className="text-xl md:text-3xl font-serif text-cream-100">
                  {t('noResults')}
                </p>

                <p className="mt-3 text-sm md:text-lg text-cream-200/60">
                  {t('noResultsHint')}
                </p>
              </div>
            ) : alternativeProducts.length === 0 ? (
              <div className="flex items-center justify-center w-full">
                <div className="w-full max-w-4xl [&>*]:h-full">
                  <ProductCard
                    product={{
                      ...mainProduct,
                      _big: true,
                      _pick: mainProduct?.sommelierPick === true,
                    }}
                    onClick={() => openDetail(mainProduct)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 xl:gap-8 items-stretch w-full lg:h-[calc(100dvh-190px)] lg:min-h-[600px] lg:max-h-[740px]">
                <div className="lg:col-span-3 w-full h-full flex [&>*]:h-full">
                  <ProductCard
                    product={{
                      ...mainProduct,
                      _big: true,
                      _pick: mainProduct?.sommelierPick === true,
                    }}
                    onClick={() => openDetail(mainProduct)}
                  />
                </div>

                <div className="lg:col-span-2 w-full h-full grid grid-cols-2 grid-rows-2 gap-4 xl:gap-6">
                  {alternativeProducts.map((product, index) => (
                    <div
                      key={getProductKey(product, index)}
                      className="min-h-0 h-full [&>*]:h-full"
                    >
                      <ProductCard
                        product={{
                          ...product,
                          _big: false,
                          _pick: false,
                        }}
                        onClick={() => openDetail(product)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}