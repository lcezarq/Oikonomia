import React from 'react';
import { LayoutDashboard, Receipt, Import, PieChart, Settings, Wallet, Download } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, toggle }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: Receipt },
    { id: 'import', label: 'Importar', icon: Import },
    { id: 'export', label: 'Exportar', icon: Download },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
      <div className="flex items-center justify-center h-20 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Wallet className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight">Oikonomia</span>
        </div>
      </div>
      <nav className="mt-6 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id);
              if (window.innerWidth < 768) toggle();
            }}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              currentView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center italic">
          "Confia ao Senhor as tuas obras, e os teus desígnios serão estabelecidos." <br/> Provérbios 16:3
        </p>
      </div>
    </div>
  );
};

export default Sidebar;