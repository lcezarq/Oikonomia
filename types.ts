export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  budget?: number; // Monthly budget
}

export interface BankAccount {
  id: string;
  name: string;
  initialBalance: number;
  startDate?: string; // ISO YYYY-MM-DD
}

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string; // Empty string if transfer
  accountId: string; // Source Account (or the account where money comes from)
  destinationAccountId?: string; // Target Account for transfers
  supplier: string; // Fornecedor ou Contribuinte
  invoiceNumber?: string; // Nota Fiscal
  notes?: string;
}

export interface ChartData {
  name: string;
  value: number;
  type?: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
}