import React, { useMemo } from 'react';
import { Transaction, Category, BankAccount } from '../types';
import { formatCurrency, formatMonthLong, formatDate } from '../services/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FileDown, FileText, TrendingUp, PieChart as PieIcon, Scale, Files } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: BankAccount[];
  currentMonth: string;
}

const cleanCategoryName = (name: string) => {
  return name.replace(/^[\d.]+\s+/, '');
};

const Reports: React.FC<ReportsProps> = ({ transactions, categories, accounts = [], currentMonth }) => {
  // -- Data Preparation for Charts (Visuals) --
  const pieData = useMemo(() => {
    const filtered = transactions.filter(t => t.date.startsWith(currentMonth));
    const income = filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    return [
      { name: 'Receitas', value: income },
      { name: 'Despesas', value: expense }
    ];
  }, [transactions, currentMonth]);

  const flowData = useMemo(() => {
    const daysInMonth = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${currentMonth}-${String(i).padStart(2, '0')}`;
        const dayTrans = transactions.filter(t => t.date === dayStr);
        const income = dayTrans.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
        const expense = dayTrans.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
        data.push({ name: String(i), Entradas: income, Saidas: expense });
    }
    return data;
  }, [transactions, currentMonth]);

  const budgetVsActualData = useMemo(() => {
    const currentTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    // Totals
    const totalIncReal = currentTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpReal = currentTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const totalIncBudget = categories.filter(c => c.type === 'income').reduce((s, c) => s + (c.budget || 0), 0);
    const totalExpBudget = categories.filter(c => c.type === 'expense').reduce((s, c) => s + (c.budget || 0), 0);

    return [
        { name: 'Receitas', Orçado: totalIncBudget, Realizado: totalIncReal },
        { name: 'Despesas', Orçado: totalExpBudget, Realizado: totalExpReal }
    ];
  }, [transactions, categories, currentMonth]);

  const accountBalanceData = useMemo(() => {
    return accounts.map(acc => {
      const income = transactions.filter(t => (t.accountId === acc.id && t.type === 'income') || (t.destinationAccountId === acc.id && t.type === 'transfer')).reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter(t => (t.accountId === acc.id && t.type === 'expense') || (t.accountId === acc.id && t.type === 'transfer')).reduce((s, t) => s + t.amount, 0);
      const balance = acc.initialBalance + income - expense;
      return { name: acc.name, value: balance > 0 ? balance : 0 }; 
    });
  }, [accounts, transactions]);


  // -- PDF Helper: Draw Bar Chart (Enhanced for Negative Values) --
  const addChartToPdf = (doc: jsPDF, title: string, data: { label: string, value: number, color: [number, number, number] }[], yPos: number, showValue = true) => {
      if (data.length === 0) return yPos;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, yPos - 5);
      
      const chartHeight = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const chartWidth = pageWidth - 28; // Dynamic width based on page size
      const startX = 14;
      
      // Calculate Range
      const values = data.map(d => d.value);
      const maxVal = Math.max(...values, 0); // Ensure at least 0 is top
      const minVal = Math.min(...values, 0); // Ensure at least 0 is bottom
      
      // Prevent division by zero if all values are 0
      const range = (maxVal - minVal) === 0 ? 100 : (maxVal - minVal);
      
      // Determine Zero Line Y Position relative to top of chart (yPos)
      const zeroY = yPos + (chartHeight * (maxVal / range));

      // Draw axis
      doc.setDrawColor(200, 200, 200);
      doc.line(startX, zeroY, startX + chartWidth, zeroY); // Zero Axis
      doc.line(startX, yPos, startX, yPos + chartHeight); // Y Axis Left
      
      const barWidth = Math.min(20, (chartWidth / data.length) * 0.7);
      const spacing = (chartWidth - (barWidth * data.length)) / (data.length + 1);
      
      data.forEach((d, i) => {
        const x = startX + spacing + (i * (barWidth + spacing));
        const barH = (Math.abs(d.value) / range) * chartHeight;
        
        // Positive goes up from ZeroY, Negative goes down from ZeroY
        const barY = d.value >= 0 ? zeroY - barH : zeroY;

        if (barH > 0) {
            doc.setFillColor(...d.color);
            doc.rect(x, barY, barWidth, barH, 'F');
        }
        
        // Label (truncated)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        const label = d.label.length > 10 ? d.label.substring(0, 8) + '..' : d.label;
        // Place label at bottom of chart area to avoid clutter near zero line
        doc.text(label, x + (barWidth/2), yPos + chartHeight + 4, { align: 'center' });
        
        // Value on top/bottom of bar
        if (showValue && Math.abs(d.value) > 0) {
            doc.setFontSize(6);
            doc.setTextColor(0);
            const valText = formatCurrency(d.value).replace('R$', '').trim();
            const textY = d.value >= 0 ? barY - 1 : barY + barH + 3;
            doc.text(valText, x + (barWidth/2), textY, { align: 'center' });
        }
      });
      
      doc.setTextColor(0); // Reset
      return yPos + chartHeight + 15; // Return next Y
  };

  // -- Helper for Donut Chart (PDF) --
  const addDonutChartToPdf = (doc: jsPDF, title: string, data: { label: string, value: number, color: [number, number, number] }[], yPos: number) => {
    if (data.length === 0) return yPos;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPos - 5);

    const cx = 60; // Center X for the pie
    const cy = yPos + 35; // Center Y
    const radius = 25;
    const innerRadius = 12; // Radius of the hole

    const total = data.reduce((s, d) => s + d.value, 0);
    let startAngle = 0;

    // Draw Slices
    data.forEach(d => {
        if (d.value <= 0) return;
        
        const sliceAngle = (d.value / total) * 360;
        const endAngle = startAngle + sliceAngle;

        doc.setFillColor(...d.color);
        
        // Triangle Fan strategy for sectors
        const step = 2; // degrees
        for (let a = startAngle; a < endAngle; a += step) {
             let a2 = a + step;
             if (a2 > endAngle) a2 = endAngle;
             
             const r1 = (a * Math.PI) / 180;
             const r2 = (a2 * Math.PI) / 180;
             
             doc.triangle(
                 cx, cy,
                 cx + radius * Math.cos(r1), cy + radius * Math.sin(r1),
                 cx + radius * Math.cos(r2), cy + radius * Math.sin(r2),
                 'F'
             );
        }

        startAngle += sliceAngle;
    });

    // Draw white circle in middle to make it a donut
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');

    // Legend on the right
    let legendY = yPos + 10;
    const legendX = 110;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Sort for legend display (highest first)
    [...data].sort((a,b) => b.value - a.value).slice(0, 10).forEach(d => {
        doc.setFillColor(...d.color);
        doc.rect(legendX, legendY, 3, 3, 'F');
        doc.setTextColor(50);
        const percent = ((d.value / total) * 100).toFixed(1) + '%';
        // Truncate label
        const label = d.label.length > 25 ? d.label.substring(0, 23) + '..' : d.label;
        doc.text(`${label} (${percent})`, legendX + 5, legendY + 2.5);
        legendY += 5;
    });

    doc.setTextColor(0);
    return yPos + 80;
  };
  
  // -- Helper for Grouped Bar Chart (PDF) --
  const addGroupedChartToPdf = (doc: jsPDF, title: string, data: { label: string, v1: number, v2: number }[], yPos: number) => {
      if (data.length === 0) return yPos;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, yPos - 5);
      
      const chartHeight = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const chartWidth = pageWidth - 28; // Dynamic width
      const startX = 14;
      const baseline = yPos + chartHeight;
      
      // Draw axis
      doc.setDrawColor(200, 200, 200);
      doc.line(startX, baseline, startX + chartWidth, baseline); 
      doc.line(startX, yPos, startX, baseline); 
      
      const maxVal = Math.max(...data.map(d => Math.max(d.v1, d.v2))) || 1;
      const groupWidth = (chartWidth / data.length);
      const barWidth = groupWidth * 0.35;
      const spacing = groupWidth * 0.1;
      
      data.forEach((d, i) => {
          const xGroup = startX + (i * groupWidth) + spacing;
          
          // Bar 1 (Income - Green)
          const h1 = (d.v1 / maxVal) * chartHeight;
          if (h1 > 0) {
            doc.setFillColor(16, 185, 129);
            doc.rect(xGroup, baseline - h1, barWidth, h1, 'F');
          }

          // Bar 2 (Expense - Red)
          const h2 = (d.v2 / maxVal) * chartHeight;
          if (h2 > 0) {
            doc.setFillColor(244, 63, 94);
            doc.rect(xGroup + barWidth + 2, baseline - h2, barWidth, h2, 'F');
          }

          // Label
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80);
          doc.text(d.label, xGroup + barWidth, baseline + 4, { align: 'center' });
      });

      // Legend
      const legendY = yPos; 
      doc.setFillColor(16, 185, 129); doc.rect(startX + chartWidth - 30, legendY, 3, 3, 'F');
      doc.text('Receitas', startX + chartWidth - 25, legendY + 3);
      doc.setFillColor(244, 63, 94); doc.rect(startX + chartWidth - 30, legendY + 5, 3, 3, 'F');
      doc.text('Despesas', startX + chartWidth - 25, legendY + 8);

      doc.setTextColor(0);
      return yPos + chartHeight + 15;
  };

  // -- Generate Content for a Single Report Type --
  const generateReportContent = (doc: jsPDF, reportType: string) => {
    const title = reportType === 'Balancete' ? 'Balancete' : `Relatório: ${reportType}`;
    
    let periodText = `Referência: ${formatMonthLong(currentMonth)}`;
    if (reportType === 'Relatório Anual') {
        const year = currentMonth.split('-')[0];
        periodText = `Ano de Referência: ${year}`;
    }
    
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(periodText, 14, 30);
    doc.setTextColor(0);

    let tableBody: any[] = [];
    let tableHead: string[] = [];
    let startY = 45;

    // Filter transactions for the selected month (common case)
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

    if (reportType === 'Balancete') {
        const startOfMonthStr = `${currentMonth}-01`;

        const banksInitial = accounts.reduce((acc, bank) => acc + bank.initialBalance, 0);
        
        const prevTrans = transactions.filter(t => t.date < startOfMonthStr);
        const prevIncome = prevTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const prevExpense = prevTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        const saldoInicial = banksInitial + prevIncome - prevExpense;

        const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        const superavitDeficit = monthIncome - monthExpense;
        const saldoFinal = saldoInicial + superavitDeficit;

        let y = 45;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        const labelX = 14;
        const valX = 180;

        const drawSummaryLine = (label: string, value: number, color: [number, number, number] = [0,0,0]) => {
             doc.setTextColor(0,0,0);
             doc.text(label, labelX, y);
             doc.setTextColor(...color);
             doc.text(formatCurrency(value), valX, y, { align: 'right' });
             y += 6;
        };

        drawSummaryLine("SALDO INICIAL", saldoInicial);
        drawSummaryLine("TOTAL DE RECEITAS", monthIncome, [0, 128, 0]);
        drawSummaryLine("TOTAL DE DESPESAS", monthExpense, [200, 0, 0]);
        
        doc.setTextColor(0,0,255);
        doc.text("SUPERÁVIT/DÉFICIT (R-D)", labelX, y);
        doc.setTextColor(superavitDeficit >= 0 ? 0 : 255, superavitDeficit >= 0 ? 0 : 0, superavitDeficit >= 0 ? 255 : 0);
        doc.text(formatCurrency(superavitDeficit), valX, y, { align: 'right' });
        y += 6;

        doc.setTextColor(0,0,0);
        drawSummaryLine("SALDO FINAL", saldoFinal);

        startY = y + 15;

        const getGroupedData = (type: 'income' | 'expense') => {
             const grouped: {[key: string]: number} = {};
             monthTransactions.filter(t => t.type === type).forEach(t => {
                 if(!grouped[t.categoryId]) grouped[t.categoryId] = 0;
                 grouped[t.categoryId] += t.amount;
             });
             
             return Object.keys(grouped).map(catId => {
                 const cat = categories.find(c => c.id === catId);
                 return {
                     name: cat ? cleanCategoryName(cat.name) : 'Sem Categoria',
                     amount: grouped[catId]
                 };
             }).sort((a, b) => a.name.localeCompare(b.name));
        };

        const incomeGroups = getGroupedData('income');
        const expenseGroups = getGroupedData('expense');

        if (incomeGroups.length > 0) {
            const body = incomeGroups.map(g => [g.name, formatCurrency(g.amount)]);
            body.push(['Total de Receitas', formatCurrency(monthIncome)]);

            autoTable(doc, {
                head: [['Receitas', 'Valor']],
                body: body,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: { 
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 40, halign: 'right' }
                },
                didParseCell: (data) => {
                    if (data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [41, 128, 185];
                        data.cell.styles.textColor = [255, 255, 255];
                    }
                }
            });
            startY = (doc as any).lastAutoTable.finalY + 10;
        }

        if (expenseGroups.length > 0) {
            const body = expenseGroups.map(g => [g.name, formatCurrency(g.amount)]);
            body.push(['Total de Despesas', formatCurrency(monthExpense)]);

            autoTable(doc, {
                head: [['Despesas', 'Valor']],
                body: body,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: { 
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 40, halign: 'right' }
                },
                didParseCell: (data) => {
                     if (data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [41, 128, 185];
                        data.cell.styles.textColor = [255, 255, 255];
                    }
                }
            });
        }
        
    } else if (reportType === 'Receitas') {
        const type = 'income';
        
        // Group by Category to sort by Value
        const grouped: {[key: string]: {name: string, amount: number, details: Transaction[]}} = {};
        
        monthTransactions.filter(t => t.type === type).forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? cleanCategoryName(cat.name) : 'Sem Categoria';
            if(!grouped[t.categoryId]) grouped[t.categoryId] = { name: catName, amount: 0, details: [] };
            grouped[t.categoryId].amount += t.amount;
            grouped[t.categoryId].details.push(t);
        });

        const sortedGroups = Object.values(grouped).sort((a,b) => b.amount - a.amount);
        
        // Donut Chart Data
        const chartData = sortedGroups.slice(0, 12).map((d, i) => ({
            label: d.name,
            value: d.amount,
            // Generate a palette of greens/teals/blues for income
            color: [
                Math.max(0, 16 - i * 5), 
                Math.max(100, 185 - i * 15), 
                Math.max(100, 129 + i * 10)
            ] as [number, number, number]
        }));
        
        startY = addDonutChartToPdf(doc, `Gráfico de ${reportType}`, chartData, startY);

        // Table - Changed Headers and Columns as requested
        tableHead = ['Categoria', 'Fornecedor', 'Valor'];
        
        sortedGroups.forEach(group => {
            // Category Header Row
            tableBody.push([{ content: `${group.name} - Total: ${formatCurrency(group.amount)}`, colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
            // Details
            group.details.sort((a,b) => a.date.localeCompare(b.date)).forEach(t => {
                tableBody.push([
                    '', // Indent
                    t.supplier || 'Não informado',
                    formatCurrency(t.amount)
                ]);
            });
        });
        
        // Add Total Row
        const total = monthTransactions.filter(t => t.type === type).reduce((acc, t) => acc + t.amount, 0);
        tableBody.push(['', 'TOTAL GERAL', { content: formatCurrency(total), styles: { fontStyle: 'bold' } }]);

    } else if (reportType === 'Despesas') {
        const type = 'expense';
        const grouped: {[key: string]: {name: string, amount: number, details: Transaction[]}} = {};
        
        monthTransactions.filter(t => t.type === type).forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? cleanCategoryName(cat.name) : 'Sem Categoria';
            if(!grouped[t.categoryId]) grouped[t.categoryId] = { name: catName, amount: 0, details: [] };
            grouped[t.categoryId].amount += t.amount;
            grouped[t.categoryId].details.push(t);
        });
        
        const sortedGroups = Object.values(grouped).sort((a,b) => b.amount - a.amount);
        
        // Donut Chart Data for Expenses (Reds/Pinks)
        const chartData = sortedGroups.slice(0, 12).map((d, i) => ({
            label: d.name,
            value: d.amount,
            color: [
                Math.max(150, 244 - i * 10), 
                Math.max(0, 63 - i * 5), 
                Math.max(50, 94 + i * 10)
            ] as [number, number, number]
        }));
        
        startY = addDonutChartToPdf(doc, `Gráfico de ${reportType}`, chartData, startY);

        // Table Layout matching Income Report
        tableHead = ['Categoria', 'Fornecedor', 'Valor'];
        
        sortedGroups.forEach(group => {
            tableBody.push([{ content: `${group.name} - Total: ${formatCurrency(group.amount)}`, colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
            group.details.sort((a,b) => a.date.localeCompare(b.date)).forEach(t => {
                tableBody.push([
                    '', 
                    t.supplier || t.description || 'Não informado',
                    formatCurrency(t.amount)
                ]);
            });
        });
        
        const total = monthTransactions.filter(t => t.type === type).reduce((acc, t) => acc + t.amount, 0);
        tableBody.push(['', 'TOTAL GERAL', { content: formatCurrency(total), styles: { fontStyle: 'bold' } }]);

    } else if (reportType === 'Fluxo de Caixa') {
        const daysInMonth = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).getDate();
        const dailyData = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStr = `${currentMonth}-${String(i).padStart(2, '0')}`;
          const dayTrans = transactions.filter(t => t.date === dayStr);
          const income = dayTrans.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
          const expense = dayTrans.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
          const balance = income - expense;
          dailyData.push({ label: String(i), value: balance });
        }
        
        // Filter out zero-movement days for chart clarity
        const chartData = dailyData
          .filter(d => d.value !== 0) 
          .map(d => ({
             label: d.label,
             value: d.value,
             color: (d.value >= 0 ? [59, 130, 246] : [239, 68, 68]) as [number, number, number]
          }));
        
        startY = addChartToPdf(doc, 'Saldo Diário (Entradas - Saídas)', chartData, startY);

        // Group transactions by date
        const groupedByDate: Record<string, Transaction[]> = {};
        monthTransactions.forEach(t => {
            if (!groupedByDate[t.date]) groupedByDate[t.date] = [];
            groupedByDate[t.date].push(t);
        });

        // Get sorted dates
        const sortedDates = Object.keys(groupedByDate).sort();

        tableHead = ['Categoria', 'Fornecedor', 'Descrição', 'Valor'];
        
        sortedDates.forEach(date => {
            const dayTrans = groupedByDate[date];
            const income = dayTrans.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
            const expense = dayTrans.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
            const dailyNet = income - expense;
            
            // Header for Date
            tableBody.push([{ 
                content: `${formatDate(date)} - Saldo do Dia: ${formatCurrency(dailyNet)}`, 
                colSpan: 4, 
                styles: { 
                    fillColor: dailyNet >= 0 ? [219, 234, 254] : [254, 226, 226], // Light Blue or Light Red
                    textColor: dailyNet >= 0 ? [30, 64, 175] : [153, 27, 27],
                    fontStyle: 'bold',
                    halign: 'left'
                } 
            }]);

            // Transaction Rows
            dayTrans.forEach(t => {
                const catName = categories.find(c => c.id === t.categoryId)?.name 
                    ? cleanCategoryName(categories.find(c => c.id === t.categoryId)!.name) 
                    : (t.type === 'transfer' ? 'Transferência' : 'Sem Categoria');

                const isExpense = t.type === 'expense';
                const sign = isExpense ? '-' : '';
                const color = isExpense ? [200, 0, 0] : [0, 100, 0];

                tableBody.push([
                    catName,
                    t.supplier || '-',
                    t.description,
                    { content: `${sign}${formatCurrency(t.amount)}`, styles: { textColor: color as any } }
                ]);
            });
        });

        const totalInc = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExp = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        // Spacer
        tableBody.push(['', '', '', '']);
        // Totals
        tableBody.push([
            { content: 'TOTAL DO MÊS', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(totalInc - totalExp), styles: { fontStyle: 'bold', textColor: (totalInc - totalExp) >= 0 ? [0,100,0] : [200,0,0] } }
        ]);

    } else if (reportType === 'Orçado x Realizado') {
        const chartData = [
            { label: 'Rec. Orç', value: budgetVsActualData[0].Orçado, color: [148, 163, 184] },
            { label: 'Rec. Real', value: budgetVsActualData[0].Realizado, color: [16, 185, 129] },
            { label: 'Desp. Orç', value: budgetVsActualData[1].Orçado, color: [148, 163, 184] },
            { label: 'Desp. Real', value: budgetVsActualData[1].Realizado, color: [244, 63, 94] },
        ];
        startY = addChartToPdf(doc, 'Comparativo Geral', chartData as any, startY);

        tableHead = ['Categoria', 'Orçado/Previsto', 'Realizado', 'Diferença'];
        
        const actuals: {[key: string]: number} = {};
        monthTransactions.forEach(t => {
             actuals[t.categoryId] = (actuals[t.categoryId] || 0) + t.amount;
        });

        tableBody.push([{content: 'RECEITAS', colSpan: 4, styles: { fillColor: [220, 252, 231], fontStyle: 'bold' }}]);
        const incomeCats = categories
            .filter(c => c.type === 'income')
            .map(c => ({...c, real: actuals[c.id] || 0}))
            .sort((a,b) => b.real - a.real);

        incomeCats.forEach(c => {
             const diff = c.real - (c.budget || 0);
             tableBody.push([
               cleanCategoryName(c.name),
               formatCurrency(c.budget || 0),
               formatCurrency(c.real),
               formatCurrency(diff)
             ]);
        });
        
        const totalIncBudget = incomeCats.reduce((s, c) => s + (c.budget||0), 0);
        const totalIncReal = incomeCats.reduce((s, c) => s + c.real, 0);
        tableBody.push(['TOTAL RECEITAS', formatCurrency(totalIncBudget), formatCurrency(totalIncReal), formatCurrency(totalIncReal - totalIncBudget)]);

        tableBody.push([{content: 'DESPESAS', colSpan: 4, styles: { fillColor: [255, 228, 230], fontStyle: 'bold' }}]);
        const expenseCats = categories
            .filter(c => c.type === 'expense')
            .map(c => ({...c, real: actuals[c.id] || 0}))
            .sort((a,b) => b.real - a.real);

        expenseCats.forEach(c => {
             const diff = (c.budget || 0) - c.real;
             tableBody.push([
               cleanCategoryName(c.name),
               formatCurrency(c.budget || 0),
               formatCurrency(c.real),
               formatCurrency(diff)
             ]);
        });
          
         const totalExpBudget = expenseCats.reduce((s, c) => s + (c.budget||0), 0);
         const totalExpReal = expenseCats.reduce((s, c) => s + c.real, 0);
         tableBody.push(['TOTAL DESPESAS', formatCurrency(totalExpBudget), formatCurrency(totalExpReal), formatCurrency(totalExpBudget - totalExpReal)]);
         
         const netBudget = totalIncBudget - totalExpBudget;
         const netReal = totalIncReal - totalExpReal;
         tableBody.push([{content: 'RESULTADO GERAL', colSpan: 4, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' }}]);
         tableBody.push(['LÍQUIDO (Rec - Desp)', formatCurrency(netBudget), formatCurrency(netReal), formatCurrency(netReal - netBudget)]);

    } else if (reportType === 'Relatório Anual') {
        const year = currentMonth.split('-')[0];
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        
        // --- 1. Chart: Income vs Expense per month ---
        const monthlyComparison = months.map(m => {
            const mTrans = transactions.filter(t => t.date.startsWith(`${year}-${m}`));
            const inc = mTrans.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
            const exp = mTrans.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
            return { label: m, v1: inc, v2: exp };
        });
        
        startY = addGroupedChartToPdf(doc, `Comparativo Mensal - ${year}`, monthlyComparison, startY);

        // --- 2. Table: Split into Income and Expense, sorted alphabetically by code ---
        tableHead = ['Categoria', ...months, 'Total'];
        const yearTransactions = transactions.filter(t => t.date.startsWith(year));
        
        // Helper to process rows
        const getRows = (type: 'income' | 'expense') => {
            return categories
                .filter(c => c.type === type)
                .map(cat => {
                    let rowTotal = 0;
                    const monthVals = months.map(m => {
                        const val = yearTransactions
                            .filter(t => t.categoryId === cat.id && t.date.substring(5, 7) === m)
                            .reduce((sum, t) => sum + t.amount, 0);
                        rowTotal += val;
                        return val;
                    });
                    // Store originalName for sorting, but catName for display
                    return { catName: cleanCategoryName(cat.name), monthVals, rowTotal, originalName: cat.name };
                })
                .filter(row => row.rowTotal > 0)
                .sort((a, b) => a.originalName.localeCompare(b.originalName)); // Sort by full name (including code)
        };

        const incomeRows = getRows('income');
        const expenseRows = getRows('expense');

        // Income Group
        tableBody.push([{ content: 'RECEITAS', colSpan: 14, styles: { fillColor: [220, 252, 231], fontStyle: 'bold', halign: 'center' } }]);
        incomeRows.forEach(row => {
             const displayRow = [row.catName];
             row.monthVals.forEach(v => displayRow.push(v === 0 ? '-' : formatCurrency(v).replace('R$', '').trim()));
             displayRow.push(formatCurrency(row.rowTotal));
             tableBody.push(displayRow);
        });
        
        // Totals Income
        const totalIncMonths = months.map((_, i) => incomeRows.reduce((s, r) => s + r.monthVals[i], 0));
        const totalIncYear = incomeRows.reduce((s, r) => s + r.rowTotal, 0);
        tableBody.push([
            { content: 'TOTAL RECEITAS', styles: { fontStyle: 'bold' }}, 
            ...totalIncMonths.map(v => formatCurrency(v).replace('R$', '').trim()), 
            formatCurrency(totalIncYear)
        ]);

        // Spacer
        tableBody.push([{ content: '', colSpan: 14, styles: { fillColor: [255, 255, 255] } }]);

        // Expense Group
        tableBody.push([{ content: 'DESPESAS', colSpan: 14, styles: { fillColor: [255, 228, 230], fontStyle: 'bold', halign: 'center' } }]);
        expenseRows.forEach(row => {
             const displayRow = [row.catName];
             row.monthVals.forEach(v => displayRow.push(v === 0 ? '-' : formatCurrency(v).replace('R$', '').trim()));
             displayRow.push(formatCurrency(row.rowTotal));
             tableBody.push(displayRow);
        });

        // Totals Expense
        const totalExpMonths = months.map((_, i) => expenseRows.reduce((s, r) => s + r.monthVals[i], 0));
        const totalExpYear = expenseRows.reduce((s, r) => s + r.rowTotal, 0);
        tableBody.push([
            { content: 'TOTAL DESPESAS', styles: { fontStyle: 'bold' }}, 
            ...totalExpMonths.map(v => formatCurrency(v).replace('R$', '').trim()), 
            formatCurrency(totalExpYear)
        ]);

        // Final Result
        const netMonths = totalIncMonths.map((inc, i) => inc - totalExpMonths[i]);
        const netYear = totalIncYear - totalExpYear;
        
        tableBody.push([
            { content: 'RESULTADO LÍQUIDO', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }}, 
            ...netMonths.map(v => ({ content: formatCurrency(v).replace('R$', '').trim(), styles: { textColor: v < 0 ? [200, 0, 0] : [0, 100, 0], fontStyle: 'bold' }})), 
            { content: formatCurrency(netYear), styles: { fontStyle: 'bold', textColor: netYear < 0 ? [200, 0, 0] : [0, 100, 0] } }
        ]);
        
        autoTable(doc, {
             head: [tableHead],
             body: tableBody,
             startY: startY,
             styles: { fontSize: 6, cellPadding: 1.5 }, 
             headStyles: { fillColor: [41, 128, 185], halign: 'center' },
             columnStyles: { 0: { cellWidth: 35 } } // Category column wider
        });

        // --- 3. New Section: Financial Summary Month-by-Month (Transposed) ---
        // Calculate Starting Balance for the Year (accounts + prior movements)
        const startOfYearDate = `${year}-01-01`;
        const accountsInitial = accounts.reduce((acc, a) => acc + a.initialBalance, 0);
        const prevTrans = transactions.filter(t => t.date < startOfYearDate);
        const prevInc = prevTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const prevExp = prevTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        let runningBalance = accountsInitial + prevInc - prevExp;

        const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const rowInitial: any[] = [{ content: 'Saldo Inicial', styles: { fontStyle: 'bold' } }];
        const rowIncome: any[] = [{ content: 'Receitas', styles: { fontStyle: 'bold' } }];
        const rowExpense: any[] = [{ content: 'Despesas', styles: { fontStyle: 'bold' } }];
        const rowResult: any[] = [{ content: 'Superávit/Déficit', styles: { fontStyle: 'bold' } }];
        const rowFinal: any[] = [{ content: 'Saldo Final', styles: { fontStyle: 'bold' } }];

        months.forEach((m) => {
             const mTransactions = transactions.filter(t => t.date.startsWith(`${year}-${m}`));
             const inc = mTransactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
             const exp = mTransactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
             const result = inc - exp;
             const final = runningBalance + result;

             // Push formatted values
             const valInitial = formatCurrency(runningBalance).replace('R$', '').trim();
             const valInc = formatCurrency(inc).replace('R$', '').trim();
             const valExp = formatCurrency(exp).replace('R$', '').trim();
             const valResult = formatCurrency(result).replace('R$', '').trim();
             const valFinal = formatCurrency(final).replace('R$', '').trim();

             rowInitial.push({ content: valInitial, styles: { halign: 'right' } });
             rowIncome.push({ content: valInc, styles: { textColor: [0, 128, 0], halign: 'right' } });
             rowExpense.push({ content: valExp, styles: { textColor: [200, 0, 0], halign: 'right' } });
             rowResult.push({ content: valResult, styles: { textColor: result >= 0 ? [0, 100, 0] : [200, 0, 0], fontStyle: 'bold', halign: 'right' } });
             rowFinal.push({ content: valFinal, styles: { fontStyle: 'bold', halign: 'right' } });
             
             runningBalance = final;
        });

        const summaryHead = [['', ...monthShortNames]];
        const summaryBody = [rowInitial, rowIncome, rowExpense, rowResult, rowFinal];

        const summaryStartY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.text("Resumo Financeiro Mensal", 14, summaryStartY - 5);

        autoTable(doc, {
            head: summaryHead,
            body: summaryBody,
            startY: summaryStartY,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 58, 138], halign: 'center' },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold' }
            }
        });

        return; 
    }

    if (tableHead.length > 0) {
        autoTable(doc, {
            head: [tableHead],
            body: tableBody,
            startY: startY,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [41, 128, 185] }
        });
    }
  };

  const generatePDF = (reportType: string) => {
    // Check if it's Annual Report for landscape
    const isAnnual = reportType === 'Relatório Anual';
    const doc = new jsPDF({
        orientation: isAnnual ? 'landscape' : 'portrait'
    });
    generateReportContent(doc, reportType);
    doc.save(`relatorio_${reportType.toLowerCase().replace(/\s/g, '_')}_${currentMonth}.pdf`);
  };

  const generateAllReports = () => {
    const doc = new jsPDF();
    const reports = ['Balancete', 'Relatório Anual', 'Fluxo de Caixa', 'Receitas', 'Despesas', 'Orçado x Realizado'];
    
    reports.forEach((type, index) => {
        if (index > 0) {
             const isAnnual = type === 'Relatório Anual';
             doc.addPage('a4', isAnnual ? 'landscape' : 'portrait');
        }
        generateReportContent(doc, type);
    });

    doc.save(`relatorio_completo_${currentMonth}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h2>
        <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
                Referência: {formatMonthLong(currentMonth)}
            </div>
            <button 
                onClick={generateAllReports}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm"
            >
                <Files className="w-4 h-4" /> Relatório Completo
            </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button onClick={() => generatePDF('Balancete')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <Scale className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-blue-800">Balancete</span>
          </button>
          <button onClick={() => generatePDF('Relatório Anual')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-blue-800">Relatório Anual</span>
          </button>
          <button onClick={() => generatePDF('Fluxo de Caixa')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <TrendingUp className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-blue-800">Fluxo de Caixa</span>
          </button>
          <button onClick={() => generatePDF('Receitas')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <PieIcon className="w-6 h-6 text-emerald-400 group-hover:text-emerald-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-800">Receitas</span>
          </button>
          <button onClick={() => generatePDF('Despesas')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <PieIcon className="w-6 h-6 text-rose-400 group-hover:text-rose-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-rose-800">Despesas</span>
          </button>
          <button onClick={() => generatePDF('Orçado x Realizado')} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition flex flex-col items-center gap-2 text-center group">
             <FileDown className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
             <span className="text-sm font-medium text-slate-600 group-hover:text-blue-800">Orçado x Realizado</span>
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Account Balances (For Balancete) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-semibold text-slate-700 mb-4">Saldo por Conta (Balancete)</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie data={accountBalanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {accountBalanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 2. Month Summary (Income vs Expense) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Resumo do Mês ({formatMonthLong(currentMonth)})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Budget vs Actual */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Orçado x Realizado (Geral)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActualData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="Orçado" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realizado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;