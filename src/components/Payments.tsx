import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, Calendar, User } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer, Payment } from '../types';

export default function Payments() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({
        id: doc.id as any,
        ...doc.data()
      })) as Customer[]);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const customerRef = doc(db, 'customers', selectedCustomer.id.toString());
        const customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          throw new Error("Customer does not exist!");
        }

        const currentOutstanding = customerDoc.data().total_outstanding || 0;
        const paymentAmount = parseFloat(amount);
        const newOutstanding = currentOutstanding - paymentAmount;

        // Record Payment
        const paymentRef = doc(collection(db, 'payments'));
        transaction.set(paymentRef, {
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          amount: paymentAmount,
          method,
          note,
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });

        // Update Customer Outstanding
        transaction.update(customerRef, {
          total_outstanding: newOutstanding
        });
      });

      // Reset
      setSelectedCustomer(null);
      setAmount('');
      setNote('');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
        <h2 className="text-2xl font-serif italic font-bold mb-8">Record Customer Payment</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Select Customer</label>
            {!selectedCustomer ? (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={20} />
                <input 
                  type="text"
                  placeholder="Search customer..."
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
                    <div className="text-sm text-rose-600 font-bold">Outstanding: ₹{selectedCustomer.total_outstanding}</div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Payment Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30">₹</span>
                <input 
                  required
                  type="number"
                  className="w-full pl-8 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] font-mono font-bold"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Payment Method</label>
              <select 
                className="w-full p-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] font-bold"
                value={method}
                onChange={e => setMethod(e.target.value)}
              >
                <option>Cash</option>
                <option>UPI / PhonePe</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Notes / Reference</label>
            <textarea 
              className="w-full p-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321]"
              rows={3}
              placeholder="Optional payment notes..."
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
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
