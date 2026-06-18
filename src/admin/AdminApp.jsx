import { Link } from 'react-router-dom'

// Yonetim paneli — Sprint 0 iskelet.
// Giris, urun yonetimi, Excel import, raporlar ve kiosk ayarlari Sprint 3'te gelecek.
export default function AdminApp() {
  return (
    <main className="min-h-screen px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-gold-500">Ertan Digital Sommelier</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-cream-100">Yönetim Paneli</h1>

        <p className="mt-4 leading-relaxed text-cream-200">
          Bu panel sonraki sprint’lerde hayata geçecek: giriş, ürün yönetimi, Excel import,
          raporlar ve kiosk ayarları. Şu an yalnızca iskelet hazır.
        </p>

        <div className="mt-10 rounded-xl border border-charcoal-700 bg-charcoal-800/60 p-6">
          <h2 className="text-lg font-medium text-cream-100">Sıradaki adım</h2>
          <p className="mt-2 text-sm text-cream-200/80">
            Sprint 1 — Firebase Authentication, Firestore veri modeli ve örnek ürünler.
          </p>
        </div>

        <Link
          to="/kiosk"
          className="mt-8 inline-block text-sm text-gold-400 underline-offset-4 hover:underline"
        >
          ← Kiosk ekranına dön
        </Link>
      </div>
    </main>
  )
}
