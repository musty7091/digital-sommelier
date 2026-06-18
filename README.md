# Ertan Digital Sommelier

Ertan Market şarap reyonu için web tabanlı, dokunmatik kiosk uyumlu dijital şarap danışmanı ve admin paneli.

- **Kiosk:** `/kiosk` — müşteriye yönelik dokunmatik öneri ekranı
- **Admin:** `/admin` — ürün, fiyat/stok, kullanıcı ve kiosk yönetimi

Detaylı geliştirme planı için `ROADMAP.md` dosyasına bakın.

## Teknoloji

- Vite + React 18 (JavaScript)
- React Router
- Tailwind CSS (premium şarap mahzeni teması)
- Firebase (Auth, Firestore, Storage, Hosting)
- Doğrulama: zod (kritik veri sınırlarında — Sprint 1+)

## Gereksinimler

- Node.js 18 veya üzeri (20+ önerilir)
- Bir Firebase projesi

## Kurulum

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. Ortam değişkenlerini ayarlayın — `.env.example` dosyasını `.env` olarak kopyalayıp Firebase değerlerinizi girin:

   ```bash
   cp .env.example .env
   ```

3. Geliştirme sunucusunu başlatın:

   ```bash
   npm run dev
   ```

   Tarayıcıda `http://localhost:5173/kiosk` ve `http://localhost:5173/admin` adreslerini açın.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — üretim derlemesi (`dist/`)
- `npm run preview` — derlemeyi yerelde önizleme
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Klasör Yapısı

```
src/
  main.jsx        Uygulama girişi
  App.jsx         Router (/kiosk, /admin)
  index.css       Tailwind + premium tema değişkenleri
  firebase/       Firebase başlatma (config .env'den)
  kiosk/          Müşteri kiosk ekranı
  admin/          Yönetim paneli
  shared/         Ortak bileşen / yardımcılar
  i18n/           Çok dil (TR/EN) — Sprint 2
  types/          Veri modeli zod şemaları — Sprint 1
```

## Firebase Hosting'e Yayın

1. Firebase CLI kurun ve giriş yapın:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Projeyi seçin (`firebase.json` hazır gelir):

   ```bash
   firebase use --add
   ```

3. Derleyip yayınlayın:

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

`firebase.json` tüm yolları `index.html`'e yönlendirir; böylece `/kiosk` ve `/admin` sayfa yenilemede de çalışır.

## Durum

- Sprint 0 — Proje iskeleti, routing, tema, Firebase config (tamamlandı)
- Sprint 1 — Firebase Auth, Firestore veri modeli, örnek ürünler (sıradaki)

## Lisans

Tüm hakları saklıdır. Bu yazılım Ertan Market'e özeldir.
