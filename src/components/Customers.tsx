import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, MapPin, CreditCard, ChevronRight, X } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer } from '../types';
import { cn } from '../lib/utils';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        total_outstanding: 0,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer. Please try again.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder="Search customers by name or phone..."
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
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center text-xl font-bold text-black/40">
                {customer.name.charAt(0)}
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                customer.total_outstanding > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              )}>
                Outstanding: ₹{customer.total_outstanding.toLocaleString()}
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
                {customer.address || 'No address'}
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
              <h2 className="text-2xl font-serif italic font-bold">New Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Full Name</label>
                <input 
                  required
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Phone Number</label>
                <input 
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Address</label>
                <textarea 
                  className="w-full p-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321]"
                  rows={3}
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-[#FF6321] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#E5591D] transition-all">
                Save Customer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
