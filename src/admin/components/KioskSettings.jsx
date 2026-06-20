import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DEFAULT_KIOSK_SETTINGS, normalizeKioskSettings } from '../../firebase/products';

const inputClass =
  'w-full rounded-md border border-charcoal-600 bg-ink-950 px-3 py-2 text-sm text-cream-100 placeholder-cream-200/30 focus:border-gold-500 focus:outline-none transition';

const ALL_LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-charcoal-700/60 bg-ink-950/30 p-4">
      <div>
        <div className="text-sm font-medium text-cream-100">{label}</div>
        {hint && <div className="mt-1 text-xs text-cream-200/45">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-wine-600' : 'bg-charcoal-600'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream-100 shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function Section({ title, desc, children, action }) {
  return (
    <section className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-serif text-xl text-cream-100">{title}</h3>
        {action}
      </div>
      {desc && <p className="mb-5 text-sm text-cream-200/60">{desc}</p>}
      {children}
    </section>
  );
}

export default function KioskSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Genel
  const [defaultLanguage, setDefaultLanguage] = useState('tr');
  const [languages, setLanguages] = useState(['tr', 'en']);
  const [currency, setCurrency] = useState('TL');

  // Zamanlayıcılar / bekleme
  const [idleTimeout, setIdleTimeout] = useState(45);
  const [resetTimeout, setResetTimeout] = useState(120);
  const [idleScreenEnabled, setIdleScreenEnabled] = useState(true);
  const [featuredRotation, setFeaturedRotation] = useState(7);

  // Öneri & stok
  const [resultCount, setResultCount] = useState(5);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  // Özellikler
  const [scanEnabled, setScanEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Bakım modu
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState({ tr: '', en: '' });

  // Fiyat aralıkları
  const [priceRanges, setPriceRanges] = useState([]);

  // Kaydederken diğer alanları (renkler, amaçlar, ülkeler vb.) korumak için
  const [existingSettings, setExistingSettings] = useState(DEFAULT_KIOSK_SETTINGS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'kioskSettings', 'default'));
        if (!alive) return;
        const s = normalizeKioskSettings(snap.exists() ? snap.data() : {});
        setExistingSettings(s);
        setDefaultLanguage(s.defaultLanguage || 'tr');
        setLanguages(Array.isArray(s.languages) && s.languages.length ? s.languages : ['tr', 'en']);
        setCurrency(s.currency || 'TL');
        setIdleTimeout(s.idleTimeoutSeconds ?? 45);
        setResetTimeout(s.resetTimeoutSeconds ?? 120);
        setIdleScreenEnabled(s.idleScreenEnabled !== false);
        setFeaturedRotation(s.featuredRotationSeconds ?? 7);
        setResultCount(s.resultCount ?? 5);
        setLowStockThreshold(s.lowStockThreshold ?? 10);
        setHideOutOfStock(s.hideOutOfStock !== false);
        setScanEnabled(s.scanEnabled !== false);
        setAnalyticsEnabled(s.analyticsEnabled !== false);
        setMaintenanceMode(s.maintenanceMode === true);
        setMaintenanceMessage({
          tr: s.maintenanceMessage?.tr || '',
          en: s.maintenanceMessage?.en || '',
        });
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

  const toggleLang = (code) =>
    setLanguages((prev) => {
      const has = prev.includes(code);
      let next = has ? prev.filter((c) => c !== code) : [...prev, code];
      if (next.length === 0) next = [code];
      return next;
    });

  // Fiyat aralığı yardımcıları
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
      const langs = languages.length ? languages : ['tr'];
      const def = langs.includes(defaultLanguage) ? defaultLanguage : langs[0];
      const cleanRanges = priceRanges.map((r) => ({
        id: r.id,
        min: Number(r.min) || 0,
        max: r.max === '' || r.max === null || r.max === undefined ? null : Number(r.max),
        label: { tr: r.label?.tr || '', en: r.label?.en || '' },
      }));
      await setDoc(
        doc(db, 'kioskSettings', 'default'),
        {
          ...DEFAULT_KIOSK_SETTINGS,
          ...existingSettings,
          defaultLanguage: def,
          languages: langs,
          currency: (currency || 'TL').trim(),
          idleTimeoutSeconds: Math.max(5, Number(idleTimeout) || 45),
          resetTimeoutSeconds: Math.max(10, Number(resetTimeout) || 120),
          idleScreenEnabled: !!idleScreenEnabled,
          featuredRotationSeconds: Math.max(2, Number(featuredRotation) || 7),
          resultCount: Math.min(12, Math.max(1, Number(resultCount) || 5)),
          lowStockThreshold: Math.max(0, Number(lowStockThreshold) || 0),
          hideOutOfStock: !!hideOutOfStock,
          scanEnabled: !!scanEnabled,
          analyticsEnabled: !!analyticsEnabled,
          maintenanceMode: !!maintenanceMode,
          maintenanceMessage: {
            tr: maintenanceMessage.tr || '',
            en: maintenanceMessage.en || '',
          },
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
      {/* Genel */}
      <Section title="Genel" desc="Dil ve para birimi gibi temel kiosk ayarları.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Varsayılan Dil</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className={inputClass}
            >
              {languages.map((c) => (
                <option key={c} value={c}>
                  {ALL_LANGS.find((l) => l.code === c)?.label || c}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-cream-200/45">Kiosk açıldığında bu dille başlar.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Para Birimi</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="TL"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">Fiyatların yanında gösterilir (örn. TL, ₺, €).</p>
          </div>
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-cream-200">Etkin Diller</label>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((l) => {
              const on = languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLang(l.code)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    on
                      ? 'border-gold-500/60 bg-wine-800/50 text-cream-100'
                      : 'border-charcoal-600 text-cream-200/50 hover:text-cream-100'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {l.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-cream-200/45">
            Açılış ekranındaki dil seçiminde yalnız etkin diller görünür. En az bir dil açık olmalı.
          </p>
        </div>
      </Section>

      {/* Zamanlayıcılar & Bekleme */}
      <Section title="Zamanlayıcılar & Bekleme" desc="Kiosk hareketsizlik davranışını belirler.">
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Bekleme Ekranı Dönüş Hızı (saniye)</label>
            <input
              type="number"
              min="2"
              value={featuredRotation}
              onChange={(e) => setFeaturedRotation(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">Bekleme ekranında her şarabın ekranda kalma süresi.</p>
          </div>
        </div>
        <div className="mt-5">
          <Toggle
            checked={idleScreenEnabled}
            onChange={setIdleScreenEnabled}
            label="Bekleme (Öne Çıkan Şaraplar) ekranı"
            hint="Kapatırsan kiosk hareketsizlikte bekleme ekranına geçmez, açılış ekranında bekler."
          />
        </div>
      </Section>

      {/* Öneri & Stok */}
      <Section title="Öneri & Stok" desc="Sonuç sayısı ve stok davranışı.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Önerilen Ürün Sayısı</label>
            <input
              type="number"
              min="1"
              max="12"
              value={resultCount}
              onChange={(e) => setResultCount(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">Sonuç ekranında en fazla kaç şarap gösterilsin.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200">Düşük Stok Eşiği</label>
            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-cream-200/45">Stok bu sayı ve altına inince “Son ürünler” uyarısı çıkar.</p>
          </div>
        </div>
        <div className="mt-5">
          <Toggle
            checked={hideOutOfStock}
            onChange={setHideOutOfStock}
            label="Stokta olmayan ürünleri gizle"
            hint="Açıkken stoğu biten şaraplar önerilerde ve sonuçlarda hiç görünmez."
          />
        </div>
      </Section>

      {/* Özellikler */}
      <Section title="Özellikler" desc="Açılış ekranı butonları ve veri toplama.">
        <div className="space-y-3">
          <Toggle
            checked={scanEnabled}
            onChange={setScanEnabled}
            label="“Ürün Okut” butonu"
            hint="Barkod okuyucusu olmayan kiosklarda kapatabilirsin; açılış ekranında buton gizlenir."
          />
          <Toggle
            checked={analyticsEnabled}
            onChange={setAnalyticsEnabled}
            label="Analitik kaydı"
            hint="Müşteri etkileşimleri Raporlar için kaydedilir. Kapatırsan yeni veri toplanmaz."
          />
        </div>
      </Section>

      {/* Bakım Modu */}
      <Section title="Bakım Modu" desc="Açıkken müşterilere kiosk yerine “geçici olarak kapalı” ekranı gösterilir.">
        <Toggle
          checked={maintenanceMode}
          onChange={setMaintenanceMode}
          label="Bakım modunu aç"
          hint="Menü güncelleme, temizlik vb. sırasında kullan."
        />
        {maintenanceMode && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200">Mesaj (TR)</label>
              <textarea
                rows={3}
                value={maintenanceMessage.tr}
                onChange={(e) => setMaintenanceMessage((m) => ({ ...m, tr: e.target.value }))}
                placeholder="Dijital sommelier şu anda bakımda. Lütfen kısa süre sonra tekrar deneyin."
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200">Mesaj (EN)</label>
              <textarea
                rows={3}
                value={maintenanceMessage.en}
                onChange={(e) => setMaintenanceMessage((m) => ({ ...m, en: e.target.value }))}
                placeholder="The digital sommelier is currently under maintenance. Please check back shortly."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Fiyat Aralıkları */}
      <Section
        title="Fiyat Aralıkları"
        desc="Kiosk’taki fiyat adımında gösterilir. Üst sınırı boş bırakırsan “ve üzeri” anlamına gelir."
        action={
          <button
            onClick={addRange}
            className="rounded-md border border-gold-500/50 bg-wine-800/40 px-3 py-1.5 text-sm font-medium text-cream-100 transition hover:bg-wine-800/70"
          >
            + Aralık Ekle
          </button>
        }
      >
        <div className="space-y-3">
          <div className="hidden grid-cols-[50px_1fr_1fr_1.4fr_1.4fr_40px] gap-3 px-1 text-[11px] uppercase tracking-wide text-cream-200/40 md:grid">
            <span>Sıra</span>
            <span>Min</span>
            <span>Max</span>
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
      </Section>

      {/* Kaydet */}
      <div className="sticky bottom-0 -mx-1 flex items-center gap-4 rounded-xl border border-charcoal-700 bg-charcoal-800/90 px-4 py-3 backdrop-blur">
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
    </div>
  );
}
