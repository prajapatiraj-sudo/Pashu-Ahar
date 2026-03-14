import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, Users, FileText, CreditCard, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Customer, Invoice } from '../types';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOutstanding: 0,
    lowStockCount: 0,
    activeCustomers: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => doc.data() as Product);
      setStats(prev => ({ ...prev, lowStockCount: products.filter(p => p.stock_quantity < 10).length }));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customers = snapshot.docs.map(doc => doc.data() as Customer);
      const totalOutstanding = customers.reduce((sum, cust) => sum + (cust.total_outstanding || 0), 0);
      setStats(prev => ({ ...prev, totalOutstanding, activeCustomers: customers.length }));
    });

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const invoices = snapshot.docs.map(doc => doc.data() as Invoice);
      const totalSales = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      setStats(prev => ({ ...prev, totalSales }));
    });

    const qRecent = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(5));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentInvoices(snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() })) as Invoice[]);
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubInvoices();
      unsubRecent();
    };
  }, []);

  const statCards = [
    { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Outstanding', value: `₹${stats.totalOutstanding.toLocaleString()}`, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Low Stock Items', value: stats.lowStockCount, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Customers', value: stats.activeCustomers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-black/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={stat.bg + " p-3 rounded-xl " + stat.color}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-black/40 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
          <h2 className="text-xl font-serif italic font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate('new-invoice')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#FF6321]/5 border border-[#FF6321]/10 text-[#FF6321] hover:bg-[#FF6321]/10 transition-all group"
            >
              <FileText className="mb-3 group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold">Create Invoice</span>
            </button>
            <button 
              onClick={() => onNavigate('payments')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-all group"
            >
              <CreditCard className="mb-3 group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold">Record Payment</span>
            </button>
            <button 
              onClick={() => onNavigate('products')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 transition-all group"
            >
              <Package className="mb-3 group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold">Manage Stock</span>
            </button>
            <button 
              onClick={() => onNavigate('customers')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all group"
            >
              <Users className="mb-3 group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold">Customer List</span>
            </button>
            <button 
              onClick={() => onNavigate('reports')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 hover:bg-purple-100 transition-all group"
            >
              <BarChart3 className="mb-3 group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold">View Reports</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
          <h2 className="text-xl font-serif italic font-bold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                    <FileText size={18} className="text-black/40" />
                  </div>
                  <div>
                    <div className="font-bold">New Invoice #{inv.id.toString().slice(-4)}</div>
                    <div className="text-xs text-black/40">{inv.customer_name}</div>
                  </div>
                </div>
                <div className="font-bold text-emerald-600">+₹{inv.total_amount.toLocaleString()}</div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <p className="text-center text-black/40 py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
