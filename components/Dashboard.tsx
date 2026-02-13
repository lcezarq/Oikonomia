import React, { useMemo } from 'react';
import { Transaction, Category, BankAccount } from '../types';
import { formatCurrency, formatMonthLong, formatDate } from '../services/utils';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  currentMonth: string; // Passed from App
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, accounts, currentMonth }) => {
  // Stats for the SELECTED month
  const stats = useMemo(() => {
    const filtered = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const totalIncome = filtered
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalExpense = filtered
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    
    const monthResult = totalIncome - totalExpense;

    return { totalIncome, totalExpense, monthResult };
  }, [transactions, currentMonth]);

  // Current Balances (All time calculated)
  const accountBalances = useMemo(() => {
    return accounts.map(acc => {
      // Income into this account
      const income = transactions
        .filter(t => t.accountId === acc.id && t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

      // Expenses from this account
      const expense = transactions
        .filter(t => t.accountId === acc.id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      // Transfers OUT of this account (Source)
      const transfersOut = transactions
        .filter(t => t.accountId === acc.id && t.type === 'transfer')
        .reduce((s, t) => s + t.amount, 0);

      // Transfers INTO this account (Destination)
      const transfersIn = transactions
        .filter(t => t.destinationAccountId === acc.id && t.type === 'transfer')
        .reduce((s, t) => s + t.amount, 0);

      return {
        ...acc,
        currentBalance: acc.initialBalance + income + transfersIn - expense - transfersOut
      };
    });
  }, [transactions, accounts]);

  const totalCurrentBalance = accountBalances.reduce((acc, curr) => acc + curr.currentBalance, 0);

  const chartData = useMemo(() => {
    // Last 6 months simplified, ending at the selected month
    const data: any[] = [];
    const [y, m] = currentMonth.split('-').map(Number);
    const refDate = new Date(y, m - 1, 1);
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      
      const income = transactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expense = transactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      data.push({ name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), Receitas: income, Despesas: expense });
    }
    return data;
  }, [transactions, currentMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
        <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
           Referência: {formatMonthLong(currentMonth)}
        </div>
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-sm font-medium text-slate-500">Receitas (Mês)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalIncome)}</p>
             </div>
             <div className="p-2 bg-emerald-100 rounded-lg">
               <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
             </div>
          </div>
          <div className="text-xs text-slate-400">Em {formatMonthLong(currentMonth)}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-sm font-medium text-slate-500">Despesas (Mês)</p>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(stats.totalExpense)}</p>
             </div>
             <div className="p-2 bg-rose-100 rounded-lg">
               <ArrowDownCircle className="w-6 h-6 text-rose-600" />
             </div>
          </div>
          <div className="text-xs text-slate-400">Em {formatMonthLong(currentMonth)}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Resultado (Mês)</p>
                <p className={`text-2xl font-bold ${stats.monthResult >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.monthResult)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
           </div>
           <div className="text-xs text-slate-400">Receitas - Despesas</div>
        </div>

        {/* Total Accumulated Balance Card */}
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-sm border border-slate-700 flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Saldo Geral (Caixa)</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalCurrentBalance)}
                </p>
              </div>
              <div className="p-2 bg-slate-700 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
           </div>
           <div className="text-xs text-slate-400">Saldo atual acumulado</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Fluxo de Caixa (Últimos 6 meses)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account Balances List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Contas Bancárias</h3>
          <div className="space-y-4">
            {accountBalances.map(acc => (
              <div key={acc.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                   <p className="font-medium text-slate-800">{acc.name}</p>
                   <p className="text-xs text-slate-500">Saldo Inicial: {formatCurrency(acc.initialBalance)}</p>
                </div>
                <div className={`font-bold ${acc.currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(acc.currentBalance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions (Filtered by month) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700">Lançamentos em {formatMonthLong(currentMonth)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions
                .filter(t => t.date.startsWith(currentMonth))
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-6 py-3 text-slate-800 font-medium">{t.description}</td>
                  <td className="px-6 py-3">
                    {t.type === 'transfer' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Transferência
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {categories.find(c => c.id === t.categoryId)?.name || 'Sem categoria'}
                        </span>
                    )}
                  </td>
                  <td className={`px-6 py-3 text-right font-medium ${t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-rose-600' : 'text-blue-600'}`}>
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
              {transactions.filter(t => t.date.startsWith(currentMonth)).length === 0 && (
                 <tr>
                   <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum lançamento neste mês.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;