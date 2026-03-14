import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  AlertCircle, 
  Share2, 
  Download,
  Search,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Customer, Invoice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

type ReportType = 'profit-loss' | 'outstanding' | 'stock' | 'best-selling' | 'low-stock';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[]);
    });

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[]);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubInvoices();
    };
  }, []);

  const calculateProfitLoss = () => {
    let totalSales = 0;
    let totalCost = 0;

    invoices.forEach(inv => {
      totalSales += inv.subtotal || 0;
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          totalCost += (item.quantity || 0) * (item.purchase_price || 0);
        });
      }
    });

    return { totalSales, totalCost, profit: totalSales - totalCost };
  };

  const getBestSelling = () => {
    const salesMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    invoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          const productId = item.product_id?.toString();
          if (!productId) return;
          
          if (!salesMap[productId]) {
            salesMap[productId] = { name: item.name, quantity: 0, revenue: 0 };
          }
          salesMap[productId].quantity += (item.quantity || 0);
          salesMap[productId].revenue += (item.amount || 0);
        });
      }
    });

    return Object.values(salesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const shareOnWhatsApp = (title: string, content: string) => {
    const text = `*${title}*\n\n${content}\n\nGenerated from Krushnam App`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShare = () => {
    let title = "";
    let content = "";

    if (activeReport === 'outstanding') {
      title = "Party-wise Outstanding Report";
      content = customers
        .filter(c => c.total_outstanding > 0)
        .map(c => `${c.name}: ₹${c.total_outstanding.toLocaleString()}`)
        .join('\n');
    } else if (activeReport === 'low-stock') {
      title = "Low Stock Alert Report";
      content = products
        .filter(p => p.stock_quantity < 10)
        .map(p => `${p.name_en}: ${p.stock_quantity} ${p.unit} left`)
        .join('\n');
    } else if (activeReport === 'stock') {
      title = "Stock Status Report";
      content = products
        .map(p => `${p.name_en}: ${p.stock_quantity} ${p.unit}`)
        .join('\n');
    } else {
      title = "Business Report";
      content = "Check the app for detailed analytics.";
    }

    shareOnWhatsApp(title, content);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6321]"></div>
      </div>
    );
  }

  const reportTabs = [
    { id: 'profit-loss', label: 'Profit & Loss', icon: BarChart3 },
    { id: 'outstanding', label: 'Outstanding', icon: Users },
    { id: 'stock', label: 'Stock Status', icon: Package },
    { id: 'best-selling', label: 'Best Selling', icon: TrendingUp },
    { id: 'low-stock', label: 'Low Stock', icon: AlertCircle },
  ];

  return (
    <div className="space-y-8">
      {/* Report Navigation */}
      <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all border",
              activeReport === tab.id 
                ? "bg-[#141414] text-white border-transparent shadow-lg" 
                : "bg-white text-black/60 border-black/5 hover:border-[#FF6321]/30"
            )}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-black/5 overflow-hidden">
        <div className="p-8 border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif italic font-bold">
              {reportTabs.find(t => t.id === activeReport)?.label}
            </h2>
            <p className="text-sm text-black/40 font-medium">Report generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <Share2 size={18} />
              Share on WhatsApp
            </button>
            <button className="p-3 bg-black/5 text-black/40 hover:text-black hover:bg-black/10 rounded-2xl transition-all">
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeReport}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeReport === 'profit-loss' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <div className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-2">Total Revenue</div>
                      <div className="text-3xl font-bold text-emerald-900">₹{calculateProfitLoss().totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                      <div className="text-rose-600 font-bold text-xs uppercase tracking-widest mb-2">Total Expenses</div>
                      <div className="text-3xl font-bold text-rose-900">₹{calculateProfitLoss().totalCost.toLocaleString()}</div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <div className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">Net Profit</div>
                      <div className="text-3xl font-bold text-indigo-900">₹{calculateProfitLoss().profit.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="bg-black/5 p-8 rounded-3xl">
                    <h3 className="font-bold mb-4">Monthly Overview</h3>
                    <div className="h-48 flex items-end gap-4">
                      {[40, 65, 45, 90, 75, 55, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-[#FF6321]/20 rounded-t-lg relative group">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-[#FF6321] rounded-t-lg transition-all group-hover:brightness-110" 
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-bold text-black/30 uppercase tracking-widest">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                    </div>
                  </div>
                </div>
              )}

              {activeReport === 'outstanding' && (
                <div className="space-y-6">
                  <div className="relative max-w-md mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filter by customer name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
                    />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-black/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                          <th className="px-6 py-4">Customer Name</th>
                          <th className="px-6 py-4">Phone</th>
                          <th className="px-6 py-4 text-right">Outstanding Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.total_outstanding - a.total_outstanding)
                          .map(c => (
                            <tr key={c.id} className="hover:bg-black/[0.02]">
                              <td className="px-6 py-4 font-bold">{c.name}</td>
                              <td className="px-6 py-4 text-sm text-black/40">{c.phone}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">₹{c.total_outstanding.toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeReport === 'stock' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                      <div key={p.id} className="p-6 rounded-3xl border border-black/5 hover:border-[#FF6321]/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center text-black/40 group-hover:bg-[#FF6321]/10 group-hover:text-[#FF6321] transition-all">
                            <Package size={24} />
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            p.stock_quantity < 10 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {p.stock_quantity < 10 ? 'Low Stock' : 'In Stock'}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{p.name_en}</h3>
                        <p className="text-sm text-black/40 font-gujarati mb-4">{p.name_gu}</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">Current Stock</div>
                            <div className="text-xl font-bold">{p.stock_quantity} {p.unit}s</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">Stock Value</div>
                            <div className="text-xl font-bold text-indigo-600">₹{(p.stock_quantity * (p.purchase_price || 0)).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeReport === 'best-selling' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      {getBestSelling().map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-black/5 hover:bg-black/[0.02] transition-all">
                          <div className="w-10 h-10 rounded-xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321] font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold">{item.name}</div>
                            <div className="text-xs text-black/40">{item.quantity} units sold</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">₹{item.revenue.toLocaleString()}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">Revenue</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-black/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#FF6321] mb-6 shadow-xl">
                        <TrendingUp size={40} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Top Performer</h3>
                      <p className="text-sm text-black/40 max-w-xs mx-auto">
                        {getBestSelling()[0]?.name} is your best selling product this month with {getBestSelling()[0]?.quantity} units sold.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeReport === 'low-stock' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600">
                    <AlertCircle size={24} />
                    <div>
                      <h4 className="font-bold">Inventory Alert</h4>
                      <p className="text-sm opacity-80">There are {products.filter(p => p.stock_quantity < 10).length} items running low on stock.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.filter(p => p.stock_quantity < 10).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-6 rounded-2xl border border-rose-100 bg-white shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <Package size={24} />
                          </div>
                          <div>
                            <div className="font-bold">{p.name_en}</div>
                            <div className="text-xs text-black/40">{p.name_gu}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-rose-600">{p.stock_quantity}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">{p.unit}s left</div>
                        </div>
                      </div>
                    ))}
                    {products.filter(p => p.stock_quantity < 10).length === 0 && (
                      <div className="col-span-full py-12 text-center text-black/40">
                        All stock levels are healthy.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
