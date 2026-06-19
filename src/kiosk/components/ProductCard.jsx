import { useLanguage } from '../../i18n/LanguageContext'
import { COUNTRY_LABELS } from '../../types/product.schema'
import StockBadge from './StockBadge'
import WineBottle from './WineBottle'

export default function ProductCard({ product, onClick }) {
  const { t, lang } = useLanguage()
  const shelfShort =
    lang === 'en'
      ? `Block ${product.block}, Shelf ${product.shelf}`
      : `${product.block} Blok ${product.shelf}. raf`
  const country = COUNTRY_LABELS[product.country] ? COUNTRY_LABELS[product.country][lang] : ''

  // BÜYÜK KART TASARIMI
  if (product._big) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="relative flex cursor-pointer flex-col gap-4 sm:gap-5 rounded-2xl sm:rounded-3xl border border-gold-500/30 bg-charcoal-800/60 p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)] md:flex-row md:p-8 transition hover:-translate-y-1 hover:border-gold-500/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      >
        {product._pick && (
          <span className="absolute -top-3 left-4 sm:left-6 rounded-full bg-gold-500 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-ink-950">
            {t('pickLabel')}
          </span>
        )}
        
        <div className="flex shrink-0 items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-48 sm:h-56 md:h-64 w-auto max-w-full object-contain xl:h-80" />
          ) : (
            <WineBottle color={product.color} className="h-48 sm:h-56 md:h-64 w-auto xl:h-80" />
          )}
        </div>
        
        <div className="flex flex-col">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-cream-100">{product.name}</h2>
          <p className="mt-1 text-xs sm:text-sm text-cream-200/60">
            {[product.brand, country].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-semibold text-gold-400">
              {product.price} {t('priceUnit')}
            </span>
            <StockBadge stock={product.stock} />
          </div>
          <p className="mt-3 md:mt-4 text-xs sm:text-sm text-cream-200/80">
            {lang === 'en'
              ? `You can find this at ${shelfShort}.`
              : `Bu ürünü ${shelfShort}ta bulabilirsiniz.`}
          </p>
          
          {product._why && (
            <div className="mt-4 rounded-xl border border-charcoal-700 bg-ink-900/50 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gold-500">{t('why')}</p>
              <p className="mt-1 text-xs sm:text-sm text-cream-200">{product._why[lang]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // KÜÇÜK KART TASARIMI
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="flex h-full cursor-pointer flex-col items-center justify-between rounded-xl sm:rounded-2xl border border-charcoal-700 bg-charcoal-800/40 p-3 sm:p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-20 sm:h-24 md:h-28 w-auto object-contain" />
      ) : (
        <WineBottle color={product.color} className="h-20 sm:h-24 md:h-28 w-auto" />
      )}
      
      <div className="mt-3 flex flex-col items-center flex-1 w-full">
        <h3 className="text-sm sm:text-base font-medium text-cream-100 line-clamp-2 leading-tight" title={product.name}>
          {product.name}
        </h3>
        <span className="mt-1 text-base sm:text-lg font-semibold text-gold-400">
          {product.price} {t('priceUnit')}
        </span>
      </div>
      
      <div className="mt-2 w-full flex flex-col items-center gap-1">
        <StockBadge stock={product.stock} />
        <p className="text-[10px] sm:text-xs text-cream-200/60 truncate w-full px-1" title={shelfShort}>
          {shelfShort}
        </p>
      </div>
    </div>
  )
}