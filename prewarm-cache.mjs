#!/usr/bin/env node
/**
 * SQL ÜRÜN CACHE'İNİ ÖNDEN OLUŞTURUR.
 *
 * Amaç: Kiosk ilk kez açıldığında SQL kopuksa ürünleri yine de gösterebilmek.
 * database-api.mjs zaten her başarılı çekişte data/.products-cache.json yazar;
 * bu betik o cache'i, go-live ÖNCESİNDE (SQL açıkken) bir kez elle üretmeni sağlar.
 *
 * Kullanım (proje kökünde, SQL erişilebilirken):
 *   node prewarm-cache.mjs
 *
 * server/.env içindeki DB ayarlarını kullanır (database-api.mjs ile birebir aynı).
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import sql from 'mssql'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const VIEW = process.env.DB_VIEW || 'vw_digital_sommelier_products'
const cachePath = path.join(__dirname, 'data', '.products-cache.json')

function envBoolean(v, dflt) {
  if (v === undefined || v === null || v === '') return dflt
  return ['1', 'true', 'yes', 'evet', 'on'].includes(String(v).toLowerCase())
}

function safeSqlIdentifier(name) {
  if (!/^[A-Za-z0-9_.\[\]]+$/.test(String(name))) {
    throw new Error('Güvensiz view adı: ' + name)
  }
  return name
}

const dbConfig = {
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
}

async function main() {
  console.log(`SQL'e bağlanılıyor: ${dbConfig.server}:${dbConfig.port}/${dbConfig.database} ...`)
  let pool
  try {
    pool = await sql.connect(dbConfig)
  } catch (e) {
    console.error('❌ SQL bağlantısı kurulamadı:', e.message)
    console.error('   server/.env doğru mu ve SQL erişilebilir mi kontrol et.')
    process.exit(1)
  }

  const safeView = safeSqlIdentifier(VIEW)
  let rows
  try {
    const result = await pool.request().query(`
      SELECT Barcode, ProductName, Brand, Price, Stock, Category, IsActive
      FROM ${safeView}
    `)
    rows = result.recordset || []
  } catch (e) {
    console.error('❌ Sorgu başarısız:', e.message)
    await pool.close().catch(() => {})
    process.exit(1)
  }

  await fs.mkdir(path.dirname(cachePath), { recursive: true })
  await fs.writeFile(cachePath, JSON.stringify(rows), 'utf8')
  await pool.close().catch(() => {})

  const active = rows.filter((r) => String(r.IsActive).toUpperCase() === 'AKTIF').length
  const inStock = rows.filter((r) => Number(r.Stock) > 0).length
  console.log(`✓ Cache yazıldı: data/.products-cache.json`)
  console.log(`  Toplam: ${rows.length} | Aktif: ${active} | Stokta: ${inStock}`)
  console.log('Artık ilk açılışta SQL kopuk olsa bile kiosk bu listeyi gösterebilir.')
}

main()
