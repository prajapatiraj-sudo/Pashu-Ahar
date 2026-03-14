import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Package, Search } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { cn } from '../lib/utils';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name_en: '', name_gu: '', unit: '', price: 0, purchase_price: 0, stock_quantity: 0 });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name_en'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({
        id: doc.id as any,
        ...doc.data()
      })) as Product[]);
    });
    return unsubscribe;
  }, []);

  const handleEdit = (product: Product) => {
    setIsEditing(product.id);
    setEditForm(product);
  };

  const handleSave = async (id: string | number) => {
    try {
      const productRef = doc(db, 'products', id.toString());
      await updateDoc(productRef, editForm);
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewProduct({ name_en: '', name_gu: '', unit: '', price: 0, purchase_price: 0, stock_quantity: 0 });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name_gu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder="Search products (English or Gujarati)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/5 text-[11px] uppercase tracking-widest text-black/40 font-bold">
              <th className="px-8 py-4">Product Name</th>
              <th className="px-8 py-4">Gujarati Name</th>
              <th className="px-8 py-4">Unit</th>
              <th className="px-8 py-4">Purchase (₹)</th>
              <th className="px-8 py-4">Selling (₹)</th>
              <th className="px-8 py-4">Stock</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-black/[0.02] transition-colors group">
                <td className="px-8 py-4">
                  {isEditing === product.id ? (
                    <input 
                      className="w-full p-2 border rounded-lg"
                      value={editForm.name_en}
                      onChange={e => setEditForm({...editForm, name_en: e.target.value})}
                    />
                  ) : (
                    <div className="font-bold">{product.name_en}</div>
                  )}
                </td>
                <td className="px-8 py-4 font-gujarati text-lg">
                  {isEditing === product.id ? (
                    <input 
                      className="w-full p-2 border rounded-lg"
                      value={editForm.name_gu}
                      onChange={e => setEditForm({...editForm, name_gu: e.target.value})}
                    />
                  ) : (
                    product.name_gu
                  )}
                </td>
                <td className="px-8 py-4 text-black/60">
                  {isEditing === product.id ? (
                    <input 
                      className="w-24 p-2 border rounded-lg"
                      value={editForm.unit}
                      onChange={e => setEditForm({...editForm, unit: e.target.value})}
                    />
                  ) : (
                    product.unit
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
                    product.stock_quantity < 10 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <Package size={14} />
                    {product.stock_quantity} {product.unit}s
                  </div>
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
                    <button 
                      onClick={() => handleEdit(product)}
                      className="p-2 text-black/20 hover:text-[#FF6321] hover:bg-[#FF6321]/5 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
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
              <h2 className="text-2xl font-serif italic font-bold">New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">English Name</label>
                <input 
                  required
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newProduct.name_en}
                  onChange={e => setNewProduct({...newProduct, name_en: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Gujarati Name</label>
                <input 
                  required
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newProduct.name_gu}
                  onChange={e => setNewProduct({...newProduct, name_gu: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Purchase Price (₹)</label>
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Unit</label>
                  <input 
                    required
                    placeholder="e.g. Box, Kg"
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.unit}
                    onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Initial Stock</label>
                  <input 
                    required
                    type="number"
                    className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                    value={newProduct.stock_quantity}
                    onChange={e => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#FF6321] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#E5591D] transition-all">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
