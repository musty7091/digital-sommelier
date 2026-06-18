// ---------------------------------------------------------------------------
// Ertan Digital Sommelier — Firestore seed script (Sprint 1 / S1-06)
// Tek seferlik çalıştırılır: 24 örnek ürün + kioskSettings yazar.
//
// ÇALIŞTIRMA:  node seed.js   (veya: npm run seed)
// GEREKSİNİM:  Proje kök klasöründe .env dosyası + Firestore "test mode" açık.
// NOT: Güvenlik kurallarını seed'den SONRA uygulayın.
// ---------------------------------------------------------------------------
import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

// Kısa yardımcı: tat profili ve metin tekrarını azaltmak için
const tn = (tr, en) => ({ tr, en })

const products = [
  { barcode: '8690000000011', name: 'Anadolu Öküzgözü', brand: 'Anadolu Bağları', color: 'red', country: 'TR', region: 'Elazığ', grape: 'Öküzgözü', price: 420, stock: 24, block: 'A', shelf: 3, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'medium', usagePurposes: ['food', 'daily', 'value'], sommelierPick: false, priorityScore: 10, featured: false, image: '', shortDescription: tn('Yerli üzümden dengeli kırmızı.', 'Balanced red from a native grape.'), tasteNotes: tn('Kırmızı meyve, yumuşak tanen.', 'Red fruit, soft tannins.'), foodPairing: tn('Kırmızı et, kebap.', 'Red meat, kebab.') },
  { barcode: '8690000000028', name: 'Kapadokya Emir', brand: 'Kapadokya Bağevi', color: 'white', country: 'TR', region: 'Nevşehir', grape: 'Emir', price: 380, stock: 16, block: 'B', shelf: 2, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['light', 'daily', 'value', 'beginner'], sommelierPick: false, priorityScore: 5, featured: false, image: '', shortDescription: tn('Taze ve canlı beyaz.', 'Fresh and lively white.'), tasteNotes: tn('Yeşil elma, narenciye.', 'Green apple, citrus.'), foodPairing: tn('Deniz ürünleri, salata.', 'Seafood, salad.') },
  { barcode: '8690000000035', name: 'Kıbrıs Xynisteri', brand: 'Vasilikon', color: 'white', country: 'CY', region: 'Paphos', grape: 'Xynisteri', price: 540, stock: 20, block: 'B', shelf: 4, active: true, body: 'light', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['food', 'light', 'beginner'], sommelierPick: false, priorityScore: 8, featured: false, image: '', shortDescription: tn('Kıbrıs’ın yerli beyaz üzümü.', 'Cyprus native white grape.'), tasteNotes: tn('Limon, beyaz çiçek.', 'Lemon, white flowers.'), foodPairing: tn('Meze, beyaz peynir.', 'Meze, white cheese.') },
  { barcode: '8690000000042', name: 'Commandaria Reserve', brand: 'KEO', color: 'red', country: 'CY', region: 'Limassol', grape: 'Mavro / Xynisteri', price: 1250, stock: 8, block: 'C', shelf: 1, active: true, body: 'intense', sweetness: 'intense', acidity: 'medium', tannin: 'medium', usagePurposes: ['gift', 'premium', 'celebration'], sommelierPick: true, priorityScore: 20, featured: true, image: '', shortDescription: tn('Kıbrıs’ın tarihi tatlı şarabı.', 'Cyprus’s historic dessert wine.'), tasteNotes: tn('Kuru üzüm, bal, kahve.', 'Raisin, honey, coffee.'), foodPairing: tn('Çikolata, tatlılar.', 'Chocolate, desserts.') },
  { barcode: '8690000000059', name: 'Toscana Sangiovese', brand: 'Casa Toscana', color: 'red', country: 'IT', region: 'Toscana', grape: 'Sangiovese', price: 890, stock: 30, block: 'A', shelf: 5, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'medium', usagePurposes: ['food', 'romantic'], sommelierPick: false, priorityScore: 12, featured: true, image: '', shortDescription: tn('Klasik İtalyan kırmızısı.', 'Classic Italian red.'), tasteNotes: tn('Vişne, kuru ot.', 'Sour cherry, dried herbs.'), foodPairing: tn('Makarna, pizza.', 'Pasta, pizza.') },
  { barcode: '8690000000066', name: 'Barolo Nebbiolo', brand: 'Cantina Piemonte', color: 'red', country: 'IT', region: 'Piemonte', grape: 'Nebbiolo', price: 2600, stock: 6, block: 'C', shelf: 2, active: true, body: 'intense', sweetness: 'light', acidity: 'medium', tannin: 'intense', usagePurposes: ['premium', 'gift', 'celebration'], sommelierPick: true, priorityScore: 25, featured: false, image: '', shortDescription: tn('Güçlü ve uzun ömürlü.', 'Powerful and age-worthy.'), tasteNotes: tn('Gül, katran, kiraz.', 'Rose, tar, cherry.'), foodPairing: tn('Kuzu, mantarlı yemekler.', 'Lamb, mushroom dishes.') },
  { barcode: '8690000000073', name: 'Prosecco Brut', brand: 'Veneto Spumante', color: 'sparkling', country: 'IT', region: 'Veneto', grape: 'Glera', price: 720, stock: 28, block: 'D', shelf: 1, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['celebration', 'light', 'daily'], sommelierPick: false, priorityScore: 9, featured: true, image: '', shortDescription: tn('Ferah İtalyan köpüklüsü.', 'Crisp Italian sparkling.'), tasteNotes: tn('Yeşil elma, çiçek.', 'Green apple, blossom.'), foodPairing: tn('Aperatif, hafif mezeler.', 'Aperitif, light bites.') },
  { barcode: '8690000000080', name: 'Bordeaux Rouge', brand: 'Château Bordeaux', color: 'red', country: 'FR', region: 'Bordeaux', grape: 'Cabernet / Merlot', price: 1450, stock: 18, block: 'A', shelf: 6, active: true, body: 'intense', sweetness: 'light', acidity: 'medium', tannin: 'intense', usagePurposes: ['food', 'premium', 'gift'], sommelierPick: true, priorityScore: 22, featured: false, image: '', shortDescription: tn('Klasik Bordeaux harmanı.', 'Classic Bordeaux blend.'), tasteNotes: tn('Siyah meyve, sedir.', 'Black fruit, cedar.'), foodPairing: tn('Dana biftek, kuzu.', 'Beef steak, lamb.') },
  { barcode: '8690000000097', name: 'Champagne Brut', brand: 'Maison Champagne', color: 'sparkling', country: 'FR', region: 'Champagne', grape: 'Chardonnay / Pinot', price: 4800, stock: 5, block: 'D', shelf: 2, active: true, body: 'medium', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['celebration', 'premium', 'gift', 'romantic'], sommelierPick: true, priorityScore: 30, featured: true, image: '', shortDescription: tn('Gerçek kutlama şarabı.', 'A true celebration wine.'), tasteNotes: tn('Brioche, narenciye, badem.', 'Brioche, citrus, almond.'), foodPairing: tn('İstiridye, kanepe.', 'Oysters, canapés.') },
  { barcode: '8690000000103', name: 'Côtes du Rhône', brand: 'Domaine Rhône', color: 'red', country: 'FR', region: 'Rhône', grape: 'Grenache / Syrah', price: 980, stock: 22, block: 'A', shelf: 7, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'medium', usagePurposes: ['food', 'daily', 'value'], sommelierPick: false, priorityScore: 11, featured: false, image: '', shortDescription: tn('Baharatlı, dengeli kırmızı.', 'Spicy, balanced red.'), tasteNotes: tn('Böğürtlen, karabiber.', 'Blackberry, pepper.'), foodPairing: tn('Izgara et, güveç.', 'Grilled meat, stew.') },
  { barcode: '8690000000110', name: 'Provence Rosé', brand: 'Maison Provence', color: 'rose', country: 'FR', region: 'Provence', grape: 'Grenache / Cinsault', price: 860, stock: 26, block: 'B', shelf: 5, active: true, body: 'light', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['light', 'romantic', 'daily'], sommelierPick: false, priorityScore: 10, featured: true, image: '', shortDescription: tn('Yazlık, ferah rosé.', 'Summery, fresh rosé.'), tasteNotes: tn('Çilek, şeftali.', 'Strawberry, peach.'), foodPairing: tn('Salata, deniz ürünleri.', 'Salad, seafood.') },
  { barcode: '8690000000127', name: 'Sancerre Sauvignon', brand: 'Domaine Loire', color: 'white', country: 'FR', region: 'Loire', grape: 'Sauvignon Blanc', price: 1320, stock: 14, block: 'B', shelf: 6, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['food', 'premium', 'light'], sommelierPick: true, priorityScore: 18, featured: false, image: '', shortDescription: tn('Mineralli, zarif beyaz.', 'Mineral, elegant white.'), tasteNotes: tn('Greyfurt, çakıl.', 'Grapefruit, flint.'), foodPairing: tn('Keçi peyniri, balık.', 'Goat cheese, fish.') },
  { barcode: '8690000000134', name: 'Mendoza Malbec', brand: 'Bodega Mendoza', color: 'red', country: 'AR', region: 'Mendoza', grape: 'Malbec', price: 760, stock: 32, block: 'A', shelf: 8, active: true, body: 'intense', sweetness: 'light', acidity: 'medium', tannin: 'medium', usagePurposes: ['food', 'value', 'daily'], sommelierPick: false, priorityScore: 13, featured: false, image: '', shortDescription: tn('Yoğun ve meyveli.', 'Bold and fruity.'), tasteNotes: tn('Erik, kakao.', 'Plum, cocoa.'), foodPairing: tn('Mangal, dana eti.', 'Barbecue, beef.') },
  { barcode: '8690000000141', name: 'Patagonia Pinot Noir', brand: 'Bodega Sur', color: 'red', country: 'AR', region: 'Patagonia', grape: 'Pinot Noir', price: 1180, stock: 12, block: 'A', shelf: 9, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['romantic', 'food', 'premium'], sommelierPick: false, priorityScore: 14, featured: false, image: '', shortDescription: tn('İnce yapılı, zarif.', 'Light-bodied, elegant.'), tasteNotes: tn('Kiraz, orman meyvesi.', 'Cherry, forest fruit.'), foodPairing: tn('Tavuk, somon.', 'Chicken, salmon.') },
  { barcode: '8690000000158', name: 'Casablanca Chardonnay', brand: 'Viña Casablanca', color: 'white', country: 'CL', region: 'Casablanca', grape: 'Chardonnay', price: 690, stock: 0, block: 'B', shelf: 7, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['food', 'daily', 'value'], sommelierPick: false, priorityScore: 6, featured: false, image: '', shortDescription: tn('Tropikal aromalı beyaz.', 'Tropical-toned white.'), tasteNotes: tn('Ananas, vanilya.', 'Pineapple, vanilla.'), foodPairing: tn('Tavuk, kremalı makarna.', 'Chicken, creamy pasta.') },
  { barcode: '8690000000165', name: 'Colchagua Rosé', brand: 'Viña Colchagua', color: 'rose', country: 'CL', region: 'Colchagua', grape: 'Syrah Rosé', price: 640, stock: 19, block: 'B', shelf: 11, active: true, body: 'light', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['light', 'value', 'beginner'], sommelierPick: false, priorityScore: 9, featured: false, image: '', shortDescription: tn('Meyveli, kolay içimli rosé.', 'Fruity, easy-drinking rosé.'), tasteNotes: tn('Ahududu, narenciye.', 'Raspberry, citrus.'), foodPairing: tn('Hafif mezeler, salata.', 'Light bites, salad.') },
  { barcode: '8690000000172', name: 'Maipo Cabernet', brand: 'Viña Maipo', color: 'red', country: 'CL', region: 'Maipo', grape: 'Cabernet Sauvignon', price: 1520, stock: 9, block: 'A', shelf: 12, active: true, body: 'intense', sweetness: 'light', acidity: 'medium', tannin: 'intense', usagePurposes: ['food', 'premium', 'gift'], sommelierPick: false, priorityScore: 16, featured: false, image: '', shortDescription: tn('Güçlü Şili kırmızısı.', 'Powerful Chilean red.'), tasteNotes: tn('Frenk üzümü, naneli.', 'Cassis, minty notes.'), foodPairing: tn('Kırmızı et, peynir.', 'Red meat, cheese.') },
  { barcode: '8690000000189', name: 'Rioja Tempranillo', brand: 'Bodega Rioja', color: 'red', country: 'ES', region: 'Rioja', grape: 'Tempranillo', price: 880, stock: 24, block: 'A', shelf: 13, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'medium', usagePurposes: ['food', 'daily', 'value'], sommelierPick: true, priorityScore: 15, featured: true, image: '', shortDescription: tn('Meşe ve kırmızı meyve.', 'Oak and red fruit.'), tasteNotes: tn('Vanilya, çilek, deri.', 'Vanilla, strawberry, leather.'), foodPairing: tn('Jambon, ızgara et.', 'Ham, grilled meat.') },
  { barcode: '8690000000196', name: 'Cava Brut', brand: 'Penedès Cava', color: 'sparkling', country: 'ES', region: 'Penedès', grape: 'Macabeo', price: 580, stock: 27, block: 'D', shelf: 3, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['celebration', 'light', 'value', 'daily'], sommelierPick: false, priorityScore: 8, featured: false, image: '', shortDescription: tn('Uygun fiyatlı köpüklü.', 'Affordable sparkling.'), tasteNotes: tn('Limon, badem.', 'Lemon, almond.'), foodPairing: tn('Aperatif, tapas.', 'Aperitif, tapas.') },
  { barcode: '8690000000202', name: 'Rías Baixas Albariño', brand: 'Bodega Galicia', color: 'white', country: 'ES', region: 'Galicia', grape: 'Albariño', price: 940, stock: 15, block: 'B', shelf: 8, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['food', 'light', 'romantic'], sommelierPick: false, priorityScore: 11, featured: false, image: '', shortDescription: tn('Tuzlu mineralli beyaz.', 'Saline, mineral white.'), tasteNotes: tn('Şeftali, deniz esintisi.', 'Peach, sea breeze.'), foodPairing: tn('Deniz ürünleri, midye.', 'Seafood, mussels.') },
  { barcode: '8690000000219', name: 'Barossa Shiraz', brand: 'Barossa Estate', color: 'red', country: 'AU', region: 'Barossa', grape: 'Shiraz', price: 1380, stock: 13, block: 'A', shelf: 14, active: true, body: 'intense', sweetness: 'light', acidity: 'medium', tannin: 'intense', usagePurposes: ['food', 'premium', 'gift'], sommelierPick: false, priorityScore: 17, featured: true, image: '', shortDescription: tn('Bol gövdeli, baharatlı.', 'Full-bodied, spicy.'), tasteNotes: tn('Böğürtlen, karanfil.', 'Blackberry, clove.'), foodPairing: tn('Barbekü, kuzu pirzola.', 'Barbecue, lamb chops.') },
  { barcode: '8690000000226', name: 'Marlborough Sauvignon', brand: 'Cloud Estate', color: 'white', country: 'NZ', region: 'Marlborough', grape: 'Sauvignon Blanc', price: 1020, stock: 21, block: 'B', shelf: 9, active: true, body: 'light', sweetness: 'light', acidity: 'intense', tannin: 'light', usagePurposes: ['light', 'food', 'beginner'], sommelierPick: false, priorityScore: 12, featured: false, image: '', shortDescription: tn('Çimensi, canlı beyaz.', 'Grassy, vibrant white.'), tasteNotes: tn('Maydanoz, misket limonu.', 'Herbs, lime.'), foodPairing: tn('Salata, deniz ürünleri.', 'Salad, seafood.') },
  { barcode: '8690000000233', name: 'Central Otago Pinot', brand: 'Otago Estate', color: 'red', country: 'NZ', region: 'Central Otago', grape: 'Pinot Noir', price: 1980, stock: 7, block: 'A', shelf: 15, active: true, body: 'medium', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['romantic', 'premium', 'food'], sommelierPick: true, priorityScore: 19, featured: false, image: '', shortDescription: tn('Zarif ve aromatik.', 'Elegant and aromatic.'), tasteNotes: tn('Kiraz, baharat.', 'Cherry, spice.'), foodPairing: tn('Ördek, somon.', 'Duck, salmon.') },
  { barcode: '8690000000240', name: 'Trakya Papaskarası Rosé', brand: 'Trakya Bağları', color: 'rose', country: 'TR', region: 'Trakya', grape: 'Papaskarası', price: 460, stock: 18, block: 'B', shelf: 10, active: true, body: 'light', sweetness: 'light', acidity: 'medium', tannin: 'light', usagePurposes: ['light', 'daily', 'value', 'beginner'], sommelierPick: false, priorityScore: 7, featured: true, image: '', shortDescription: tn('Yerli üzümden ferah rosé.', 'Fresh rosé from a native grape.'), tasteNotes: tn('Nar, kırmızı meyve.', 'Pomegranate, red fruit.'), foodPairing: tn('Meze, hafif yemekler.', 'Meze, light dishes.') },
]

const kioskSettings = {
  languages: ['tr', 'en'],
  defaultLanguage: 'tr',
  resetTimeoutSeconds: 120,
  colors: [
    { key: 'red', label: { tr: 'Kırmızı', en: 'Red' } },
    { key: 'white', label: { tr: 'Beyaz', en: 'White' } },
    { key: 'rose', label: { tr: 'Rosé', en: 'Rosé' } },
    { key: 'sparkling', label: { tr: 'Köpüklü', en: 'Sparkling' } },
  ],
  priceRanges: [
    { id: 'r1', min: 0, max: 500, label: { tr: '0 - 500 TL', en: '0 - 500 TL' } },
    { id: 'r2', min: 500, max: 1000, label: { tr: '500 - 1000 TL', en: '500 - 1000 TL' } },
    { id: 'r3', min: 1000, max: 2000, label: { tr: '1000 - 2000 TL', en: '1000 - 2000 TL' } },
    { id: 'r4', min: 2000, max: 4000, label: { tr: '2000 - 4000 TL', en: '2000 - 4000 TL' } },
    { id: 'r5', min: 4000, max: null, label: { tr: '4000 TL üzeri', en: 'Over 4000 TL' } },
  ],
  usagePurposes: [
    { key: 'food', label: { tr: 'Yemek için', en: 'For food' } },
    { key: 'gift', label: { tr: 'Hediye için', en: 'As a gift' } },
    { key: 'celebration', label: { tr: 'Kutlama için', en: 'For celebration' } },
    { key: 'daily', label: { tr: 'Günlük içim', en: 'Everyday' } },
    { key: 'romantic', label: { tr: 'Romantik akşam', en: 'Romantic evening' } },
    { key: 'premium', label: { tr: 'Premium seçim', en: 'Premium choice' } },
    { key: 'light', label: { tr: 'Hafif içim', en: 'Light & easy' } },
    { key: 'value', label: { tr: 'Fiyat / performans', en: 'Value for money' } },
    { key: 'beginner', label: { tr: 'Yeni başlayanlar için', en: 'For beginners' } },
    { key: 'sommelier', label: { tr: 'Somelye önerisi', en: "Sommelier's pick" } },
  ],
  countries: [
    { code: 'TR', label: { tr: 'Türkiye', en: 'Turkey' } },
    { code: 'CY', label: { tr: 'Kıbrıs', en: 'Cyprus' } },
    { code: 'IT', label: { tr: 'İtalya', en: 'Italy' } },
    { code: 'FR', label: { tr: 'Fransa', en: 'France' } },
    { code: 'CL', label: { tr: 'Şili', en: 'Chile' } },
    { code: 'AR', label: { tr: 'Arjantin', en: 'Argentina' } },
    { code: 'ES', label: { tr: 'İspanya', en: 'Spain' } },
    { code: 'AU', label: { tr: 'Avustralya', en: 'Australia' } },
    { code: 'NZ', label: { tr: 'Yeni Zelanda', en: 'New Zealand' } },
    { code: 'OTHER', label: { tr: 'Diğer', en: 'Other' } },
  ],
}

async function main() {
  if (!firebaseConfig.projectId) {
    console.error('HATA: .env okunamadı. Proje kök klasöründe .env dosyası var mı?')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  const now = Date.now()

  console.log(`Firestore'a yazılıyor (proje: ${firebaseConfig.projectId})...\n`)

  // Kiosk ayarları
  await setDoc(doc(db, 'kioskSettings', 'default'), kioskSettings)
  console.log('  ✓ kioskSettings/default')

  // Ürünler (barkod = doküman kimliği)
  let count = 0
  for (const p of products) {
    await setDoc(doc(db, 'products', p.barcode), {
      ...p,
      createdAt: now,
      updatedAt: now,
      updatedBy: 'seed',
    })
    count += 1
    console.log(`  ✓ ${p.barcode} — ${p.name}`)
  }

  console.log(`\nTamamlandı: ${count} ürün + kioskSettings yazıldı.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('\nSeed hatası:', err.message || err)
  process.exit(1)
})
