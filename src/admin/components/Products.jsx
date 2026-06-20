import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as XLSX from 'xlsx';
import { logAdminAction } from '../utils/logger';
import { getLocalProductImagePath, getProductImageAlt } from '../../shared/productImage';
import {
  prepareProductImage,
  uploadProductImageToLocalApi,
  formatImageSize,
} from '../../shared/localImageUpload';
import {
  COLORS,
  COLOR_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  LEVELS,
  LEVEL_LABELS,
  USAGE_PURPOSES,
  USAGE_PURPOSE_LABELS,
} from '../../types/product.schema';

const checkIsActive = (p) => p.active !== false;
const checkIsSommelier = (p) => p.sommelierPick === true;

const colorLabelTr = (c) => (c && COLOR_LABELS[c] ? COLOR_LABELS[c].tr : 'Kırmızı');

function AdminProductImagePreview({ product, previewDataUrl }) {
  const [failedSrc, setFailedSrc] = useState('');
  const imageSrc = previewDataUrl || getLocalProductImagePath(product);

  if (!imageSrc || failedSrc === imageSrc) {
    return (
      <svg
        className="w-10 h-10 text-charcoal-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={getProductImageAlt(product)}
      className="h-full w-full object-contain"
      onError={() => setFailedSrc(imageSrc)}
    />
  );
}

const formatPrice = (price) => {
  const num = Number(price);
  return isNaN(num)
    ? '0,00'
    : num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const emptyForm = {
  barcode: '',
  name: '',
  brand: '',
  color: 'red',
  price: '',
  stock: '',
  block: '',
  shelf: '',
  country: 'TR',
  region: '',
  grape: '',
  shortDescription: '',
  shortDescriptionEn: '',
  tasteNotes: '',
  tasteNotesEn: '',
  foodPairing: '',
  foodPairingEn: '',
  usagePurposes: [],
  body: 'medium',
  sweetness: 'medium',
  acidity: 'medium',
  tannin: 'medium',
  active: true,
  sommelierPick: false,
  image: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState(emptyForm);
  const [processingImage, setProcessingImage] = useState(false);
  const [preparedImage, setPreparedImage] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((d) => {
        productsList.push({ id: d.id, ...d.data() });
      });
      setProducts(productsList);
    } catch (error) {
      console.error('Ürünler veritabanından çekilirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = product.name?.toLowerCase().includes(searchLower) || false;
    const barcodeMatch = product.barcode?.includes(searchTerm) || false;
    return nameMatch || barcodeMatch;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const togglePurpose = (key) => {
    setFormData((prev) => {
      const has = prev.usagePurposes.includes(key);
      return {
        ...prev,
        usagePurposes: has
          ? prev.usagePurposes.filter((k) => k !== key)
          : [...prev.usagePurposes, key],
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Resim 15MB’dan küçük olmalıdır.');
      return;
    }

    try {
      setProcessingImage(true);

      const prepared = await prepareProductImage(file, {
        maxDimension: 1200,
        targetMaxBytes: 300 * 1024,
      });

      setPreparedImage(prepared);

      // Eski Firestore base64 görsel kaydını artık kullanmıyoruz.
      setFormData((prev) => ({ ...prev, image: '' }));
    } catch (error) {
      console.error('Resim işlenirken hata oluştu:', error);
      alert(error.message || 'Resim işlenemedi. Lütfen tekrar deneyin.');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setPreparedImage(null);
    setFormData((prev) => ({ ...prev, image: '' }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setEditingProduct(null);
    setFormData(emptyForm);
    setPreparedImage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode || '',
      name: product.name || '',
      brand: product.brand || '',
      color: product.color || 'red',
      price: product.price ?? '',
      stock: product.stock ?? '',
      block: product.block || '',
      shelf: product.shelf ?? '',
      country: product.country || 'TR',
      region: product.region || '',
      grape: product.grape || '',
      shortDescription: product.shortDescription?.tr || '',
      shortDescriptionEn: product.shortDescription?.en || '',
      tasteNotes: product.tasteNotes?.tr || '',
      tasteNotesEn: product.tasteNotes?.en || '',
      foodPairing: product.foodPairing?.tr || '',
      foodPairingEn: product.foodPairing?.en || '',
      usagePurposes: Array.isArray(product.usagePurposes) ? product.usagePurposes : [],
      body: product.body || 'medium',
      sweetness: product.sweetness || 'medium',
      acidity: product.acidity || 'medium',
      tannin: product.tannin || 'medium',
      active: product.active !== false,
      sommelierPick: product.sommelierPick === true,
      image: '',
    });
    setPreparedImage(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        active: !currentStatus,
        updatedAt: new Date().toISOString(),
      });

      await logAdminAction(
        'Ürün Yönetimi',
        'GÜNCELLEME',
        `Bir şarabın durumu ${!currentStatus ? 'Aktif' : 'Pasif'} yapıldı.`,
      );

      fetchProducts();
    } catch (error) {
      console.error('Ürün durumu güncellenirken hata oluştu:', error);
      alert('İşlem sırasında bir sorun oluştu.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        brand: formData.brand || '',
        color: formData.color,
        country: formData.country,
        region: formData.region || '',
        grape: formData.grape || '',
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        block: formData.block || '',
        shelf: formData.shelf || '',
        active: formData.active,
        sommelierPick: formData.sommelierPick,
        usagePurposes: formData.usagePurposes,
        ...(preparedImage ? { imageUpdatedAt: new Date().toISOString() } : {}),
        body: formData.body,
        sweetness: formData.sweetness,
        acidity: formData.acidity,
        tannin: formData.tannin,
        shortDescription: {
          tr: formData.shortDescription || '',
          en: formData.shortDescriptionEn || '',
        },
        tasteNotes: {
          tr: formData.tasteNotes || '',
          en: formData.tasteNotesEn || '',
        },
        foodPairing: {
          tr: formData.foodPairing || '',
          en: formData.foodPairingEn || '',
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
      };

      if (!payload.barcode) {
        throw new Error('Barkod zorunludur.');
      }

      if (!payload.name) {
        throw new Error('Ürün adı zorunludur.');
      }

      if (preparedImage) {
        await uploadProductImageToLocalApi({
          barcode: payload.barcode,
          preparedImage,
        });
      }

      if (editingId) {
        await setDoc(doc(db, 'products', editingId), payload, { merge: true });

        let logDesc = `"${payload.name}" ürünü güncellendi.`;
        if (editingProduct) {
          if (Number(editingProduct.price) !== payload.price) {
            logDesc += ` Fiyat (${editingProduct.price || 0}₺ -> ${payload.price}₺) oldu.`;
          }
          if (Number(editingProduct.stock) !== payload.stock) {
            logDesc += ` Stok (${editingProduct.stock || 0} -> ${payload.stock}) oldu.`;
          }
          if (preparedImage) {
            logDesc += ' Ürün görseli güncellendi.';
          }
        }

        await logAdminAction('Ürün Yönetimi', 'GÜNCELLEME', logDesc);
      } else {
        await setDoc(
          doc(db, 'products', payload.barcode),
          {
            ...payload,
            priorityScore: 0,
            featured: false,
            createdAt: new Date().toISOString(),
          },
          { merge: true },
        );

        await logAdminAction(
          'Ürün Yönetimi',
          'EKLEME',
          `Sisteme yeni ürün eklendi: "${payload.name}"`,
        );
      }

      setIsModalOpen(false);
      setEditingId(null);
      setEditingProduct(null);
      setPreparedImage(null);
      fetchProducts();
    } catch (error) {
      console.error('Ürün kaydedilirken hata oluştu:', error);
      alert(error.message || 'Ürün kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    if (products.length === 0) {
      alert('Dışa aktarılacak ürün bulunamadı.');
      return;
    }

    const dataToExport = products.map((p) => {
      const getTr = (val) => (typeof val === 'object' ? val?.tr || '' : val || '');
      const getEn = (val) => (typeof val === 'object' ? val?.en || '' : '');
      const getLevelTr = (val) => (LEVELS.includes(val) ? LEVEL_LABELS[val]?.tr : 'Orta');

      return {
        Barkod: p.barcode || '',
        UrunAdi: p.name || '',
        Marka: p.brand || '',
        Fiyat: p.price || 0,
        Stok: p.stock || 0,
        Renk: colorLabelTr(p.color),
        Blok: p.block || '',
        Raf: p.shelf || '',
        Ulke: COUNTRY_LABELS[p.country] ? COUNTRY_LABELS[p.country].tr : p.country || '',
        Bolge: p.region || '',
        UzumTuru: p.grape || '',
        KisaAciklama_TR: getTr(p.shortDescription),
        KisaAciklama_EN: getEn(p.shortDescription),
        TadimNotlari_TR: getTr(p.tasteNotes),
        TadimNotlari_EN: getEn(p.tasteNotes),
        YemekUyumu_TR: getTr(p.foodPairing),
        YemekUyumu_EN: getEn(p.foodPairing),
        KullanimAmaci: Array.isArray(p.usagePurposes)
          ? p.usagePurposes.map((k) => USAGE_PURPOSE_LABELS[k]?.tr || k).join(', ')
          : '',
        Govde: getLevelTr(p.body),
        Tatlilik: getLevelTr(p.sweetness),
        Asidite: getLevelTr(p.acidity),
        Tanen: getLevelTr(p.tannin),
        Aktif: checkIsActive(p) ? 'Evet' : 'Hayır',
        SomelyeTavsiyesi: checkIsSommelier(p) ? 'Evet' : 'Hayır',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Saraplar');
    XLSX.writeFile(workbook, 'Ertan_Mahzen_Guncel.xlsx');

    logAdminAction(
      'Ürün Yönetimi',
      'SİSTEM',
      `Tüm envanter (${products.length} ürün) Excel'e dışa aktarıldı.`,
    );
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-charcoal-700 border-t-wine-600 rounded-full animate-spin"></div>
        <p className="text-wine-600 font-serif text-lg animate-pulse">
          Şarap listesi mahzenden getiriliyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Üst Kısım: Arama Çubuğu ve Butonlar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 bg-charcoal-800 p-2 rounded-lg border border-charcoal-700 w-full sm:w-96 shadow-inner">
          <svg
            className="w-5 h-5 text-cream-200 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Barkod veya ürün adı ile ara..."
            className="bg-transparent border-none outline-none text-cream-100 w-full placeholder-charcoal-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleExportExcel}
            className="px-6 py-3 bg-charcoal-700 hover:bg-gold-500 hover:text-ink-950 text-cream-100 font-medium rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Excel'e Aktar
          </button>

          <button
            onClick={handleAddNew}
            className="px-6 py-3 bg-wine-700 hover:bg-wine-600 text-cream-100 font-medium rounded-md transition-colors shadow-md flex justify-center items-center gap-2 whitespace-nowrap"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Şarap Listesi Tablosu */}
      <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-charcoal-700/50 text-cream-200 text-sm uppercase tracking-wider border-b border-charcoal-700">
                <th className="p-4 font-medium">Barkod</th>
                <th className="p-4 font-medium">Ürün Adı</th>
                <th className="p-4 font-medium">Renk</th>
                <th className="p-4 font-medium">Fiyat</th>
                <th className="p-4 font-medium">Stok</th>
                <th className="p-4 font-medium">Raf Konumu</th>
                <th className="p-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-charcoal-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-cream-200">
                    Sistemde aradığınız kriterlere uygun şarap bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const displayBarcode = product.barcode || '-';
                  const displayName = product.name || '-';
                  const displayColor = colorLabelTr(product.color);
                  const displayPrice = product.price ?? '0';
                  const displayStock = product.stock ?? '0';
                  const displayBlock = product.block || '';
                  const displayShelf = product.shelf ?? '';
                  const isProductActive = checkIsActive(product);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-charcoal-700/30 transition-colors ${
                        !isProductActive ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      <td className="p-4 text-cream-200 text-sm">{displayBarcode}</td>

                      <td className="p-4 font-medium text-cream-100">
                        {displayName}

                        {!isProductActive && (
                          <span className="ml-2 text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800">
                            Pasif
                          </span>
                        )}

                        {checkIsSommelier(product) && (
                          <span className="ml-2 text-xs bg-gold-900/40 text-gold-400 px-2 py-0.5 rounded border border-gold-800/50">
                            Tavsiye
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            displayColor === 'Kırmızı'
                              ? 'bg-wine-900/50 text-wine-200 border-wine-800'
                              : displayColor === 'Beyaz'
                                ? 'bg-cream-100/10 text-cream-200 border-cream-200/20'
                                : displayColor === 'Rosé'
                                  ? 'bg-pink-900/30 text-pink-300 border-pink-800/50'
                                  : displayColor === 'Köpüklü'
                                    ? 'bg-gold-900/30 text-gold-400 border-gold-800/50'
                                    : 'bg-charcoal-600 text-cream-200 border-charcoal-500'
                          }`}
                        >
                          {displayColor}
                        </span>
                      </td>

                      <td className="p-4 text-gold-400 font-medium">
                        {formatPrice(displayPrice)} ₺
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            Number(displayStock) > 10
                              ? 'bg-green-900/30 text-green-400 border-green-800/50'
                              : Number(displayStock) > 0
                                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
                                : 'bg-red-900/30 text-red-400 border-red-800/50'
                          }`}
                        >
                          {displayStock} Adet
                        </span>
                      </td>

                      <td className="p-4 text-cream-200 text-sm">
                        {displayBlock ? `${displayBlock} Blok ` : ''}
                        {displayShelf !== '' ? `${displayShelf}. Raf` : '-'}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-gold-500 hover:text-gold-400 font-medium text-sm mr-4 transition-colors"
                        >
                          Düzenle
                        </button>

                        <button
                          onClick={() => handleToggleActive(product.id, isProductActive)}
                          className={`${
                            isProductActive
                              ? 'text-red-500 hover:text-red-400'
                              : 'text-green-500 hover:text-green-400'
                          } font-medium text-sm transition-colors`}
                        >
                          {isProductActive ? 'Pasife Al' : 'Aktif Et'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAYLI ÜRÜN EKLEME / DÜZENLEME PENCERESİ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-charcoal-700 flex justify-between items-center bg-charcoal-800/50 shrink-0">
              <h3 className="text-2xl font-serif text-gold-500">
                {editingId ? 'Şarabı Düzenle' : 'Detaylı Şarap Ekle'}
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-cream-200 hover:text-red-400 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-8">
                {/* BÖLÜM 1: Temel Bilgiler */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Temel Bilgiler
                  </h4>

                  {/* Ürün görseli */}
                  <div className="mb-6 flex items-center gap-5">
                    <div className="h-28 w-28 flex-none overflow-hidden rounded-lg border border-charcoal-600 bg-ink-950 flex items-center justify-center">
                      <AdminProductImagePreview
                        product={formData}
                        previewDataUrl={preparedImage?.dataUrl}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-cream-200">
                        Ürün Görseli
                      </label>

                      <div className="flex items-center gap-3">
                        <label
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-gold-500/50 bg-wine-800/40 px-4 py-2 text-sm font-medium text-cream-100 transition hover:bg-wine-800/70 ${
                            processingImage ? 'pointer-events-none opacity-60' : ''
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12"
                            />
                          </svg>

                          {preparedImage ? 'Değiştir' : 'Resim Seç'}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleImageUpload}
                            disabled={processingImage}
                            className="hidden"
                          />
                        </label>

                        {preparedImage && !processingImage && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-sm text-cream-200/60 transition hover:text-red-400"
                          >
                            Seçimi Temizle
                          </button>
                        )}
                      </div>

                      {processingImage ? (
                        <p className="flex items-center gap-2 text-xs text-cream-200/60">
                          <span className="inline-block w-3 h-3 border-2 border-charcoal-600 border-t-gold-500 rounded-full animate-spin"></span>
                          Resim WebP formatına hazırlanıyor…
                        </p>
                      ) : preparedImage ? (
                        <p className="text-xs text-emerald-400">
                          WebP hazır · {preparedImage.width}×{preparedImage.height}px ·{' '}
                          {formatImageSize(preparedImage.size)}
                        </p>
                      ) : formData.barcode ? (
                        <p className="text-xs text-cream-200/50">
                          Kayıt sırasında dosya adı: {formData.barcode}.webp
                        </p>
                      ) : (
                        <p className="text-xs text-cream-200/50">
                          PNG, JPG veya WEBP seçebilirsiniz. Kayıtta barkod.webp olarak saklanır.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Barkod *</label>
                      <input
                        required
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        disabled={Boolean(editingId)}
                        title={editingId ? 'Barkod mevcut üründe değiştirilemez.' : ''}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Örn: 8691234567890"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-cream-200">Ürün Adı *</label>
                      <input
                        required
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Ertan Reserve Cabernet"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Marka</label>
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Ertan Bağları"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Fiyat (₺) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: 750.50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Stok Miktarı *</label>
                      <input
                        required
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: 24"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Şarap Rengi *</label>
                      <select
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {COLORS.map((c) => (
                          <option key={c} value={c}>
                            {COLOR_LABELS[c].tr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 2: Menşei ve Üzüm */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Menşei ve Üzüm
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Ülke</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {COUNTRY_LABELS[c].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Bölge</label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Ege, Bordeaux"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Üzüm Türü</label>
                      <input
                        type="text"
                        name="grape"
                        value={formData.grape}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Cabernet Sauvignon"
                      />
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 3: Şarap Karakteri */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Şarap Karakteri (Tat Profili)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Gövde</label>
                      <select
                        name="body"
                        value={formData.body}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABELS[l].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tatlılık</label>
                      <select
                        name="sweetness"
                        value={formData.sweetness}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABELS[l].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Asidite</label>
                      <select
                        name="acidity"
                        value={formData.acidity}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABELS[l].tr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tanen</label>
                      <select
                        name="tannin"
                        value={formData.tannin}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABELS[l].tr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 4: Tadım Notları ve Kullanım */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Tadım Notları ve Kullanım
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kısa Açıklama (TR)
                      </label>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Türkçe metin..."
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kısa Açıklama (EN)
                      </label>
                      <textarea
                        name="shortDescriptionEn"
                        value={formData.shortDescriptionEn}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="English text..."
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tat Notları (TR)</label>
                      <input
                        type="text"
                        name="tasteNotes"
                        value={formData.tasteNotes}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Kiraz, Vanilya"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Tat Notları (EN)</label>
                      <input
                        type="text"
                        name="tasteNotesEn"
                        value={formData.tasteNotesEn}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="e.g. Cherry, Vanilla"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Yemek Uyumu (TR)</label>
                      <input
                        type="text"
                        name="foodPairing"
                        value={formData.foodPairing}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: Izgara etler"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Yemek Uyumu (EN)</label>
                      <input
                        type="text"
                        name="foodPairingEn"
                        value={formData.foodPairingEn}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="e.g. Grilled meats"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 mt-2">
                      <label className="text-sm font-medium text-cream-200">
                        Kullanım Amaçları (birden fazla seçebilirsiniz)
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {USAGE_PURPOSES.map((key) => {
                          const selected = formData.usagePurposes.includes(key);

                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => togglePurpose(key)}
                              className={`px-3 py-2 rounded-md text-sm border text-left transition-colors ${
                                selected
                                  ? 'bg-wine-700 border-gold-500 text-cream-100'
                                  : 'bg-ink-950 border-charcoal-600 text-cream-200 hover:border-charcoal-500'
                              }`}
                            >
                              {USAGE_PURPOSE_LABELS[key].tr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BÖLÜM 5: Konum ve Ayarlar */}
                <div>
                  <h4 className="text-lg font-serif text-cream-100 border-b border-charcoal-700 pb-2 mb-4">
                    Konum ve Ayarlar
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">
                        Raf Konumu - Blok
                      </label>
                      <input
                        type="text"
                        name="block"
                        value={formData.block}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: A"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-cream-200">Raf Numarası</label>
                      <input
                        type="text"
                        name="shelf"
                        value={formData.shelf}
                        onChange={handleInputChange}
                        className="w-full bg-ink-950 border border-charcoal-600 rounded-md p-3 text-cream-100 focus:outline-none focus:border-gold-500 transition-colors"
                        placeholder="Örn: 6"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 mt-6 p-4 bg-ink-950 rounded-lg border border-charcoal-700">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          name="sommelierPick"
                          checked={formData.sommelierPick}
                          onChange={handleInputChange}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 bg-charcoal-800 border-2 border-charcoal-500 rounded peer-checked:bg-gold-500 peer-checked:border-gold-500 transition-colors"></div>
                        <svg
                          className="absolute w-4 h-4 text-ink-950 opacity-0 peer-checked:opacity-100 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      <div>
                        <p className="text-cream-100 font-medium">Somelye'nin Tavsiyesi</p>
                        <p className="text-xs text-cream-200 opacity-70">
                          Bu ürünü ekranda özel bir etiketle öne çıkar.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          name="active"
                          checked={formData.active}
                          onChange={handleInputChange}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 bg-charcoal-800 border-2 border-charcoal-500 rounded peer-checked:bg-wine-600 peer-checked:border-wine-600 transition-colors"></div>
                        <svg
                          className="absolute w-4 h-4 text-cream-100 opacity-0 peer-checked:opacity-100 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      <div>
                        <p className="text-cream-100 font-medium">Ürün Aktif</p>
                        <p className="text-xs text-cream-200 opacity-70">
                          İşareti kaldırırsanız kiosk ekranında görünmez.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-charcoal-700 bg-charcoal-800/50 flex justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-charcoal-700 hover:bg-charcoal-600 text-cream-100 font-medium rounded-md transition-colors"
              >
                İptal Et
              </button>

              <button
                type="submit"
                form="addProductForm"
                disabled={isSubmitting || processingImage}
                className="px-8 py-2.5 bg-gold-500 hover:bg-gold-400 text-ink-950 font-bold rounded-md transition-colors shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}