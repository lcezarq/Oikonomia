export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const formatMonth = (monthString: string) => {
  // monthString is YYYY-MM
  if (!monthString) return '-';
  const [year, month] = monthString.split('-');
  return `${month}/${year}`;
};

export const formatMonthLong = (monthString: string) => {
  if (!monthString) return '-';
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const s = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  // Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const parseOFXDate = (ofxDate: string): string => {
  // OFX dates are typically YYYYMMDDHHMMSS...
  if (!ofxDate || ofxDate.length < 8) return new Date().toISOString().split('T')[0];
  const y = ofxDate.substring(0, 4);
  const m = ofxDate.substring(4, 6);
  const d = ofxDate.substring(6, 8);
  return `${y}-${m}-${d}`;
};

// Simple XML parser logic for OFX (Regex based for client-side simplicity)
export const parseOFX = (content: string) => {
  const transactions: any[] = [];
  
  // Split by STMTTRN blocks
  const rawTransactions = content.split('<STMTTRN>');
  
  // Skip header
  for (let i = 1; i < rawTransactions.length; i++) {
    const block = rawTransactions[i];
    
    // Extract fields
    const typeMatch = block.match(/<TRNTYPE>(.*?)(\n|<)/);
    const dateMatch = block.match(/<DTPOSTED>(.*?)(\n|<)/);
    const amountMatch = block.match(/<TRNAMT>(.*?)(\n|<)/);
    const memoMatch = block.match(/<MEMO>(.*?)(\n|<)/);
    const nameMatch = block.match(/<NAME>(.*?)(\n|<)/);
    
    if (dateMatch && amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const description = memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Sem descrição');
      
      transactions.push({
        rawDate: dateMatch[1].trim(),
        amount: amount,
        description: description.trim(),
        type: amount > 0 ? 'income' : 'expense'
      });
    }
  }
  return transactions;
};
