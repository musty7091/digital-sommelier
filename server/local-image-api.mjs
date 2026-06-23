import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname, '..')
const imagesDir = path.join(projectRoot, 'public', 'product-images')
const dataDir = path.join(projectRoot, 'data')
const adminSettingsPath = path.join(dataDir, 'admin-settings.json')

const PORT = Number(process.env.LOCAL_IMAGE_API_PORT || 8787)

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data)

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  res.end(body)
}

function normalizeBarcode(value) {
  return String(value || '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function safeText(value) {
  return String(value || '').trim()
}

async function ensureAdminSettings() {
  await fs.mkdir(dataDir, { recursive: true })

  try {
    const raw = await fs.readFile(adminSettingsPath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!parsed.adminPassword) {
      throw new Error('Admin şifresi boş.')
    }

    return parsed
  } catch {
    const defaultSettings = {
      adminPassword: '1234',
    }

    await fs.writeFile(
      adminSettingsPath,
      JSON.stringify(defaultSettings, null, 2),
      'utf8',
    )

    return defaultSettings
  }
}

async function writeAdminSettings(settings) {
  await fs.mkdir(dataDir, { recursive: true })

  await fs.writeFile(
    adminSettingsPath,
    JSON.stringify(settings, null, 2),
    'utf8',
  )
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk

      if (body.length > 8 * 1024 * 1024) {
        reject(new Error('İstek gövdesi çok büyük.'))
        req.destroy()
      }
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new Error('Geçersiz JSON verisi.'))
      }
    })

    req.on('error', reject)
  })
}

async function handleAdminLogin(req, res) {
  try {
    const payload = await readJsonBody(req)
    const password = safeText(payload.password)

    if (!password) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Şifre zorunludur.',
      })
    }

    const settings = await ensureAdminSettings()
    const expectedPassword = safeText(settings.adminPassword)

    if (password !== expectedPassword) {
      return sendJson(res, 401, {
        ok: false,
        message: 'Şifre hatalı.',
      })
    }

    return sendJson(res, 200, {
      ok: true,
      message: 'Admin girişi başarılı.',
    })
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: error.message || 'Admin girişi kontrol edilemedi.',
    })
  }
}

async function handleAdminChangePassword(req, res) {
  try {
    const payload = await readJsonBody(req)

    const currentPassword = safeText(payload.currentPassword)
    const newPassword = safeText(payload.newPassword)
    const newPasswordAgain = safeText(payload.newPasswordAgain)

    if (!currentPassword) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Mevcut şifre zorunludur.',
      })
    }

    if (!newPassword) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Yeni şifre zorunludur.',
      })
    }

    if (newPassword.length < 4) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Yeni şifre en az 4 karakter olmalıdır.',
      })
    }

    if (newPassword !== newPasswordAgain) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Yeni şifreler birbiriyle uyuşmuyor.',
      })
    }

    const settings = await ensureAdminSettings()
    const expectedPassword = safeText(settings.adminPassword)

    if (currentPassword !== expectedPassword) {
      return sendJson(res, 401, {
        ok: false,
        message: 'Mevcut şifre hatalı.',
      })
    }

    await writeAdminSettings({
      ...settings,
      adminPassword: newPassword,
      updatedAt: new Date().toISOString(),
    })

    return sendJson(res, 200, {
      ok: true,
      message: 'Admin şifresi güncellendi.',
    })
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: error.message || 'Admin şifresi güncellenemedi.',
    })
  }
}

async function saveProductImage(req, res) {
  try {
    const payload = await readJsonBody(req)

    const barcode = normalizeBarcode(payload.barcode)
    const base64 = String(payload.base64 || '')

    if (!barcode) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Barkod zorunludur.',
      })
    }

    if (!base64) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Görsel verisi zorunludur.',
      })
    }

    const cleanBase64 = base64.includes(',')
      ? base64.split(',').pop()
      : base64

    const buffer = Buffer.from(cleanBase64, 'base64')

    if (!buffer.length) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Görsel dosyası okunamadı.',
      })
    }

    if (buffer.length > 400 * 1024) {
      return sendJson(res, 413, {
        ok: false,
        message: 'Görsel 400 KB üstünde. Lütfen daha küçük görsel yükleyin.',
        size: buffer.length,
      })
    }

    await fs.mkdir(imagesDir, { recursive: true })

    const filename = `${barcode}.webp`
    const filePath = path.join(imagesDir, filename)

    await fs.writeFile(filePath, buffer)

    return sendJson(res, 200, {
      ok: true,
      message: 'Görsel kaydedildi.',
      barcode,
      filename,
      path: `/product-images/${filename}`,
      size: buffer.length,
    })
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: error.message || 'Görsel kaydedilemedi.',
    })
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'local-image-api',
      imagesDir,
      adminSettingsPath,
      adminAuth: 'local-single-admin',
    })
  }

  if (req.method === 'POST' && req.url === '/api/admin/login') {
    return handleAdminLogin(req, res)
  }

  if (req.method === 'POST' && req.url === '/api/admin/change-password') {
    return handleAdminChangePassword(req, res)
  }

  if (req.method === 'GET' && req.url === '/api/product-images') {
    try {
      await fs.mkdir(imagesDir, { recursive: true })
      const files = await fs.readdir(imagesDir)
      const barcodes = files
        .filter((f) => f.toLowerCase().endsWith('.webp'))
        .map((f) => f.slice(0, -'.webp'.length))
      return sendJson(res, 200, { ok: true, count: barcodes.length, barcodes })
    } catch (error) {
      return sendJson(res, 500, { ok: false, message: error.message || 'Liste alınamadı.' })
    }
  }

  if (req.method === 'POST' && req.url === '/api/product-image') {
    return saveProductImage(req, res)
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Endpoint bulunamadı.',
  })
})

server.listen(PORT, () => {
  console.log(`Local image API çalışıyor: http://localhost:${PORT}`)
  console.log(`Görsel klasörü: ${imagesDir}`)
  console.log(`Admin ayar dosyası: ${adminSettingsPath}`)
})