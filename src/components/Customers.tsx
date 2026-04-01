import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, MapPin, CreditCard, ChevronRight, X, Eye, Download, Upload } from 'lucide-react';
import CustomerLedger from './CustomerLedger';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../lib/api';
import type { Customer } from '../types';
import { cn } from '../lib/utils';
import { ConfirmModal, AlertModal } from './ui/Modal';
import { downloadSampleExcel, parseExcelFile } from '../lib/excel';

import { useLanguage } from '../contexts/LanguageContext';

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', village: '' });
  const [viewLedger, setViewLedger] = useState<Customer | null>(null);
  
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await api.customers.list();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.customers.create(newCustomer);
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', address: '', village: '' });
      fetchCustomers();
      setAlert({ type: 'success', title: t('success'), message: 'Customer added successfully' });
    } catch (error) {
      console.error('Error adding customer:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to add customer. Please try again.' });
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.customers.delete(id);
      setConfirmDelete(null);
      fetchCustomers();
      setAlert({ type: 'success', title: t('success'), message: 'Customer and related data moved to recycle bin' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to delete customer. Please try again.' });
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.village && c.village.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      for (const row of data) {
        const customer = {
          name: row['Name'] || '',
          phone: row['Phone']?.toString() || '',
          address: row['Address'] || '',
          village: row['Village'] || ''
        };
        await api.customers.create(customer);
      }
      fetchCustomers();
      setAlert({ type: 'success', title: t('success'), message: 'Customers imported successfully!' });
    } catch (error) {
      console.error('Error importing customers:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to import customers. Check file format.' });
    }
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
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will NOT delete their invoices or payments."
        confirmText="Delete"
        type="danger"
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder={t('search') + "..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => downloadSampleExcel('customers')}
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
            {t('addCustomer')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center text-xl font-bold text-black/40">
                {customer.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  customer.total_outstanding > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {t('outstanding')}: ₹{customer.total_outstanding.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewLedger(customer);
                    }}
                    className="p-2 text-black/20 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="View Ledger"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(customer.id);
                    }}
                    className="p-2 text-black/20 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4 group-hover:text-[#FF6321] transition-colors">{customer.name}</h3>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-sm text-black/60">
                <Phone size={16} className="text-black/30" />
                {customer.phone || 'No phone'}
              </div>
              <div className="flex items-center gap-3 text-sm text-black/60">
                <MapPin size={16} className="text-black/30" />
                <span>{customer.village ? `${customer.village}, ` : ''}{customer.address || 'No address'}</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 text-sm font-bold group-hover:bg-[#141414] group-hover:text-white transition-all">
              View Ledger
              <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif italic font-bold">{t('addCustomer')}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
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
                {t('save')}
              </button>
            </form>
          </div>
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
