import React, { useMemo } from 'react';
import { Transaction, Category, BankAccount } from '../types';
import { formatMonthLong, formatDate, formatCurrency } from '../services/utils';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportDataProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  currentMonth: string;
}

const ExportData: React.FC<ExportDataProps> = ({ transactions, categories, accounts, currentMonth }) => {
  
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, currentMonth]);

  const prepareData = () => {
    return filteredTransactions.map(t => {
      const accountName = accounts.find(a => a.id === t.accountId)?.name || 'Conta Removida';
      let categoryName = '';
      let obs = t.notes || '';

      if (t.type === 'transfer') {
        categoryName = 'Transferência';
        const destAccount = accounts.find(a => a.id === t.destinationAccountId)?.name;
        obs = `Para: ${destAccount} ${obs}`;
      } else {
        categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Sem Categoria';
      }

      return {
        'Data': formatDate(t.date),
        'Descrição': t.description,
        'Tipo': t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
        'Categoria': categoryName,
        'Valor': t.amount,
        'Conta': accountName,
        'Fornecedor': t.supplier || '',
        'Nota Fiscal': t.invoiceNumber || '',
        'Observações': obs
      };
    });
  };

  const exportExcel = () => {
    const data = prepareData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");
    XLSX.writeFile(workbook, `lancamentos_${currentMonth}.xlsx`);
  };

  const exportCSV = () => {
    const data = prepareData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lancamentos_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Exportar Dados</h2>
        <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
           Referência: {formatMonthLong(currentMonth)}
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Exportar Lançamentos do Mês</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Foram encontrados <strong>{filteredTransactions.length}</strong> lançamentos em {formatMonthLong(currentMonth)}. 
          Selecione o formato desejado para download.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          <button 
            onClick={exportExcel}
            className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md group"
            disabled={filteredTransactions.length === 0}
          >
            <div className="bg-emerald-500 p-2 rounded-lg group-hover:bg-emerald-600 transition-colors">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block text-xs text-emerald-100 font-medium uppercase tracking-wider">Formato</span>
              <span className="block font-bold">Excel (.xlsx)</span>
            </div>
          </button>

          <button 
            onClick={exportCSV}
            className="flex items-center gap-3 px-6 py-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md group"
            disabled={filteredTransactions.length === 0}
          >
             <div className="bg-slate-600 p-2 rounded-lg group-hover:bg-slate-700 transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block text-xs text-slate-300 font-medium uppercase tracking-wider">Formato</span>
              <span className="block font-bold">CSV (.csv)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {filteredTransactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Prévia dos dados ({filteredTransactions.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Data</th>
                  <th className="px-6 py-3 whitespace-nowrap">Descrição</th>
                  <th className="px-6 py-3 whitespace-nowrap">Conta</th>
                  <th className="px-6 py-3 whitespace-nowrap">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.slice(0, 5).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-6 py-3 text-slate-700">{t.description}</td>
                    <td className="px-6 py-3 text-slate-500">
                         {accounts.find(a => a.id === t.accountId)?.name}
                    </td>
                    <td className={`px-6 py-3 font-medium ${t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-rose-600' : 'text-blue-600'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length > 5 && (
                    <tr>
                        <td colSpan={4} className="px-6 py-3 text-center text-xs text-slate-400 italic">
                            ... e mais {filteredTransactions.length - 5} linhas
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportData;