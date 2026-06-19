import WineBottle from './WineBottle'

export default function SelectionCard({ label, count, color, disabled, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex flex-col items-center justify-center text-center shadow-[0_22px_60px_rgba(0,0,0,0.28)] transition ${
        compact
          ? 'min-h-[140px] gap-3 rounded-[22px] px-5 py-5'
          : 'min-h-[220px] gap-5 rounded-[28px] px-8 py-8 xl:min-h-[240px]'
      } ${
        disabled
          ? 'cursor-not-allowed border border-charcoal-700 bg-charcoal-800/20 opacity-40'
          : 'border border-charcoal-700 bg-gradient-to-b from-charcoal-800/80 to-charcoal-900/40 hover:-translate-y-1 hover:border-gold-500/70 hover:from-wine-800/55 hover:shadow-[0_28px_80px_rgba(0,0,0,0.42)]'
      }`}
    >
      {typeof count === 'number' && (
        <span
          className={`absolute rounded-full border border-charcoal-600 bg-ink-950/75 font-semibold text-cream-200/75 transition group-hover:border-gold-500/60 group-hover:text-gold-400 ${
            compact
              ? 'right-4 top-4 px-2.5 py-0.5 text-xs'
              : 'right-5 top-5 px-3.5 py-1 text-sm'
          }`}
        >
          {count}
        </span>
      )}

      {color && (
        <WineBottle
          color={color}
          className={`w-auto ${compact ? 'h-16' : 'h-24 xl:h-28'}`}
        />
      )}

      <span
        className={`font-semibold text-cream-100 ${
          compact ? 'text-xl xl:text-2xl' : 'text-2xl xl:text-3xl'
        }`}
      >
        {label}
      </span>
    </button>
  )
}