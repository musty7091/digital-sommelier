import { logAuditAction } from '../../firebase/products'

/**
 * Yönetim panelinde yapılan işlemleri lokal audit log dosyasına kaydeder.
 *
 * Artık Firebase kullanmaz.
 * Kayıtlar backend üzerinden şuraya yazılır:
 * data/audit-logs.json
 *
 * @param {string} moduleName - Hangi ekranda yapıldı? Örn: 'Ürün Yönetimi'
 * @param {string} actionType - Ne yapıldı? Örn: 'EKLEME', 'GÜNCELLEME', 'SİLME'
 * @param {string} description - Detaylı açıklama
 * @param {string} user - İşlemi yapan kullanıcı
 */
export const logAdminAction = async (
  moduleName,
  actionType,
  description,
  user = 'Sistem Yöneticisi',
) => {
  try {
    await logAuditAction({
      actor: user,
      action: actionType || 'SİSTEM',
      entityType: moduleName || 'admin',
      entityId: '',
      message: description || '',
      details: {
        module: moduleName || '',
        actionType: actionType || '',
        description: description || '',
        user,
      },
    })

    return {
      ok: true,
    }
  } catch (error) {
    console.error('Lokal log kaydedilemedi:', error)

    return {
      ok: false,
      error,
    }
  }
}

export default {
  logAdminAction,
}