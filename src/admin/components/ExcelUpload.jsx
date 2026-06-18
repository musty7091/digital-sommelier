import React, { useState } from 'react';

export default function ExcelUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Üst Bilgi Kartı */}
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-8 shadow-lg">
        <h3 className="text-xl font-serif text-gold-500 mb-4">Excel ile Toplu İşlem</h3>
        <p className="text-cream-200 mb-6">
          Mahzeninizdeki şarap listesini tek seferde güncelleyin. Lütfen önce şablon dosyamızı indirin, verilerinizi doldurun ve ardından sisteme yükleyin.
        </p>
        
        <button className="px-6 py-3 bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-100 font-medium rounded-md transition-colors border border-charcoal-600 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel Şablonunu İndir (.xlsx)
        </button>
      </div>

      {/* Yükleme Alanı */}
      <div 
        className={`border-4 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-gold-500 bg-gold-500/5' : 'border-charcoal-700 bg-charcoal-800'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <svg className="w-16 h-16 mx-auto text-charcoal-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-lg text-cream-100 font-medium mb-2">
          {fileName ? fileName : "Dosyayı buraya sürükleyip bırakın"}
        </p>
        <p className="text-sm text-cream-200 opacity-60">veya bilgisayarınızdan seçmek için tıklayın</p>
        <input type="file" className="hidden" id="fileInput" onChange={(e) => setFileName(e.target.files[0]?.name)} />
        <label htmlFor="fileInput" className="mt-6 inline-block px-8 py-3 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md cursor-pointer transition-colors">
          Dosya Seç
        </label>
      </div>

      {/* İşlem Butonu */}
      <div className="flex justify-end">
        <button className="px-10 py-4 bg-gold-500 hover:bg-gold-400 text-ink-950 font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50">
          Listeyi Sisteme İşle
        </button>
      </div>
    </div>
  );
}