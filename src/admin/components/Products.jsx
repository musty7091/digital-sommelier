import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Eski veya yeni veritabanı kayıtlarının aktifliğini %100 doğru okuyan yardımcı fonksiyon
const checkIsActive = (p) => {
  if (p.isActive === false || p.isActive === 'false') return false;
  if (p.aktif === false || p.aktif === 'Hayır' || p.aktif === 'hayır') return false;
  if (p.Aktif === false || p.Aktif === 'Hayır' || p.Aktif === 'hayır') return false;
  return true; 
};

// Sömelye tavsiyesini %100 doğru okuyan yardımcı fonksiyon
const checkIsSommelier = (p) => {
  if (p.isSommelierPick === true || p.isSommelierPick === 'true') return true;
  if (p.somelyeTavsiyesi === true || p.somelyeTavsiyesi === 'Evet' || p.somelyeTavsiyesi === 'evet') return true;
  return false;
};

// Veritabanındaki farklı renk yazılışlarını (İngilizce/Türkçe) formata uyduran çevirmen
const translateColor = (c) => {
  if (!c) return 'Kırmızı';
  const lower = c.toLowerCase();
  if (lower === 'white' || lower === 'beyaz') return 'Beyaz';
  if (lower === 'rose' || lower === 'rosé') return 'Rose';
  if (lower === 'sparkling' || lower === 'köpüklü') return 'Köpüklü';
  return 'Kırmızı'; 
};

// Fiyatları kuruşlu (decimal) ve şık bir formatta göstermek için yardımcı fonksiyon
const formatPrice = (price) => {
  const num = Number(price);
  return isNaN(num) ? '0,00' : num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    color: 'Kırmızı',
    price: '',
    stock: '',
    block: '',
    shelf: '',
    country: '',
    region: '',
    grape: '',
    shortDescription: '',
    tasteNotes: '',
    foodPairing: '',
    usagePurpose: 'Yemek için',
    body: 'Orta',
    sweetness: 'Orta',
    acidity: 'Orta',
    tannin: 'Orta',
    isActive: true,
    isSommelierPick: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
    } catch (error) {
      console.error("Ürünler veritabanından çekilirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = product.name?.toLowerCase().includes(searchLower) || product.urunAdi?.toLowerCase().includes(searchLower) || false;
    const barcodeMatch = product.barcode?.includes(searchTerm) || product.barkod?.includes(searchTerm) || false;
    return nameMatch || barcodeMatch;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      barcode: '', name: '', color: 'Kırmızı', price: '', stock: '', block: '', shelf: '',
      country: '', region: '', grape: '', shortDescription: '', tasteNotes: '', foodPairing: '',
      usagePurpose: 'Yemek için', body: 'Orta', sweetness: 'Orta', acidity: 'Orta', tannin: 'Orta',
      isActive: true, isSommelierPick: false
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    
    setFormData({
      barcode: product.barcode || product.barkod || '',
      name: product.name || product.urunAdi || '',
      color: translateColor(product.color || product.renk),
      price: product.price || product.fiyat || '',
      stock: product.stock ?? product.stok ?? '',
      block: product.block || product.blok || '',
      shelf: product.shelf || product.raf || '',
      country: product.country || '',
      region: product.region || '',
      grape: product.grape || '',
      shortDescription: product.shortDescription || product.kisaAciklama?.tr || '',
      tasteNotes: product.tasteNotes || product.tadimNotlari?.tr || '',
      foodPairing: product.foodPairing || product.yemekUyumu?.tr || '',
      usagePurpose: product.usagePurpose || 'Yemek için',
      body: product.body || 'Orta',
      sweetness: product.sweetness || 'Orta',
      acidity: product.acidity || 'Orta',
      tannin: product.tannin || 'Orta',
      isActive: checkIsActive(product),
      isSommelierPick: checkIsSommelier(product)
    });
    
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        isActive: !currentStatus
      });
      fetchProducts(); 
    } catch (error) {
      console.error("Ürün durumu güncellenirken hata oluştu:", error);
      alert("İşlem sırasında bir sorun oluştu.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const productRef = doc(db, 'products', editingId);
        await updateDoc(productRef, {
          ...formData,
          // Girilen virgüllü fiyatı güvenli bir şekilde sayıya çeviriyoruz
          price: Number(formData.price),
          stock: Number(formData.stock),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      fetchProducts(); 
      
    } catch (error) {
      console.error("Ürün kaydedilirken hata oluştu:", error);
      alert("Ürün kaydedilirken bir sorun oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-wine-600 rounded-full animate-spin"></div>
        <p className="text-wine-600 font-serif text-lg animate-pulse">Şarap listesi mahzenden getiriliyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      
      {/* Üst Kısım: Arama Çubuğu ve Yeni Ürün Ekle Butonu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 bg-charcoal-800 p-2 rounded-lg border border-charcoal-700 w-full sm:w-96 shadow-inner">
          <svg className="w-5 h-5 text-cream-200 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Barkod veya ürün adı ile ara..." 
            className="bg-transparent border-none outline-none text-cream-100 w-full placeholder-charcoal-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={handleAddNew}
          className="px-6 py-3 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md transition-colors shadow-md flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ürün Ekle
        </button>
      </div>

      {/* Şarap Listesi Tablosu */}
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-charcoal-700/50 text-cream-200 text-sm uppercase tracking-wider border-b border-charcoal-700">
                <th className="p-4 font-medium">Barkod</th>
                <th className="p-4 font-medium">Ürün Adı</th>
                <th className="p-4 font-medium">Renk</th>
                <th className="p-4 font-medium">Fiyat</th>
                <th className="p-4 font-medium">Stok</th>
                <th className="p-4 font-medium">Raf Konumu</th>
                <th className="p-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700">
              
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-cream-200">
                    Sistemde aradığınız kriterlere uygun şarap bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const displayBarcode = product.barcode || product.barkod || '-';
                  const displayName = product.name || product.urunAdi || '-';
                  const displayColor = translateColor(product.color || product.renk);
                  const displayPrice = product.price || product.fiyat || '0';
                  const displayStock = product.stock ?? product.stok ?? '0';
                  const displayBlock = product.block || product.blok || '';
                  const displayShelf = product.shelf || product.raf || '';
                  const isProductActive = checkIsActive(product);

                  return (
                    <tr key={product.id} className={`hover:bg-charcoal-700/30 transition-colors ${!isProductActive ? 'opacity-50 grayscale' : ''}`}>
                      <td className="p-4 text-cream-200 text-sm">{displayBarcode}</td>
                      <td className="p-4 font-medium text-cream-100">
                        {displayName}
                        {!isProductActive && <span className="ml-2 text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800">Pasif</span>}
                      </td>
                      
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          displayColor === 'Kırmızı' ? 'bg-wine-900/50 text-wine-200 border-wine-800' :
                          displayColor === 'Beyaz' ? 'bg-cream-100/10 text-cream-200 border-cream-200/20' :
                          displayColor === 'Rose' ? 'bg-pink-900/30 text-pink-300 border-pink-800/50' :
                          displayColor === 'Köpüklü' ? 'bg-gold-900/30 text-gold-400 border-gold-800/50' :
                          'bg-charcoal-600 text-cream-200 border-charcoal-500'
                        }`}>
                          {displayColor}
                        </span>
                      </td>
                      
                      <td className="p-4 text-gold-400 font-medium">{formatPrice(displayPrice)} ₺</td>
                      
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          Number(displayStock) > 10 ? 'bg-green-900/30 text-green-400 border-green-800/50' :
                          Number(displayStock) > 0 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' :
                          'bg-red-900/30 text-red-400 border-red-800/50'
                        }`}>
                          {displayStock} Adet
                        </span>
                      </td>
                      
                      <td className="p-4 text-cream-200 text-sm">
                        {displayBlock ? `${displayBlock} Blok ` : ''} 
                        {displayShelf ? `${displayShelf}. Raf` : '-'}
                      </td>
                      
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="text-gold-500 hover:text-gold-400 font-medium text-sm mr-4 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button 
                          onClick={() => handleToggleActive(product.id, isProductActive)}
                          className={`${isProductActive ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'} font-medium text-sm transition-colors`}
                        >
                          {isProductActive ? 'Pasife Al' : 'Aktif Et'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAYLI ÜRÜN EKLEME / DÜZENLEME PENCERESİ (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-800/50 shrink-0">
              <h3 className="text-2xl font-serif text-gold-500">
                {editingId ? 'Şarabı Düzenle' : 'Detaylı Şarap Ekle'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-cream-200 hover:text-red-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-8">
                
                {/* BÖLÜM 1: Temel Bilgiler */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">Temel Bilgiler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Barkod *</label>
                      <input required type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: 8691234567890" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-cream-200">Ürün Adı *</label>
                      <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Ertan Reserve Cabernet" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Fiyat (₺) *</label>
                      <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} min="0" className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: 750.50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Stok Miktarı *</label>
                      <input required type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: 24" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Şarap Rengi *</label>
                      <select name="color" value={formData.color} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Kırmızı">Kırmızı</option>
                        <option value="Beyaz">Beyaz</option>
                        <option value="Rose">Rose</option>
                        <option value="Köpüklü">Köpüklü</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 2: Menşei ve Üzüm */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">Menşei ve Üzüm</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Ülke</label>
                      <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Türkiye, İtalya" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Bölge</label>
                      <input type="text" name="region" value={formData.region} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Ege, Bordeaux" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Üzüm Türü</label>
                      <input type="text" name="grape" value={formData.grape} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Cabernet Sauvignon" />
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 3: Şarap Karakteri (Tat Profili) */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">Şarap Karakteri (Tat Profili)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Gövde</label>
                      <select name="body" value={formData.body} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Hafif">Hafif</option>
                        <option value="Orta">Orta</option>
                        <option value="Yoğun">Yoğun</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tatlılık</label>
                      <select name="sweetness" value={formData.sweetness} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Sek (Kuru)">Sek (Kuru)</option>
                        <option value="Dömisek (Yarı Tatlı)">Dömisek (Yarı Tatlı)</option>
                        <option value="Tatlı">Tatlı</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Asidite</label>
                      <select name="acidity" value={formData.acidity} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Düşük">Düşük</option>
                        <option value="Orta">Orta</option>
                        <option value="Yüksek">Yüksek</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tanen</label>
                      <select name="tannin" value={formData.tannin} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Düşük">Düşük</option>
                        <option value="Orta">Orta</option>
                        <option value="Yüksek">Yüksek</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 4: Tadım Notları ve Kullanım */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">Tadım Notları ve Kullanım</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-cream-200">Kısa Açıklama (Müşteriye Gösterilecek)</label>
                      <textarea name="shortDescription" value={formData.shortDescription} onChange={handleInputChange} rows="2" className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Kırmızı orman meyveleri aromalı, yumuşak içimli..."></textarea>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tat Notları (Aromalar)</label>
                      <input type="text" name="tasteNotes" value={formData.tasteNotes} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Kiraz, Vanilya, Meşe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Yemek Uyumu</label>
                      <input type="text" name="foodPairing" value={formData.foodPairing} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: Izgara etler, Sert peynirler" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Önerilen Kullanım Amacı</label>
                      <select name="usagePurpose" value={formData.usagePurpose} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors">
                        <option value="Yemek için">Yemek için</option>
                        <option value="Hediye için">Hediye için</option>
                        <option value="Kutlama için">Kutlama için</option>
                        <option value="Günlük içim">Günlük içim</option>
                        <option value="Romantik akşam">Romantik akşam</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 5: Konum ve Ayarlar */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">Konum ve Ayarlar</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Raf Konumu - Blok</label>
                      <input type="text" name="block" value={formData.block} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: A" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Raf Numarası</label>
                      <input type="text" name="shelf" value={formData.shelf} onChange={handleInputChange} className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors" placeholder="Örn: 6" />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 mt-6 p-4 bg-ink-950 rounded-lg border border-charcoal-700">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" name="isSommelierPick" checked={formData.isSommelierPick} onChange={handleInputChange} className="peer sr-only" />
                        <div className="w-6 h-6 bg-charcoal-800 border-2 border-charcoal-500 rounded peer-checked:bg-gold-500 peer-checked:border-gold-500 transition-colors"></div>
                        <svg className="absolute w-4 h-4 text-ink-950 opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-cream-100 font-medium">Sömelye'nin Tavsiyesi</p>
                        <p className="text-xs text-cream-200 opacity-70">Bu ürünü ekranda özel bir etiketle öne çıkar.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="peer sr-only" />
                        <div className="w-6 h-6 bg-charcoal-800 border-2 border-charcoal-500 rounded peer-checked:bg-wine-600 peer-checked:border-wine-600 transition-colors"></div>
                        <svg className="absolute w-4 h-4 text-cream-100 opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-cream-100 font-medium">Ürün Aktif</p>
                        <p className="text-xs text-cream-200 opacity-70">İşareti kaldırırsanız kiosk ekranında görünmez.</p>
                      </div>
                    </label>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-charcoal-700 bg-charcoal-800/50 flex justify-end gap-4 shrink-0">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md transition-colors"
              >
                İptal Et
              </button>
              <button 
                form="addProductForm"
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-gold-500 hover:bg-gold-400 text-ink-950 font-bold rounded-md transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Kaydediliyor...' : (editingId ? 'Güncellemeleri Kaydet' : 'Tüm Detaylarıyla Kaydet')}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}