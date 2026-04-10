import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import type { Product, Customer, Invoice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const [productsData, customersResponse, invoicesData] = await Promise.all([
        api.products.list(),
        api.customers.list({ limit: 1000 }), // Fetch more for reports
        api.invoices.list()
      ]);
      setProducts(productsData);
      setCustomers(customersResponse.customers || []);
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
    const salesMap: Record<string, { name: string, name_gu?: string, quantity: number, revenue: number }> = {};
    
    invoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          const productId = item.product_id?.toString();
          if (!productId) return;
          
          if (!salesMap[productId]) {
            // Find product to get Gujarati name
            const product = products.find(p => p.id.toString() === productId);
            salesMap[productId] = { 
              name: item.name, 
              name_gu: product?.name_gu,
              quantity: 0, 
              revenue: 0 
            };
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

  const handleDownload = async () => {
    if (!reportRef.current || isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const dateStr = format(new Date(), 'dd MMM yyyy, hh:mm a');
      const fileName = `${activeReport}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      // For table-based reports, use autoTable for better reliability with large datasets
      if (['outstanding', 'stock', 'low-stock', 'best-selling'].includes(activeReport)) {
        pdf.setFontSize(20);
        pdf.text(reportTabs.find(t => t.id === activeReport)?.label || 'Report', 14, 22);
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Generated on ${dateStr}`, 14, 30);
        pdf.text('Powered by Ruhi Computer', 14, 35);

        let tableData: any[] = [];
        let columns: string[] = [];

        if (activeReport === 'outstanding') {
          columns = ['Customer Name', 'Phone', 'Outstanding (₹)'];
          tableData = customers
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.total_outstanding - a.total_outstanding)
            .map(c => [c.name, c.phone, (c.total_outstanding || 0).toLocaleString()]);
        } else if (activeReport === 'stock') {
          columns = ['Product Name', 'Stock', 'Unit', 'Value (₹)'];
          tableData = products
            .filter(p => p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) || p.name_gu.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(p => [
              p.name_en, 
              p.stock_quantity, 
              p.unit, 
              (p.stock_quantity * (p.purchase_price || 0)).toLocaleString()
            ]);
        } else if (activeReport === 'low-stock') {
          columns = ['Product Name', 'Current Stock', 'Threshold'];
          tableData = products
            .filter(p => p.stock_quantity < (p.low_stock_threshold || 10))
            .map(p => [p.name_en, p.stock_quantity, p.low_stock_threshold || 10]);
        } else if (activeReport === 'best-selling') {
          columns = ['Rank', 'Product Name', 'Units Sold', 'Revenue (₹)'];
          tableData = getBestSelling().map((item, i) => [
            i + 1,
            item.name,
            item.quantity,
            item.revenue.toLocaleString()
          ]);
        }

        autoTable(pdf, {
          head: [columns],
          body: tableData,
          startY: 45,
          theme: 'grid',
          headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 45 },
          styles: { font: 'helvetica', fontSize: 9 }
        });

        pdf.save(fileName);
      } else {
        // For Profit & Loss (which has charts/cards), use html2canvas
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));

        const element = reportRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: element.scrollWidth,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap');
              .font-gujarati { font-family: 'Noto Sans Gujarati', sans-serif !important; }
              * { -webkit-font-smoothing: antialiased; }
              .print\\:hidden { display: none !important; }
            `;
            clonedDoc.head.appendChild(style);
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }

        pdf.save(fileName);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please use the Print option as a fallback.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const shareOnWhatsApp = (title: string, content: string) => {
    const text = `*${title}*\n\n${content}\n\nPowered by Ruhi Computer`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShare = () => {
    let title = "";
    let content = "";

    if (activeReport === 'outstanding') {
      title = "Party-wise Outstanding Report";
      content = customers
        .filter(c => (c.total_outstanding || 0) > 0)
        .map(c => `${c.name}: ₹${(c.total_outstanding || 0).toLocaleString()}`)
        .join('\n');
    } else if (activeReport === 'low-stock') {
      title = "Low Stock Alert Report";
      content = products
        .filter(p => p.stock_quantity < (p.low_stock_threshold || 10))
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

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-black/5 overflow-hidden" ref={reportRef}>
        {/* Print-only Header */}
        <div className="hidden print:block p-8 border-b-2 border-black mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black text-[#dc2626] mb-1 tracking-tighter">કૃષ્ણમ પશુ આહાર</h1>
              <p className="text-lg font-bold">માં કૃપા કોમ્પલેક્ષ, ધરમપુર-૩૯૬૦૫૦ જિ. વલસાડ.</p>
              <p className="font-bold">Mo. 87585 99902</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase tracking-widest">
                {reportTabs.find(t => t.id === activeReport)?.label}
              </h2>
              <p className="text-sm font-medium text-black/60">Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
        </div>

        <div className="p-8 border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
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
          <div className="flex items-center gap-3 print:hidden">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white border border-black/10 text-black px-6 py-3 rounded-2xl font-bold hover:bg-black/5 transition-all shadow-sm"
              title="Print Report (Save as PDF)"
            >
              <Printer size={18} />
              Print
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <Share2 size={18} />
              {t('shareWhatsApp')}
            </button>
            <button 
              onClick={handleDownload}
              disabled={isGeneratingPDF}
              className={cn(
                "flex items-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-black/10",
                isGeneratingPDF && "opacity-50 cursor-not-allowed"
              )}
            >
              {isGeneratingPDF ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Download size={18} />
              )}
              {isGeneratingPDF ? "Generating..." : t('downloadPDF')}
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
                  <div className="overflow-hidden rounded-3xl border border-black/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                          <th className="px-8 py-5">{t('product')}</th>
                          <th className="px-8 py-5">Gujarati Name</th>
                          <th className="px-8 py-5 text-center">{t('currentStock')}</th>
                          <th className="px-8 py-5 text-right">{t('stockValue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {products
                          .filter(p => p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) || p.name_gu.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(p => (
                            <tr key={p.id} className="hover:bg-black/[0.02] transition-colors">
                              <td className="px-8 py-5">
                                <div className="font-bold">{p.name_en}</div>
                                <div className="text-[10px] text-black/40 uppercase tracking-widest mt-1">{p.unit}</div>
                              </td>
                              <td className="px-8 py-5 font-gujarati text-[#FF6321] font-medium">{p.name_gu}</td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-lg font-bold font-mono",
                                      p.stock_quantity < (p.low_stock_threshold || 10) ? "text-rose-600" : "text-emerald-600"
                                    )}>
                                      {p.stock_quantity}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold">{p.unit}s</span>
                                  </div>
                                  {p.stock_quantity < (p.low_stock_threshold || 10) && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold w-fit uppercase tracking-wider">
                                      <AlertCircle size={10} />
                                      Low Stock
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right font-mono font-bold text-indigo-600">
                                ₹{(p.stock_quantity * (p.purchase_price || 0)).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeReport === 'best-selling' && (
                <div className="space-y-8">
                  <div className="overflow-hidden rounded-3xl border border-black/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                          <th className="px-8 py-5">Rank</th>
                          <th className="px-8 py-5">{t('product')}</th>
                          <th className="px-8 py-5">Gujarati Name</th>
                          <th className="px-8 py-5 text-center">Units Sold</th>
                          <th className="px-8 py-5 text-right">{t('revenue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {getBestSelling().map((item, i) => (
                          <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                            <td className="px-8 py-5">
                              <div className="w-8 h-8 rounded-lg bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321] font-bold text-xs">
                                {i + 1}
                              </div>
                            </td>
                            <td className="px-8 py-5 font-bold">{item.name}</td>
                            <td className="px-8 py-5 font-gujarati text-black/40">{item.name_gu}</td>
                            <td className="px-8 py-5 text-center font-medium">{item.quantity}</td>
                            <td className="px-8 py-5 text-right font-mono font-bold text-emerald-600">₹{item.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div className="overflow-hidden rounded-3xl border border-black/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 text-[10px] uppercase tracking-widest text-black/40 font-bold">
                          <th className="px-8 py-5">{t('product')}</th>
                          <th className="px-8 py-5">Gujarati Name</th>
                          <th className="px-8 py-5 text-right">{t('currentStock')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {products
                          .filter(p => p.stock_quantity < (p.low_stock_threshold || 10))
                          .map(p => (
                            <tr key={p.id} className="hover:bg-black/[0.02] transition-colors">
                              <td className="px-8 py-5 font-bold">{p.name_en}</td>
                              <td className="px-8 py-5 font-gujarati text-black/40">{p.name_gu}</td>
                              <td className="px-8 py-5 text-right">
                                <div className="text-xl font-bold text-rose-600">{p.stock_quantity}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">{p.unit}s left</div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {products.filter(p => p.stock_quantity < (p.low_stock_threshold || 10)).length === 0 && (
                      <div className="py-20 text-center text-black/40 bg-black/5">
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
