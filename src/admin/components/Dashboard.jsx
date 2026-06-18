import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    sommelierPicks: 0,
  });
  
  const [loading, setLoading] = useState(true);

  // Sayfa açıldığında Firebase'den verileri çeken fonksiyon
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        
        let total = 0;
        let active = 0;
        let outOfStock = 0;
        let sommelier = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          total++;
          
          // Veritabanındaki alan adlarına göre sayım yapıyoruz
          // Eğer seed.js dosyanızda alan isimleri farklıysa (örneğin 'aktif' yerine 'isActive') burası otomatik uyum sağlar.
          if (data.isActive === true || data.aktif === true || data.Aktif === 'Evet') active++;
          if (data.stock === 0 || data.stok === 0 || data.Stok === 0) outOfStock++;
          if (data.isSommelierPick === true || data.somelyeTavsiyesi === true) sommelier++;
        });

        setStats({
          totalProducts: total,
          activeProducts: active,
          outOfStock: outOfStock,
          sommelierPicks: sommelier,
        });
      } catch (error) {
        console.error("Firebase'den veri çekilirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-gold-500 font-serif text-lg animate-pulse">Mahzene bağlanılıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-charcoal-800 p-6 rounded-xl border border-charcoal-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-sm text-cream-200 mb-2 font-medium">Toplam Ürün</p>
          <p className="text-4xl font-sans font-bold text-cream-100">{stats.totalProducts}</p>
        </div>
        
        <div className="bg-charcoal-800 p-6 rounded-xl border border-charcoal-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-wine-600/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-sm text-cream-200 mb-2 font-medium">Aktif Ürünler</p>
          <p className="text-4xl font-sans font-bold text-cream-100">{stats.activeProducts}</p>
        </div>
        
        <div className="bg-charcoal-800 p-6 rounded-xl border border-charcoal-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-sm text-cream-200 mb-2 font-medium">Stokta Olmayan</p>
          <p className="text-4xl font-sans font-bold text-cream-100">{stats.outOfStock}</p>
        </div>
        
        <div className="bg-charcoal-800 p-6 rounded-xl border border-charcoal-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gold-400/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-sm text-cream-200 mb-2 font-medium">Sömelye Tavsiyesi</p>
          <p className="text-4xl font-sans font-bold text-cream-100">{stats.sommelierPicks}</p>
        </div>
      </div>

      {/* Hızlı İşlemler */}
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-8 shadow-lg">
        <h3 className="text-xl font-serif text-gold-500 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Hızlı İşlemler
        </h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setActiveTab('products')}
            className="px-6 py-3.5 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md transition-colors shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ürün Ekle
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className="px-6 py-3.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md border border-charcoal-600 transition-colors shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Excel ile Fiyat Güncelle
          </button>
        </div>
      </div>
    </div>
  );
}