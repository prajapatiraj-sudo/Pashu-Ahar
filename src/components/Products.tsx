import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Package, Search, Download, Upload } from 'lucide-react';
import { api } from '../lib/api';
import type { Product } from '../types';
import { cn } from '../lib/utils';
import { ConfirmModal, AlertModal } from './ui/Modal';
import { downloadSampleExcel, parseExcelFile } from '../lib/excel';

import { useLanguage } from '../contexts/LanguageContext';

export default function Products({ userRole }: { userRole?: string }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name_en: '', name_gu: '', unit: '', price: 0, purchase_price: 0, stock_quantity: 0, low_stock_threshold: 10 });
  
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.products.list();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setIsEditing(product.id);
    setEditForm({
      ...product,
      low_stock_threshold: product.low_stock_threshold || 10
    });
  };

  const handleSave = async (id: string | number) => {
    try {
      await api.products.update(id, editForm);
      setIsEditing(null);
      fetchProducts();
      setAlert({ type: 'success', title: t('success'), message: 'Product updated successfully' });
    } catch (error) {
      console.error('Error updating product:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to update product. Please try again.' });
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.products.delete(id);
      setConfirmDelete(null);
      fetchProducts();
      setAlert({ type: 'success', title: t('success'), message: 'Product moved to recycle bin' });
    } catch (error) {
      console.error('Error deleting product:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to delete product. Please try again.' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.products.create(newProduct);
      setShowAddModal(false);
      setNewProduct({ name_en: '', name_gu: '', unit: '', price: 0, purchase_price: 0, stock_quantity: 0, low_stock_threshold: 10 });
      fetchProducts();
      setAlert({ type: 'success', title: t('success'), message: 'Product added successfully' });
    } catch (error) {
      console.error('Error adding product:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to add product. Please try again.' });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name_gu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const seedProducts = async () => {
    const sampleProducts = [
      { name_en: 'Cotton Seed Cake', name_gu: 'કપાસિયા ખોળ', unit: 'Bag', price: 1850, purchase_price: 1750, stock_quantity: 50 },
      { name_en: 'Maize Churi', name_gu: 'મકાઈ ચુરી', unit: 'Bag', price: 1250, purchase_price: 1150, stock_quantity: 40 },
      { name_en: 'Wheat Bran', name_gu: 'ઘઉંનું ભૂસું', unit: 'Bag', price: 850, purchase_price: 780, stock_quantity: 60 },
      { name_en: 'Rice Bran', name_gu: 'ડાંગરનું ભૂસું', unit: 'Bag', price: 950, purchase_price: 880, stock_quantity: 30 },
      { name_en: 'Mustard Cake', name_gu: 'રાયડો ખોળ', unit: 'Bag', price: 1450, purchase_price: 1350, stock_quantity: 25 },
      { name_en: 'Groundnut Cake', name_gu: 'મગફળી ખોળ', unit: 'Bag', price: 2100, purchase_price: 1950, stock_quantity: 20 },
      { name_en: 'Mineral Mixture', name_gu: 'મિનરલ મિશ્રણ', unit: 'Kg', price: 120, purchase_price: 95, stock_quantity: 100 },
      { name_en: 'Calcium Liquid', name_gu: 'કેલ્શિયમ લિક્વિડ', unit: 'Litre', price: 250, purchase_price: 190, stock_quantity: 50 },
    ];

    try {
      for (const p of sampleProducts) {
        await api.products.create(p);
      }
      fetchProducts();
      setAlert({ type: 'success', title: t('success'), message: 'Sample products added successfully!' });
    } catch (error) {
      console.error('Error seeding products:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to seed products.' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          // Map columns and handle potential variations in naming
          const nameEn = row['Product Name (EN)'] || row['Name'] || row['Product'] || '';
          const nameGu = row['Product Name (GU)'] || row['Name Gujarati'] || '';
          
          if (!nameEn) {
            console.warn('Skipping row due to missing product name:', row);
            errorCount++;
            continue;
          }

          const product = {
            name_en: nameEn,
            name_gu: nameGu,
            unit: row['Unit'] || 'Bag',
            purchase_price: parseFloat(row['Purchase Price']) || parseFloat(row['Cost']) || 0,
            price: parseFloat(row['Selling Price']) || parseFloat(row['Rate']) || 0,
            stock_quantity: parseInt(row['Stock Quantity']) || parseInt(row['Stock']) || 0,
            low_stock_threshold: parseInt(row['Alert Threshold']) || parseInt(row['Threshold']) || 10
          };
          
          await api.products.create(product);
          successCount++;
        } catch (rowError) {
          console.error('Error importing row:', row, rowError);
          errorCount++;
        }
      }
      
      fetchProducts();
      if (errorCount === 0) {
        setAlert({ type: 'success', title: t('success'), message: `Successfully imported ${successCount} products!` });
      } else {
        setAlert({ 
          type: 'warning', 
          title: 'Import Partial', 
          message: `Imported ${successCount} products. Failed to import ${errorCount} rows. Check console for details.` 
        });
      }
    } catch (error) {
      console.error('Error importing products:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to import products. Please ensure you are using the correct Excel format.' });
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type}
      />
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 gap-4 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
            <input 
              type="text" 
              placeholder={t('search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all"
            />
          </div>
          {products.length === 0 && (
            <button 
              onClick={seedProducts}
              className="flex items-center justify-center gap-2 bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-600 transition-all whitespace-nowrap"
            >
              Seed Sample Items
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => downloadSampleExcel('products')}
            className="flex items-center justify-center gap-2 bg-white border border-black/5 text-black/60 px-4 py-3 rounded-2xl font-bold hover:bg-black/5 transition-all"
            title="Download Sample Excel"
          >
            <Download size={20} />
            Sample
          </button>
          <label className="flex items-center justify-center gap-2 bg-white border border-black/5 text-black/60 px-4 py-3 rounded-2xl font-bold hover:bg-black/5 transition-all cursor-pointer">
            <Upload size={20} />
            Import
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all"
          >
            <Plus size={20} />
            {t('addProduct')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/5 text-[11px] uppercase tracking-widest text-black/40 font-bold">
              <th className="px-8 py-4">{t('product')}</th>
              <th className="px-8 py-4">Unit Price (₹)</th>
              <th className="px-8 py-4">Selling Price (₹)</th>
              <th className="px-8 py-4">{t('stock')}</th>
              <th className="px-8 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-black/[0.02] transition-colors group">
                <td className="px-8 py-4">
                  {isEditing === product.id ? (
                    <div className="space-y-2">
                      <input 
                        className="w-full p-2 border rounded-lg"
                        placeholder="English Name"
                        value={editForm.name_en}
                        onChange={e => setEditForm({...editForm, name_en: e.target.value})}
                      />
                      <input 
                        className="w-full p-2 border rounded-lg font-gujarati"
                        placeholder="Gujarati Name"
                        value={editForm.name_gu}
                        onChange={e => setEditForm({...editForm, name_gu: e.target.value})}
                      />
                      <input 
                        className="w-full p-2 border rounded-lg"
                        placeholder="Unit (e.g. Bag)"
                        value={editForm.unit}
                        onChange={e => setEditForm({...editForm, unit: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold">{product.name_en}</div>
                      <div className="font-gujarati text-sm text-[#FF6321]">{product.name_gu}</div>
                      <div className="text-[10px] text-black/40 uppercase tracking-widest mt-1">{product.unit}</div>
                    </div>
                  )}
                </td>
                <td className="px-8 py-4 font-mono">
                  {isEditing === product.id ? (
                    <input 
                      type="number"
                      className="w-24 p-2 border rounded-lg"
                      value={editForm.purchase_price === undefined || Number.isNaN(editForm.purchase_price) ? '' : editForm.purchase_price}
                      onChange={e => setEditForm({...editForm, purchase_price: e.target.value === '' ? NaN : parseFloat(e.target.value)})}
                    />
                  ) : (
                    `₹${product.purchase_price || 0}`
                  )}
                </td>
                <td className="px-8 py-4 font-mono font-bold">
                  {isEditing === product.id ? (
                    <input 
                      type="number"
                      className="w-24 p-2 border rounded-lg"
                      value={editForm.price === undefined || Number.isNaN(editForm.price) ? '' : editForm.price}
                      onChange={e => setEditForm({...editForm, price: e.target.value === '' ? NaN : parseFloat(e.target.value)})}
                    />
                  ) : (
                    `₹${product.price}`
                  )}
                </td>
                <td className="px-8 py-4">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                    product.stock_quantity < (product.low_stock_threshold || 10) ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <Package size={14} />
                    {product.stock_quantity < (product.low_stock_threshold || 10) ? "Low Stock: " : "Stock: "} {product.stock_quantity} {product.unit}
                  </div>
                  {isEditing === product.id && isAdmin && (
                    <div className="mt-2">
                      <label className="text-[10px] uppercase font-bold text-black/40">Alert Threshold</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded-lg mt-1"
                        value={editForm.low_stock_threshold}
                        onChange={e => setEditForm({...editForm, low_stock_threshold: parseInt(e.target.value)})}
                      />
                    </div>
                  )}
                </td>
                <td className="px-8 py-4 text-right">
                  {isEditing === product.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSave(product.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                        <Save size={18} />
                      </button>
                      <button onClick={() => setIsEditing(null)} className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 text-black/20 hover:text-[#FF6321] hover:bg-[#FF6321]/5 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(product.id)}
                        className="p-2 text-black/20 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif italic font-bold">{t('addProduct')}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Product Name (EN)</label>
                  <input 
                    required
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.name_en}
                    onChange={e => setNewProduct({...newProduct, name_en: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Product Name (GU)</label>
                  <input 
                    required
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321] font-gujarati"
                    value={newProduct.name_gu}
                    onChange={e => setNewProduct({...newProduct, name_gu: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Unit Price (₹)</label>
                  <input 
                    required
                    type="number"
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.purchase_price}
                    onChange={e => setNewProduct({...newProduct, purchase_price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Selling Price (₹)</label>
                  <input 
                    required
                    type="number"
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('stock')}</label>
                  <input 
                    required
                    type="number"
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.stock_quantity}
                    onChange={e => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value)})}
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Alert Threshold</label>
                    <input 
                      required
                      type="number"
                      className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                      value={newProduct.low_stock_threshold}
                      onChange={e => setNewProduct({...newProduct, low_stock_threshold: parseInt(e.target.value)})}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('unit')}</label>
                  <input 
                    required
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.unit}
                    onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#FF6321] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#E5591D] transition-all">
                {t('save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
