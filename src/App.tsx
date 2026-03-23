import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  PlusCircle, 
  CreditCard, 
  Menu, 
  X,
  Search,
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  LogOut,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import type { Product, Customer, Invoice, Payment } from './types';
import { useAuth } from './contexts/AuthContext';

// Components
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Invoices from './components/Invoices';
import NewInvoice from './components/NewInvoice';
import Payments from './components/Payments';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';

type View = 'dashboard' | 'products' | 'customers' | 'invoices' | 'new-invoice' | 'payments' | 'users' | 'reports';

export default function App() {
  const { user, profile, loading, logout, isAdmin, isSales } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales'] },
    { id: 'products', label: 'Inventory', icon: Package, roles: ['admin', 'sales'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'sales'] },
    { id: 'invoices', label: 'Invoices', icon: FileText, roles: ['admin', 'sales'] },
    { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'sales'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'sales'] },
    { id: 'users', label: 'Users', icon: ShieldCheck, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(profile?.role || '')
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6321]"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#141414] text-white transition-all duration-300 flex flex-col h-screen sticky top-0 z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <div className="font-serif italic text-xl font-bold tracking-tight leading-none">
                Krushnam
              </div>
              <div className="font-gujarati text-xs font-bold text-[#FF6321] mt-1">
                કૃષ્ણમ પશુ આહાર
              </div>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                currentView === item.id 
                  ? "bg-white text-[#141414] shadow-lg" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setCurrentView('new-invoice')}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-[#FF6321] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#E5591D] transition-all mb-2",
              !isSidebarOpen && "px-0"
            )}
          >
            <PlusCircle size={20} />
            {isSidebarOpen && <span>New Invoice</span>}
          </button>
          
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-all",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-40 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif italic font-bold text-[#141414]">
              {navItems.find(i => i.id === currentView)?.label || 'New Invoice'}
            </h1>
            <p className="text-sm text-black/40 font-medium">
              {format(new Date(), 'EEEE, MMMM do yyyy')}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2 bg-black/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all w-64"
              />
            </div>
            <div className="flex items-center gap-3 bg-black/5 pl-2 pr-4 py-1.5 rounded-2xl border border-black/5">
              <div className="w-8 h-8 rounded-xl bg-[#141414] text-white flex items-center justify-center font-bold text-xs">
                {profile?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold leading-tight">{profile?.name || user.email}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF6321] leading-tight">{profile?.role}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
              {currentView === 'products' && <Products />}
              {currentView === 'customers' && <Customers />}
              {currentView === 'invoices' && <Invoices />}
              {currentView === 'new-invoice' && <NewInvoice onComplete={() => setCurrentView('invoices')} />}
              {currentView === 'payments' && <Payments />}
              {currentView === 'reports' && <Reports />}
              {currentView === 'users' && <UserManagement />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
