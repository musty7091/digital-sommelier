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

  if (product._big) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="relative flex cursor-pointer flex-col gap-5 rounded-3xl border border-gold-500/30 bg-charcoal-800/60 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-gold-500/60 hover:shadow-[0_28px_80px_rgba(0,0,0,0.42)] md:flex-row md:p-8"
      >
        {product._pick && (
          <span className="absolute -top-3 left-6 rounded-full bg-gold-500 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-950">
            {t('pickLabel')}
          </span>
        )}
        <div className="flex shrink-0 items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-64 w-auto max-w-full object-contain xl:h-80" />
          ) : (
            <WineBottle color={product.color} className="h-64 w-auto xl:h-80" />
          )}
        </div>
        <div className="flex flex-col">
          <h2 className="font-serif text-3xl font-semibold text-cream-100">{product.name}</h2>
          <p className="mt-1 text-sm text-cream-200/60">
            {[product.brand, country].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-semibold text-gold-400">
              {product.price} {t('priceUnit')}
            </span>
            <StockBadge stock={product.stock} />
          </div>
          <p className="mt-4 text-sm text-cream-200/80">
            {lang === 'en'
              ? `You can find this at ${shelfShort}.`
              : `Bu ürünü ${shelfShort}ta bulabilirsiniz.`}
          </p>
          {product._why && (
            <div className="mt-4 rounded-xl border border-charcoal-700 bg-ink-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-gold-500">{t('why')}</p>
              <p className="mt-1 text-sm text-cream-200">{product._why[lang]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col items-center rounded-2xl border border-charcoal-700 bg-charcoal-800/40 p-4 text-center shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-[0_20px_55px_rgba(0,0,0,0.38)]"
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-28 w-auto object-contain" />
      ) : (
        <WineBottle color={product.color} className="h-28 w-auto" />
      )}
      <h3 className="mt-3 text-base font-medium text-cream-100">{product.name}</h3>
      <span className="mt-1 text-lg font-semibold text-gold-400">
        {product.price} {t('priceUnit')}
      </span>
      <div className="mt-2">
        <StockBadge stock={product.stock} />
      </div>
      <p className="mt-2 text-xs text-cream-200/60">{shelfShort}</p>
    </div>
  )
}
