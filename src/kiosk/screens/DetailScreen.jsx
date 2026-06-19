import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { COUNTRY_LABELS, LEVEL_LABELS } from '../../types/product.schema'
import WineBottle from '../components/WineBottle'
import BackButton from '../components/BackButton'

export default function DetailScreen() {
  const { detailProduct, closeDetail } = useFlow()
  const { t, lang } = useLanguage()

  if (!detailProduct) return null

  const p = detailProduct
  const country = COUNTRY_LABELS[p.country] ? COUNTRY_LABELS[p.country][lang] : ''
  const shelfShort = lang === 'en'
    ? `Block ${p.block}, Shelf ${p.shelf}`
    : `${p.block} Blok ${p.shelf}. raf`

  const renderLevel = (labelKey, value) => {
    if (!value) return null;
    return (
      <div className="flex flex-col items-center rounded-lg border border-charcoal-700/50 bg-charcoal-800/30 py-2 md:py-3">
        <span className="text-[10px] uppercase tracking-widest text-cream-200/60">{t(labelKey)}</span>
        <span className="mt-1 text-xs md:text-sm font-medium text-cream-100">
          {LEVEL_LABELS[value] ? LEVEL_LABELS[value][lang] : value}
        </span>
      </div>
    )
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden px-4 md:px-8 py-4 md:py-6">
      {/* Üst Kısım (Sabit) */}
      <div className="flex flex-none flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <button
          type="button"
          onClick={closeDetail}
          className="flex items-center gap-2 rounded-full border border-charcoal-600 bg-charcoal-800 px-4 md:px-6 py-2 md:py-3 text-xs md:text-base font-medium text-cream-100 shadow-md transition-all hover:border-gold-500 hover:text-gold-400 hover:bg-charcoal-700"
        >
          <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('back')}
        </button>
        <BackButton />
      </div>

      {/* İçerik (Ekrana Sığar) */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden pb-2">
        <div className="relative flex w-full h-full max-h-[85vh] max-w-6xl flex-col md:flex-row items-center gap-6 md:gap-10 rounded-3xl border border-gold-500/20 bg-charcoal-800/40 p-4 md:p-8 shadow-2xl overflow-y-auto custom-scrollbar md:overflow-hidden">
          
          {/* Sol: Şişe Görseli (Ekrana Göre Küçülür) */}
          <div className="flex w-full md:w-2/5 shrink-0 items-center justify-center h-48 md:h-full">
            {p.image ? (
              <img src={p.image} alt={p.name} className="h-full w-auto max-h-48 md:max-h-[52vh] object-contain drop-shadow-2xl" />
            ) : (
              <WineBottle color={p.color} className="h-full w-auto max-h-48 md:max-h-[52vh] drop-shadow-2xl" />
            )}
          </div>

          {/* Sağ: Detaylar (İçeriden Kaydırılabilir) */}
          <div className="flex flex-col justify-center text-left w-full md:w-3/5 md:h-full md:overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <h1 className="font-serif text-2xl md:text-4xl font-semibold text-cream-100 leading-tight">
              {p.name}
            </h1>
            
            <p className="mt-1 md:mt-2 text-xs md:text-sm text-cream-200/60">
              {[p.brand, country, p.region].filter(Boolean).join(' · ')}
            </p>
            
            <div className="mt-4 md:mt-6 flex items-center gap-3 md:gap-4">
              <span className="text-xl md:text-3xl font-bold text-gold-400">
                {p.price} {t('priceUnit')}
              </span>
              {p.stock > 0 ? (
                <span className="rounded-full border border-gold-500/50 bg-gold-900/20 px-2 py-1 text-[10px] md:text-xs font-medium text-gold-400">
                  {lang === 'en' ? 'In Stock' : 'Stokta Var'}
                </span>
              ) : (
                <span className="rounded-full border border-red-500/50 bg-red-900/20 px-2 py-1 text-[10px] md:text-xs font-medium text-red-400">
                  {lang === 'en' ? 'Out of Stock' : 'Tükendi'}
                </span>
              )}
            </div>

            <p className="mt-3 md:mt-4 flex items-center gap-2 text-sm md:text-lg font-semibold text-emerald-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
                <circle cx="12" cy="11" r="2" />
              </svg>
              {shelfShort}
            </p>

            {p.shortDescription && p.shortDescription[lang] && (
              <p className="mt-4 md:mt-6 font-serif text-base md:text-lg italic text-cream-100/90 leading-snug">
                {p.shortDescription[lang]}
              </p>
            )}

            <div className="mt-5 md:mt-8 grid grid-cols-4 gap-2 md:gap-3">
              {renderLevel('body', p.body)}
              {renderLevel('sweetness', p.sweetness)}
              {renderLevel('acidity', p.acidity)}
              {renderLevel('tannin', p.tannin)}
            </div>

            <div className="mt-5 md:mt-8 space-y-2 text-xs md:text-sm">
              {p.tasteNotes && p.tasteNotes[lang] && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">{t('tasteNotes')}:</span>
                  <span className="text-cream-200">{p.tasteNotes[lang]}</span>
                </div>
              )}
              {p.foodPairing && p.foodPairing[lang] && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">{t('foodPairing')}:</span>
                  <span className="text-cream-200">{p.foodPairing[lang]}</span>
                </div>
              )}
              {p.grape && (
                <div className="flex">
                  <span className="w-24 md:w-28 shrink-0 font-medium text-gold-500">{t('grape')}:</span>
                  <span className="text-cream-200">{p.grape}</span>
                </div>
              )}
            </div>

            {p._why && p._why[lang] && (
              <div className="mt-6 mb-2 rounded-xl border border-charcoal-700 bg-ink-950/50 p-3 md:p-4">
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gold-500">
                  {t('why')}
                </p>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-cream-200 leading-relaxed">
                  {p._why[lang]}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}