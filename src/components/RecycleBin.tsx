import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Package, Users, FileText, Search, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal, AlertModal } from './ui/Modal';

type DeletedType = 'products' | 'customers' | 'invoices';

export default function RecycleBin() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DeletedType>('customers');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string | number, type: 'restore' | 'permanent_delete' } | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const data = await api[activeTab].list(true);
      setItems(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      setLoading(false);
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await api[activeTab].restore(id);
      setAlert({ type: 'success', title: t('success'), message: 'Item restored successfully' });
      fetchDeletedItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to restore item' });
    }
  };

  const handlePermanentDelete = async (id: string | number) => {
    try {
      await api[activeTab].delete(id, true);
      setAlert({ type: 'success', title: t('success'), message: 'Item permanently deleted' });
      fetchDeletedItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to delete item permanently' });
    }
  };

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    if (activeTab === 'products') return item.name_en?.toLowerCase().includes(search) || item.name_gu?.toLowerCase().includes(search);
    if (activeTab === 'customers') return item.name?.toLowerCase().includes(search) || item.phone?.includes(search);
    if (activeTab === 'invoices') return item.customer_name?.toLowerCase().includes(search) || item.id.toString().includes(search);
    return false;
  });

  return (
    <div className="space-y-8">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type}
      />
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'restore') handleRestore(confirmAction.id);
          else handlePermanentDelete(confirmAction.id);
        }}
        title={confirmAction?.type === 'restore' ? 'Restore Item' : 'Permanent Delete'}
        message={confirmAction?.type === 'restore' 
          ? 'Are you sure you want to restore this item? It will be visible in the main lists again.' 
          : 'WARNING: This action is permanent and cannot be undone. All data for this item will be lost forever.'}
        confirmText={confirmAction?.type === 'restore' ? 'Restore' : 'Delete Permanently'}
        type={confirmAction?.type === 'restore' ? 'info' : 'danger'}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Recycle Bin</h2>
          <p className="text-sm text-black/40 font-medium">Manage and restore deleted items</p>
        </div>
        <div className="flex bg-black/5 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('customers')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'customers' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black")}
          >
            Customers
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'products' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black")}
          >
            Products
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'invoices' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black")}
          >
            Invoices
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-black/5 overflow-hidden">
        <div className="p-6 border-b border-black/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
            <input 
              type="text" 
              placeholder="Search deleted items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                <th className="px-8 py-4">Item Details</th>
                <th className="px-8 py-4">Deleted At</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6321] mx-auto"></div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-black/40">
                    No deleted items found in this category.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-black/40">
                          {activeTab === 'products' ? <Package size={20} /> : activeTab === 'customers' ? <Users size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                          <div className="font-bold">
                            {activeTab === 'products' ? item.name_en : activeTab === 'customers' ? item.name : `Invoice #${item.id.toString().slice(-4)}`}
                          </div>
                          <div className="text-xs text-black/40">
                            {activeTab === 'products' ? item.name_gu : activeTab === 'customers' ? item.phone : item.customer_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-black/40">
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setConfirmAction({ id: item.id, type: 'restore' })}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Restore"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button 
                          onClick={() => setConfirmAction({ id: item.id, type: 'permanent_delete' })}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Permanently"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4">
        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
        <div>
          <h4 className="font-bold text-amber-900 mb-1">Recycle Bin Policy</h4>
          <p className="text-sm text-amber-800/70 leading-relaxed">
            Items in the recycle bin are hidden from the main application but still occupy database space. 
            Restoring a customer will also restore their associated invoices and payments that were deleted with them.
          </p>
        </div>
      </div>
    </div>
  );
}
