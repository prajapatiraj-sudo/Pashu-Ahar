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
  Filter,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import type { Product, Customer, Invoice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useLanguage } from '../contexts/LanguageContext';

type ReportType = 'profit-loss' | 'outstanding' | 'stock' | 'best-selling' | 'low-stock';

export default function Reports() {
  const { t } = useLanguage();
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const [productsData, customersData, invoicesData] = await Promise.all([
        api.products.list(),
        api.customers.list(),
        api.invoices.list()
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setLoading(false);
    }
  };

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

  const handleDownload = () => {
    const doc = new jsPDF();
    const title = reportTabs.find(t => t.id === activeReport)?.label || 'Report';
    const dateStr = format(new Date(), 'dd MMM yyyy, hh:mm a');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(255, 99, 33); // #FF6321
    doc.text('Krushnam Management System', 14, 22);
    
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(title, 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${dateStr}`, 14, 38);
    doc.line(14, 42, 196, 42);

    if (activeReport === 'profit-loss') {
      const stats = calculateProfitLoss();
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `Rs. ${stats.totalSales.toLocaleString()}`],
          ['Total Expenses', `Rs. ${stats.totalCost.toLocaleString()}`],
          ['Net Profit', `Rs. ${stats.profit.toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
    } else if (activeReport === 'outstanding') {
      const data = customers
        .filter(c => c.total_outstanding > 0)
        .sort((a, b) => b.total_outstanding - a.total_outstanding)
        .map(c => [c.name, c.phone, `Rs. ${c.total_outstanding.toLocaleString()}`]);

      autoTable(doc, {
        startY: 50,
        head: [['Customer', 'Phone', 'Outstanding']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
    } else if (activeReport === 'stock') {
      const data = products.map(p => [
        p.name_en,
        p.name_gu,
        `${p.stock_quantity} ${p.unit}`,
        `Rs. ${(p.stock_quantity * (p.purchase_price || 0)).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Product', 'Gujarati Name', 'Stock', 'Value']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
    } else if (activeReport === 'best-selling') {
      const data = getBestSelling().map((item, i) => [
        i + 1,
        item.name,
        item.quantity,
        `Rs. ${item.revenue.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Rank', 'Product', 'Units Sold', 'Revenue']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
    } else if (activeReport === 'low-stock') {
      const data = products
        .filter(p => p.stock_quantity < 10)
        .map(p => [p.name_en, p.name_gu, p.stock_quantity, p.unit]);

      autoTable(doc, {
        startY: 50,
        head: [['Product', 'Gujarati Name', 'Stock', 'Unit']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
    }

    doc.save(`${activeReport}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
    { id: 'profit-loss', label: t('profitLoss'), icon: BarChart3 },
    { id: 'outstanding', label: t('outstanding'), icon: Users },
    { id: 'stock', label: t('stockStatus'), icon: Package },
    { id: 'best-selling', label: t('bestSelling'), icon: TrendingUp },
    { id: 'low-stock', label: t('lowStock'), icon: AlertCircle },
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
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321]">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {reportTabs.find(t => t.id === activeReport)?.label}
              </h2>
              <p className="text-sm text-black/40 font-medium">Report generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <Share2 size={18} />
              {t('shareWhatsApp')}
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
            >
              <Download size={18} />
              {t('downloadPDF')}
            </button>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeReport}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeReport === 'profit-loss' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100">
                      <div className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-3">{t('totalRevenue')}</div>
                      <div className="text-4xl font-bold text-emerald-900">₹{calculateProfitLoss().totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100">
                      <div className="text-rose-600 font-bold text-xs uppercase tracking-widest mb-3">{t('totalExpenses')}</div>
                      <div className="text-4xl font-bold text-rose-900">₹{calculateProfitLoss().totalCost.toLocaleString()}</div>
                    </div>
                    <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
                      <div className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-3">{t('netProfit')}</div>
                      <div className="text-4xl font-bold text-indigo-900">₹{calculateProfitLoss().profit.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="bg-black/5 p-8 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-lg">Monthly Performance</h3>
                      <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-black/40">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#FF6321]" />
                          Revenue
                        </div>
                      </div>
                    </div>
                    <div className="h-64 flex items-end gap-4 md:gap-8">
                      {[40, 65, 45, 90, 75, 55, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-[#FF6321]/10 rounded-t-2xl relative group">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            className="absolute bottom-0 left-0 right-0 bg-[#FF6321] rounded-t-2xl transition-all group-hover:brightness-110" 
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded font-bold">
                            {h}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-6 text-[10px] font-bold text-black/30 uppercase tracking-widest">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                    </div>
                  </div>
                </div>
              )}

              {activeReport === 'outstanding' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                      <input 
                        type="text" 
                        placeholder={t('search') + "..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
                      />
                    </div>
                    <div className="text-sm font-bold text-black/40">
                      Total Outstanding: <span className="text-rose-600">₹{customers.reduce((sum, c) => sum + c.total_outstanding, 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-black/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                          <th className="px-8 py-5">{t('customer')}</th>
                          <th className="px-8 py-5">{t('phone')}</th>
                          <th className="px-8 py-5 text-right">{t('outstanding')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.total_outstanding - a.total_outstanding)
                          .map(c => (
                            <tr key={c.id} className="hover:bg-black/[0.02] transition-colors">
                              <td className="px-8 py-5 font-bold">{c.name}</td>
                              <td className="px-8 py-5 text-sm text-black/40">{c.phone}</td>
                              <td className="px-8 py-5 text-right font-mono font-bold text-rose-600">₹{c.total_outstanding.toLocaleString()}</td>
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
                      <div key={p.id} className="p-8 rounded-[2rem] border border-black/5 hover:border-[#FF6321]/30 transition-all group bg-white shadow-sm hover:shadow-xl hover:shadow-black/5">
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-black/40 group-hover:bg-[#FF6321]/10 group-hover:text-[#FF6321] transition-all">
                            <Package size={28} />
                          </div>
                          <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            p.stock_quantity < (p.low_stock_threshold || 10) ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {p.stock_quantity < (p.low_stock_threshold || 10) ? t('lowStock') : t('inStock')}
                          </div>
                        </div>
                        <h3 className="font-bold text-xl mb-1">{p.name_en}</h3>
                        <p className="text-sm text-black/40 font-gujarati mb-6">{p.name_gu}</p>
                        <div className="flex justify-between items-end pt-6 border-t border-black/5">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-1">{t('currentStock')}</div>
                            <div className="text-2xl font-bold">{p.stock_quantity} {p.unit}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-1">{t('stockValue')}</div>
                            <div className="text-2xl font-bold text-indigo-600">₹{(p.stock_quantity * (p.purchase_price || 0)).toLocaleString()}</div>
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
                        <div key={i} className="flex items-center gap-6 p-6 rounded-3xl border border-black/5 hover:bg-black/[0.02] transition-all bg-white">
                          <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321] font-bold text-lg">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg">{item.name}</div>
                            <div className="text-sm text-black/40">{item.quantity} units sold</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600 text-lg">₹{item.revenue.toLocaleString()}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">{t('revenue')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#141414] rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center text-white shadow-2xl shadow-black/20">
                      <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-[#FF6321] mb-8 shadow-xl backdrop-blur-sm">
                        <TrendingUp size={48} />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Top Performer</h3>
                      <p className="text-white/60 max-w-xs mx-auto leading-relaxed">
                        <span className="text-white font-bold">{getBestSelling()[0]?.name}</span> is your best selling product this month with <span className="text-[#FF6321] font-bold">{getBestSelling()[0]?.quantity}</span> units sold.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeReport === 'low-stock' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-8 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-600">
                    <div className="w-14 h-14 rounded-2xl bg-rose-600/10 flex items-center justify-center">
                      <AlertCircle size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl">{t('lowStock')}</h4>
                      <p className="text-sm opacity-80">{t('lowStockAlert')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.filter(p => p.stock_quantity < (p.low_stock_threshold || 10)).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-8 rounded-3xl border border-rose-100 bg-white shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <Package size={32} />
                          </div>
                          <div>
                            <div className="font-bold text-lg">{p.name_en}</div>
                            <div className="text-sm text-black/40 font-gujarati">{p.name_gu}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-rose-600">{p.stock_quantity}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">{p.unit}s left</div>
                        </div>
                      </div>
                    ))}
                    {products.filter(p => p.stock_quantity < (p.low_stock_threshold || 10)).length === 0 && (
                      <div className="col-span-full py-20 text-center text-black/40 bg-black/5 rounded-[2rem] border border-dashed border-black/10">
                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">All stock levels are healthy.</p>
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
