import React, { useState } from 'react';
import { Category, BankAccount, Transaction } from '../types';
import { generateId, formatCurrency, formatDate, formatMonthLong } from '../services/utils';
import { Plus, Trash, Wallet, Edit, Save, X, Lock, Unlock, AlertTriangle, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface SettingsProps {
  categories: Category[];
  setCategories: (c: Category[]) => void;
  accounts: BankAccount[];
  setAccounts: (a: BankAccount[]) => void;
  closedUntil: string;
  setClosedUntil: (m: string) => void;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

interface ConfirmState {
    isOpen: boolean;
    type: 'DELETE_CAT' | 'DELETE_ACC' | 'RESET_DB' | 'UNLOCK_ALL' | null;
    data: string | null; // ID or empty
    title: string;
    message: string;
    isDanger: boolean;
}

const Settings: React.FC<SettingsProps> = ({ categories, setCategories, accounts, setAccounts, closedUntil, setClosedUntil, setTransactions }) => {
  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income'|'expense'>('expense');
  const [newCatBudget, setNewCatBudget] = useState(0);

  // Account State
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState(0);
  const [newAccStartDate, setNewAccStartDate] = useState('');
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  
  // Validation Messages
  const [accError, setAccError] = useState<string | null>(null);

  // Closing State (Initialize with current closedUntil or current month)
  const [closingMonthInput, setClosingMonthInput] = useState(closedUntil || new Date().toISOString().slice(0, 7));
  
  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<ConfirmState>({
      isOpen: false, type: null, data: null, title: '', message: '', isDanger: false
  });

  // --- Helpers ---
  const closeConfirm = () => setConfirmState({ ...confirmState, isOpen: false });
  
  const handleConfirmAction = () => {
      switch (confirmState.type) {
          case 'DELETE_CAT':
              if (confirmState.data) {
                  setCategories(categories.filter(c => c.id !== confirmState.data));
              }
              break;
          case 'DELETE_ACC':
              if (confirmState.data) {
                  setAccounts(accounts.filter(a => a.id !== confirmState.data));
                  if (editingAccId === confirmState.data) cancelEditAccount();
              }
              break;
          case 'UNLOCK_ALL':
              setClosedUntil('');
              break;
          case 'RESET_DB':
              setTransactions([]);
              break;
      }
      closeConfirm();
  };

  // --- Category Handlers ---
  const addCategory = () => {
    if (!newCatName) return;
    const newCat: Category = {
      id: generateId(),
      name: newCatName,
      type: newCatType,
      budget: newCatBudget
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatBudget(0);
  };

  const removeCategoryClick = (id: string) => {
      setConfirmState({
          isOpen: true,
          type: 'DELETE_CAT',
          data: id,
          title: 'Remover Categoria',
          message: 'Ao remover uma categoria, o histórico de lançamentos antigos pode ficar inconsistente (sem categoria). Deseja continuar?',
          isDanger: true
      });
  };

  const updateBudget = (id: string, val: number) => {
      setCategories(categories.map(c => c.id === id ? { ...c, budget: val } : c));
  };

  // --- Account Handlers ---
  const handleSaveAccount = () => {
    setAccError(null);
    if (!newAccName) {
        setAccError("O nome da conta é obrigatório.");
        return;
    }
    
    if (editingAccId) {
        // Update existing account
        setAccounts(accounts.map(acc => acc.id === editingAccId ? {
            ...acc,
            name: newAccName,
            initialBalance: newAccBalance,
            startDate: newAccStartDate
        } : acc));
        setEditingAccId(null);
    } else {
        // Create new account
        const newAcc: BankAccount = {
            id: generateId(),
            name: newAccName,
            initialBalance: newAccBalance,
            startDate: newAccStartDate || new Date().toISOString().split('T')[0]
        };
        setAccounts([...accounts, newAcc]);
    }

    // Reset Form
    setNewAccName('');
    setNewAccBalance(0);
    setNewAccStartDate('');
  };

  const startEditingAccount = (acc: BankAccount) => {
      setAccError(null);
      setEditingAccId(acc.id);
      setNewAccName(acc.name);
      setNewAccBalance(acc.initialBalance);
      setNewAccStartDate(acc.startDate || new Date().toISOString().split('T')[0]);
  };

  const cancelEditAccount = () => {
      setAccError(null);
      setEditingAccId(null);
      setNewAccName('');
      setNewAccBalance(0);
      setNewAccStartDate('');
  };

  const removeAccountClick = (id: string) => {
      setConfirmState({
          isOpen: true,
          type: 'DELETE_ACC',
          data: id,
          title: 'Remover Conta Bancária',
          message: 'Tem certeza? Se houver lançamentos vinculados a esta conta, o saldo deles ficará órfão e os relatórios podem quebrar.',
          isDanger: true
      });
  };

  // --- Closing Handlers ---
  const handleLockMonth = () => {
      if (!closingMonthInput) return;
      setClosedUntil(closingMonthInput);
  };

  const handleUnlockAllClick = () => {
      setConfirmState({
          isOpen: true,
          type: 'UNLOCK_ALL',
          data: null,
          title: 'Reabrir Todos os Meses',
          message: 'Deseja remover o bloqueio de data? Todos os lançamentos passados poderão ser editados.',
          isDanger: false
      });
  };

  // --- Reset Handler ---
  const handleResetDatabaseClick = () => {
      setConfirmState({
          isOpen: true,
          type: 'RESET_DB',
          data: null,
          title: 'APAGAR TODOS OS DADOS',
          message: 'ATENÇÃO: Esta ação apagará TODOS os lançamentos do sistema permanentemente. Esta ação é irreversível. Tem certeza absoluta?',
          isDanger: true
      });
  };

  return (
    <div className="space-y-8">
      <ConfirmationModal 
          isOpen={confirmState.isOpen}
          onClose={closeConfirm}
          onConfirm={handleConfirmAction}
          title={confirmState.title}
          message={confirmState.message}
          isDanger={confirmState.isDanger}
      />
      
      {/* --- Monthly Closing Section --- */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
           <Lock className="w-6 h-6 text-blue-600" /> Fechamento Mensal
        </h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-600 mb-4 text-sm">
                Bloqueie meses fechados para impedir edições ou exclusões acidentais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                    <input 
                        type="month" 
                        value={closingMonthInput}
                        onChange={(e) => setClosingMonthInput(e.target.value)}
                        className="w-full sm:w-auto bg-white text-slate-900 border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleLockMonth}
                        className="px-4 py-2.5 rounded-lg text-white font-medium flex items-center gap-2 transition-colors bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    >
                        <Lock className="w-4 h-4" /> Fechar Mês
                    </button>
                    {closedUntil && (
                        <button 
                            onClick={handleUnlockAllClick}
                            className="px-4 py-2.5 rounded-lg text-slate-600 font-medium flex items-center gap-2 transition-colors bg-slate-100 hover:bg-slate-200 border border-slate-200"
                        >
                            <Unlock className="w-4 h-4" /> Reabrir Tudo
                        </button>
                    )}
                </div>
            </div>

            {closedUntil && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>
                        Sistema fechado para edições até <strong>{formatMonthLong(closedUntil)}</strong> (inclusive).
                    </span>
                </div>
            )}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* --- Bank Accounts Section --- */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
           <Wallet className="w-6 h-6 text-blue-600" /> Contas Bancárias
        </h2>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 transition-all duration-300">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-700">
                  {editingAccId ? 'Editar Conta' : 'Adicionar Nova Conta'}
              </h3>
              {editingAccId && (
                  <button onClick={cancelEditAccount} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="w-4 h-4" /> Cancelar
                  </button>
              )}
           </div>

           {accError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {accError}
              </div>
           )}
           
           <div className="flex flex-col lg:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
               <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Nome da Conta / Banco</label>
               <input 
                 type="text" 
                 value={newAccName}
                 onChange={e => setNewAccName(e.target.value)}
                 className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Ex: Banco do Brasil - Conta Corrente"
               />
             </div>
             <div className="w-full lg:w-48">
               <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Saldo Inicial</label>
               <input 
                 type="number"
                 step="0.01"
                 value={newAccBalance}
                 onChange={e => setNewAccBalance(Number(e.target.value))}
                 className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             <div className="w-full lg:w-48">
               <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Data Início</label>
               <input 
                 type="date" 
                 value={newAccStartDate}
                 onChange={e => setNewAccStartDate(e.target.value)}
                 className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             <button 
               onClick={handleSaveAccount}
               className={`p-2.5 rounded-lg transition text-white flex items-center justify-center min-w-[3rem] ${editingAccId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
               title={editingAccId ? "Atualizar Conta" : "Adicionar Conta"}
             >
               {editingAccId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {accounts.map(acc => (
             <div key={acc.id} className={`bg-white p-4 rounded-lg border flex justify-between items-center shadow-sm transition-colors ${editingAccId === acc.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <div className="overflow-hidden">
                   <p className="font-bold text-slate-800 truncate">{acc.name}</p>
                   <div className="text-sm text-slate-500 space-y-0.5">
                      <p>Inicial: {formatCurrency(acc.initialBalance)}</p>
                      {acc.startDate && <p className="text-xs text-slate-400">Desde: {formatDate(acc.startDate)}</p>}
                   </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => startEditingAccount(acc)}
                        className="text-slate-400 hover:text-blue-500 p-2 rounded hover:bg-slate-100"
                        title="Editar"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => removeAccountClick(acc.id)} 
                        className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-slate-100"
                        title="Excluir"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
             </div>
           ))}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* --- Categories Section --- */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Plano de Contas & Orçamento</h2>
        
        {/* Add New Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Adicionar Nova Categoria</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Nome</label>
              <input 
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 3.0.01 - Nova Despesa"
              />
            </div>
            <div className="w-full md:w-40">
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Tipo</label>
              <select 
                value={newCatType} 
                onChange={e => setNewCatType(e.target.value as any)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div className="w-full md:w-40">
               <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Orçamento Mensal</label>
               <input 
                type="number" 
                value={newCatBudget}
                onChange={e => setNewCatBudget(Number(e.target.value))}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button 
              onClick={addCategory}
              className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex-none">
               <h3 className="font-bold text-emerald-800">Receitas e Orçamento</h3>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
               {categories
                  .filter(c => c.type === 'income')
                  .sort((a,b) => a.name.localeCompare(b.name))
                  .map(c => (
                 <div key={c.id} className="p-3 flex items-center gap-4 hover:bg-slate-50">
                   <span className="font-medium text-slate-700 flex-1 text-sm">{c.name}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Previsto:</span>
                      <input 
                        type="number" 
                        value={c.budget || 0} 
                        onChange={(e) => updateBudget(c.id, Number(e.target.value))}
                        className="w-20 text-right text-sm border-b border-slate-300 focus:border-blue-500 outline-none bg-transparent text-slate-900"
                      />
                   </div>
                   <button onClick={() => removeCategoryClick(c.id)} className="text-slate-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                 </div>
               ))}
            </div>
          </div>

          {/* Expense List */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="bg-rose-50 p-4 border-b border-rose-100 flex-none">
               <h3 className="font-bold text-rose-800">Despesas e Orçamento</h3>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
               {categories
                  .filter(c => c.type === 'expense')
                  .sort((a,b) => a.name.localeCompare(b.name))
                  .map(c => (
                 <div key={c.id} className="p-3 flex items-center gap-4 hover:bg-slate-50">
                   <span className="font-medium text-slate-700 flex-1 text-sm">{c.name}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Orçado:</span>
                      <input 
                        type="number" 
                        value={c.budget || 0} 
                        onChange={(e) => updateBudget(c.id, Number(e.target.value))}
                        className="w-20 text-right text-sm border-b border-slate-300 focus:border-blue-500 outline-none bg-transparent text-slate-900"
                      />
                   </div>
                   <button onClick={() => removeCategoryClick(c.id)} className="text-slate-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />
      
      {/* --- Danger Zone --- */}
      <div className="border border-red-200 bg-red-50 p-6 rounded-xl">
        <h3 className="text-red-700 font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/> Zona de Perigo
        </h3>
        <p className="text-sm text-red-600 mb-4">
            Ações irreversíveis que afetam todos os dados de lançamentos.
        </p>
        <div className="flex justify-end">
            <button 
                type="button"
                onClick={handleResetDatabaseClick} 
                className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-medium shadow-sm"
            >
                Apagar Todos os Lançamentos
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;