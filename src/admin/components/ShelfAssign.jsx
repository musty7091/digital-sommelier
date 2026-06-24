import { useEffect, useMemo, useRef, useState } from 'react'
import { saveProduct } from '../../firebase/products'

const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R']
const SHELVES = [1, 2, 3, 4, 5, 6, 7]

const keyOf = (p) => p.barcode || p.id || ''
const up = (v) => String(v || '').toUpperCase()
const norm = (v) => String(v || '').toLocaleLowerCase('tr')

function locLabel(p) {
  if (p.block && (p.shelf || p.shelf === 0)) return `${up(p.block)} Blok · ${p.shelf}. Raf`
  return 'konumsuz'
}

export default function ShelfAssign({ products, onClose, onSaved }) {
  const [list, setList] = useState(products || [])
  const [block, setBlock] = useState('A')
  const [shelf, setShelf] = useState(1)
  const [query, setQuery] = useState('')
  const [savingKey, setSavingKey] = useState('')
  const [flashKey, setFlashKey] = useState('')
  const [count, setCount] = useState(0)
  const [dirty, setDirty] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => setList(products || []), [products])
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const q = norm(query).trim()
    if (!q) return []
    return list
      .filter((p) => norm(`${p.name} ${p.brand} ${p.barcode}`).includes(q))
      .slice(0, 50)
  }, [list, query])

  const onShelf = useMemo(
    () => list.filter((p) => up(p.block) === block && Number(p.shelf) === Number(shelf)),
    [list, block, shelf],
  )

  async function assign(p) {
    const k = keyOf(p)
    if (!k) return
    setSavingKey(k)
    try {
      await saveProduct({ barcode: k, block, shelf: Number(shelf) })
      setList((prev) => prev.map((x) => (keyOf(x) === k ? { ...x, block, shelf: Number(shelf) } : x)))
      setCount((c) => c + 1)
      setDirty(true)
      setFlashKey(k)
      setTimeout(() => setFlashKey(''), 1200)
    } catch (e) {
      alert('Kaydedilemedi: ' + (e.message || ''))
    } finally {
      setSavingKey('')
    }
  }

  async function clearLoc(p) {
    const k = keyOf(p)
    if (!k) return
    setSavingKey(k)
    try {
      await saveProduct({ barcode: k, block: '', shelf: '' })
      setList((prev) => prev.map((x) => (keyOf(x) === k ? { ...x, block: '', shelf: '' } : x)))
      setDirty(true)
    } catch (e) {
      alert('Kaldırılamadı: ' + (e.message || ''))
    } finally {
      setSavingKey('')
    }
  }

  function close() {
    if (dirty) onSaved?.()
    onClose?.()
  }

  const isOnSelected = (p) => up(p.block) === block && Number(p.shelf) === Number(shelf)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-charcoal-700 bg-charcoal-800 p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-xl text-cream-100">📍 Raf Konumu Ata</h3>
          <button type="button" onClick={close} className="text-2xl leading-none text-cream-200/60 hover:text-cream-100">×</button>
        </div>

        {/* Konum seçimi */}
        <div className="rounded-xl border border-charcoal-700 bg-ink-950/40 p-3">
          <p className="mb-1.5 text-xs uppercase tracking-wider text-cream-200/50">Blok</p>
          <div className="flex flex-wrap gap-1.5">
            {BLOCKS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBlock(b)}
                className={`h-9 w-9 rounded-md border text-sm font-semibold ${block === b ? 'border-wine-700 bg-wine-800 text-white' : 'border-charcoal-600 bg-ink-950 text-cream-200 hover:border-gold-500'}`}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-xs uppercase tracking-wider text-cream-200/50">Raf (üstten alta)</p>
          <div className="flex flex-wrap gap-1.5">
            {SHELVES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShelf(s)}
                className={`h-9 w-9 rounded-md border text-sm font-semibold ${Number(shelf) === s ? 'border-wine-700 bg-wine-800 text-white' : 'border-charcoal-600 bg-ink-950 text-cream-200 hover:border-gold-500'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-cream-200/80">
              Seçili konum: <b className="text-gold-400">{block} Blok · {shelf}. Raf</b>
            </span>
            <span className="text-xs text-cream-200/50">Bu rafta: {onShelf.length} ürün · Bu oturumda atanan: <b className="text-emerald-300">{count}</b></span>
          </div>
        </div>

        {/* Bu rafta olanlar */}
        {onShelf.length > 0 && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-charcoal-700/60 bg-ink-950/30 p-2 text-xs">
            <p className="mb-1 text-cream-200/50">Bu rafta olanlar:</p>
            <div className="flex flex-wrap gap-1.5">
              {onShelf.map((p) => (
                <span key={keyOf(p)} className="inline-flex items-center gap-1 rounded-full border border-charcoal-600 bg-charcoal-800 px-2 py-0.5 text-cream-200">
                  {p.name}
                  <button type="button" onClick={() => clearLoc(p)} title="Bu raftan kaldır" className="text-rose-300 hover:text-rose-200">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Arama */}
        <div className="mt-3">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün ara (ad, marka veya barkod) ve dokununca seçili rafa ata…"
            className="w-full rounded-lg border border-charcoal-600 bg-ink-950 px-4 py-3 text-cream-100 placeholder:text-cream-200/40 focus:border-gold-500 focus:outline-none"
          />
        </div>

        {/* Sonuçlar */}
        <div className="mt-3 flex-1 overflow-y-auto rounded-lg border border-charcoal-700 bg-ink-950/40">
          {!query.trim() && (
            <p className="p-6 text-center text-sm text-cream-200/50">Atamak için yukarıdan ürün aramaya başla.</p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="p-6 text-center text-sm text-cream-200/50">Eşleşen ürün yok.</p>
          )}
          {results.map((p) => {
            const k = keyOf(p)
            const here = isOnSelected(p)
            return (
              <button
                key={k}
                type="button"
                onClick={() => assign(p)}
                disabled={savingKey === k}
                className="flex w-full items-center justify-between gap-3 border-b border-charcoal-700/50 px-4 py-2.5 text-left transition hover:bg-charcoal-700/40 disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-cream-100">{p.name}</span>
                  <span className="block truncate text-xs text-cream-200/50">{p.brand || '—'} · {p.barcode}</span>
                </span>
                <span className="shrink-0 text-right">
                  {flashKey === k || here ? (
                    <span className="text-sm font-semibold text-emerald-300">✓ {block}·{shelf}</span>
                  ) : (
                    <span className={`text-xs ${p.block ? 'text-gold-400/80' : 'text-cream-200/40'}`}>{locLabel(p)}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <button type="button" onClick={close} className="rounded-lg bg-wine-800 px-6 py-2.5 font-semibold text-white hover:bg-wine-700">Bitir</button>
        </div>
      </div>
    </div>
  )
}
