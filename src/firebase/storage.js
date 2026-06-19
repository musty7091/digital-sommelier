// Firebase Storage yardımcıları (ürün görselleri).
// Resim yüklenir, indirilebilir URL döner; bu URL ürünün `image` alanına yazılır.
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

// Bir ürün görselini yükler ve indirilebilir URL'i döndürür.
// onProgress(percent): 0-100 arası ilerleme bildirir (opsiyonel).
export function uploadProductImage(file, barcode, onProgress) {
  return new Promise((resolve, reject) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const base = (barcode || 'urun').trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'urun'
    const path = `product-images/${base}_${Date.now()}.${ext}`
    const task = uploadBytesResumable(ref(storage, path), file, {
      contentType: file.type,
    })
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
        }
      },
      (err) => reject(err),
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref))
        } catch (err) {
          reject(err)
        }
      },
    )
  })
}
