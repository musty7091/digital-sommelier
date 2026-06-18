# Ertan Digital Sommelier — Teknik Görev Listesi (ROADMAP)

> Bu dosya, projeyi adım adım hayata geçirmek için sprint'lere bölünmüş teknik görev listesidir.
> Proje dokümanının 20. bölümündeki başlama sırasını temel alır ve gerçek geliştirme akışına göre yeniden düzenler.
>
> **Nasıl kullanılır:** Her görevin başında bir kimlik (örn. `S2-04`) ve bir kutu `[ ]` vardır. İş bittikçe `[x]` yapın. Bir oturumda "S2-04'ü yapalım" diyerek devam edebiliriz.
>
> **Durum:** Adım 1 (Proje Dokümanı) ✓ tamamlandı. Şu an buradayız → **Sprint 0**.

---

## 0. Önerilen Teknoloji Yığını (Önce bunu onaylayalım)

Aşağıdaki yığın, dokümandaki "React + Firebase", premium dokunmatik UI, offline/PWA ve Excel import gereksinimlerine en uygun seçimdir. Sprint 0'a başlamadan önce **onaylamanızı veya değiştirmenizi** istiyorum, çünkü sonraki tüm adımlar buna dayanacak.

| Katman | Öneri | Neden |
| --- | --- | --- |
| Build / Dev | **Vite** | Hızlı, SPA + PWA için ideal, Firebase Hosting'e kolay deploy |
| UI Kütüphanesi | **React 18 + JavaScript** | Hızlı ve sade; tip duvarı yok, güvenlik kritik sınırlarda zod ile sağlanır |
| Stil | **Tailwind CSS** | Koyu premium tema, hızlı ve tutarlı dokunmatik tasarım |
| Yönlendirme | **React Router** | `/kiosk` ve `/admin` ayrımı |
| State | **Zustand** | Kiosk seçim akışı için hafif ve sade |
| Backend | **Firebase** (Auth, Firestore, Storage, Hosting, Functions) | Dokümanda belirtilen mimari |
| Çok dil | **i18next + react-i18next** | TR/EN, ileride RU genişlemesi kolay |
| Excel | **SheetJS (xlsx)** | Import/export için standart çözüm |
| Offline | **vite-plugin-pwa (Workbox)** | Service worker, cache, offline fallback |
| Form / doğrulama | **react-hook-form + zod** | Admin formları ve Excel satır doğrulama; bozuk verinin girişini çalışma zamanında net hata mesajıyla engeller |

> **Karar:** Sade JavaScript kullanılacak (TypeScript değil). Tip güvenliği yerine, bozuk verinin girebileceği kritik sınırlarda (Excel import, admin formları) **zod** ile çalışma zamanı doğrulaması yapılacak. Başka bir değişiklik istenirse (örn. Tailwind yerine başka bir şey) liste güncellenir.

---

## Sprint 0 — Proje Kurulumu ve Altyapı

Hedef: Boş ama çalışan, deploy edilebilir bir iskelet.

- [ ] **S0-01** GitHub repo oluştur: `digital-sommelier` (private), README + .gitignore + lisans
- [ ] **S0-02** Vite + React (JavaScript) projesi başlat
- [ ] **S0-03** Tailwind CSS kurulumu ve premium tema renk değişkenleri (bordo, siyah, antrasit, altın, krem)
- [ ] **S0-04** Klasör yapısı: `src/kiosk`, `src/admin`, `src/shared`, `src/firebase`, `src/i18n`, `src/types`
- [ ] **S0-05** ESLint + Prettier + editor/format ayarları
- [ ] **S0-06** React Router kurulumu: `/kiosk` ve `/admin` temel route'ları
- [ ] **S0-07** `.env` yapısı ve Firebase config değişkenleri (gizli anahtarlar repoya girmez)
- [ ] **S0-08** Firebase projesi oluştur (konsol) ve uygulamayı bağla
- [ ] **S0-09** Firebase Hosting'e ilk boş deploy (canlı URL alınır)

**Tamamlanma kriteri:** `/kiosk` ve `/admin` adresleri canlıda boş da olsa açılıyor; deploy hattı çalışıyor.

---

## Sprint 1 — Firebase Temeli ve Veri Modeli

Hedef: Veri yapısı, güvenlik ve örnek veri hazır.

- [ ] **S1-01** Firebase Authentication aç (e-posta/şifre), test admin kullanıcısı oluştur
- [ ] **S1-02** Firestore koleksiyon taslağını oluştur: `products`, `productTranslations`, `kioskSettings`, `users`, `roles`, `importLogs`, `auditLogs`, `analyticsEvents`, `mediaAssets`, `usagePurposes`, `priceRanges`, `countries`, `foodPairings`, `backups`
- [ ] **S1-03** Veri modeli şablonları (JS sabitleri) ve zod şemaları: `Product`, `KioskSettings`, `UserRole`, `ImportLog` vb. (dokümandaki 8.2 alanlarına göre)
- [ ] **S1-04** Fiyat/stok verisini içerik verisinden mantıksal olarak ayır (Vega'ya hazırlık) — alan ayrımını tipte netleştir
- [ ] **S1-05** Firebase Storage klasörleri: `product-images/`, `product-thumbnails/`, `kiosk-media/`, `import-files/`, `backups/`
- [ ] **S1-06** 20–30 örnek ürünlük seed verisi (sahte ama gerçekçi: barkod, renk, ülke, fiyat, stok, raf, tat profili)
- [ ] **S1-07** Firestore Security Rules iskeleti: kiosk yalnızca aktif/public veriyi okur, yazamaz; admin verileri role göre kısıtlı
- [ ] **S1-08** Rol modeli: Yönetici, Somelye, Muhasebe/Fiyat, Sadece Görüntüleme, Teknik Admin

**Tamamlanma kriteri:** Örnek ürünler Firestore'da; kiosk anonim olarak yalnızca aktif ürünleri okuyabiliyor; admin verisi korunuyor.

---

## Sprint 2 — Kiosk Müşteri Akışı (Projenin Vitrini)

Hedef: Dokunmatik, premium, baştan sona çalışan müşteri deneyimi.

- [ ] **S2-01** i18next kurulumu, TR/EN metin dosyaları, dil değiştirme
- [ ] **S2-02** Açılış/karşılama ekranı: başlık, alt başlıklar, dil seçimi, başla aksiyonu, premium arka plan (video/görsel)
- [ ] **S2-03** Bekleme ekranı: "Öne Çıkan Şaraplar" katalog dönüşü
- [ ] **S2-04** Seçim akışı adımları: Renk → Fiyat aralığı → Kullanım amacı → Tat profili → Ülke
- [ ] **S2-05** Büyük dokunmatik seçim kartları (ikon + kısa açıklama)
- [ ] **S2-06** Canlı önizleme: seçim yaptıkça altta ürün önizlemeleri belirir
- [ ] **S2-07** Öneri motoru v1: filtre + stok + fiyat aralığı eleme + somelye tavsiyesi önceliği
- [ ] **S2-08** Sonuç ekranı: 1 büyük kart + 4 küçük kart, "Somelye'nin Tavsiyesi" etiketi kuralı
- [ ] **S2-09** Ürün detay ekranı (dokümandaki 6.10 alanları), raf konumu cümlesi: "Bu ürünü A Blok 6. rafta bulabilirsiniz."
- [ ] **S2-10** "Neden önerdik?" açıklaması gösterimi
- [ ] **S2-11** Hızlı Öneri / Sommelier's Choice: somelye tavsiyesi ürünleri getirir
- [ ] **S2-12** Stok durumu rozetleri: Stokta var / Az kaldı / Stokta yok (eşikler: 0, 1–10, 11+)
- [ ] **S2-13** Her ekranda "Başa Dön" butonu (seçimleri temizler, açılışa döner)
- [ ] **S2-14** Otomatik sıfırlama (varsayılan 120 sn, ayardan okunur)
- [ ] **S2-15** Premium tasarım geçişleri, yatay tam ekran, taşma/scroll önleme

**Tamamlanma kriteri:** Müşteri baştan sona seçim yapıp 5 ürün önerisi ve detay görebiliyor; tasarım premium ve dokunmatik dostu; Başa Dön + otomatik sıfırlama çalışıyor.

---

## Sprint 3 — Admin Panel Temeli

Hedef: Giriş + ürün yönetimi + rol yetkileri.

- [ ] **S3-01** Admin giriş ekranı (Firebase Auth), oturum yönetimi
- [ ] **S3-02** Admin layout: yan menü, üst bar, modül navigasyonu
- [ ] **S3-03** Rol bazlı yetki katmanı (UI + Firestore rules birlikte)
- [ ] **S3-04** Dashboard: ürün sayıları, stok özetleri, son import, en çok görüntülenen ürünler
- [ ] **S3-05** Ürün listeleme + arama + filtreler (barkod, renk, ülke, aktif/pasif, stok)
- [ ] **S3-06** Ürün ekleme/düzenleme formu (tüm 8.2 alanları, react-hook-form + zod)
- [ ] **S3-07** Ürün pasife alma (kalıcı silme yalnızca Teknik Admin)
- [ ] **S3-08** Görsel yükleme (Storage), thumbnail, görselsiz ürün için varsayılan premium şişe
- [ ] **S3-09** Tat profili, yemek uyumu, somelye tavsiyesi, raf konumu, gizli öncelik puanı düzenleme

**Tamamlanma kriteri:** Yetkili kullanıcı ürün ekleyip düzenleyebiliyor, görsel yükleyebiliyor; değişiklikler kioska yansıyor; roller doğru kısıtlıyor.

---

## Sprint 4 — Excel Import ve Fiyat/Stok Yönetimi

Hedef: Toplu veri girişi ve güvenilir hata raporu.

- [ ] **S4-01** SheetJS ile Excel okuma altyapısı
- [ ] **S4-02** Ürün import (zorunlu alanlar: Barkod, Ürün Adı, Fiyat, Stok, Renk, Ülke, Blok, Raf, Aktif)
- [ ] **S4-03** Fiyat/stok import (minimum: Barkod, Fiyat, Stok) — barkod eşleştirme omurgası
- [ ] **S4-04** Satır bazlı doğrulama: geçerli satır işlenir, hatalı satır rapora düşer, import durmaz
- [ ] **S4-05** Import sonuç raporu (toplam/başarılı/hatalı/güncellenen/yeni/fiyat değişen/stok değişen/pasif)
- [ ] **S4-06** Import logları `importLogs` koleksiyonuna kaydedilir
- [ ] **S4-07** Manuel fiyat/stok düzenleme (Yönetici + Muhasebe; Somelye yapamaz)
- [ ] **S4-08** Admin'de fiyat son güncelleme bilgisi gösterimi (kioskta gösterilmez)

**Tamamlanma kriteri:** Karışık bir Excel yüklendiğinde geçerli satırlar işleniyor, hatalılar net raporlanıyor, loglar tutuluyor.

---

## Sprint 5 — Raporlama ve Değişiklik Geçmişi

Hedef: Ticari kararları destekleyen veriler ve denetim izi.

- [ ] **S5-01** Kiosk olay takibi: `analyticsEvents` (görüntülenme, seçilen filtreler, detay açılma, hızlı öneri)
- [ ] **S5-02** Değişiklik geçmişi (`auditLogs`): ürün/fiyat/stok/görsel/somelye/raf/import/rol/ayar/AI işlemleri
- [ ] **S5-03** Raporlar ekranı: en çok görüntülenen ürünler, en çok seçilen renk/fiyat/amaç/ülke/tat, hızlı öneri kullanımı
- [ ] **S5-04** Manuel export: ürün listesi, fiyat/stok, tüm ürün verisi, import raporları, loglar, rapor verileri

**Tamamlanma kriteri:** Kiosk kullanımı kayıt altında; admin temel raporları ve değişiklik geçmişini görebiliyor; export alınabiliyor.

---

## Sprint 6 — Offline ve PWA

Hedef: İnternet kesilse de kiosk çalışmaya devam eder.

- [ ] **S6-01** vite-plugin-pwa kurulumu, manifest, service worker
- [ ] **S6-02** Son ürün listesi + fiyat/stok için local cache stratejisi
- [ ] **S6-03** Görsel cache optimizasyonu (cache-first)
- [ ] **S6-04** Offline fallback ekranları ve durum göstergesi
- [ ] **S6-05** İnternet gelince otomatik senkronizasyon

**Tamamlanma kriteri:** Ağ kapatıldığında kiosk son veriyle çalışıyor; bağlantı dönünce güncelliyor.

---

## Sprint 7 — Yapay Zekâ Açıklama Modülü

Hedef: Admin'de içerik taslağı üretimi (insan onaylı).

- [ ] **S7-01** "Açıklama Oluştur" butonu ve ürün bilgisinden istem hazırlama
- [ ] **S7-02** TR/EN kısa açıklama, TR/EN tat notu, "Neden önerdik?", yemek uyumu üretimi
- [ ] **S7-03** Üretilen metin önce kullanıcıya gösterilir, düzenlenebilir, onaylanınca kaydedilir
- [ ] **S7-04** AI çıktısı doğrudan müşteriye yayınlanmaz (zorunlu insan kontrolü)
- [ ] **S7-05** AI işlemleri `auditLogs`'a kaydedilir

**Tamamlanma kriteri:** Somelye/admin tek tıkla taslak alıp düzenleyip kaydedebiliyor; onaysız metin yayına çıkmıyor.

---

## Sprint 8 — Kiosk Mode, Test ve MVP Kapanışı

Hedef: Gerçek kullanıma hazır teslimat.

- [ ] **S8-01** Kiosk ayarları ekranı: açılış medyası, bekleme ürünleri, sıfırlama süresi, diller, fiyat aralıkları, kullanım amaçları, tema, başlık/alt başlık
- [ ] **S8-02** Kiosk mode hazırlığı (tarayıcıdan çıkış yok, adres çubuğu yok)
- [ ] **S8-03** Windows otomatik tam ekran açılış yapılandırması
- [ ] **S8-04** Ofis bilgisayarında uçtan uca test (21. bölüm test listesi)
- [ ] **S8-05** MVP başarı kriterleri kontrolü (22. bölüm) ve düzeltmeler

**Tamamlanma kriteri:** 22. bölümdeki 14 başarı kriteri karşılanıyor.

---

## MVP Bitiş Kontrol Listesi (Doküman 22. Bölüm)

- [ ] Ofis bilgisayarında sorunsuz çalışıyor
- [ ] Kiosk ekranı profesyonel görünüyor
- [ ] Müşteri akışı sade ve anlaşılır
- [ ] 20–30 ürünle doğru öneri veriyor
- [ ] Fiyat, stok, raf konumu doğru
- [ ] Admin'den ürün yönetimi yapılabiliyor
- [ ] Excel import güvenilir
- [ ] Hatalı Excel satırları raporlanıyor
- [ ] Kullanıcı/rol sistemi çalışıyor
- [ ] Değişiklik geçmişi tutuluyor
- [ ] Raporlama temel verileri üretiyor
- [ ] İnternet kesilince son veriyle çalışıyor
- [ ] Başa Dön her ekranda var
- [ ] Kiosktan admin'e geçiş yok

---

## Bağımlılık Notları

- Sprint 0 → her şeyin önkoşulu.
- Sprint 1, Sprint 2 ve 3'ün veri temelini sağlar.
- Sprint 2 (kiosk) ve Sprint 3 (admin) paralel ilerleyebilir, ama ikisi de Sprint 1'e bağlıdır.
- Sprint 4 (import) Sprint 3'teki ürün modeli oturduktan sonra anlamlı.
- Sprint 6 (offline) kiosk büyük ölçüde bittikten sonra eklenmeli.
- Sprint 7 (AI) bağımsızdır, istenirse erkene alınabilir.

---

## Sonraki Adım

Sıradaki adım **Sprint 0 / S0-01–S0-09**: repo + proje iskeleti + Firebase bağlantısı. Bunu gerçek başlangıç dosyaları (klasör yapısı, config, temel React kurulumu) olarak üretebilirim.
