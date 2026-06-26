# Yol Haritası / Durum

Son güncelleme: lokal (Firebase'siz) mimariye geçiş tamamlandı; kiosk + admin üretim seviyesinde.

## ✅ Tamamlananlar

### Mimari
- Firebase tamamen kaldırıldı; tüm veri lokal (SQL Server view + `product-overrides.json`).
- Yerel API'ler: `database-api` (8788), `local-image-api` (8787), `dev-local` orkestratörü.
- SQL koparsa son başarılı listeyi sunan bellek + disk cache (`.products-cache.json`).
- `prewarm-cache.mjs` ile cache'i go-live öncesi önden üretme.
- Excel toplu içe aktarmada boş hücrelerin mevcut veriyi ezmemesi (alan koruması).
- Her kayıtta otomatik yedek (`data/backups/`).

### Kiosk
- Akış: karşılama → seçim adımları (renk, fiyat, amaç, tat, ülke) → sonuç → detay.
- Fiyat 2 ondalık TR formatı; stok rozetleri (ayarla aç/kapa).
- Bekleme modu: video arka plan (1024×768, döngü) + öne çıkan ürünler.
- 3B mağaza-içi raf haritası (three.js): "Yerini Göster" ile blok/raf işaretleme.
- Hareketsizlik zaman aşımları (scan, harita, genel) → ana ekrana dönüş.
- **Sesli Arama**: tarayıcı konuşma tanıma + yerel/Gemini ayrıştırma; renk/fiyat/ülke/bölge/
  üzüm/tatlılık/tanen/amaç filtreleri. Ayarlardan aç/kapa.
- Kullanım amacı eşleşmesi (alias + isabetli filtre); ülke/renk/fiyat filtreleri.
- Stok görünürlüğü ayarları (stokta olmayanı gizle / stok durumunu göster).

### Yönetim
- Ürünler CRUD, hızlı doldur, filtreli liste.
- **AI ile Doldur**: Özellikler / İki dilli Açıklamalar / Kullanım Amaçları modları (Gemini).
- **Raf Ata**: blok+raf seç, arayıp dokunarak hızlı konum atama.
- **Resim Yapıştır**: Ctrl+V ile arka plan temizleme + 800×1000 kompozisyon.
- Excel içe/dışa, görsel toplu işleme, raporlar, reklam yönetimi, denetim geçmişi, şifre.
- `merge-overrides.mjs`: iki makinedeki veriyi alan-bazında çakışmasız birleştirme.

## ⏳ Go-live öncesi kontrol listesi
- [ ] `server/.env` oluşturuldu, SQL erişilebilir.
- [ ] `node prewarm-cache.mjs` çalıştırıldı (ilk açılış dayanıklılığı).
- [ ] Stok gösterimi tutarlı: ya stokta-olmayanı gizle, ya stok durumunu göster
      (ikisi de kapalıyken müşteri "Tükendi" görmeden seçebilir).
- [ ] Raf atamaları tamamlandı / merge edildi ("Yerini Göster" kapsamı).
- [ ] Sesli arama isteniyorsa Ayarlar'dan açık + Edge'de mikrofon izni.
- [ ] Kiosk-hazır ürün sayısı yeterli (renk/gövde/tatlılık dolu + stokta).

## 💡 Olası gelecek işler (zorunlu değil)
- Kullanım amacı listesini şema anahtarlarıyla (food/celebration) güncelleme.
- `settings.countries`'i sahip olunan ülkelerle doldurup boş seçenekleri eleme.
- Sesli aramada üzüm/bölge takma-ad sözlüğünü katalogdan otomatik genişletme.
- Denetim kayıtları için döndürme/arşivleme.
- Cihaz-üstü (offline) konuşma tanıma seçeneği.
