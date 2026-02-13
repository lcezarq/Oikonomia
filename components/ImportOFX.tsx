import React, { useState, useRef } from 'react';
import { Transaction, Category, BankAccount } from '../types';
import { parseOFX, parseOFXDate, generateId, formatCurrency } from '../services/utils';
import { Upload, FileText, Check, AlertCircle, Layers, Trash2, X, FileSpreadsheet, Wand2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportOFXProps {
  onImport: (transactions: Transaction[]) => void;
  categories: Category[];
  accounts: BankAccount[];
  closedUntil: string;
  transactions: Transaction[]; // Historical data for smart matching
}

interface SplitItem {
    categoryId: string;
    amount: number;
}

const ImportOFX: React.FC<ImportOFXProps> = ({ onImport, categories, accounts, closedUntil, transactions }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'classify'>('upload');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Import Type State
  const [importType, setImportType] = useState<'ofx' | 'excel'>('ofx');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  
  // Split Modal State
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTargetItem, setSplitTargetItem] = useState<any>(null);
  const [splitRows, setSplitRows] = useState<SplitItem[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);

  // Smart Classification Helper
  const findSmartMatch = (description: string, amount: number) => {
      if (!description) return null;
      const normalizedDesc = description.toLowerCase().trim();
      
      // Sort history by date descending (most recent first)
      const sortedHistory = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Find first match with similar description
      const match = sortedHistory.find(t => 
          t.description.toLowerCase().includes(normalizedDesc) || 
          normalizedDesc.includes(t.description.toLowerCase())
      );

      if (match) {
          return {
              categoryId: match.categoryId,
              supplier: match.supplier,
              // If exact match is very close, we might reuse description too, but usually safer to keep imported one
          };
      }
      return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (importType === 'ofx') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const parsed = parseOFX(content);
          
          const mapped = parsed.map(p => {
             // 1. Try explicit Category match by name (legacy)
             let matchedCat = categories.find(c => 
               p.description.toLowerCase().includes(c.name.toLowerCase()) && c.type === p.type
             );
             
             let categoryId = matchedCat ? matchedCat.id : '';
             let supplier = '';

             // 2. Try Smart Match from History
             if (!categoryId) {
                 const smartMatch = findSmartMatch(p.description, p.amount);
                 if (smartMatch) {
                     categoryId = smartMatch.categoryId;
                     supplier = smartMatch.supplier || '';
                 }
             }

             return {
               ...p,
               tempId: generateId(),
               accountId: selectedAccountId,
               categoryId: categoryId,
               description: p.description,
               supplier: supplier, 
               invoiceNumber: '',
               isAutoMatched: !!categoryId // Flag for UI
             };
          });
    
          setPreviewData(mapped);
          setStep('classify');
        };
        reader.readAsText(file);
    } else {
        // EXCEL IMPORT
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            const getVal = (row: any, potentialKeys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of potentialKeys) {
                    const foundKey = rowKeys.find(rk => rk.trim().toUpperCase() === key.toUpperCase());
                    if (foundKey) return row[foundKey];
                }
                return undefined;
            };

            const mapped = jsonData.map((row: any) => {
                // ... Date parsing logic (same as before) ...
                const valDate = getVal(row, ['DATA', 'Data', 'Date']);
                let rawDate = new Date().toISOString().split('T')[0];
                if (valDate instanceof Date) {
                    const d = valDate;
                    rawDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                } else if (typeof valDate === 'string') {
                    const parts = valDate.trim().split('/');
                    if (parts.length === 3) rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    else if (valDate.includes('-')) rawDate = valDate;
                } else if (typeof valDate === 'number') {
                     const dateInfo = XLSX.SSF.parse_date_code(valDate);
                     if (dateInfo) rawDate = `${dateInfo.y}-${String(dateInfo.m).padStart(2, '0')}-${String(dateInfo.d).padStart(2, '0')}`;
                }

                // ... Amount parsing logic ...
                const valAmount = getVal(row, ['VALOR', 'Valor', 'Value', 'Amount']);
                let amount = 0;
                if (typeof valAmount === 'number') amount = valAmount;
                else if (typeof valAmount === 'string') {
                    const clean = valAmount.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                    amount = parseFloat(clean);
                }
                if (isNaN(amount)) amount = 0;

                const valAccount = getVal(row, ['CONTA', 'Conta', 'Account']);
                const accountName = String(valAccount || '').trim();
                const matchedAccount = accounts.find(a => a.name.toLowerCase() === accountName.toLowerCase());
                
                const valCat = getVal(row, ['CATEGORIA/DESTINO', 'Categoria', 'Category', 'Destino']);
                const catDestName = String(valCat || '').trim();
                
                let categoryId = '';
                let transferDestId = '';

                const matchedDestAccount = accounts.find(a => a.name.toLowerCase() === catDestName.toLowerCase());
                if (matchedDestAccount) {
                    transferDestId = matchedDestAccount.id;
                    categoryId = `TRANSFER_${transferDestId}`;
                } else {
                    const matchedCat = categories.find(c => c.name.toLowerCase() === catDestName.toLowerCase());
                    if (matchedCat) categoryId = matchedCat.id;
                }

                const valDesc = getVal(row, ['DESCRIÇÃO', 'Descrição', 'Descricao', 'Description', 'Memo']);
                const description = valDesc ? String(valDesc).trim() : 'Sem descrição';

                const valSupplier = getVal(row, ['FORNECEDOR', 'Fornecedor', 'Supplier']);
                let supplier = valSupplier ? String(valSupplier).trim() : '';

                const valInvoice = getVal(row, ['NOTA FISCAL', 'Nota Fiscal', 'Nota', 'Invoice']);
                const invoice = valInvoice ? String(valInvoice).trim() : '';

                // --- SMART MATCH (If category or supplier missing) ---
                let isAutoMatched = false;
                if (!categoryId) {
                    const smartMatch = findSmartMatch(description, amount);
                    if (smartMatch) {
                        categoryId = smartMatch.categoryId;
                        if (!supplier) supplier = smartMatch.supplier || '';
                        isAutoMatched = true;
                    }
                }

                return {
                    tempId: generateId(),
                    rawDate: rawDate.replace(/-/g, ''),
                    dateOverride: rawDate,
                    amount: amount,
                    description: description,
                    accountId: matchedAccount ? matchedAccount.id : '',
                    categoryId: categoryId,
                    supplier: supplier,
                    invoiceNumber: invoice,
                    type: amount > 0 ? 'income' : 'expense',
                    isAutoMatched: isAutoMatched
                };
            });

            setPreviewData(mapped);
            setStep('classify');
        };
        reader.readAsBinaryString(file);
    }
  };

  const updateItem = (tempId: string, field: string, value: string) => {
    setPreviewData(prev => prev.map(p => p.tempId === tempId ? { ...p, [field]: value } : p));
  };

  // --- Split Logic (Same as before) ---
  const openSplitModal = (item: any) => {
      setSplitError(null);
      setSplitTargetItem(item);
      setSplitRows([{ categoryId: item.categoryId || '', amount: Math.abs(item.amount) }]);
      setSplitModalOpen(true);
  };

  const addSplitRow = () => {
      setSplitRows([...splitRows, { categoryId: '', amount: 0 }]);
  };

  const updateSplitRow = (index: number, field: keyof SplitItem, value: any) => {
      const newRows = [...splitRows];
      newRows[index] = { ...newRows[index], [field]: value };
      setSplitRows(newRows);
  };

  const removeSplitRow = (index: number) => {
      setSplitRows(splitRows.filter((_, i) => i !== index));
  };

  const confirmSplit = () => {
      if (!splitTargetItem) return;
      setSplitError(null);

      const totalSplit = splitRows.reduce((acc, row) => acc + row.amount, 0);
      const targetAmount = Math.abs(splitTargetItem.amount);
      
      if (Math.abs(totalSplit - targetAmount) > 0.01) {
          setSplitError(`A soma do rateio (${formatCurrency(totalSplit)}) deve ser igual ao valor do item (${formatCurrency(targetAmount)})`);
          return;
      }

      const newItems = splitRows.map(row => ({
          ...splitTargetItem,
          tempId: generateId(),
          amount: splitTargetItem.amount > 0 ? row.amount : -row.amount,
          categoryId: row.categoryId,
          description: `${splitTargetItem.description} (Rateio)`
      }));

      setPreviewData(prev => {
          const index = prev.findIndex(p => p.tempId === splitTargetItem.tempId);
          if (index === -1) return prev;
          const before = prev.slice(0, index);
          const after = prev.slice(index + 1);
          return [...before, ...newItems, ...after];
      });

      setSplitModalOpen(false);
      setSplitTargetItem(null);
  };

  // --- Finalize ---
  const finalizeImport = () => {
    setErrorMsg(null);
    const missingAccount = previewData.some(p => !p.accountId);
    if (missingAccount) {
        setErrorMsg("Alguns lançamentos não têm conta bancária definida. Por favor, selecione a conta para cada linha.");
        return;
    }

    const finalTransactions: Transaction[] = previewData.map(p => {
      const isTransfer = p.categoryId && p.categoryId.startsWith('TRANSFER_');
      let type: 'income' | 'expense' | 'transfer' = p.amount > 0 ? 'income' : 'expense';
      let catId = p.categoryId;
      let accountId = p.accountId || selectedAccountId; 
      let destinationAccountId: string | undefined = undefined;

      if (isTransfer) {
          type = 'transfer';
          const targetAccId = p.categoryId.replace('TRANSFER_', '');
          catId = ''; 
          if (p.amount < 0) {
              destinationAccountId = targetAccId;
          } else {
              const originalSource = accountId;
              accountId = targetAccId;
              destinationAccountId = originalSource;
          }
      }

      const dateStr = p.dateOverride || parseOFXDate(p.rawDate);

      return {
        id: generateId(),
        date: dateStr,
        description: p.description,
        amount: Math.abs(p.amount),
        type: type,
        categoryId: catId || (type === 'transfer' ? '' : (type === 'income' ? categories[0].id : categories.find(c => c.type === 'expense')?.id || '')),
        accountId: accountId,
        destinationAccountId: destinationAccountId,
        supplier: p.supplier || (type === 'transfer' ? '' : 'Importado'),
        invoiceNumber: p.invoiceNumber || '',
      };
    });
    
    onImport(finalTransactions);
    setPreviewData([]);
    setStep('upload');
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-slate-800">Importação de Dados</h2>
       
       {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <span>{errorMsg}</span>
          </div>
       )}

       {/* Toggle Switch */}
       {step === 'upload' && (
           <div className="flex justify-center mb-4">
               <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                   <button 
                    onClick={() => setImportType('ofx')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${importType === 'ofx' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       Arquivo OFX
                   </button>
                   <button 
                    onClick={() => setImportType('excel')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${importType === 'excel' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       Planilha Excel
                   </button>
               </div>
           </div>
       )}

       {step === 'upload' && (
         <div className={`bg-white p-12 rounded-xl shadow-sm border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${importType === 'ofx' ? 'border-blue-300 hover:border-blue-500' : 'border-green-300 hover:border-green-500'}`}>
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${importType === 'ofx' ? 'bg-blue-50' : 'bg-green-50'}`}>
             {importType === 'ofx' ? <Upload className="w-8 h-8 text-blue-600" /> : <FileSpreadsheet className="w-8 h-8 text-green-600" />}
           </div>
           <h3 className="text-xl font-semibold text-slate-700 mb-2">
               {importType === 'ofx' ? 'Selecione o arquivo OFX' : 'Selecione a Planilha Excel'}
           </h3>
           <p className="text-slate-500 mb-6 max-w-md">
             {importType === 'ofx' 
                ? 'Suportamos arquivos .OFX ou .OFC. Selecione abaixo a conta de destino.'
                : 'Suportamos .XLSX ou .XLS. O arquivo deve conter: Data, Descrição, Conta, Categoria/Destino, Fornecedor, Valor.'}
           </p>

           {importType === 'ofx' && (
               <div className="w-full max-w-xs mb-4 text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino (OFX)</label>
                <select 
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-white text-slate-900 rounded-lg border-slate-300 border px-3 py-2"
                >
                    {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
               </div>
           )}

           <input 
             type="file" 
             ref={fileInputRef}
             accept={importType === 'ofx' ? ".ofx,.ofc" : ".xlsx,.xls"}
             onChange={handleFileChange}
             className="hidden" 
           />
           <button 
            onClick={() => {
              setErrorMsg(null);
              if(importType === 'ofx' && !selectedAccountId && accounts.length > 0) {
                 setSelectedAccountId(accounts[0].id);
              }
              if (accounts.length === 0) {
                 setErrorMsg("Crie uma conta bancária primeiro nas configurações.");
                 return;
              }
              fileInputRef.current?.click();
            }}
            className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${importType === 'ofx' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
           >
             Escolher Arquivo
           </button>
         </div>
       )}

       {step === 'classify' && (
         <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
           <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div className="flex items-center gap-3">
               <FileText className="text-blue-600" />
               <span className="font-semibold text-blue-800">{previewData.length} lançamentos encontrados</span>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm text-blue-600">
                     <Wand2 className="w-4 h-4" />
                     <span>Identificação Inteligente Ativa</span>
                 </div>
                 <button 
                    onClick={finalizeImport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                 >
                    <Check className="w-4 h-4" /> Confirmar Importação
                 </button>
             </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
             <table className="w-full text-sm text-left min-w-[1200px]">
               <thead className="bg-slate-50 text-slate-600">
                 <tr>
                   <th className="px-4 py-3 w-32">Data</th>
                   <th className="px-4 py-3 w-48">Conta</th>
                   <th className="px-4 py-3">Descrição</th>
                   <th className="px-4 py-3 w-40">Fornecedor</th>
                   <th className="px-4 py-3 w-28">Nota Fiscal</th>
                   <th className="px-4 py-3 text-right w-32">Valor</th>
                   <th className="px-4 py-3 w-56">Classificação</th>
                   <th className="px-4 py-3 w-10"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {previewData.map((item) => {
                    const isIncome = item.amount > 0;
                    return (
                      <tr key={item.tempId} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 text-slate-500">
                            {item.dateOverride ? parseOFXDate(item.dateOverride.replace(/-/g,'')) : parseOFXDate(item.rawDate)}
                        </td>
                        <td className="px-4 py-3">
                           {/* Account Selector per row */}
                           <select 
                            value={item.accountId}
                            onChange={(e) => updateItem(item.tempId, 'accountId', e.target.value)}
                            className={`w-full bg-white text-slate-900 border rounded px-2 py-1 focus:ring-2 outline-none ${!item.accountId ? 'border-red-300' : 'border-slate-200'}`}
                           >
                               <option value="">Selecione...</option>
                               {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                           </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                         <td className="px-4 py-3">
                          <input 
                            type="text" 
                            placeholder="Fornecedor"
                            value={item.supplier}
                            onChange={(e) => updateItem(item.tempId, 'supplier', e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            placeholder="Nº"
                            value={item.invoiceNumber}
                            onChange={(e) => updateItem(item.tempId, 'invoiceNumber', e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-3 relative">
                          {item.isAutoMatched && <Wand2 className="w-3 h-3 text-blue-400 absolute top-2 right-2" title="Preenchido automaticamente pelo histórico" />}
                          <select 
                            value={item.categoryId}
                            onChange={(e) => updateItem(item.tempId, 'categoryId', e.target.value)}
                            className={`w-full p-2 rounded border text-slate-900 ${!item.categoryId ? 'border-amber-300 bg-amber-50 text-slate-900' : 'border-slate-200 bg-white'}`}
                          >
                            <option value="">Selecione...</option>
                            <optgroup label="Categorias">
                                {categories
                                .filter(c => c.type === (isIncome ? 'income' : 'expense'))
                                .sort((a,b) => a.name.localeCompare(b.name))
                                .map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Transferências">
                                {accounts
                                    .filter(acc => acc.id !== item.accountId) // Don't show self
                                    .map(acc => (
                                        <option key={`TRANSFER_${acc.id}`} value={`TRANSFER_${acc.id}`}>
                                            {isIncome ? `Recebido de ${acc.name}` : `Transferir para ${acc.name}`}
                                        </option>
                                    ))
                                }
                            </optgroup>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                            <button 
                                onClick={() => openSplitModal(item)}
                                className="text-slate-400 hover:text-blue-600 p-1"
                                title="Dividir Lançamento"
                            >
                                <Layers className="w-4 h-4" />
                            </button>
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
           </div>
         </div>
       )}

       {/* Split Modal */}
       {splitModalOpen && splitTargetItem && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                       <h3 className="font-semibold text-slate-800">Dividir Lançamento (Rateio)</h3>
                       <button onClick={() => setSplitModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                   </div>
                   <div className="p-6">
                       {splitError && (
                          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                             <AlertCircle className="w-4 h-4 shrink-0" />
                             <span>{splitError}</span>
                          </div>
                       )}

                       <div className="mb-4 text-sm bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                           <p><strong>Descrição:</strong> {splitTargetItem.description}</p>
                           <p><strong>Valor Total:</strong> {formatCurrency(Math.abs(splitTargetItem.amount))}</p>
                       </div>

                       <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                           {splitRows.map((row, idx) => (
                               <div key={idx} className="flex gap-2 items-center">
                                   <select 
                                       value={row.categoryId}
                                       onChange={(e) => updateSplitRow(idx, 'categoryId', e.target.value)}
                                       className="flex-1 bg-white border border-slate-300 rounded p-2 text-sm text-slate-900"
                                   >
                                       <option value="">Selecione a Categoria...</option>
                                       {categories
                                        .filter(c => c.type === (splitTargetItem.amount > 0 ? 'income' : 'expense'))
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                       }
                                   </select>
                                   <input 
                                       type="number" step="0.01" 
                                       value={row.amount}
                                       onChange={(e) => updateSplitRow(idx, 'amount', Number(e.target.value))}
                                       className="w-28 bg-white border border-slate-300 rounded p-2 text-sm text-slate-900"
                                   />
                                   <button onClick={() => removeSplitRow(idx)} className="text-slate-400 hover:text-red-500">
                                       <Trash2 className="w-4 h-4" />
                                   </button>
                               </div>
                           ))}
                           <button onClick={addSplitRow} className="text-sm text-blue-600 hover:underline font-medium">+ Adicionar Linha</button>
                       </div>

                       <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                           <span className="text-sm font-medium">Soma do Rateio:</span>
                           <span className={`text-lg font-bold ${Math.abs(splitRows.reduce((a,b)=>a+b.amount,0) - Math.abs(splitTargetItem.amount)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                               {formatCurrency(splitRows.reduce((a,b)=>a+b.amount,0))}
                           </span>
                       </div>
                   </div>
                   <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                       <button onClick={() => setSplitModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                       <button onClick={confirmSplit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Aplicar Rateio</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default ImportOFX;