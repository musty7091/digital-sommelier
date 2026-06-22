// SQL Server view + lokal JSON veri merkezi.
// Bu dosya Firebase kullanmaz.
// Görevi:
// 1. SQL Server'dan ticari ürün verisini almak
// 2. data/product-overrides.json içindeki sommelier metadata ile birleştirmek
// 3. Admin panelden gelen metadata güncellemelerini lokal JSON'a yazmak
// 4. Kiosk ayarlarını lokal JSON'da yönetmek
// 5. Audit loglarını lokal JSON'da tutmak

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import sql from 'mssql'
import { buildProducts, buildProduct, loadOverrides } from './product-merge.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'data')

const overridesPath = path.join(dataDir, 'product-overrides.json')
const kioskSettingsPath = path.join(dataDir, 'kiosk-settings.json')
const auditLogsPath = path.join(dataDir, 'audit-logs.json')

dotenv.config({ path: path.join(__dirname, '.env') })

const PORT = Number(process.env.DB_API_PORT || 8788)
const VIEW = process.env.DB_VIEW || 'vw_digital_sommelier_products'

const DEFAULT_KIOSK_SETTINGS = {
  idleTimeoutSeconds: 120,
  autoResetSeconds: 120,
  showPopularProducts: true,
  showStock: true,
  showPrice: true,
  maxResults: 12,
  maxLivePreviewProducts: 30,
  language: 'tr',
  isKioskEnabled: true,

  colors: [
    { value: 'red', label: { tr: 'Kırmızı', en: 'Red' } },
    { value: 'white', label: { tr: 'Beyaz', en: 'White' } },
    { value: 'rose', label: { tr: 'Roze', en: 'Rosé' } },
    { value: 'sparkling', label: { tr: 'Köpüklü', en: 'Sparkling' } },
  ],

  priceRanges: [
    { value: 'budget', label: { tr: 'Ekonomik', en: 'Budget' }, min: 0, max: 500 },
    { value: 'mid', label: { tr: 'Orta Seviye', en: 'Mid range' }, min: 500, max: 1000 },
    { value: 'premium', label: { tr: 'Premium', en: 'Premium' }, min: 1000, max: 2000 },
    { value: 'luxury', label: { tr: 'Üst Segment', en: 'Luxury' }, min: 2000, max: null },
  ],

  usagePurposes: [
    { value: 'daily', label: { tr: 'Günlük tüketim', en: 'Everyday' } },
    { value: 'gift', label: { tr: 'Hediye', en: 'Gift' } },
    { value: 'dinner', label: { tr: 'Yemek eşliği', en: 'Dinner pairing' } },
    { value: 'special', label: { tr: 'Özel gün', en: 'Special occasion' } },
  ],

  countries: [],
}

function envBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()

  if (['1', 'true', 'yes', 'evet'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'hayir', 'hayır'].includes(normalized)) {
    return false
  }

  return fallback
}

function normalizeBarcode(value) {
  return String(value || '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

function cleanText(value) {
  return String(value || '').trim()
}

function nowIso() {
  return new Date().toISOString()
}

function sendJson(res, code, data) {
  const body = JSON.stringify(data)

  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Content-Length': Buffer.byteLength(body),
  })

  res.end(body)
}

function sendNoContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  })
  res.end()
}

function buildDbConfig() {
  return {
    server: process.env.DB_SERVER || '192.168.1.155',
    database: process.env.DB_DATABASE || 'REPORTDB',
    user: process.env.DB_USER || 'yasemin',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 1433),

    connectionTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 30000),

    options: {
      encrypt: envBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: envBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
      enableArithAbort: true,
    },

    pool: {
      max: Number(process.env.DB_POOL_MAX || 5),
      min: 0,
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000),
    },
  }
}

const dbConfig = buildDbConfig()

let poolPromise = null

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig).catch((error) => {
      poolPromise = null
      throw error
    })
  }

  return poolPromise
}

function safeSqlIdentifier(value) {
  const text = String(value || '').trim()

  if (!/^[a-zA-Z0-9_.$[\]]+$/.test(text)) {
    throw new Error(`Geçersiz SQL view adı: ${text}`)
  }

  return text
}

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true })

  await ensureJsonFile(overridesPath, {})
  await ensureJsonFile(kioskSettingsPath, DEFAULT_KIOSK_SETTINGS)
  await ensureJsonFile(auditLogsPath, [])
}

async function ensureJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')

    if (!raw.trim()) {
      await writeJsonFile(filePath, fallbackValue)
    }
  } catch {
    await writeJsonFile(filePath, fallbackValue)
  }
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')

    if (!raw.trim()) {
      return fallbackValue
    }

    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  const tempPath = `${filePath}.tmp`

  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk

      if (body.length > 20 * 1024 * 1024) {
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

async function queryRows(barcode) {
  const pool = await getPool()
  const request = pool.request()
  const safeViewName = safeSqlIdentifier(VIEW)

  let query = `
    SELECT
      Barcode,
      ProductName,
      Brand,
      Price,
      Stock,
      Category,
      IsActive
    FROM ${safeViewName}
  `

  if (barcode) {
    request.input('barcode', sql.VarChar, String(barcode))
    query += ` WHERE CAST(Barcode AS VARCHAR(64)) = @barcode`
  }

  const result = await request.query(query)

  return result.recordset || []
}

function normalizeOverridesForWrite(rawData) {
  if (Array.isArray(rawData)) {
    const map = {}

    for (const item of rawData) {
      const barcode = normalizeBarcode(item?.barcode || item?.Barcode || item?.Barkod)

      if (barcode) {
        map[barcode] = {
          ...item,
          barcode,
        }
      }
    }

    return map
  }

  return rawData && typeof rawData === 'object' ? rawData : {}
}

async function readOverridesForWrite() {
  const raw = await readJsonFile(overridesPath, {})
  return normalizeOverridesForWrite(raw)
}

function cleanMetadataPayload(payload = {}) {
  const allowedFields = [
    'barcode',
    'name',
    'brand',

    'color',
    'country',
    'region',
    'grape',
    'body',
    'sweetness',
    'taste',
    'acidity',
    'tannin',

    'block',
    'shelf',

    'usagePurposes',

    'shortDescription',
    'tasteNotes',
    'foodPairing',

    'description',
    'descriptionTr',
    'descriptionEn',

    'sommelierPick',
    'featured',
    'priorityScore',

    'imageUpdatedAt',
    'imagePath',
  ]

  const cleaned = {}

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      cleaned[field] = payload[field]
    }
  }

  delete cleaned.image
  delete cleaned.base64
  delete cleaned.dataUrl

  return cleaned
}

async function appendAuditLog(entry = {}) {
  const logs = await readJsonFile(auditLogsPath, [])

  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: nowIso(),
    actor: entry.actor || 'local-admin',
    action: entry.action || 'unknown',
    entityType: entry.entityType || '',
    entityId: entry.entityId || '',
    message: entry.message || '',
    details: entry.details || {},
  }

  const nextLogs = [nextEntry, ...logs].slice(0, 2000)

  await writeJsonFile(auditLogsPath, nextLogs)

  return nextEntry
}

async function handleHealth(res) {
  const pool = await getPool()
  const result = await pool.request().query('SELECT 1 AS ok')

  return sendJson(res, 200, {
    ok: true,
    service: 'database-api',
    mode: 'local-sql-json',
    view: VIEW,
    server: dbConfig.server,
    database: dbConfig.database,
    port: dbConfig.port,
    encrypt: dbConfig.options.encrypt,
    trustServerCertificate: dbConfig.options.trustServerCertificate,
    sqlOk: result.recordset?.[0]?.ok === 1,
    files: {
      dataDir,
      overridesPath,
      kioskSettingsPath,
      auditLogsPath,
    },
  })
}

async function handleProducts(reqUrl, res) {
  const rows = await queryRows()
  const overrides = loadOverrides(overridesPath)

  let products = buildProducts(rows, overrides)

  if (reqUrl.searchParams.get('activeOnly') === '1') {
    products = products.filter((product) => {
      return product.active !== false && product.isActive !== false
    })
  }

  if (reqUrl.searchParams.get('inStockOnly') === '1') {
    products = products.filter((product) => Number(product.stock || 0) > 0)
  }

  if (reqUrl.searchParams.get('kioskReadyOnly') === '1') {
    products = products.filter((product) => product.kioskReady === true)
  }

  if (reqUrl.searchParams.get('missingOnly') === '1') {
    products = products.filter((product) => product.metadataStatus === 'missing' || product.needsReview)
  }

  return sendJson(res, 200, {
    ok: true,
    count: products.length,
    products,
  })
}

async function handleProductByBarcode(barcode, res) {
  const cleanBarcode = normalizeBarcode(barcode)

  if (!cleanBarcode) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Barkod zorunludur.',
    })
  }

  const rows = await queryRows(cleanBarcode)

  if (!rows.length) {
    return sendJson(res, 404, {
      ok: false,
      error: 'Ürün bulunamadı.',
      barcode: cleanBarcode,
    })
  }

  const overrides = loadOverrides(overridesPath)

  return sendJson(
    res,
    200,
    {
      ok: true,
      product: buildProduct(rows[0], overrides[cleanBarcode] || {}),
    },
  )
}

async function handleUpdateProductMetadata(barcode, req, res) {
  const cleanBarcode = normalizeBarcode(barcode)

  if (!cleanBarcode) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Barkod zorunludur.',
    })
  }

  const payload = await readJsonBody(req)
  const overrides = await readOverridesForWrite()

  const previous = overrides[cleanBarcode] || {}

  const nextMetadata = {
    ...previous,
    ...cleanMetadataPayload(payload),
    barcode: cleanBarcode,
    updatedAt: nowIso(),
  }

  overrides[cleanBarcode] = nextMetadata

  await writeJsonFile(overridesPath, overrides)

  const rows = await queryRows(cleanBarcode)
  const product = rows.length
    ? buildProduct(rows[0], loadOverrides(overridesPath)[cleanBarcode] || {})
    : {
        id: cleanBarcode,
        barcode: cleanBarcode,
        ...nextMetadata,
      }

  await appendAuditLog({
    action: 'product_metadata_updated',
    entityType: 'product',
    entityId: cleanBarcode,
    message: `${cleanBarcode} barkodlu ürün metadata güncellendi.`,
    details: {
      barcode: cleanBarcode,
      fields: Object.keys(cleanMetadataPayload(payload)),
    },
  })

  return sendJson(res, 200, {
    ok: true,
    barcode: cleanBarcode,
    metadata: nextMetadata,
    product,
  })
}

async function handleBulkMetadata(req, res) {
  const payload = await readJsonBody(req)
  const items = Array.isArray(payload) ? payload : payload.items

  if (!Array.isArray(items)) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Toplu metadata için dizi formatında veri gerekir.',
    })
  }

  const overrides = await readOverridesForWrite()
  const results = []

  for (const item of items) {
    const barcode = normalizeBarcode(item?.barcode || item?.Barcode || item?.Barkod)

    if (!barcode) {
      results.push({
        ok: false,
        error: 'Barkod eksik.',
        item,
      })
      continue
    }

    const previous = overrides[barcode] || {}

    overrides[barcode] = {
      ...previous,
      ...cleanMetadataPayload(item),
      barcode,
      updatedAt: nowIso(),
    }

    results.push({
      ok: true,
      barcode,
    })
  }

  await writeJsonFile(overridesPath, overrides)

  await appendAuditLog({
    action: 'product_metadata_bulk_updated',
    entityType: 'product',
    message: 'Toplu ürün metadata güncellemesi yapıldı.',
    details: {
      total: items.length,
      success: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
    },
  })

  return sendJson(res, 200, {
    ok: true,
    total: items.length,
    success: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  })
}

function normalizeKioskSettings(settings = {}) {
  return {
    ...DEFAULT_KIOSK_SETTINGS,
    ...settings,

    idleTimeoutSeconds: Number(
      settings.idleTimeoutSeconds ??
        settings.autoResetSeconds ??
        DEFAULT_KIOSK_SETTINGS.idleTimeoutSeconds,
    ),

    autoResetSeconds: Number(
      settings.autoResetSeconds ??
        settings.idleTimeoutSeconds ??
        DEFAULT_KIOSK_SETTINGS.autoResetSeconds,
    ),

    maxResults: Number(settings.maxResults ?? DEFAULT_KIOSK_SETTINGS.maxResults),

    maxLivePreviewProducts: Number(
      settings.maxLivePreviewProducts ??
        DEFAULT_KIOSK_SETTINGS.maxLivePreviewProducts,
    ),

    showPopularProducts:
      settings.showPopularProducts ?? DEFAULT_KIOSK_SETTINGS.showPopularProducts,

    showStock: settings.showStock ?? DEFAULT_KIOSK_SETTINGS.showStock,
    showPrice: settings.showPrice ?? DEFAULT_KIOSK_SETTINGS.showPrice,
    language: settings.language || DEFAULT_KIOSK_SETTINGS.language,
    isKioskEnabled: settings.isKioskEnabled ?? DEFAULT_KIOSK_SETTINGS.isKioskEnabled,

    colors: Array.isArray(settings.colors) && settings.colors.length
      ? settings.colors
      : DEFAULT_KIOSK_SETTINGS.colors,

    priceRanges: Array.isArray(settings.priceRanges) && settings.priceRanges.length
      ? settings.priceRanges
      : DEFAULT_KIOSK_SETTINGS.priceRanges,

    usagePurposes: Array.isArray(settings.usagePurposes) && settings.usagePurposes.length
      ? settings.usagePurposes
      : DEFAULT_KIOSK_SETTINGS.usagePurposes,

    countries: Array.isArray(settings.countries)
      ? settings.countries
      : DEFAULT_KIOSK_SETTINGS.countries,
  }
}

async function handleGetKioskSettings(res) {
  const rawSettings = await readJsonFile(kioskSettingsPath, DEFAULT_KIOSK_SETTINGS)
  const settings = normalizeKioskSettings(rawSettings)

  return sendJson(res, 200, {
    ok: true,
    settings,
  })
}

async function handleSaveKioskSettings(req, res) {
  const payload = await readJsonBody(req)
  const settingsPayload = payload.settings && typeof payload.settings === 'object'
    ? payload.settings
    : payload

  const normalized = normalizeKioskSettings(settingsPayload)

  await writeJsonFile(kioskSettingsPath, {
    ...normalized,
    updatedAt: nowIso(),
  })

  await appendAuditLog({
    action: 'kiosk_settings_updated',
    entityType: 'kiosk-settings',
    entityId: 'kiosk',
    message: 'Kiosk ayarları güncellendi.',
    details: {
      fields: Object.keys(settingsPayload),
    },
  })

  return sendJson(res, 200, {
    ok: true,
    settings: normalized,
  })
}

async function handleGetAuditLogs(reqUrl, res) {
  const logs = await readJsonFile(auditLogsPath, [])
  const limit = Number(reqUrl.searchParams.get('limit') || 200)

  return sendJson(res, 200, {
    ok: true,
    count: Math.min(logs.length, limit),
    logs: logs.slice(0, limit),
  })
}

async function handlePostAuditLog(req, res) {
  const payload = await readJsonBody(req)
  const entry = await appendAuditLog(payload)

  return sendJson(res, 200, {
    ok: true,
    log: entry,
  })
}

async function routeRequest(req, res) {
  if (req.method === 'OPTIONS') {
    return sendNoContent(res)
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return handleHealth(res)
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    return handleProducts(url, res)
  }

  if (req.method === 'POST' && url.pathname === '/api/products/bulk-metadata') {
    return handleBulkMetadata(req, res)
  }

  const metadataMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/metadata$/)

  if ((req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') && metadataMatch) {
    const barcode = decodeURIComponent(metadataMatch[1])
    return handleUpdateProductMetadata(barcode, req, res)
  }

  const productMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/)

  if (req.method === 'GET' && productMatch) {
    const barcode = decodeURIComponent(productMatch[1])
    return handleProductByBarcode(barcode, res)
  }

  if (req.method === 'GET' && url.pathname === '/api/kiosk-settings') {
    return handleGetKioskSettings(res)
  }

  if ((req.method === 'PUT' || req.method === 'POST' || req.method === 'PATCH') && url.pathname === '/api/kiosk-settings') {
    return handleSaveKioskSettings(req, res)
  }

  if (req.method === 'GET' && url.pathname === '/api/audit-logs') {
    return handleGetAuditLogs(url, res)
  }

  if (req.method === 'POST' && url.pathname === '/api/audit-logs') {
    return handlePostAuditLog(req, res)
  }

  return sendJson(res, 404, {
    ok: false,
    error: 'Endpoint bulunamadı.',
    path: url.pathname,
  })
}

const server = http.createServer(async (req, res) => {
  try {
    await routeRequest(req, res)
  } catch (error) {
    console.error('[database-api]', error.message)

    return sendJson(res, 500, {
      ok: false,
      error: error.message || 'Database API hatası.',
    })
  }
})

await ensureDataFiles()

server.listen(PORT, () => {
  console.log(`Ürün DB API çalışıyor: http://localhost:${PORT}  (view: ${VIEW})`)
  console.log(`Test: http://localhost:${PORT}/api/health`)
  console.log(`SQL Server: ${dbConfig.server}:${dbConfig.port} / ${dbConfig.database}`)
  console.log(`SQL encrypt: ${dbConfig.options.encrypt}`)
  console.log(`Trust certificate: ${dbConfig.options.trustServerCertificate}`)
  console.log(`Lokal data klasörü: ${dataDir}`)
})