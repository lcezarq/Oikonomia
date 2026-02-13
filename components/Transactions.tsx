import React, { useState, useEffect } from 'react';
import { Transaction, Category, TransactionType, BankAccount } from '../types';
import { formatCurrency, generateId, formatMonthLong, formatDate } from '../services/utils';
import { Plus, Trash2, Search, Filter, Save, X, Edit, ArrowRightLeft, Layers, Lock, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TransactionsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: Category[];
  accounts: BankAccount[];
  currentMonth: string;
  closedUntil: string;
}

interface SplitItem {
    id: string;
    categoryId: string;
    amount: number;
    description: string;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, setTransactions, categories, accounts, currentMonth, closedUntil }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; transaction: Transaction | null }>({
    isOpen: false,
    transaction: null
  });

  // Split State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: '',
    type: 'expense',
    categoryId: '',
    description: '',
    amount: 0,
    supplier: '',
    invoiceNumber: '',
    accountId: '',
    destinationAccountId: '',
  });

  useEffect(() => {
    if (closedUntil) {
        setIsMonthLocked(currentMonth <= closedUntil);
    } else {
        setIsMonthLocked(false);
    }
  }, [currentMonth, closedUntil]);

  const isFormDateLocked = formData.date && closedUntil ? formData.date.substring(0, 7) <= closedUntil : false;

  useEffect(() => {
    if (!formData.date && currentMonth) {
        const today = new Date().toISOString().slice(0, 10);
        if (today.startsWith(currentMonth)) {
            setFormData(prev => ({ ...prev, date: today }));
        } else {
            setFormData(prev => ({ ...prev, date: `${currentMonth}-01` }));
        }
    }
  }, [currentMonth, formData.date]);

  useEffect(() => {
    if (isFormOpen && !editingId && accounts.length > 0 && !formData.accountId) {
      setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [isFormOpen, accounts, editingId]);

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultDate = today.startsWith(currentMonth) ? today : `${currentMonth}-01`;

    setFormData({
      date: defaultDate,
      type: 'expense',
      categoryId: '',
      description: '',
      amount: 0,
      supplier: '',
      invoiceNumber: '',
      accountId: accounts.length > 0 ? accounts[0].id : '',
      destinationAccountId: '',
    });
    setEditingId(null);
    setIsSplitMode(false);
    setSplitItems([]);
    setFormError(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setFormError(null);
    if (closedUntil && transaction.date.substring(0, 7) <= closedUntil) {
        // Just show alert here as it is an interaction blockage, not form validation
        // Could be a toast, but keeping simple for now
        // Ideally the button is disabled, but if clicked:
        return; 
    }
    setEditingId(transaction.id);
    setFormData({
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.categoryId,
      description: transaction.description,
      amount: transaction.amount,
      supplier: transaction.supplier,
      invoiceNumber: transaction.invoiceNumber,
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId,
    });
    setIsSplitMode(false);
    setIsFormOpen(true);
  };

  const addSplitItem = () => {
     setSplitItems([...splitItems, { id: generateId(), categoryId: '', amount: 0, description: '' }]);
  };
  
  const removeSplitItem = (id: string) => {
      setSplitItems(splitItems.filter(i => i.id !== id));
  };

  const updateSplitItem = (id: string, field: keyof SplitItem, value: any) => {
      setSplitItems(splitItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const getSplitTotal = () => splitItems.reduce((acc, item) => acc + item.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (isFormDateLocked) {
        setFormError("Não é possível salvar lançamentos em um mês fechado.");
        return;
    }

    if (!formData.description || !formData.amount || !formData.accountId) {
        setFormError("Preencha todos os campos obrigatórios.");
        return;
    }
    
    if (isSplitMode && formData.type !== 'transfer') {
        const totalSplit = getSplitTotal();
        if (Math.abs(totalSplit - (formData.amount || 0)) > 0.01) {
            setFormError(`A soma do rateio (${formatCurrency(totalSplit)}) deve ser igual ao valor total (${formatCurrency(formData.amount || 0)}).`);
            return;
        }
        if (splitItems.some(i => !i.categoryId || i.amount <= 0)) {
            setFormError("Preencha todas as categorias e valores do rateio (valores devem ser maiores que zero).");
            return;
        }

        const newTransactions: Transaction[] = splitItems.map(item => ({
            id: generateId(),
            date: formData.date!,
            description: item.description || formData.description!,
            amount: item.amount,
            type: formData.type as TransactionType,
            categoryId: item.categoryId,
            accountId: formData.accountId!,
            supplier: formData.supplier || '',
            invoiceNumber: formData.invoiceNumber || '',
            notes: `Rateio de: ${formData.description}`
        }));

        setTransactions(prev => [...newTransactions, ...prev]);
        setIsFormOpen(false);
        resetForm();
        return;
    }

    if (formData.type !== 'transfer' && !formData.categoryId) {
        setFormError("Selecione uma categoria.");
        return;
    }
    if (formData.type === 'transfer') {
        if (!formData.destinationAccountId) {
            setFormError("Selecione a conta de destino.");
            return;
        }
        if (formData.accountId === formData.destinationAccountId) {
            setFormError("A conta de destino não pode ser igual à conta de origem.");
            return;
        }
    }

    if (editingId) {
      setTransactions(prev => prev.map(t => {
        if (t.id === editingId) {
          return {
            ...t,
            date: formData.date!,
            description: formData.description!,
            amount: Number(formData.amount),
            type: formData.type as TransactionType,
            categoryId: formData.type === 'transfer' ? '' : formData.categoryId!,
            accountId: formData.accountId!,
            destinationAccountId: formData.type === 'transfer' ? formData.destinationAccountId : undefined,
            supplier: formData.type === 'transfer' ? '' : formData.supplier || '',
            invoiceNumber: formData.type === 'transfer' ? '' : formData.invoiceNumber || '',
          };
        }
        return t;
      }));
    } else {
      const newTransaction: Transaction = {
        id: generateId(),
        date: formData.date!,
        description: formData.description!,
        amount: Number(formData.amount),
        type: formData.type as TransactionType,
        categoryId: formData.type === 'transfer' ? '' : formData.categoryId!,
        accountId: formData.accountId!,
        destinationAccountId: formData.type === 'transfer' ? formData.destinationAccountId : undefined,
        supplier: formData.type === 'transfer' ? '' : formData.supplier || '',
        invoiceNumber: formData.type === 'transfer' ? '' : formData.invoiceNumber || '',
        notes: ''
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleDeleteClick = (e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();

    // Check lock based on transaction date
    if (t.date && closedUntil && t.date.substring(0, 7) <= closedUntil) {
        // Using alert here purely for info block, could be custom but low impact
        // Just fail silently visually or show a small tooltip?
        // Let's rely on the disabled look, but if clicked, do nothing.
        return;
    }
    setDeleteModal({ isOpen: true, transaction: t });
  };

  const confirmDelete = () => {
      if (deleteModal.transaction) {
          setTransactions(prev => prev.filter(tr => tr.id !== deleteModal.transaction!.id));
      }
      setDeleteModal({ isOpen: false, transaction: null });
  };

  const filteredTransactions = transactions
    .filter(t => t.date && t.date.startsWith(currentMonth))
    .filter(t => 
       t.description.toLowerCase().includes(filter.toLowerCase()) ||
       (t.supplier && t.supplier.toLowerCase().includes(filter.toLowerCase())) ||
       (t.categoryId && categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(filter.toLowerCase()))
    );

  const splitTotal = getSplitTotal();
  const splitRemaining = (formData.amount || 0) - splitTotal;

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, transaction: null })}
        onConfirm={confirmDelete}
        title="Excluir Lançamento"
        message={`Tem certeza que deseja excluir "${deleteModal.transaction?.description}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDanger={true}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               Lançamentos {isMonthLocked && <span title="Mês Fechado"><Lock className="w-5 h-5 text-amber-500" /></span>}
           </h2>
           <p className="text-sm text-slate-500">Exibindo dados de {formatMonthLong(currentMonth)}</p>
        </div>
        {!isMonthLocked ? (
            <button 
            type="button"
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
            <Plus className="w-4 h-4" /> Novo Lançamento
            </button>
        ) : (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium border border-amber-200">
                Mês Fechado para Edição
            </span>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-in fade-in slide-in-from-top-4 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{formError}</span>
              </div>
          )}

          {isFormDateLocked && !formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  Atenção: A data selecionada pertence a um mês fechado. Não será possível salvar.
              </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-slate-900 hover:text-slate-700'}`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-slate-900 hover:text-slate-700'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  disabled={isSplitMode}
                  onClick={() => setFormData({ ...formData, type: 'transfer' })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === 'transfer' ? 'bg-blue-500 text-white shadow-sm' : isSplitMode ? 'text-slate-300' : 'bg-white text-slate-900 hover:text-slate-700'}`}
                >
                  Transferência
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input
                type="text"
                required
                placeholder={formData.type === 'transfer' ? "Ex: Transferência para Poupança" : "Ex: Conta de Luz, Dízimo Fulano..."}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                 {formData.type === 'transfer' ? 'Conta de Origem' : 'Conta Bancária'}
              </label>
              <select
                required
                value={formData.accountId}
                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecione...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {formData.type === 'transfer' ? (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino</label>
                    <select
                        required
                        value={formData.destinationAccountId}
                        onChange={e => setFormData({ ...formData, destinationAccountId: e.target.value })}
                        className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Selecione...</option>
                        {accounts
                           .filter(acc => acc.id !== formData.accountId)
                           .map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                 </div>
            ) : (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                      Categoria
                      {!editingId && (
                        <button type="button" onClick={() => { setIsSplitMode(!isSplitMode); if(!isSplitMode) setSplitItems([]); }} className="ml-2 text-xs text-blue-600 hover:underline">
                            {isSplitMode ? '- Cancelar Rateio' : '+ Dividir (Rateio)'}
                        </button>
                      )}
                  </label>
                  {!isSplitMode ? (
                      <select
                        required
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Selecione...</option>
                        {categories
                        .filter(c => c.type === (formData.type as string))
                        .sort((a,b) => a.name.localeCompare(b.name)) 
                        .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                  ) : (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500">
                          Categoria será definida no rateio abaixo.
                      </div>
                  )}
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {(formData.type as TransactionType) !== 'transfer' && (
                <>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor / Contribuinte</label>
                    <input
                        type="text"
                        value={formData.supplier}
                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>

                    <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nota Fiscal / Recibo</label>
                    <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    </div>
                </>
            )}

            {/* SPLIT SECTION */}
            {isSplitMode && (formData.type as string) !== 'transfer' && (
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2 animate-in fade-in">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Detalhes do Rateio
                        </h4>
                        <button type="button" onClick={addSplitItem} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100">
                            + Adicionar Linha
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        {splitItems.map((item) => (
                            <div key={item.id} className="flex gap-2 items-start">
                                <select 
                                    value={item.categoryId}
                                    onChange={(e) => updateSplitItem(item.id, 'categoryId', e.target.value)}
                                    className="flex-1 bg-white text-slate-900 border border-slate-300 rounded p-1.5 text-sm"
                                >
                                    <option value="">Categoria...</option>
                                    {categories.filter(c => c.type === formData.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input 
                                    type="number" step="0.01" placeholder="Valor" 
                                    value={item.amount}
                                    onChange={(e) => updateSplitItem(item.id, 'amount', Number(e.target.value))}
                                    className="w-24 bg-white text-slate-900 border border-slate-300 rounded p-1.5 text-sm"
                                />
                                <input 
                                    type="text" placeholder="Desc. (Opcional)" 
                                    value={item.description}
                                    onChange={(e) => updateSplitItem(item.id, 'description', e.target.value)}
                                    className="flex-1 bg-white text-slate-900 border border-slate-300 rounded p-1.5 text-sm hidden md:block"
                                />
                                <button type="button" onClick={() => removeSplitItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {splitItems.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Clique em adicionar linha para começar a dividir o valor.</p>}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Restante a Alocar:</span>
                            <span className={`text-sm font-bold ${Math.abs(splitRemaining) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(splitRemaining)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-slate-600 mr-2">Total do Rateio:</span>
                            <span className={`text-sm font-bold ${Math.abs(splitRemaining) < 0.01 ? 'text-green-600' : 'text-slate-900'}`}>
                                {formatCurrency(splitTotal)}
                            </span>
                            <span className="text-xs text-slate-400 mx-1">/</span>
                            <span className="text-sm text-slate-500">{formatCurrency(formData.amount || 0)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isFormDateLocked}
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 ${isFormDateLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              >
                <Save className="w-4 h-4" /> {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por descrição, fornecedor..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 bg-white text-slate-900 rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Filtros avançados (Demo)">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Conta</th>
                <th className="px-6 py-3">Categoria/Destino</th>
                <th className="px-6 py-3">Fornecedor</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-800">{t.description}</div>
                    {t.invoiceNumber && <div className="text-xs text-slate-400">NF: {t.invoiceNumber}</div>}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {accounts.find(a => a.id === t.accountId)?.name || '-'}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {t.type === 'transfer' ? (
                         <span className="flex items-center gap-1 text-blue-600">
                             <ArrowRightLeft className="w-3 h-3" />
                             {accounts.find(a => a.id === t.destinationAccountId)?.name || 'Destino Desc.'}
                         </span>
                    ) : (
                        categories.find(c => c.id === t.categoryId)?.name || '-'
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{t.supplier || '-'}</td>
                  <td className={`px-6 py-3 text-right font-medium whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-rose-600' : 'text-blue-600'}`}>
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        type="button"
                        onClick={() => handleEdit(t)}
                        className={`text-slate-400 hover:text-blue-500 ${isMonthLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isMonthLocked ? "Mês fechado" : "Editar"}
                        disabled={isMonthLocked}
                      >
                        <Edit className="w-4 h-4 pointer-events-none" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteClick(e, t)}
                        className={`text-slate-400 hover:text-red-500`}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Nenhum lançamento encontrado em {formatMonthLong(currentMonth)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;