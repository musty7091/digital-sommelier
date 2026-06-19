import { useFlow } from '../state/FlowContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { COLOR_LABELS, COUNTRY_LABELS, LEVEL_LABELS } from '../../types/product.schema'
import StockBadge from '../components/StockBadge'
import WineBottle from '../components/WineBottle'
import BackButton from '../components/BackButton'

function ProfileChip({ label, value }) {
  return (
    <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/50 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-cream-200/50">{label}</p>
      <p className="mt-1 text-sm font-medium text-cream-100">{value}</p>
    </div>
  )
}

export default function DetailScreen() {
  const { detailProduct: p, closeDetail } = useFlow()
  const { t, tl, lang } = useLanguage()
  if (!p) return null

  const country = COUNTRY_LABELS[p.country] ? COUNTRY_LABELS[p.country][lang] : ''
  const color = COLOR_LABELS[p.color] ? COLOR_LABELS[p.color][lang] : ''
  const lvl = (v) => (v && LEVEL_LABELS[v] ? LEVEL_LABELS[v][lang] : '—')
  const shelfSentence =
    lang === 'en'
      ? `You can find this at Block ${p.block}, Shelf ${p.shelf}.`
      : `Bu ürünü ${p.block} Blok ${p.shelf}. rafta bulabilirsiniz.`
  const labels =
    lang === 'en'
      ? { body: 'Body', sweetness: 'Sweetness', acidity: 'Acidity', tannin: 'Tannin', notes: 'Notes', pairs: 'Pairs with', grape: 'Grape', colour: 'Colour' }
      : { body: 'Gövde', sweetness: 'Tatlılık', acidity: 'Asidite', tannin: 'Tanen', notes: 'Tat notları', pairs: 'Yemek uyumu', grape: 'Üzüm', colour: 'Renk' }

  return (
    <main className="flex h-screen flex-col overflow-hidden px-8 py-5">
      <div className="flex flex-none items-center justify-between">
        <button
          type="button"
          onClick={closeDetail}
          className="rounded-full px-4 py-2 text-base font-medium text-cream-200/70 transition hover:bg-cream-100/5 hover:text-cream-100"
        >
          ← {t('prev')}
        </button>
        <BackButton />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="grid max-h-full w-full max-w-6xl gap-8 overflow-y-auto rounded-[28px] border border-gold-500/25 bg-charcoal-800/50 p-8 shadow-[0_22px_60px_rgba(0,0,0,0.3)] md:grid-cols-[380px_1fr]">
          <div className="flex items-center justify-center">
            {p.image ? (
              <img src={p.image} alt={p.name} className="h-96 w-auto max-w-full object-contain xl:h-[30rem]" />
            ) : (
              <WineBottle color={p.color} className="h-96 w-auto xl:h-[30rem]" />
            )}
          </div>

          <div className="flex flex-col">
            {p._pick && (
              <span className="mb-3 w-fit rounded-full bg-gold-500 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-950">
                {t('pickLabel')}
              </span>
            )}
            <h1 className="font-serif text-4xl font-semibold text-cream-100">{p.name}</h1>
            <p className="mt-1 text-sm text-cream-200/60">
              {[p.brand, [country, p.region].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-3xl font-semibold text-gold-400">
                {p.price} {t('priceUnit')}
              </span>
              <StockBadge stock={p.stock} />
            </div>
            <p className="mt-3 text-sm text-cream-200/80">{shelfSentence}</p>

            {tl(p.shortDescription) && (
              <p className="mt-5 text-base leading-relaxed text-cream-100/90">{tl(p.shortDescription)}</p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ProfileChip label={labels.body} value={lvl(p.body)} />
              <ProfileChip label={labels.sweetness} value={lvl(p.sweetness)} />
              <ProfileChip label={labels.acidity} value={lvl(p.acidity)} />
              <ProfileChip label={labels.tannin} value={lvl(p.tannin)} />
            </div>

            <div className="mt-6 space-y-2 text-sm">
              {tl(p.tasteNotes) && (
                <p className="text-cream-200">
                  <span className="text-gold-500">{labels.notes}: </span>
                  {tl(p.tasteNotes)}
                </p>
              )}
              {tl(p.foodPairing) && (
                <p className="text-cream-200">
                  <span className="text-gold-500">{labels.pairs}: </span>
                  {tl(p.foodPairing)}
                </p>
              )}
              {p.grape && (
                <p className="text-cream-200">
                  <span className="text-gold-500">{labels.grape}: </span>
                  {p.grape}
                </p>
              )}
              <p className="text-cream-200">
                <span className="text-gold-500">{labels.colour}: </span>
                {color}
              </p>
            </div>

            {p._why && (
              <div className="mt-6 rounded-xl border border-charcoal-700 bg-ink-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-gold-500">{t('why')}</p>
                <p className="mt-1 text-sm text-cream-200">{p._why[lang]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
