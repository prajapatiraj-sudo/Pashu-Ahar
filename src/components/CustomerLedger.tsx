import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Customer } from '../types';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface CustomerLedgerProps {
  customer: Customer;
  onClose: () => void;
}

export default function CustomerLedger({ customer, onClose }: CustomerLedgerProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const data = await api.customers.getLedger(customer.id);
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching ledger:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [customer.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-serif italic font-bold">{customer.name}'s Ledger</h3>
          <p className="text-sm text-black/40 font-medium">Complete transaction history</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Current Outstanding</div>
          <div className={cn(
            "text-2xl font-bold",
            customer.total_outstanding > 0 ? "text-rose-600" : "text-emerald-600"
          )}>
            ₹{customer.total_outstanding.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Description</th>
                <th className="px-8 py-4 text-right">Debit (Invoice)</th>
                <th className="px-8 py-4 text-right">Credit (Payment)</th>
                <th className="px-8 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6321] mx-auto"></div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-black/40">
                    No transactions found for this customer.
                  </td>
                </tr>
              ) : (
                (() => {
                  let runningBalance = 0;
                  return transactions.map((tx) => {
                    if (tx.type === 'invoice') {
                      runningBalance += tx.amount;
                    } else {
                      runningBalance -= tx.amount;
                    }

                    return (
                      <tr key={`${tx.type}-${tx.id}`} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-8 py-4 text-sm font-medium">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-8 py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            tx.type === 'invoice' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {tx.type === 'invoice' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                            {tx.type}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-sm text-black/60">
                          {tx.type === 'invoice' ? `Invoice #${tx.id.toString().slice(-4)}` : `Payment via ${tx.method}`}
                          {tx.note && <span className="block text-[10px] text-black/30 italic">{tx.note}</span>}
                        </td>
                        <td className="px-8 py-4 text-right font-bold text-rose-600">
                          {tx.type === 'invoice' ? `₹${tx.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-8 py-4 text-right font-bold text-emerald-600">
                          {tx.type === 'payment' ? `₹${tx.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-8 py-4 text-right font-bold">
                          ₹{runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
