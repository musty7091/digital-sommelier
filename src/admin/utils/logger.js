import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

/**
 * Yönetim panelinde yapılan işlemleri veritabanına kaydeder.
 * @param {string} moduleName - Hangi ekranda yapıldı? (Örn: 'Ürün Yönetimi', 'Excel Yükleme')
 * @param {string} actionType - Ne yapıldı? (Örn: 'EKLEME', 'GÜNCELLEME', 'SİLME')
 * @param {string} description - Detaylı açıklama (Örn: 'Bottega Gold fiyatı 1500 -> 1600 TL oldu')
 */
export const logAdminAction = async (moduleName, actionType, description, user = 'Sistem Yöneticisi') => {
  try {
    // adminLogs yerine Firebase kurallarının izin verdiği auditLogs klasörüne yazıyoruz
    await addDoc(collection(db, 'auditLogs'), {
      module: moduleName,
      action: actionType,
      details: description,
      user: user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Log kaydedilemedi:", error);
  }
};