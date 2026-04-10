import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, Search, User, Package, ChevronDown, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import type { Product, Customer } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import InvoicePrintLayout from './InvoicePrintLayout';
import { AlertModal } from './ui/Modal';

import { useLanguage } from '../contexts/LanguageContext';

interface NewInvoiceProps {
  onComplete: () => void;
}

interface SelectedItem {
  product_id: string | number;
  name: string;
  name_gu: string;
  quantity: number;
  rate: number;
  purchase_price: number;
  amount: number;
}

export default function NewInvoice({ onComplete }: NewInvoiceProps) {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersData, productsData] = await Promise.all([
        api.customers.list(),
        api.products.list()
      ]);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const previousOutstanding = selectedCustomer?.total_outstanding || 0;
  const totalAmount = subtotal + previousOutstanding;
  const balanceDue = totalAmount - paidAmount;

  const addItem = () => {
    setItems([...items, { product_id: '0', name: '', name_gu: '', quantity: 1, rate: 0, purchase_price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = products.find(p => p.id.toString() === value.toString());
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: product.id,
          name: product.name_en,
          name_gu: product.name_gu,
          rate: product.price,
          purchase_price: product.purchase_price || 0,
          amount: newItems[index].quantity * product.price
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    // Recalculate amount
    if (newItems[index].quantity && newItems[index].rate) {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    } else {
      newItems[index].amount = 0;
    }

    // Check stock
    const product = products.find(p => p.id === newItems[index].product_id);
    if (product && newItems[index].quantity > product.stock_quantity) {
      // We'll show a warning in the UI
    }
    
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await api.invoices.create({
        customer_id: selectedCustomer.id,
        date: new Date().toISOString(),
        items,
        subtotal,
        previous_outstanding: previousOutstanding,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance_due: balanceDue
      });

      onComplete();
    } catch (error) {
      console.error('Error saving invoice:', error);
      setAlert({ type: 'error', title: t('error'), message: 'Failed to save invoice. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">{t('customerDetails')}</h3>
            
            <div className="relative">
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
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                  />
                  {showCustomerSearch && customerSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-2xl shadow-xl z-50 max-h-60 overflow-auto">
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowCustomerSearch(false);
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
                      <div className="text-sm text-black/40">{selectedCustomer.phone}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
                  >
                    {t('change')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">{t('invoiceItems')}</h3>
              <button 
                onClick={addItem}
                className="flex items-center gap-2 text-[#FF6321] font-bold text-sm hover:underline"
              >
                <Plus size={16} /> {t('addItem')}
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end bg-black/[0.02] p-4 rounded-2xl border border-black/5">
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[10px] font-bold uppercase text-black/30 mb-1">{t('product')}</label>
                    <select 
                      className="w-full p-2 bg-white border border-black/10 rounded-xl text-sm"
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    >
                      <option value="0">{t('selectProduct')}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name_en} ({p.name_gu})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-black/30 mb-1">{t('qty')}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        className={cn(
                          "w-full p-2 bg-white border rounded-xl text-sm",
                          products.find(p => p.id === item.product_id) && item.quantity > (products.find(p => p.id === item.product_id)?.stock_quantity || 0)
                            ? "border-rose-500 focus:ring-rose-500" 
                            : "border-black/10 focus:ring-[#FF6321]"
                        )}
                        value={item.quantity === undefined || Number.isNaN(item.quantity) ? '' : item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? NaN : parseFloat(e.target.value))}
                      />
                      {products.find(p => p.id === item.product_id) && item.quantity > (products.find(p => p.id === item.product_id)?.stock_quantity || 0) && (
                        <div className="absolute -bottom-4 left-0 text-[8px] text-rose-600 font-bold uppercase whitespace-nowrap">
                          Exceeds Stock ({products.find(p => p.id === item.product_id)?.stock_quantity} left)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-black/30 mb-1">{t('rate')}</label>
                    <input 
                      type="number"
                      className="w-full p-2 bg-white border border-black/10 rounded-xl text-sm"
                      value={item.rate === undefined || Number.isNaN(item.rate) ? '' : item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value === '' ? NaN : parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-black/30 mb-1">{t('total')}</label>
                    <div className="p-2 font-bold text-sm">₹{item.quantity * item.rate}</div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button 
                      onClick={() => removeItem(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-black/5 rounded-3xl">
                  <Package className="mx-auto mb-4 text-black/10" size={48} />
                  <p className="text-black/40 font-medium">{t('noItems')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <div className="bg-[#141414] text-white p-8 rounded-3xl shadow-xl sticky top-24">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">{t('invoiceSummary')}</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-white/60">
                <span>{t('subtotal')}</span>
                <span className="font-mono">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>{t('outstanding')}</span>
                <span className="font-mono">₹{previousOutstanding.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/10 my-4"></div>
              <div className="flex justify-between text-xl font-bold">
                <span>{t('total')}</span>
                <span className="font-mono">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">{t('paid')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                  <input 
                    type="number"
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#FF6321] text-white font-mono"
                    value={paidAmount === undefined || Number.isNaN(paidAmount) ? '' : paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value === '' ? NaN : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">{t('balance')}</span>
                <span className="font-bold text-[#FF6321]">₹{balanceDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowPreview(true)}
                className="flex items-center justify-center gap-2 bg-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/20 transition-all"
              >
                <Eye size={20} />
                {t('preview')}
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedCustomer || items.length === 0}
                className="flex items-center justify-center gap-2 bg-[#FF6321] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#E5591D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isSubmitting ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-black/5"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321]">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('preview')}</h3>
                    <p className="text-sm text-black/40">{t('reviewInvoice')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
                  >
                    <Printer size={20} />
                    {t('print')}
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="p-3 hover:bg-black/5 rounded-2xl transition-colors text-black/40 hover:text-black"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable Preview Area */}
              <div className="flex-1 overflow-y-auto bg-gray-100/50 p-4 md:p-12 flex justify-center">
                <div className="w-full max-w-[210mm] shadow-2xl origin-top transition-transform duration-300">
                  <div className="bg-white rounded-sm overflow-hidden">
                    <InvoicePrintLayout 
                      selectedCustomer={selectedCustomer}
                      items={items}
                      subtotal={subtotal}
                      previousOutstanding={previousOutstanding}
                      totalAmount={totalAmount}
                      paidAmount={paidAmount}
                      balanceDue={balanceDue}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Print Layout */}
      {createPortal(
        <div className="hidden print:block" id="printable-invoice">
          <InvoicePrintLayout 
            selectedCustomer={selectedCustomer}
            items={items}
            subtotal={subtotal}
            previousOutstanding={previousOutstanding}
            totalAmount={totalAmount}
            paidAmount={paidAmount}
            balanceDue={balanceDue}
          />
        </div>,
        document.body
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            z-index: 99999 !important;
            display: block !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
