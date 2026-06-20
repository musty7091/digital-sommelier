export function normalizeBarcode(barcode) {
  return String(barcode || '')
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, '')
}

export function getLocalProductImagePath(product) {
  const barcode = normalizeBarcode(product?.barcode)

  if (!barcode) {
    return ''
  }

  return `/product-images/${barcode}.webp`
}

export function getProductImageAlt(product) {
  return product?.name || product?.barcode || 'Ürün görseli'
}