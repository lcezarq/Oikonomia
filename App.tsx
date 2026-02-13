import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import ImportOFX from './components/ImportOFX';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ExportData from './components/ExportData';
import { Transaction, Category, BankAccount } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { Menu, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { generateId, formatMonthLong } from './services/utils';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Global Month State
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Persistence State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('ecclesia_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('ecclesia_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('ecclesia_accounts');
    if (saved) return JSON.parse(saved);
    // Default account if none exists
    const today = new Date().toISOString().split('T')[0];
    return [{ id: generateId(), name: 'Conta Principal', initialBalance: 0, startDate: today }];
  });

  // Refactored: Store a single string "YYYY-MM". All months <= this date are closed.
  const [closedUntil, setClosedUntil] = useState<string>(() => {
    const saved = localStorage.getItem('ecclesia_closed_until');
    if (saved) return JSON.parse(saved);

    // Migration: Check for old array format
    const oldSaved = localStorage.getItem('ecclesia_closed_months');
    if (oldSaved) {
      try {
        const arr = JSON.parse(oldSaved);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.sort();
          // Take the latest closed month as the new cutoff
          return arr[arr.length - 1];
        }
      } catch (e) {
        console.error("Error migrating closed months", e);
      }
    }
    return '';
  });

  // Save to LocalStorage effects
  useEffect(() => {
    localStorage.setItem('ecclesia_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('ecclesia_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('ecclesia_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('ecclesia_closed_until', JSON.stringify(closedUntil));
  }, [closedUntil]);

  const handleImport = (newTransactions: Transaction[]) => {
    // Check if any transaction belongs to a closed month (date <= closedUntil)
    if (closedUntil) {
        const hasClosedMonthError = newTransactions.some(t => t.date.substring(0, 7) <= closedUntil);
        
        if (hasClosedMonthError) {
            alert(`Erro: Alguns lançamentos pertencem a meses fechados (até ${formatMonthLong(closedUntil)}). Abra o mês nas configurações para importar.`);
            return;
        }
    }

    setTransactions(prev => [...newTransactions, ...prev]);
    setCurrentView('transactions');
    // Using a simple alert or toast would be better here, but maintaining existing behavior
    // You might want to replace this with the custom modal logic later if needed globally
  };

  const changeMonth = (offset: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + offset, 1);
    const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard transactions={transactions} categories={categories} accounts={accounts} currentMonth={currentMonth} />;
      case 'transactions':
        return <Transactions transactions={transactions} setTransactions={setTransactions} categories={categories} accounts={accounts} currentMonth={currentMonth} closedUntil={closedUntil} />;
      case 'import':
        // Pass transactions history to enable smart matching
        return <ImportOFX onImport={handleImport} categories={categories} accounts={accounts} closedUntil={closedUntil} transactions={transactions} />;
      case 'export':
        return <ExportData transactions={transactions} categories={categories} accounts={accounts} currentMonth={currentMonth} />;
      case 'reports':
        return <Reports transactions={transactions} categories={categories} accounts={accounts} currentMonth={currentMonth} />;
      case 'settings':
        return <Settings categories={categories} setCategories={setCategories} accounts={accounts} setAccounts={setAccounts} closedUntil={closedUntil} setClosedUntil={setClosedUntil} setTransactions={setTransactions} />;
      default:
        return <Dashboard transactions={transactions} categories={categories} accounts={accounts} currentMonth={currentMonth} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        isOpen={isSidebarOpen} 
        toggle={() => setSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded">
               <Menu className="w-6 h-6" />
             </button>
             <h1 className="text-xl font-bold text-slate-800 hidden md:block">
               Oikonomia
             </h1>
             <span className="text-lg font-bold text-blue-600 md:hidden">Oikonomia</span>
           </div>

           {/* Month Selector */}
           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => changeMonth(-1)} 
                className="p-1.5 hover:bg-white rounded-md shadow-sm text-slate-600 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="relative group">
                <input 
                    type="month" 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="px-3 py-1 min-w-[9rem] text-center flex items-center justify-center gap-2">
                   <Calendar className="w-4 h-4 text-slate-500" />
                   <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {formatMonthLong(currentMonth)}
                   </span>
                </div>
              </div>

              <button 
                onClick={() => changeMonth(1)} 
                className="p-1.5 hover:bg-white rounded-md shadow-sm text-slate-600 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;