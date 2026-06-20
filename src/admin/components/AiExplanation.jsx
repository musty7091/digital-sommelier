import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { logAdminAction } from '../utils/logger';
import { LEVEL_LABELS, COUNTRY_LABELS } from '../../types/product.schema';

export default function AiExplanation() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // API Anahtarını tarayıcı hafızasında tutuyoruz
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Hem Türkçe hem İngilizce verileri tutacak yeni yapı
  const [generatedData, setGeneratedData] = useState({
    shortDescriptionTr: '',
    shortDescriptionEn: '',
    tasteNotesTr: '',
    tasteNotesEn: '',
    foodPairingTr: '',
    foodPairingEn: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((d) => {
        productsList.push({ id: d.id, ...d.data() });
      });
      setProducts(productsList.filter(p => p.active !== false));
    } catch (error) {
      console.error('Ürünler çekilirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Lütfen önce bir Gemini API Anahtarı girin.");
      return;
    }
    if (!selectedProductId) {
      alert("Lütfen listeden bir şarap seçin.");
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    setIsGenerating(true);
    setGeneratedData({
      shortDescriptionTr: '', shortDescriptionEn: '',
      tasteNotesTr: '', tasteNotesEn: '',
      foodPairingTr: '', foodPairingEn: ''
    });

    const countryTr = COUNTRY_LABELS[selectedProduct.country]?.tr || selectedProduct.country || 'Belirtilmemiş';
    const bodyTr = LEVEL_LABELS[selectedProduct.body]?.tr || 'Orta';
    const sweetnessTr = LEVEL_LABELS[selectedProduct.sweetness]?.tr || 'Orta';

    // Yapay Zekaya Gönderilen Çift Dilli Emir
    const prompt = `
      Sen dünyaca ünlü, uzman bir şarap somelyesisin.
      Aşağıdaki şarap için müşteriyi satın almaya ikna edecek profesyonel bir içerik üret.
      Bunu hem Türkçe hem de İngilizce dillerinde ayrı ayrı hazırlamanı istiyorum.
      
      Şarap Bilgileri:
      Adı: ${selectedProduct.name}
      Üzüm Türü: ${selectedProduct.grape || 'Belirtilmemiş'}
      Ülkesi ve Bölgesi: ${countryTr} - ${selectedProduct.region || 'Belirtilmemiş'}
      Gövde: ${bodyTr}, Tatlılık: ${sweetnessTr}

      Aşağıdaki JSON şemasını DOLDUR. HİÇBİR EK METİN YAZMA. SADECE JSON ÇIKTISI VER:
      {
        "shortDescriptionTr": "Müşterinin okuyacağı, ekranı yormayacak şekilde KISA, ÖZ ve ÇARPICI (en fazla 1-2 kısa cümle) Türkçe tanıtım metni.",
        "shortDescriptionEn": "Aynı metnin kusursuz ve doğal bir dille yapılmış İngilizce çevirisi.",
        "tasteNotesTr": "Virgülle ayrılmış en fazla 3 belirgin tat/aroma notu (Örn: Karadut, Vanilya, Meşe).",
        "tasteNotesEn": "Aynı tat notlarının İngilizce çevirisi (Örn: Blackberry, Vanilla, Oak).",
        "foodPairingTr": "Bu şarapla en iyi gidecek 2 adet yemek veya peynir eşleşmesi (Türkçe).",
        "foodPairingEn": "Aynı yemek eşleşmesinin İngilizce çevirisi."
      }
    `;

    try {
      const cleanApiKey = apiKey.trim();
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${cleanApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.error?.message || `HTTP Hata Kodu: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;
      
      const parsedData = JSON.parse(aiText);
      setGeneratedData({
        shortDescriptionTr: parsedData.shortDescriptionTr || '',
        shortDescriptionEn: parsedData.shortDescriptionEn || '',
        tasteNotesTr: parsedData.tasteNotesTr || '',
        tasteNotesEn: parsedData.tasteNotesEn || '',
        foodPairingTr: parsedData.foodPairingTr || '',
        foodPairingEn: parsedData.foodPairingEn || ''
      });

    } catch (error) {
      console.error("Yapay Zeka Hatası:", error);
      alert(`BİR HATA OLUŞTU:\n\n${error.message}\n\nLütfen API anahtarınızın doğru kopyalandığından emin olun.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct || !generatedData.shortDescriptionTr) return;

    try {
      // Artık her iki dili de doğrudan güncelliyoruz
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        shortDescription: { tr: generatedData.shortDescriptionTr, en: generatedData.shortDescriptionEn },
        tasteNotes: { tr: generatedData.tasteNotesTr, en: generatedData.tasteNotesEn },
        foodPairing: { tr: generatedData.foodPairingTr, en: generatedData.foodPairingEn },
        updatedAt: new Date().toISOString()
      });

      await logAdminAction('Yapay Zeka', 'GÜNCELLEME', `"${selectedProduct.name}" şarabı için çift dilli (TR/EN) yapay zeka içeriği üretildi ve kaydedildi.`);
      
      alert("Harika! Çift dilli yapay zeka içerikleri şaraba başarıyla kaydedildi.");
      
      // İşlem bitince ekranı temizle
      setGeneratedData({
        shortDescriptionTr: '', shortDescriptionEn: '',
        tasteNotesTr: '', tasteNotesEn: '',
        foodPairingTr: '', foodPairingEn: ''
      });
      setSelectedProductId('');
      fetchProducts();
      
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      alert("Veritabanına kaydedilirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-gold-500 font-serif text-lg animate-pulse">Sistem Hazırlanıyor...</p>
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal-700 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-500 flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Yapay Zekâ Somelye
          </h2>
          <p className="text-cream-200/70 text-sm mt-1">Şaraplarınız için otomatik, çift dilli ve iştah açıcı içerikler üretin.</p>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg max-w-3xl">
        <label className="block text-sm font-medium text-cream-200 mb-2">Google Gemini API Anahtarı</label>
        <div className="flex gap-3">
          <input
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="AI_xxxxxxxxxxxxxxxxxxxx"
            className="flex-1 bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL: Ürün Seçimi (1 Sütun) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg">
            <h3 className="text-lg font-serif text-cream-100 mb-4 border-b border-charcoal-700 pb-2">1. Şarap Seçin</h3>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none focus:border-gold-500"
            >
              <option value="">-- Şarap Seçiniz --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
              ))}
            </select>

            {selectedProduct && (
              <div className="mt-6 p-4 bg-ink-950 rounded-lg border border-charcoal-700 space-y-3">
                <p className="text-sm text-cream-200"><strong className="text-gold-400">Üzüm:</strong> {selectedProduct.grape || '-'}</p>
                <p className="text-sm text-cream-200"><strong className="text-gold-400">Bölge:</strong> {selectedProduct.region || '-'}</p>
                <p className="text-sm text-cream-200"><strong className="text-gold-400">Mevcut TR:</strong> {selectedProduct.shortDescription?.tr || 'Yok'}</p>
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-wine-700 hover:bg-wine-600 disabled:bg-charcoal-600 text-cream-100 font-medium rounded-lg transition-colors shadow-md"
                >
                  {isGenerating ? (
                    <><div className="w-5 h-5 border-2 border-cream-100 border-t-transparent rounded-full animate-spin"></div> Düşünüyor...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> Çift Dilli Üret</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: Yapay Zeka Sonuçları (2 Sütun Genişliğinde Çift Dilli Görünüm) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-lg font-serif text-cream-100 mb-4 border-b border-charcoal-700 pb-2">2. Yapay Zekâ Çift Dilli Öneri</h3>
            
            {!generatedData.shortDescriptionTr && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <svg className="w-16 h-16 text-charcoal-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p className="text-cream-200">Henüz bir açıklama üretilmedi.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-6">
                
                {/* Şiirsel Açıklama Bloğu */}
                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">Kısa Şiirsel Açıklama</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">Türkçe</label>
                      <textarea 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        rows="3" 
                        value={generatedData.shortDescriptionTr}
                        onChange={(e) => setGeneratedData({...generatedData, shortDescriptionTr: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">İngilizce (English)</label>
                      <textarea 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        rows="3" 
                        value={generatedData.shortDescriptionEn}
                        onChange={(e) => setGeneratedData({...generatedData, shortDescriptionEn: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Tat Notları Bloğu */}
                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">Tat Notları (Aromalar)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">Türkçe</label>
                      <input 
                        type="text" 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        value={generatedData.tasteNotesTr}
                        onChange={(e) => setGeneratedData({...generatedData, tasteNotesTr: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">İngilizce (English)</label>
                      <input 
                        type="text" 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        value={generatedData.tasteNotesEn}
                        onChange={(e) => setGeneratedData({...generatedData, tasteNotesEn: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Yemek Uyumu Bloğu */}
                <div>
                  <h4 className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-3 border-b border-charcoal-700 pb-1">Yemek & Peynir Uyumu</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">Türkçe</label>
                      <input 
                        type="text" 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        value={generatedData.foodPairingTr}
                        onChange={(e) => setGeneratedData({...generatedData, foodPairingTr: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-cream-200 mb-1">İngilizce (English)</label>
                      <input 
                        type="text" 
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-lg p-3 text-cream-100 focus:outline-none" 
                        value={generatedData.foodPairingEn}
                        onChange={(e) => setGeneratedData({...generatedData, foodPairingEn: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveToDatabase}
                  className="w-full mt-6 px-6 py-4 bg-gold-500 hover:bg-gold-400 text-ink-950 font-bold text-lg rounded-lg transition-colors shadow-md"
                >
                  Tümünü Onayla ve Şaraba Kaydet
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}