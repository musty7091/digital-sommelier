import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { fetchKioskSettings, saveKioskSettings } from '../../firebase/products';
import { prepareProductImage, uploadProductImageToLocalApi } from '../../shared/localImageUpload';

// Şık ve modern iOS tarzı geçiş anahtarı (Toggle) bileşeni
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-ink-950 ${
        checked ? 'bg-emerald-500' : 'bg-charcoal-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// Kırpılan alanı alıp yeni bir resim dosyası (WEBP) oluşturan yardımcı fonksiyon
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop, fileName) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Kiosk çözünürlüğüne (1024x768) uygunluk için canvas boyutları
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    // Performans için resmi WEBP formatında kaydediyoruz
    canvas.toBlob((blob) => {
      if (!blob) return;
      const newFileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
      const file = new File([blob], newFileName, { type: 'image/webp' });
      resolve(file);
    }, 'image/webp', 0.90);
  });
}

export default function AdsManager() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Kırpma (Crop) Ekranı Durumları
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageStr, setSelectedImageStr] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Sürükle bırak ile sıralama için referanslar
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Sayfa açıldığında lokal ayarlardan (kiosk-settings.json) reklamları getir
  useEffect(() => {
    let alive = true;
    async function loadAds() {
      try {
        const settings = await fetchKioskSettings();
        if (alive) {
          setAds(settings.ads || []);
        }
      } catch (err) {
        console.error('Reklam ayarları yüklenemedi:', err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadAds();
    return () => { alive = false; };
  }, []);

  // Değişiklikleri lokal sisteme (kiosk-settings.json) kaydet
  const saveToServer = async (newAds) => {
    try {
      const settings = await fetchKioskSettings();
      const updatedSettings = { ...settings, ads: newAds };
      await saveKioskSettings(updatedSettings);
      setAds(newAds);
    } catch (err) {
      alert('Ayarlar kaydedilirken hata oluştu: ' + err.message);
    }
  };

  // Yeni dosya seçildiğinde
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resim dosyası ise kırpma ekranını aç
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setSelectedImageStr(reader.result);
        setSelectedFileName(file.name);
        setCrop(({ x: 0, y: 0 }));
        setZoom(1);
        setCropModalOpen(true);
      };
    } else if (file.type.startsWith('video/')) {
      // Lokal altyapıda video yükleyici olmadığı için kullanıcıyı uyar
      alert('Sistem altyapınız sadece görselleri işlemek üzere kuruludur. Videoları "public" klasörüne kopyalayıp, yukarıdaki "Video Ekle" butonunu kullanarak isimlerini girebilirsiniz.');
    }
    e.target.value = null; // Inputu sıfırla
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Kırpma onaylandığında çalışacak fonksiyon (Mevcut altyapıyı kullanır)
  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !selectedImageStr) return;
    
    setUploading(true);
    setCropModalOpen(false); // Modalı kapat ve yükleniyor uyarısını göster

    try {
      // 1. Resmi kırp ve File objesine dönüştür
      const croppedFile = await getCroppedImg(selectedImageStr, croppedAreaPixels, selectedFileName);
      
      // 2. Kendi yazdığın altyapı (imageCompress) ile görseli hazırla (Kiosk boyutu olan 1024'e sınırla)
      const preparedImage = await prepareProductImage(croppedFile, { maxDimension: 1024 });

      // 3. Reklam için benzersiz bir barkod (ID) oluştur
      const adId = `ad-${Date.now()}`;

      // 4. Senin lokal yükleme servisinle resmi sunucuya gönder
      const uploadResult = await uploadProductImageToLocalApi({
        barcode: adId,
        preparedImage
      });

      // 5. Yükleme başarılıysa URL'yi listeye ekle (Lokal servis genelde /product-images/ klasörüne kaydeder)
      const fileUrl = uploadResult?.url || `/product-images/${adId}.webp`;

      const newAd = {
        id: adId,
        type: 'image',
        url: fileUrl,
        isActive: true,
      };
      
      const updatedAds = [...ads, newAd];
      await saveToServer(updatedAds);

    } catch (err) {
      alert('Resim işlenirken veya yüklenirken hata oluştu:\n' + err.message);
    } finally {
      setUploading(false);
      setSelectedImageStr(null);
    }
  };

  // Video Ekleme Butonu (Manuel Link)
  const handleManualVideoAdd = () => {
    const videoName = window.prompt(
      'Videonuzun tam adını uzantısıyla birlikte yazın.\n(Örn: reklam1.mp4)\n\nNot: Bu videoyu projenin "public" klasörü içine kopyaladığınızdan emin olun.'
    );

    if (videoName && videoName.trim()) {
      let cleanName = videoName.trim();
      // Eğer kullanıcı başına / koymadıysa biz ekleyelim
      if (!cleanName.startsWith('/')) {
        cleanName = '/' + cleanName;
      }

      const newAd = {
        id: `ad-${Date.now()}`,
        type: 'video',
        url: cleanName,
        isActive: true,
      };

      const updatedAds = [...ads, newAd];
      saveToServer(updatedAds);
    }
  };

  // Sürükle-Bırak Sıralama İşlemleri
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _ads = [...ads];
    const draggedItemContent = _ads.splice(dragItem.current, 1)[0];
    _ads.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    saveToServer(_ads);
  };

  const toggleActive = (id) => {
    const updatedAds = ads.map((ad) => 
      ad.id === id ? { ...ad, isActive: !ad.isActive } : ad
    );
    saveToServer(updatedAds);
  };

  const deleteAd = (id) => {
    if (window.confirm('Bu reklamı listeden kalıcı olarak silmek istediğinize emin misiniz?')) {
      const updatedAds = ads.filter((ad) => ad.id !== id);
      saveToServer(updatedAds);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-gold-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-cream-200 font-medium">Veriler Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const activeAdsCount = ads.filter(a => a.isActive).length;

  return (
    <div className="max-w-5xl mx-auto pb-12 relative">
      
      {/* KIRPMA MODALI (CROP UI) */}
      {cropModalOpen && selectedImageStr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-ink-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-charcoal-700">
            {/* Modal Üst Başlık */}
            <div className="p-5 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-900">
              <div>
                <h3 className="text-xl font-serif text-gold-500 tracking-wide">Resmi Kırp ve Düzenle</h3>
                <p className="text-xs text-cream-200/60 mt-1">Kiosk ekranına kusursuz oturması için 1024x768 oranında sabitlenmiştir.</p>
              </div>
              <button 
                onClick={() => setCropModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-charcoal-800 text-cream-200/60 hover:text-cream-100 hover:bg-charcoal-700 transition text-2xl leading-none pb-1"
              >
                &times;
              </button>
            </div>
            
            {/* Kırpma Alanı */}
            <div className="relative w-full h-[50vh] sm:h-[60vh] bg-black">
              <Cropper
                image={selectedImageStr}
                crop={crop}
                zoom={zoom}
                aspect={1024 / 768} // Kiosk ekranı 4:3 formatı
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="contain"
              />
            </div>
            
            {/* Modal Alt Kontroller */}
            <div className="p-6 bg-charcoal-900 border-t border-charcoal-700 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 w-full flex items-center gap-4">
                <svg className="w-5 h-5 text-cream-200/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-2 bg-charcoal-700 rounded-lg appearance-none cursor-pointer accent-gold-500"
                />
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setCropModalOpen(false)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-charcoal-600 text-cream-200 hover:bg-charcoal-800 transition font-semibold"
                >
                  İptal
                </button>
                <button 
                  onClick={handleCropConfirm}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition font-semibold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Kırp ve Yükle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Üst Başlık ve İstatistikler */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif text-cream-100 tracking-wide mb-2">Reklam Merkezi</h2>
          <p className="text-cream-200/60 text-sm max-w-xl leading-relaxed">
            Kiosk ekranı boşta kaldığında tam ekran gösterilecek medya içeriklerini yönetin. 
            Sistemde aktif reklam olduğunda "Öne Çıkan Şaraplar" yerine reklam döngüsü başlar.
          </p>
        </div>
        
        <div className="flex gap-4 shrink-0">
          <div className="bg-charcoal-800/50 border border-charcoal-700 rounded-xl p-4 flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-charcoal-700 flex items-center justify-center text-gold-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-cream-100">{ads.length}</div>
              <div className="text-xs uppercase tracking-wider text-cream-200/50 font-semibold mt-0.5">Toplam</div>
            </div>
          </div>
          <div className="bg-charcoal-800/50 border border-charcoal-700 rounded-xl p-4 flex items-center gap-4 min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-cream-100">{activeAdsCount}</div>
              <div className="text-xs uppercase tracking-wider text-cream-200/50 font-semibold mt-0.5">Yayında</div>
            </div>
          </div>
        </div>
      </div>

      {/* Yükleme Alanı ve Video Butonu */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="group flex-1 relative border-2 border-dashed border-charcoal-600 rounded-2xl p-8 text-center bg-charcoal-800/20 hover:border-gold-500 hover:bg-charcoal-800/40 transition-all duration-300 overflow-hidden">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
            title=""
          />
          <div className="flex flex-col items-center justify-center relative z-0">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 ${uploading ? 'bg-emerald-900/50 text-emerald-400' : 'bg-charcoal-700 group-hover:bg-wine-800/50 text-gold-500'}`}>
              {uploading ? (
                <svg className="w-7 h-7 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              )}
            </div>
            <span className="text-cream-100 font-medium text-base tracking-wide">
              {uploading ? 'İşleniyor...' : 'Görsel Yüklemek İçin Tıklayın veya Sürükleyin'}
            </span>
            <span className="text-cream-200/40 text-xs mt-1 font-medium">Otomatik Kırpma Aracı • Sadece Resimler</span>
          </div>
        </div>

        <button 
          onClick={handleManualVideoAdd}
          className="w-full sm:w-64 border border-charcoal-600 rounded-2xl p-6 flex flex-col items-center justify-center bg-ink-950 hover:bg-charcoal-800/50 hover:border-gold-500 transition group"
        >
          <div className="w-14 h-14 rounded-full bg-charcoal-800 flex items-center justify-center text-charcoal-400 group-hover:text-gold-500 transition mb-3">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
          </div>
          <span className="text-cream-100 font-medium text-base">Manuel Video Ekle</span>
          <span className="text-cream-200/40 text-xs mt-1 text-center font-medium">Link üzerinden .mp4 dosyaları</span>
        </button>
      </div>

      {/* Liste Başlıkları */}
      {ads.length > 0 && (
        <div className="flex text-xs font-semibold uppercase tracking-widest text-cream-200/40 px-4 pb-3 border-b border-charcoal-700/50 mb-4">
          <div className="w-8"></div>
          <div className="w-32 ml-4">ÖNİZLEME</div>
          <div className="flex-1 ml-4">DOSYA BİLGİSİ</div>
          <div className="w-32 text-center">DURUM</div>
          <div className="w-16 text-right">İŞLEM</div>
        </div>
      )}

      {/* Reklam Listesi */}
      <div className="space-y-3">
        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-charcoal-800/10 border border-charcoal-800 rounded-2xl border-dashed">
            <svg className="w-12 h-12 text-charcoal-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-cream-200/60 font-medium">Sistemde henüz kayıtlı bir reklam bulunmuyor.</p>
          </div>
        ) : (
          ads.map((ad, index) => (
            <div 
              key={ad.id}
              draggable
              onDragStart={(e) => (dragItem.current = index)}
              onDragEnter={(e) => (dragOverItem.current = index)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className={`group flex items-center p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                ad.isActive 
                  ? 'bg-charcoal-800/80 border-charcoal-700 hover:border-charcoal-500' 
                  : 'bg-ink-950 border-charcoal-800/50 opacity-70 hover:opacity-100'
              }`}
            >
              {/* Sürükleme Tutamacı */}
              <div className="cursor-grab active:cursor-grabbing text-charcoal-500 hover:text-gold-500 px-2 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
              </div>
              
              {/* Önizleme */}
              <div className="w-32 h-20 bg-ink-950 rounded-lg overflow-hidden shrink-0 border border-charcoal-900 relative shadow-inner ml-2">
                {ad.type === 'video' ? (
                  <>
                    <video src={ad.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={ad.url} className="w-full h-full object-cover" alt="Reklam Önizleme" />
                )}
              </div>

              {/* Bilgi */}
              <div className="flex-1 min-w-0 ml-4">
                <div className="text-cream-100 font-medium truncate text-base mb-1">{ad.url.split('/').pop() || 'İsimsiz Medya'}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    ad.type === 'video' ? 'bg-indigo-900/40 text-indigo-300' : 'bg-amber-900/40 text-amber-300'
                  }`}>
                    {ad.type === 'video' ? 'VİDEO' : 'GÖRSEL'}
                  </span>
                  <span className="text-xs text-cream-200/40 font-mono">Sıra: {index + 1}</span>
                </div>
              </div>

              {/* Durum Anahtarı (Toggle) */}
              <div className="w-32 flex justify-center items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <ToggleSwitch checked={ad.isActive} onChange={() => toggleActive(ad.id)} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${ad.isActive ? 'text-emerald-400' : 'text-cream-200/40'}`}>
                    {ad.isActive ? 'YAYINDA' : 'PASİF'}
                  </span>
                </div>
              </div>

              {/* Sil Butonu */}
              <div className="w-16 flex justify-end pr-2 border-l border-charcoal-700/50 pl-4">
                <button 
                  onClick={() => deleteAd(ad.id)}
                  className="p-2 text-charcoal-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                  title="Sil"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}