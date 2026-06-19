import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as XLSX from 'xlsx';

// Fiyat formatlayıcı
const formatPrice = (price) => {
  const num = Number(price);
  return isNaN(num) ? '0,00' : num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Veritabanındaki İngilizce terimleri Türkçeye çeviren sözlük
const translateTerm = (term) => {
  if (!term) return 'Belirtilmemiş';
  
  const dict = {
    // Renkler
    'red': 'Kırmızı', 'white': 'Beyaz', 'rose': 'Rose', 'sparkling': 'Köpüklü',
    // Gövde
    'light': 'Hafif', 'medium': 'Orta', 'intense': 'Yoğun',
    // Amaçlar
    'food': 'Yemek İçin', 'gift': 'Hediye İçin', 'celebration': 'Kutlama',
    'daily': 'Günlük İçim', 'romantic': 'Romantik Akşam', 'premium': 'Premium Seçim',
    'beginner': 'Yeni Başlayanlar', 'sommelier': 'Somelye Önerisi', 'value': 'Fiyat / Performans',
    // Ülkeler
    'TR': 'Türkiye', 'FR': 'Fransa', 'IT': 'İtalya', 'ES': 'İspanya', 'CL': 'Şili'
  };

  return dict[term] || term;
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  
  // Envanter/Stok state'leri
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalUniqueWines: 0,
    totalBottles: 0,
    totalValue: 0,
    activeWines: 0
  });

  // Kiosk Analitik state'leri
  const [analytics, setAnalytics] = useState({
    totalUsages: 0,
    totalClicks: 0, 
    colors: [],
    purposes: [],
    tastes: [],
    countries: [],
    peakHours: [],
    topProducts: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // ==========================================
      // 1. ÜRÜNLERİ (ENVANTERİ) ÇEK
      // ==========================================
      const productsSnap = await getDocs(collection(db, 'products'));
      const prods = [];
      let tBottles = 0;
      let tValue = 0;
      let activeCount = 0;

      productsSnap.forEach(doc => {
        const data = doc.data();
        const p = { id: doc.id, ...data };
        prods.push(p);

        const stock = Number(p.stock) || 0;
        const price = Number(p.price) || 0;
        const isActive = p.active !== false && p.isActive !== false;

        tBottles += stock;
        tValue += (stock * price);
        if (isActive) activeCount++;
      });

      // Stok sayısı 10 ve altında olan kritik ürünler
      const lowStock = prods.filter(p => (Number(p.stock) || 0) <= 10 && (p.active !== false && p.isActive !== false))
                            .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

      setProducts(prods);
      setLowStockProducts(lowStock);
      setInventoryStats({
        totalUniqueWines: prods.length,
        totalBottles: tBottles,
        totalValue: tValue,
        activeWines: activeCount
      });

      // ==========================================
      // 2. KİOSK ETKİLEŞİMLERİNİ (ANALİZLERİ) ÇEK
      // ==========================================
      const eventsSnap = await getDocs(collection(db, 'analyticsEvents'));
      
      let sessionCount = 0;
      const counts = { color: {}, purpose: {}, taste: {}, country: {}, products: {} };
      const hoursCount = Array(24).fill(0);

      eventsSnap.forEach(doc => {
        const data = doc.data();
        
        // 1. Saat Yoğunluğu
        const dateStr = data.createdAt || data.timestamp;
        if (dateStr) {
           const dateObj = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
           if (!isNaN(dateObj)) {
               const hour = dateObj.getHours();
               hoursCount[hour]++;
           }
        }
        
        // 2. Başlama Sayısı (Oturum)
        if (data.type === 'session_start' || data.type === 'flow_start') {
          sessionCount++;
        } 
        // 3. Filtre Seçimleri
        else if (data.type === 'filter_selected' || data.type === 'step_completed') {
           const key = data.filterKey || data.stepKey;
           const val = data.filterValue || data.selectedValue;
           if (key && val && counts[key]) {
              counts[key][val] = (counts[key][val] || 0) + 1;
           }
        }
        // 4. Detay İnceleme
        else if (data.type === 'product_viewed' || data.type === 'detail_opened') {
           const pName = data.productName || data.productId || data.barcode;
           if (pName) {
              counts.products[pName] = (counts.products[pName] || 0) + 1;
           }
        }
      });

      const formatAndSort = (obj) => {
        return Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({ label, count }));
      };

      const formattedHours = hoursCount.map((count, index) => {
         const currentHour = index.toString().padStart(2, '0');
         const nextHour = ((index + 1) % 24).toString().padStart(2, '0');
         return {
           label: `${currentHour}:00 - ${nextHour}:00`,
           count: count
         };
      });
      const peakHoursSorted = formattedHours.filter(h => h.count > 0).sort((a, b) => b.count - a.count);

      setAnalytics({
        totalUsages: sessionCount, 
        totalClicks: eventsSnap.size, 
        colors: formatAndSort(counts.color),
        purposes: formatAndSort(counts.purpose),
        tastes: formatAndSort(counts.taste),
        countries: formatAndSort(counts.country),
        topProducts: formatAndSort(counts.products),
        peakHours: peakHoursSorted
      });

    } catch (error) {
      console.error("Raporlar çekilirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Yazdırma (PDF) fonksiyonu
  const handlePrint = () => {
    window.print();
  };

  // Excel İndirme Fonksiyonu
  const exportToExcel = (dataList, fileName) => {
    if (dataList.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    const dataToExport = dataList.map(p => ({
      Barkod: p.barcode || p.id,
      UrunAdi: p.name || '',
      Renk: translateTerm(p.color),
      Fiyat: p.price || 0,
      Stok: p.stock || 0,
      ToplamDeger: (p.price || 0) * (p.stock || 0),
      Raf: `${p.block || ''} Blok ${p.shelf || ''}. Raf`,
      Aktif: (p.active !== false && p.isActive !== false) ? 'Evet' : 'Hayır'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-gold-500 font-serif text-lg animate-pulse">Raporlar Derleniyor...</p>
      </div>
    );
  }

  // Dinamik çubuk grafik çizici (Kiosk Analizleri için)
  const renderProgressBar = (items, title, emptyMessage = "Yeterli veri yok.") => {
    if (!items || items.length === 0) {
      return (
        <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg">
           <h3 className="font-serif text-xl text-gold-500 mb-6 border-b border-charcoal-700 pb-2">{title}</h3>
           <p className="text-sm text-cream-200/50 italic">{emptyMessage}</p>
        </div>
      );
    }
    
    const maxCount = Math.max(...items.map(i => i.count));

    return (
      <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col">
        <h3 className="font-serif text-xl text-gold-500 mb-6 border-b border-charcoal-700 pb-2">{title}</h3>
        <div className="space-y-5 flex-1">
          {items.slice(0, 5).map((item, idx) => {
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={idx} className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-cream-100 truncate pr-4" title={translateTerm(item.label)}>
                    {translateTerm(item.label)}
                  </span>
                  <span className="text-xs font-bold text-gold-400 shrink-0">{item.count} İşlem</span>
                </div>
                <div className="w-full bg-charcoal-900 rounded-full h-2 shadow-inner overflow-hidden mt-1">
                  <div 
                    className="bg-gold-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${percentage}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto print:m-0 print:p-0">

      {/* =======================================================
          KESİN ÇÖZÜM: YAZDIRMA (PDF) STİLLERİ
          Menüleri tamamen yok eder, siyah temayı zorla basar.
          ======================================================= */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          
          /* Menüleri, üst çubuğu ve yazdırmak istemediğimiz her şeyi kökten gizle */
          header, nav, aside, .fixed.inset-y-0, .print-hidden { 
            display: none !important; 
            visibility: hidden !important; 
            height: 0 !important; 
          }
          
          /* Arka planı zorla siyah yap, yazıları renkli tut */
          body, html, main, #root { 
            background-color: #0d1117 !important; 
            color: #fce7cf !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Tailwind'in karanlık tema sınıflarını yazıcıya zorla uygulat */
          .bg-charcoal-800 { background-color: #1f232b !important; border-color: #2b303b !important; }
          .bg-charcoal-900 { background-color: #14171d !important; }
          .bg-gold-500 { background-color: #c8a951 !important; }
          .text-gold-500 { color: #c8a951 !important; }
          .text-cream-100 { color: #fce7cf !important; }
          .text-cream-200 { color: #e6cdac !important; }
          .text-gold-400 { color: #d6b56d !important; }
          
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
      
      {/* SADECE KAĞIT ÇIKTISINDA GÖRÜNECEK RESMİ ANTET */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-charcoal-700 pb-4">
        <h1 className="text-3xl font-serif font-bold uppercase tracking-widest text-gold-500">ERTAN MARKET</h1>
        <h2 className="text-xl mt-2 font-medium text-cream-100">Kiosk Performans Analizi Raporu</h2>
        <p className="text-sm mt-2 text-cream-200/60 font-sans">
          Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} | Saat: {new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
        </p>
      </div>

      {/* Üst Başlık (Yazdırılırken Gizlenir) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal-700 pb-4 print-hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-500">Raporlar ve Analizler</h2>
          <p className="text-cream-200/70 text-sm mt-1">Mahzeninizin güncel durumunu ve kiosk etkileşimlerini buradan takip edin.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 text-ink-950 hover:bg-gold-400 transition-colors bg-gold-500 px-4 py-2 rounded-lg shadow-sm font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Sadece Kiosk Analizini Yazdır
          </button>
          <button onClick={fetchData} className="flex items-center gap-2 text-cream-200 hover:text-gold-400 transition-colors bg-charcoal-800 px-4 py-2 rounded-lg border border-charcoal-700 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Verileri Yenile
          </button>
        </div>
      </div>

      {/* =======================================================
          BÖLÜM 1: ENVANTER VE STOK ÖZETİ
          Buranın tamamına "print-hidden" ekledik, PDF'te asla çıkmaz!
          ======================================================= */}
      <div className="print-hidden">
        <h2 className="font-serif text-2xl text-cream-100 border-l-4 border-wine-600 pl-3">Envanter Durumu</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-wine-900/30 rounded-full blur-2xl group-hover:bg-wine-800/50 transition-colors"></div>
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">Farklı Şarap Çeşidi</span>
            <span className="text-3xl font-bold text-cream-100">{inventoryStats.totalUniqueWines}</span>
            <span className="text-xs text-green-400 mt-2">{inventoryStats.activeWines} tanesi kioskta aktif</span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-gold-900/20 rounded-full blur-2xl group-hover:bg-gold-800/40 transition-colors"></div>
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">Toplam Şişe Stoğu</span>
            <span className="text-3xl font-bold text-cream-100">{inventoryStats.totalBottles}</span>
            <span className="text-xs text-cream-200/50 mt-2">Mahzendeki tüm fiziksel ürünler</span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-900/20 rounded-full blur-2xl group-hover:bg-green-800/40 transition-colors"></div>
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">Toplam Envanter Değeri</span>
            <span className="text-3xl font-bold text-gold-400">{formatPrice(inventoryStats.totalValue)} ₺</span>
            <span className="text-xs text-cream-200/50 mt-2">Güncel fiyatlar üzerinden</span>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-900/20 rounded-full blur-2xl group-hover:bg-red-800/40 transition-colors"></div>
            <span className="text-sm font-medium text-cream-200/60 uppercase tracking-wider mb-2">Kritik Stok Uyarısı</span>
            <span className="text-3xl font-bold text-red-400">{lowStockProducts.length}</span>
            <span className="text-xs text-cream-200/50 mt-2">10 şişe ve altına düşen ürünler</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Sol Taraf: Kritik Stok Tablosu */}
          <div className="lg:col-span-2 bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-800/50">
              <h3 className="font-serif text-xl text-cream-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                Stoğu Tükenmek Üzere Olanlar
              </h3>
              <button 
                onClick={() => exportToExcel(lowStockProducts, 'Kritik_Stok_Raporu')}
                className="text-xs font-medium bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-200 px-3 py-1.5 rounded transition-colors"
              >
                Excel İndir
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1 custom-scrollbar max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-charcoal-800 z-10">
                  <tr className="text-cream-200/60 text-xs uppercase tracking-wider border-b border-charcoal-700">
                    <th className="p-4 font-medium">Ürün Adı</th>
                    <th className="p-4 font-medium">Kategori</th>
                    <th className="p-4 font-medium">Raf</th>
                    <th className="p-4 font-medium text-right">Kalan Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-700/50">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-cream-200/50 text-sm">
                        Harika! Şu an kritik seviyede azalan bir ürününüz yok.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map(p => (
                      <tr key={p.id} className="hover:bg-charcoal-700/30 transition-colors">
                        <td className="p-4 text-sm font-medium text-cream-100">{p.name || '-'}</td>
                        <td className="p-4 text-sm text-cream-200/80">{translateTerm(p.color)}</td>
                        <td className="p-4 text-sm text-cream-200/80">{p.block} {p.shelf}</td>
                        <td className="p-4 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            p.stock === 0 ? 'bg-red-900/50 text-red-400 border border-red-800/50' : 
                            'bg-yellow-900/30 text-yellow-500 border border-yellow-800/50'
                          }`}>
                            {p.stock || 0} Adet
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sağ Taraf: Excel İndirme Kutusu */}
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg flex-1">
            <h3 className="font-serif text-lg text-gold-500 mb-4 border-b border-charcoal-700 pb-2">Dışa Aktarım İşlemleri</h3>
            <p className="text-sm text-cream-200/70 mb-5">Mahzendeki tüm ürün listenizi, stok ve güncel fiyatlarıyla birlikte yedekleyebilirsiniz.</p>
            
            <button 
              onClick={() => exportToExcel(products, 'Ertan_Tum_Envanter_Raporu')}
              className="w-full flex items-center justify-center gap-2 bg-wine-700 hover:bg-wine-600 text-cream-100 py-3 px-4 rounded-lg font-medium transition-colors shadow-md border border-wine-600/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Tüm Envanteri Excel'e Aktar
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================
          BÖLÜM 2: KİOSK ETKİLEŞİM ANALİZLERİ (GRAFİKLER)
          PDF'te SADECE BURASI ÇIKACAK VE EKRANDAKİ GİBİ KARANLIK OLACAK!
          ======================================================= */}
      <div className="pt-8 border-t border-charcoal-700 mt-12 print-hidden"></div>
      
      <h2 className="font-serif text-2xl text-cream-100 border-l-4 border-gold-500 pl-3">Kiosk Kullanım Analizi</h2>

      <div className="break-inside-avoid bg-charcoal-800 rounded-2xl border border-charcoal-700 p-8 shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden group">
        <div className="absolute w-40 h-40 bg-gold-900/20 rounded-full blur-3xl group-hover:bg-gold-800/40 transition-colors print-hidden"></div>
        <span className="text-sm font-medium text-cream-200/60 uppercase tracking-widest mb-3 z-10">KİOSK TOPLAM OTURUM SAYISI</span>
        <span className="text-5xl md:text-7xl font-bold text-cream-100 z-10">{analytics.totalUsages}</span>
        <span className="text-sm text-gold-400 mt-4 z-10">Müşterilerinizin uygulamayı en baştan başlatma sayısı.</span>
        <span className="text-xs text-cream-200/50 mt-1 z-10">(Ekrana toplam {analytics.totalClicks} kez dokunuldu ve işlem yapıldı)</span>
      </div>

      {analytics.totalClicks === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 border border-dashed border-charcoal-700 rounded-2xl bg-charcoal-800/30">
          <svg className="w-12 h-12 text-charcoal-600 mb-3 print-hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <p className="text-cream-200 text-lg">Henüz Yeterli Veri Yok</p>
          <p className="text-cream-200/50 text-sm mt-1">Müşterileriniz kiosk cihazını kullandıkça grafikler burada belirecektir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderProgressBar(analytics.peakHours, 'En Yoğun Kullanım Saatleri', 'Saat verisi henüz toplanmadı.')}
          {renderProgressBar(analytics.topProducts, 'En Çok İncelenen Şaraplar', 'Henüz bir şarabın detayına bakılmadı.')}
          {renderProgressBar(analytics.purposes, 'Müşterilerin Kullanım Amaçları')}
          {renderProgressBar(analytics.colors, 'En Çok Aranan Renkler')}
          {renderProgressBar(analytics.tastes, 'Tat Profili Eğilimi')}
          {renderProgressBar(analytics.countries, 'Popüler Şarap Ülkeleri')}
        </div>
      )}

    </div>
  );
}