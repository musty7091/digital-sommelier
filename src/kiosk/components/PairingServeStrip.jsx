import { useLanguage } from '../../i18n/LanguageContext'

// Şarap rengine göre servis önerisi (sıcaklık + kadeh). Sommelier dokunuşu.
const SERVE = {
  red: { temp: '16–18°C', glassTr: 'Büyük balon kadeh', glassEn: 'Large bowl glass' },
  white: { temp: '8–10°C', glassTr: 'Beyaz şarap kadehi', glassEn: 'White wine glass' },
  rose: { temp: '8–10°C', glassTr: 'Roze kadehi', glassEn: 'Rosé glass' },
  sparkling: { temp: '6–8°C', glassTr: 'Flüt kadeh', glassEn: 'Flute glass' },
}

function Thermo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4 4 0 1 1-4 0z" />
      <path d="M12 9v5.8" />
    </svg>
  )
}
function Glass() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 3h9l-1 7.2a3.5 3.5 0 0 1-7 0L7.5 3z" />
      <path d="M12 14v6" />
      <path d="M8.5 21h7" />
    </svg>
  )
}
function Fork() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a2 2 0 0 0 2 2v10" />
      <path d="M8 3v6" />
      <path d="M16 3c-1.4 0-2.4 1.6-2.4 4.2S15 11 16 11v10" />
    </svg>
  )
}

function Item({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-charcoal-700 bg-ink-950/40 px-5 py-4">
      <span className="mt-0.5 text-gold-500">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide text-cream-200/50">{label}</p>
        <p className="mt-0.5 text-base font-medium text-cream-100">{value}</p>
      </div>
    </div>
  )
}

export default function PairingServeStrip({ product }) {
  const { tl, lang } = useLanguage()
  if (!product) return null

  const s = SERVE[product.color] || SERVE.red
  const glass = lang === 'en' ? s.glassEn : s.glassTr
  const pairing = tl(product.foodPairing)
  const labels =
    lang === 'en'
      ? { title: 'Serving suggestion', temp: 'Serve at', glass: 'Glass', pairs: 'Pairs with' }
      : { title: 'Servis önerisi', temp: 'Servis sıcaklığı', glass: 'Kadeh', pairs: 'Yemek uyumu' }

  return (
    <div className="mx-auto mt-10 w-full max-w-5xl rounded-3xl border border-gold-500/20 bg-charcoal-800/40 p-6 backdrop-blur-sm md:p-8">
      <p className="mb-5 text-center font-serif text-2xl text-cream-100">{labels.title}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Item icon={<Thermo />} label={labels.temp} value={s.temp} />
        <Item icon={<Glass />} label={labels.glass} value={glass} />
        {pairing && <Item icon={<Fork />} label={labels.pairs} value={pairing} />}
      </div>
    </div>
  )
}
