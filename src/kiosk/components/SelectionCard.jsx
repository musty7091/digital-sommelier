import WineBottle from './WineBottle'
import CountryFlag from './CountryFlag'

export default function SelectionCard({ label, count, color, countryCode, disabled, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex h-full w-full min-h-0 flex-col items-center justify-center overflow-hidden text-center shadow-[0_22px_60px_rgba(0,0,0,0.28)] transition ${
        compact
          ? 'gap-2 rounded-[22px] px-4 py-3'
          : 'gap-3 rounded-[28px] px-6 py-5'
      } ${
        disabled
          ? 'cursor-not-allowed border border-charcoal-700 bg-charcoal-800/20 opacity-40'
          : 'border border-charcoal-700 bg-gradient-to-b from-charcoal-800/80 to-ink-950/40 hover:-translate-y-1 hover:border-gold-500/70 hover:from-wine-800/55 hover:shadow-[0_28px_80px_rgba(0,0,0,0.42)]'
      }`}
    >
      {typeof count === 'number' && (
        <span
          className={`absolute rounded-full border border-charcoal-600 bg-ink-950/75 font-semibold text-cream-200/75 transition group-hover:border-gold-500/60 group-hover:text-gold-400 ${
            compact
              ? 'right-3 top-3 px-2.5 py-0.5 text-xs'
              : 'right-4 top-4 px-3.5 py-1 text-sm'
          }`}
        >
          {count}
        </span>
      )}

      {color && (
        <WineBottle
          color={color}
          className={`w-auto min-h-0 shrink ${compact ? 'h-12' : 'h-16 sm:h-20 xl:h-24'}`}
        />
      )}

      {countryCode && <CountryFlag code={countryCode} compact={compact} />}

      <span
        className={`font-semibold leading-tight text-cream-100 ${
          compact ? 'text-lg xl:text-xl' : 'text-xl sm:text-2xl xl:text-3xl'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
