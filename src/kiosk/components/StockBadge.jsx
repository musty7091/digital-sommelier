import { stockStatus, STOCK_LABELS } from '../../types/product.schema'
import { useLanguage } from '../../i18n/LanguageContext'
import { useFlow } from '../state/FlowContext'

const STYLES = {
  in: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  low: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  out: 'bg-rose-900/40 text-rose-300 border-rose-700/40',
}

export default function StockBadge({ stock }) {
  const { lang } = useLanguage()
  const { settings } = useFlow()
  const s = stockStatus(stock, settings?.lowStockThreshold ?? 10)
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${STYLES[s]}`}>
      {STOCK_LABELS[s][lang]}
    </span>
  )
}
