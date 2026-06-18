// Kiosk veri okuma yardımcıları.
// Kiosk anonimdir; güvenlik kuralları yalnızca aktif ürünlerin okunmasına izin verir.
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from './config'

// Yalnızca aktif ürünleri getirir (güvenlik kuralıyla uyumlu sorgu).
export async function fetchActiveProducts() {
  const q = query(collection(db, 'products'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Tek ürün — barkod, doküman kimliğidir.
export async function fetchProduct(barcode) {
  const snap = await getDoc(doc(db, 'products', barcode))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Kiosk ayarları (filtre seçenekleri, diller, sıfırlama süresi, fiyat aralıkları).
export async function fetchKioskSettings() {
  const snap = await getDoc(doc(db, 'kioskSettings', 'default'))
  return snap.exists() ? snap.data() : null
}
