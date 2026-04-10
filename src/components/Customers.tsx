import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, MapPin, CreditCard, ChevronRight, X, Eye, Download, Upload, ChevronLeft, MoreVertical, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react';
import CustomerLedger from './CustomerLedger';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../lib/api';
import type { Customer } from '../types';
import { cn } from '../lib/utils';
import { ConfirmModal, AlertModal } from './ui/Modal';
import { downloadSampleExcel, parseExcelFile } from '../lib/excel';
import { useLanguage } from '../contexts/LanguageContext';

const PAGE_SIZE = 50;

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', village: '' });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewLedger, setViewLedger] = useState<Customer | null>(null);
  
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.customers.list({
        search: searchTerm,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy,
        sortOrder
      });
      setCustomers(response.customers);
      setTotal(response.total);
      setTotalOutstanding(response.totalOutstanding);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(0);
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.customers.update(editingCustomer.id, newCustomer);
        setAlert({ type: 'success', title: t('success'), message: 'Customer updated successfully' });
      } else {
        await api.customers.create(newCustomer);
        setAlert({ type: 'success', title: t('success'), message: 'Customer added successfully' });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      setNewCustomer({ name: '', phone: '', address: '', village: '' });
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setAlert({ 
        type: 'error', 
        title: t('error'), 
        message: error.message || 'Failed to save customer. Please try again.' 
      });
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.customers.delete(id);
      setConfirmDelete(null);
      fetchCustomers();
      setAlert({ type: 'success', title: t('success'), message: 'Customer moved to recycle bin' });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      setAlert({ 
        type: 'error', 
        title: t('error'), 
        message: error.message || 'Failed to delete customer.' 
      });
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
          const name = row['Name'] || row['Customer Name'] || row['Customer'] || '';
          if (!name) {
            errorCount++;
            continue;
          }

          const customer = {
            name: name,
            phone: row['Phone']?.toString() || row['Mobile']?.toString() || row['Contact']?.toString() || '',
            address: row['Address'] || '',
            village: row['Village'] || ''
          };
          await api.customers.create(customer);
          successCount++;
        } catch (rowError) {
          errorCount++;
        }
      }
      
      fetchCustomers();
      if (errorCount === 0) {
        setAlert({ type: 'success', title: t('success'), message: `Successfully imported ${successCount} customers!` });
      } else {
        setAlert({ 
          type: 'warning', 
          title: 'Import Partial', 
          message: `Imported ${successCount} customers. Failed to import ${errorCount} rows.` 
        });
      }
    } catch (error) {
      console.error('Error importing customers:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to import customers.' });
    }
    e.target.value = '';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type === 'warning' ? 'error' : alert?.type}
      />
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will NOT delete their invoices or payments."
        confirmText="Delete"
        type="danger"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-serif italic font-bold flex items-center gap-3">
            <Users className="text-[#FF6321]" />
            {t('customers')}
          </h2>
          <div className="flex items-center gap-4 text-xs font-medium text-black/40">
            <span>Total: <span className="text-black font-bold">{total.toLocaleString()}</span></span>
            <span>Outstanding: <span className="text-rose-600 font-bold">₹{totalOutstanding.toLocaleString()}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => downloadSampleExcel('customers')}
            className="flex items-center justify-center gap-2 bg-white border border-black/5 text-black/60 px-4 py-3 rounded-2xl font-bold hover:bg-black/5 transition-all"
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
            onClick={() => {
              setEditingCustomer(null);
              setNewCustomer({ name: '', phone: '', address: '', village: '' });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all"
          >
            <Plus size={20} />
            {t('addCustomer')}
          </button>
        </div>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
        <input 
          type="text" 
          placeholder={t('search') + "..."}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5">
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40 cursor-pointer hover:text-black transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Customer Name
                    {sortBy === 'name' ? (sortOrder === 'ASC' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Village / Address</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Phone</th>
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40 text-right cursor-pointer hover:text-black transition-colors"
                  onClick={() => toggleSort('outstanding')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Outstanding
                    {sortBy === 'outstanding' ? (sortOrder === 'ASC' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-black/40 italic">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-black/40 italic">No customers found</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-black/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center text-xs font-bold text-black/40 group-hover:bg-[#FF6321] group-hover:text-white transition-all">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-black/60">{customer.village || 'N/A'}</span>
                        <span className="text-[10px] text-black/30 truncate max-w-[200px]">{customer.address || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-black/60">{customer.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-sm font-bold px-2 py-1 rounded-lg",
                        customer.total_outstanding > 0 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50"
                      )}>
                        ₹{customer.total_outstanding.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewLedger(customer)}
                          className="p-2 text-black/20 hover:text-[#FF6321] hover:bg-[#FF6321]/5 rounded-xl transition-all"
                          title="View Ledger"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCustomer(customer);
                            setNewCustomer({
                              name: customer.name,
                              phone: customer.phone || '',
                              address: customer.address || '',
                              village: customer.village || ''
                            });
                            setShowAddModal(true);
                          }}
                          className="p-2 text-black/20 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(customer.id)}
                          className="p-2 text-black/20 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-black/5 flex items-center justify-between border-t border-black/5">
            <div className="text-xs text-black/40">
              Showing <span className="font-bold text-black">{page * PAGE_SIZE + 1}</span> to <span className="font-bold text-black">{Math.min((page + 1) * PAGE_SIZE, total)}</span> of <span className="font-bold text-black">{total.toLocaleString()}</span> customers
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-xl bg-white border border-black/5 disabled:opacity-30 hover:bg-black/5 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = 0;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else {
                    if (page < 3) pageNum = i;
                    else if (page > totalPages - 3) pageNum = totalPages - 5 + i;
                    else pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                        page === pageNum ? "bg-[#FF6321] text-white shadow-lg shadow-[#FF6321]/20" : "bg-white border border-black/5 hover:bg-black/5"
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button 
                disabled={page === totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-xl bg-white border border-black/5 disabled:opacity-30 hover:bg-black/5 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif italic font-bold">{editingCustomer ? 'Edit Customer' : t('addCustomer')}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('customer')}</label>
                <input 
                  required
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('phone')}</label>
                <input 
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('village')}</label>
                <input 
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newCustomer.village}
                  onChange={e => setNewCustomer({...newCustomer, village: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('address')}</label>
                <textarea 
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  rows={3}
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-[#FF6321] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#E5591D] transition-all">
                {editingCustomer ? 'Update Customer' : t('save')}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {viewLedger && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 bg-black text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-serif italic font-bold">Customer Ledger</h3>
                  <p className="text-white/40 text-sm">Detailed history for {viewLedger.name}</p>
                </div>
                <button onClick={() => setViewLedger(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <CustomerLedger customer={viewLedger} onClose={() => setViewLedger(null)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
