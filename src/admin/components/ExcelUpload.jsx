import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Excel'deki Türkçe kelimeleri veritabanı şemamıza uygun hale getiren çevirmenler
const colorToDb = (c) => {
  if (!c) return 'red';
  const v = c.toLowerCase();
  if (v === 'beyaz') return 'white';
  if (v === 'rose' || v === 'rosé') return 'rose';
  if (v === 'köpüklü') return 'sparkling';
  return 'red';
};

const levelToDb = (l) => {
  if (!l) return 'medium';
  const v = l.toLowerCase();
  if (v.includes('hafif') || v.includes('sek') || v.includes('düşük')) return 'light';
  if (v.includes('yoğun') || v.includes('yüksek') || v.includes('tatlı')) return 'intense';
  return 'medium';
};

const purposeToDb = (val) => {
  if (!val) return ['food'];
  const map = {
    'yemek için': 'food', 'hediye için': 'gift', 'kutlama için': 'celebration',
    'günlük içim': 'daily', 'romantik akşam': 'romantic', 'premium seçim': 'premium',
    'hafif içim': 'light', 'fiyat / performans': 'value', 'yeni başlayanlar için': 'beginner',
    'somelye önerisi': 'sommelier'
  };
  // Birden fazla kullanım amacı virgülle ayrılmışsa hepsini yakala
  const parts = String(val).split(',').map(s => s.trim().toLowerCase());
  const res = parts.map(p => map[p]).filter(Boolean);
  return res.length > 0 ? res : ['food'];
};

// YENİ EKLENEN ÇEVİRMEN: Ülke isimlerini tekrar veritabanı kodlarına (TR, FR, IT vb.) çevirir
const countryToDb = (val) => {
  if (!val) return 'OTHER';
  const v = String(val).toLowerCase().trim();
  if (v === 'türkiye' || v === 'turkiye' || v === 'turkey') return 'TR';
  if (v === 'kıbrıs' || v === 'kibris' || v === 'cyprus') return 'CY';
  if (v === 'i̇talya' || v === 'italya' || v === 'italy') return 'IT';
  if (v === 'fransa' || v === 'france') return 'FR';
  if (v === 'şili' || v === 'sili' || v === 'chile') return 'CL';
  if (v === 'arjantin' || v === 'argentina') return 'AR';
  if (v === 'i̇spanya' || v === 'ispanya' || v === 'spain') return 'ES';
  if (v === 'avustralya' || v === 'australia') return 'AU';
  if (v === 'yeni zelanda' || v === 'new zealand') return 'NZ';
  return 'OTHER';
};

export default function ExcelUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      processFile(file);
    }
  };

  const processFile = async (file) => {
    setIsProcessing(true);
    setProgress(0);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert("Excel dosyası boş görünüyor.");
          setIsProcessing(false);
          return;
        }

        // Büyük verileri 400'lük paketlere bölüyoruz (Firebase limiti 500'dür)
        const chunkSize = 400;
        const chunks = [];
        for (let i = 0; i < jsonData.length; i += chunkSize) {
          chunks.push(jsonData.slice(i, i + chunkSize));
        }

        let processedCount = 0;

        for (const chunk of chunks) {
          const batch = writeBatch(db);

          chunk.forEach((row) => {
            // Excel'deki barkodu okuyup doküman kimliği yapıyoruz
            const barcodeStr = row.Barkod ? String(row.Barkod).trim() : Date.now().toString() + Math.floor(Math.random() * 1000);
            const productRef = doc(db, 'products', barcodeStr);
            
            // Excel satırını güvenli bir şekilde veritabanı formatına dönüştürme
            const payload = {
              barcode: barcodeStr,
              name: String(row.UrunAdi || '').trim(),
              brand: String(row.Marka || '').trim(),
              color: colorToDb(row.Renk),
              price: Number(row.Fiyat || 0),
              stock: Number(row.Stok || 0),
              block: String(row.Blok || '').trim(),
              shelf: String(row.Raf || '').trim(),
              country: countryToDb(row.Ulke), // Ülke kodunu çözen bölüm eklendi
              region: String(row.Bolge || '').trim(),
              grape: String(row.UzumTuru || '').trim(),
              body: levelToDb(row.Govde),
              sweetness: levelToDb(row.Tatlilik),
              acidity: levelToDb(row.Asidite),
              tannin: levelToDb(row.Tanen),
              usagePurposes: purposeToDb(row.KullanimAmaci),
              active: row.Aktif !== 'Hayır' && row.Aktif !== false,
              sommelierPick: row.SomelyeTavsiyesi === 'Evet' || row.SomelyeTavsiyesi === true,
              shortDescription: {
                tr: String(row.KisaAciklama || '').trim(),
                en: ''
              },
              tasteNotes: {
                tr: String(row.TadimNotlari || '').trim(),
                en: ''
              },
              foodPairing: {
                tr: String(row.YemekUyumu || '').trim(),
                en: ''
              },
              updatedAt: new Date().toISOString(),
              updatedBy: 'excel_upload'
            };

            // { merge: true } ile eskiden var olan İngilizce çevirilerin silinmesini önlüyoruz
            batch.set(productRef, payload, { merge: true });
          });

          await batch.commit();
          processedCount += chunk.length;
          setProgress(Math.round((processedCount / jsonData.length) * 100));
        }

        alert(`${jsonData.length} adet ürün başarıyla sisteme aktarıldı!`);
        setFileName(null);
      } catch (error) {
        console.error("Yükleme sırasında hata oluştu:", error);
        alert("Excel dosyası işlenirken bir sorun yaşandı. Lütfen formatı kontrol edin.");
      } finally {
        setIsProcessing(false);
        setProgress(0);
        // İkinci yükleme için inputu temizle
        document.getElementById('fileInput').value = '';
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Üst Bilgi Kartı */}
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-8 shadow-lg">
        <h3 className="text-xl font-serif text-gold-500 mb-4">Excel ile Toplu İşlem</h3>
        <p className="text-cream-200 mb-6">
          Mahzeninizdeki şarap listesini tek seferde güncelleyin. Lütfen önce şablon dosyamızı indirin, verilerinizi doldurun ve ardından sisteme yükleyin.
        </p>
        
        <a 
          href="/sarap-sablon.xlsx" 
          download="sarap-sablon.xlsx"
          className="px-6 py-3 bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-100 font-medium rounded-md transition-colors border border-charcoal-600 flex items-center gap-2 inline-flex"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel Şablonunu İndir (.xlsx)
        </a>
      </div>

      {/* Yükleme ve Animasyon Alanı */}
      <div 
        className={`border-4 border-dashed rounded-xl p-12 text-center transition-all ${
          dragActive ? 'border-gold-500 bg-gold-500/5' : 
          isProcessing ? 'border-wine-600 bg-wine-900/20' : 'border-charcoal-700 bg-charcoal-800'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-16 h-16 border-4 border-charcoal-700 border-t-gold-500 rounded-full animate-spin"></div>
            <p className="text-xl text-gold-400 font-medium">İşleniyor... %{progress}</p>
            <p className="text-sm text-cream-200 opacity-60">Lütfen sayfayı kapatmayın, ürünler mahzene yerleştiriliyor.</p>
          </div>
        ) : (
          <>
            <svg className="w-16 h-16 mx-auto text-charcoal-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg text-cream-100 font-medium mb-2">
              {fileName ? fileName : "Dosyayı buraya sürükleyip bırakın"}
            </p>
            <p className="text-sm text-cream-200 opacity-60">veya bilgisayarınızdan seçmek için tıklayın</p>
            <input 
              type="file" 
              className="hidden" 
              id="fileInput" 
              accept=".xlsx, .xls, .csv" 
              onChange={(e) => {
                if(e.target.files[0]) {
                  setFileName(e.target.files[0].name);
                  processFile(e.target.files[0]);
                }
              }} 
            />
            <label htmlFor="fileInput" className="mt-6 inline-block px-8 py-3 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md cursor-pointer transition-colors">
              Dosya Seç ve Yükle
            </label>
          </>
        )}
      </div>

    </div>
  );
}