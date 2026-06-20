import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

// İşlem tiplerine göre renk ve Türkçe isim eşleştirmesi
const actionStyles = {
  'EKLEME': { color: 'text-green-400 bg-green-900/20 border-green-800/50', label: 'Yeni Ekleme' },
  'GÜNCELLEME': { color: 'text-blue-400 bg-blue-900/20 border-blue-800/50', label: 'Güncelleme' },
  'SİLME': { color: 'text-red-400 bg-red-900/20 border-red-800/50', label: 'Silme İşlemi' },
  'İÇERİ AKTARMA': { color: 'text-purple-400 bg-purple-900/20 border-purple-800/50', label: 'Excel Yükleme' },
  'SİSTEM': { color: 'text-gold-400 bg-gold-900/20 border-gold-800/50', label: 'Sistem Ayarı' }
};

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtreleme State'leri
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('TÜMÜ');
  const [filterAction, setFilterAction] = useState('TÜMÜ');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // adminLogs yerine Firebase'in izin verdiği auditLogs koleksiyonundan okuyoruz
      const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(500));
      const querySnapshot = await getDocs(q);
      
      const fetchedLogs = [];
      querySnapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() });
      });
      
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("Loglar çekilirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Tarih ve Saati Okunabilir Formata Çeviren Fonksiyon
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  // Arama ve Dropdown Filtrelerini Uygulama
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.module?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'TÜMÜ' || log.module === filterModule;
    const matchesAction = filterAction === 'TÜMÜ' || log.action === filterAction;
    
    return matchesSearch && matchesModule && matchesAction;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      
      {/* Üst Başlık ve Yenile Butonu */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal-700 pb-4 flex-none">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-gold-500">Değişiklik Geçmişi (Loglar)</h2>
          <p className="text-cream-200/70 text-sm mt-1">Sistem üzerinde yapılan tüm işlemlerin güvenlik ve takip kayıtları.</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 text-cream-200 hover:text-gold-400 transition-colors bg-charcoal-800 px-4 py-2 rounded-lg border border-charcoal-700 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Kayıtları Yenile
        </button>
      </div>

      {/* Akıllı Filtreleme Çubuğu */}
      <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-4 shadow-lg flex flex-col md:flex-row gap-4 flex-none">
        
        {/* Metin ile Arama */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Açıklama veya ürün ara (Örn: Bottega)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-ink-950 text-cream-100 border border-charcoal-600 rounded-lg pl-10 pr-4 py-2.5 placeholder-charcoal-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
          />
        </div>

        {/* Modül Filtresi */}
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="bg-ink-950 text-cream-100 border border-charcoal-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-gold-500 cursor-pointer w-full md:w-48"
        >
          <option value="TÜMÜ" className="bg-ink-950 text-cream-100">Tüm Modüller</option>
          <option value="Ürün Yönetimi" className="bg-ink-950 text-cream-100">Ürün Yönetimi</option>
          <option value="Excel Yükleme" className="bg-ink-950 text-cream-100">Excel Yükleme</option>
          <option value="Kiosk Ayarları" className="bg-ink-950 text-cream-100">Kiosk Ayarları</option>
        </select>

        {/* İşlem Tipi Filtresi */}
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-ink-950 text-cream-100 border border-charcoal-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-gold-500 cursor-pointer w-full md:w-48"
        >
          <option value="TÜMÜ" className="bg-ink-950 text-cream-100">Tüm İşlemler</option>
          <option value="EKLEME" className="bg-ink-950 text-cream-100">Ekleme</option>
          <option value="GÜNCELLEME" className="bg-ink-950 text-cream-100">Güncelleme</option>
          <option value="SİLME" className="bg-ink-950 text-cream-100">Silme</option>
          <option value="İÇERİ AKTARMA" className="bg-ink-950 text-cream-100">İçeri Aktarma</option>
        </select>

      </div>

      {/* Log Tablosu */}
      <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-10 h-10 border-4 border-charcoal-600 border-t-gold-500 rounded-full animate-spin"></div>
            <p className="text-gold-500 text-sm animate-pulse">Kayıtlar getiriliyor...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <svg className="w-16 h-16 text-charcoal-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-cream-200 text-lg font-serif">Kayıt Bulunamadı</p>
            <p className="text-cream-200/50 text-sm mt-1">Arama kriterlerinize uygun bir değişiklik geçmişi yok.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-charcoal-900 z-10 shadow-sm">
                <tr className="text-gold-500 text-xs uppercase tracking-widest border-b border-charcoal-700">
                  <th className="p-4 font-semibold w-40">Tarih / Saat</th>
                  <th className="p-4 font-semibold w-32">İşlem Tipi</th>
                  <th className="p-4 font-semibold w-40">Modül</th>
                  <th className="p-4 font-semibold">Detaylı Açıklama</th>
                  <th className="p-4 font-semibold w-32">Kullanıcı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-700/50">
                {filteredLogs.map(log => {
                  const style = actionStyles[log.action] || { color: 'text-cream-200 bg-charcoal-700 border-charcoal-600', label: log.action };
                  
                  return (
                    <tr key={log.id} className="hover:bg-charcoal-700/20 transition-colors group">
                      <td className="p-4 text-xs font-medium text-cream-200/80 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold border ${style.color}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-cream-200 font-medium">
                        {log.module}
                      </td>
                      <td className="p-4 text-sm text-cream-100 group-hover:text-gold-400 transition-colors leading-snug">
                        {log.details}
                      </td>
                      <td className="p-4 text-xs font-semibold text-charcoal-400 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-charcoal-900 border border-charcoal-600 flex items-center justify-center text-cream-100">
                          {log.user ? log.user.charAt(0).toUpperCase() : 'S'}
                        </div>
                        {log.user || 'Sistem'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}