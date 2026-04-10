import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, Calendar, User } from 'lucide-react';
import { api } from '../lib/api';
import type { Customer, Payment } from '../types';
import { AlertModal } from './ui/Modal';
import { cn } from '../lib/utils';

import { useLanguage } from '../contexts/LanguageContext';

export default function Payments() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;

    setIsSubmitting(true);
    try {
      await api.payments.create({
        customer_id: selectedCustomer.id,
        amount: parseFloat(amount),
        method,
        note,
        date: new Date().toISOString()
      });

      // Reset
      setSelectedCustomer(null);
      setAmount('');
      setNote('');
      fetchCustomers(); // Refresh customer outstanding
      setAlert({ type: 'success', title: t('success'), message: 'Payment recorded successfully' });
    } catch (error) {
      console.error('Error recording payment:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to record payment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type}
      />
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
        <h2 className="text-2xl font-serif italic font-bold mb-8">{t('recordPayment')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('selectCustomer')}</label>
            {!selectedCustomer ? (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={20} />
                <input 
                  type="text"
                  placeholder={t('search') + "..."}
                  className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321]"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                />
                {showSearch && customerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-2xl shadow-xl z-50 max-h-60 overflow-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowSearch(false);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-6 py-4 hover:bg-black/5 transition-colors flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold">{c.name}</div>
                          <div className="text-xs text-black/40">{c.phone}</div>
                        </div>
                        <div className="text-sm font-bold text-rose-600">₹{c.total_outstanding}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#141414] text-white flex items-center justify-center font-bold">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{selectedCustomer.name}</div>
                    <div className="text-sm text-rose-600 font-bold">{t('outstanding')}: ₹{selectedCustomer.total_outstanding}</div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
                >
                  {t('change')}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('paymentAmount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30">₹</span>
                <input 
                  required
                  type="number"
                  className={cn(
                    "w-full pl-8 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] font-mono font-bold",
                    selectedCustomer && parseFloat(amount) > selectedCustomer.total_outstanding && "text-rose-600 focus:ring-rose-500"
                  )}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                {selectedCustomer && parseFloat(amount) > selectedCustomer.total_outstanding && (
                  <div className="absolute -bottom-5 left-0 text-[10px] text-rose-600 font-bold uppercase">
                    Warning: Amount exceeds outstanding (₹{selectedCustomer.total_outstanding})
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('paymentMethod')}</label>
              <select 
                className="w-full p-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] font-bold"
                value={method}
                onChange={e => setMethod(e.target.value)}
              >
                <option value="Cash">{t('cash')}</option>
                <option value="UPI / PhonePe">UPI / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">{t('notes')}</label>
            <textarea 
              className="w-full p-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321]"
              rows={3}
              placeholder={t('notes') + "..."}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !selectedCustomer || !amount}
            className="w-full bg-[#141414] text-white py-5 rounded-2xl font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <CreditCard size={20} />
            {isSubmitting ? t('recording') + '...' : t('recordPayment')}
          </button>
        </form>
      </div>
    </div>
  );
}
