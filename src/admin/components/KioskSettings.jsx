import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const inputClass =
  'w-full rounded-md border border-charcoal-600 bg-ink-950 px-3 py-2 text-sm text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none transition';

export default function KioskSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [idleTimeout, setIdleTimeout] = useState(45);
  const [resetTimeout, setResetTimeout] = useState(120);
  const [priceRanges, setPriceRanges] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'kioskSettings', 'default'));
        if (!alive) return;
        const s = snap.exists() ? snap.data() : {};
        setIdleTimeout(s.idleTimeoutSeconds ?? 45);
        setResetTimeout(s.resetTimeoutSeconds ?? 120);
        setPriceRanges(Array.isArray(s.priceRanges) ? s.priceRanges : []);
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateRange = (idx, patch) =>
    setPriceRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const updateRangeLabel = (idx, lang, val) =>
    setPriceRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, label: { ...r.label, [lang]: val } } : r)),
    );
  const addRange = () =>
    setPriceRanges((prev) => [
      ...prev,
      { id: 'r' + Date.now().toString().slice(-6), min: 0, max: null, label: { tr: '', en: '' } },
    ]);
  const removeRange = (idx) => setPriceRanges((prev) => prev.filter((_, i) => i !== idx));
  const moveRange = (idx, dir) =>
    setPriceRanges((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleanRanges = priceRanges.map((r) => ({
        id: r.id,
        min: Number(r.min) || 0,
        max: r.max === '' || r.max === null || r.max === undefined ? null : Number(r.max),
        label: { tr: r.label?.tr || '', en: r.label?.en || '' },
      }));
      await setDoc(
        doc(db, 'kioskSettings', 'default'),
        {
          idleTimeoutSeconds: Math.max(5, Number(idleTimeout) || 45),
          resetTimeoutSeconds: Math.max(10, Number(resetTimeout) || 120),
          priceRanges: cleanRanges,
        },
        { merge: true },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-cream-200">Ayarlar yükleniyor…</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Zamanlayıcılar */}
      <section className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-6">
        <h3 className="mb-1 font-serif text-xl text-cream-100">Zamanlayıcılar</h3>
        <p className="mb-5 text-sm text-cream-200/60">Kiosk hareketsizlik davranışını belirler.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Bekleme Süresi (saniye)</label>
            <input
              type="number"
              min="5"
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">
              Açılış ekranında bu süre dokunulmazsa “Öne Çıkan Şaraplar” bekleme ekranına geçer.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Sıfırlama Süresi (saniye)</label>
            <input
              type="number"
              min="10"
              value={resetTimeout}
              onChange={(e) => setResetTimeout(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">
              Seçim akışı sırasında bu kadar hareketsizlikte otomatik olarak başa döner.
            </p>
          </div>
        </div>
      </section>

      {/* Fiyat Aralıkları */}
      <section className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-6">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-serif text-xl text-cream-100">Fiyat Aralıkları</h3>
          <button
            onClick={addRange}
            className="rounded-md border border-gold-500/50 bg-wine-800/40 px-3 py-1.5 text-sm font-medium text-cream-100 transition hover:bg-wine-800/70"
          >
            + Aralık Ekle
          </button>
        </div>
        <p className="mb-5 text-sm text-cream-200/60">
          Kiosk’taki fiyat adımında gösterilir. Üst sınırı boş bırakırsan “ve üzeri” anlamına gelir.
        </p>

        <div className="space-y-3">
          <div className="hidden grid-cols-[50px_1fr_1fr_1.4fr_1.4fr_40px] gap-3 px-1 text-[11px] uppercase tracking-wide text-cream-200/40 md:grid">
            <span>Sıra</span>
            <span>Min (TL)</span>
            <span>Max (TL)</span>
            <span>Etiket (TR)</span>
            <span>Etiket (EN)</span>
            <span></span>
          </div>

          {priceRanges.length === 0 && (
            <p className="py-4 text-center text-sm text-cream-200/50">
              Henüz aralık yok. “Aralık Ekle” ile başlayın.
            </p>
          )}

          {priceRanges.map((r, idx) => (
            <div
              key={r.id}
              className="grid grid-cols-2 items-center gap-3 rounded-lg border border-charcoal-700/60 bg-ink-950/30 p-3 md:grid-cols-[50px_1fr_1fr_1.4fr_1.4fr_40px]"
            >
              <div className="flex flex-col items-center text-xs leading-none">
                <button
                  onClick={() => moveRange(idx, -1)}
                  disabled={idx === 0}
                  className="px-1 py-0.5 text-cream-200/50 transition hover:text-gold-400 disabled:opacity-20"
                  title="Yukarı"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveRange(idx, 1)}
                  disabled={idx === priceRanges.length - 1}
                  className="px-1 py-0.5 text-cream-200/50 transition hover:text-gold-400 disabled:opacity-20"
                  title="Aşağı"
                >
                  ▼
                </button>
              </div>
              <input
                type="number"
                value={r.min ?? ''}
                onChange={(e) => updateRange(idx, { min: e.target.value })}
                placeholder="0"
                className={inputClass}
              />
              <input
                type="number"
                value={r.max ?? ''}
                onChange={(e) => updateRange(idx, { max: e.target.value === '' ? null : e.target.value })}
                placeholder="üst sınır yok"
                className={inputClass}
              />
              <input
                value={r.label?.tr || ''}
                onChange={(e) => updateRangeLabel(idx, 'tr', e.target.value)}
                placeholder="0 - 500 TL"
                className={inputClass}
              />
              <input
                value={r.label?.en || ''}
                onChange={(e) => updateRangeLabel(idx, 'en', e.target.value)}
                placeholder="0 - 500 TL"
                className={inputClass}
              />
              <button
                onClick={() => removeRange(idx)}
                className="justify-self-end px-2 text-cream-200/50 transition hover:text-red-400"
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Kaydet */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-wine-700 px-6 py-2.5 font-medium text-cream-100 shadow-md transition hover:bg-wine-800 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-400">✓ Ayarlar kaydedildi.</span>}
        {error && <span className="text-sm text-red-400">Kaydedilemedi. Lütfen tekrar deneyin.</span>}
      </div>

      <p className="text-xs text-cream-200/40">
        Not: Renk, kullanım amacı ve ülke listeleri ürün şemasına bağlı olduğundan bu sürümde
        düzenlenmez. İhtiyaç olursa sonraki adımda bunların etiketlerini düzenlemeyi de ekleriz.
      </p>
    </div>
  );
}
