import React, { useState, useEffect } from 'react';
import { FileText, Search, Printer, Eye, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import type { Invoice } from '../types';
import InvoicePrintLayout from './InvoicePrintLayout';

import { useLanguage } from '../contexts/LanguageContext';

export default function Invoices() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isPrintPending, setIsPrintPending] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await api.invoices.list();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  useEffect(() => {
    if (isPrintPending && !isLoadingItems && invoiceItems.length > 0) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrintPending(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrintPending, isLoadingItems, invoiceItems]);

  const handlePreview = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceItems((invoice as any).items || []);
    setShowPreview(true);
  };

  const handlePrint = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceItems((invoice as any).items || []);
    setIsPrintPending(true);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toString().includes(searchTerm)
  );

  const formatDate = (date: any) => {
    if (!date) return '';
    if (date.toDate) return format(date.toDate(), 'dd MMM yyyy');
    return format(new Date(date), 'dd MMM yyyy');
  };

  return (
    <div className="space-y-6">
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
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/5 text-[11px] uppercase tracking-widest text-black/40 font-bold">
              <th className="px-8 py-4">{t('invoiceNumber')}</th>
              <th className="px-8 py-4">{t('date')}</th>
              <th className="px-8 py-4">{t('customer')}</th>
              <th className="px-8 py-4">{t('subtotal')}</th>
              <th className="px-8 py-4">{t('outstanding')}</th>
              <th className="px-8 py-4">{t('total')}</th>
              <th className="px-8 py-4">{t('paid')}</th>
              <th className="px-8 py-4 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-black/[0.02] transition-colors group">
                <td className="px-8 py-4 font-bold text-black/40">#{inv.id.toString().slice(-6)}</td>
                <td className="px-8 py-4 text-sm">{formatDate(inv.date)}</td>
                <td className="px-8 py-4 font-bold">{inv.customer_name}</td>
                <td className="px-8 py-4 font-mono">₹{inv.subtotal.toLocaleString()}</td>
                <td className="px-8 py-4 font-mono text-rose-600">₹{inv.previous_outstanding.toLocaleString()}</td>
                <td className="px-8 py-4 font-mono font-bold">₹{inv.total_amount.toLocaleString()}</td>
                <td className="px-8 py-4 font-mono text-emerald-600">₹{inv.paid_amount.toLocaleString()}</td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handlePreview(inv)}
                      className="p-2 text-black/20 hover:text-[#FF6321] hover:bg-[#FF6321]/5 rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handlePrint(inv)}
                      className="p-2 text-black/20 hover:text-[#FF6321] hover:bg-[#FF6321]/5 rounded-lg transition-all"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedInvoice && (
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
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('invoicePreview')}</h3>
                    <p className="text-sm text-black/40">#{selectedInvoice.id.toString().slice(-6)} • {formatDate(selectedInvoice.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => window.print()}
                    disabled={isLoadingItems}
                    className="flex items-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                  >
                    <Printer size={20} />
                    {isLoadingItems ? t('recording') + '...' : t('print')}
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
                  {isLoadingItems ? (
                    <div className="bg-white rounded-3xl h-[800px] flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-[#FF6321]/20 border-t-[#FF6321] rounded-full animate-spin"></div>
                      <p className="text-black/40 font-medium animate-pulse">Preparing your invoice...</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-sm overflow-hidden">
                      <InvoicePrintLayout 
                        selectedCustomer={{
                          name: selectedInvoice.customer_name || '',
                          address: (selectedInvoice as any).customer_address || '',
                          phone: (selectedInvoice as any).customer_phone || '',
                          village: (selectedInvoice as any).customer_village || ''
                        }}
                        items={invoiceItems}
                        subtotal={selectedInvoice.subtotal}
                        previousOutstanding={selectedInvoice.previous_outstanding}
                        totalAmount={selectedInvoice.total_amount}
                        paidAmount={selectedInvoice.paid_amount}
                        balanceDue={selectedInvoice.balance_due}
                        invoiceId={selectedInvoice.id}
                        date={selectedInvoice.date}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Print Layout */}
      {createPortal(
        <div className="hidden print:block" id="printable-invoice">
          {selectedInvoice && (
            <InvoicePrintLayout 
              selectedCustomer={{
                name: selectedInvoice.customer_name || '',
                address: (selectedInvoice as any).customer_address || '',
                phone: (selectedInvoice as any).customer_phone || '',
                village: (selectedInvoice as any).customer_village || ''
              }}
              items={invoiceItems}
              subtotal={selectedInvoice.subtotal}
              previousOutstanding={selectedInvoice.previous_outstanding}
              totalAmount={selectedInvoice.total_amount}
              paidAmount={selectedInvoice.paid_amount}
              balanceDue={selectedInvoice.balance_due}
              invoiceId={selectedInvoice.id}
              date={selectedInvoice.date}
            />
          )}
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
