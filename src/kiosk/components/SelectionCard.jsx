import WineBottle from './WineBottle'

export default function SelectionCard({ label, count, color, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-6 text-center transition ${
        disabled
          ? 'cursor-not-allowed border-charcoal-700 bg-charcoal-800/20 opacity-40'
          : 'border-charcoal-700 bg-gradient-to-b from-charcoal-800/70 to-charcoal-800/30 hover:border-gold-500/70 hover:from-wine-800/50'
      }`}
    >
      {typeof count === 'number' && (
        <span className="absolute right-3 top-3 rounded-full border border-charcoal-600 bg-ink-950/70 px-2.5 py-0.5 text-xs font-medium text-cream-200/70 transition group-hover:border-gold-500/50 group-hover:text-gold-400">
          {count}
        </span>
      )}
      {color && <WineBottle color={color} className="h-16 w-auto" />}
      <span className="text-xl font-medium text-cream-100">{label}</span>
    </button>
  )
}
