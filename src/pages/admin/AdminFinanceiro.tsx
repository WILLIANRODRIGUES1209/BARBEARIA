import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export default function AdminFinanceiro() {
  const { state, addTransaction } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: 0, type: 'INCOME' as 'INCOME' | 'EXPENSE' });

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('MONTH');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('ALL');

  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return state.transactions.filter(t => {
      // 1. Date Filter
      if (dateFilter !== 'ALL') {
         const tDate = parseISO(t.date);
         if (dateFilter === 'TODAY' && !isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) })) return false;
         if (dateFilter === 'MONTH' && !isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      }
      
      // 2. Payment Method Filter (only applies to INCOME)
      if (paymentMethodFilter !== 'ALL' && t.type === 'INCOME') {
         if (!t.description.includes(paymentMethodFilter)) return false;
      }

      return true;
    });
  }, [state.transactions, dateFilter, paymentMethodFilter]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Calculate totals by payment method ignoring the current paymentMethodFilter
  // but respecting the date filter to show accurate boxes
  const totalsByMethod = useMemo(() => {
    const now = new Date();
    const dateFiltered = state.transactions.filter(t => {
      if (dateFilter === 'ALL') return true;
      const tDate = parseISO(t.date);
      if (dateFilter === 'TODAY') return isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) });
      if (dateFilter === 'MONTH') return isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) });
      return true;
    });

    const incomes = dateFiltered.filter(t => t.type === 'INCOME');
    
    return {
      'PIX': incomes.filter(t => t.description.includes('PIX')).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Crédito': incomes.filter(t => t.description.includes('Cartão de Crédito')).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Débito': incomes.filter(t => t.description.includes('Cartão de Débito')).reduce((sum, t) => sum + t.amount, 0),
      'Dinheiro': incomes.filter(t => t.description.includes('Dinheiro')).reduce((sum, t) => sum + t.amount, 0),
    };
  }, [state.transactions, dateFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description || newTx.amount <= 0) return;
    addTransaction({
      ...newTx,
      date: new Date().toISOString()
    });
    setIsAdding(false);
    setNewTx({ description: '', amount: 0, type: 'INCOME' });
  };

  const handleQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isNaN(Number(chatResponse)) || Number(chatResponse) <= 0) return;
    addTransaction({
      description: chatInput,
      amount: Number(chatResponse),
      type: 'EXPENSE',
      date: new Date().toISOString()
    });
    setChatInput('');
    setChatResponse('');
  };

  const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Financeiro</h1>
        
        <div className="flex items-center gap-4 bg-[#121212] p-1 border border-[#333] rounded-lg">
          <button onClick={() => setDateFilter('TODAY')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors ${dateFilter === 'TODAY' ? 'bg-[#1A1A1A] text-[#C5A059]' : 'text-[#777] hover:text-[#E0E0E0]'}`}>Hoje</button>
          <button onClick={() => setDateFilter('MONTH')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors ${dateFilter === 'MONTH' ? 'bg-[#1A1A1A] text-[#C5A059]' : 'text-[#777] hover:text-[#E0E0E0]'}`}>Mês</button>
          <button onClick={() => setDateFilter('ALL')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors ${dateFilter === 'ALL' ? 'bg-[#1A1A1A] text-[#C5A059]' : 'text-[#777] hover:text-[#E0E0E0]'}`}>Tudo</button>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancelar' : 'Nova Transação'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#00C85333]">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#00C85322] text-[#00C853] p-2 rounded">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#555] font-medium">Entradas</h3>
          </div>
          <p className="text-3xl font-light text-white">R$ {totalIncome.toFixed(2)}</p>
        </div>

        <div className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#FF3D0033]">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FF3D0022] text-[#FF3D00] p-2 rounded">
              <TrendingDown size={20} />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#555] font-medium">Saídas</h3>
          </div>
          <p className="text-3xl font-light text-white">R$ {totalExpense.toFixed(2)}</p>
        </div>

        <div className="bg-[#1A1A1A] p-6 rounded-2xl shadow-xl border border-[#C5A05933]">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#C5A059] text-[#0A0A0A] p-2 rounded">
              <DollarSign size={20} />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#888] font-medium">Saldo Atual</h3>
          </div>
          <p className={`text-3xl font-light ${balance >= 0 ? 'text-[#C5A059]' : 'text-[#FF3D00]'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222]">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#FF3D0022] text-[#FF3D00] p-2 rounded">
            <TrendingDown size={20} />
          </div>
          <h2 className="text-lg font-medium text-white">Lançamento Rápido de Gastos</h2>
        </div>
        <p className="text-xs text-[#888] mb-4">
          Registre gastos rápidos como cremes, navalhas ou qualquer outro produto da barbearia.
        </p>
        
        <form onSubmit={handleQuickExpense} className="flex gap-4 flex-wrap sm:flex-nowrap">
          <input 
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Produto Ex: Creme, Navalha..."
            className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#FF3D00] focus:outline-none transition-colors"
            required
          />
          <input 
            type="number"
            value={chatResponse}
            onChange={e => setChatResponse(e.target.value)}
            placeholder="Valor (R$)"
            step="0.01" min="0.01"
            className="w-full sm:w-32 px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#FF3D00] focus:outline-none transition-colors"
            required
          />
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-[#FF3D00] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#D84315] transition-colors"
          >
            Lançar Gasto
          </button>
        </form>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222] grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Descrição</label>
            <input 
              type="text" 
              required
              value={newTx.description}
              onChange={e => setNewTx({...newTx, description: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
              placeholder="Ex: Pagamento de Luz"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Valor (R$)</label>
            <input 
              type="number" 
              required
              min="0.01" step="any"
              value={newTx.amount || ''}
              onChange={e => setNewTx({...newTx, amount: e.target.value === '' ? 0 : Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Tipo</label>
            <select 
              value={newTx.type}
              onChange={e => setNewTx({...newTx, type: e.target.value as 'INCOME' | 'EXPENSE'})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors appearance-none"
            >
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded hover:bg-[#8E6D31] transition-colors">
              Registrar
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <div className="p-6 border-b border-[#222]">
          <h2 className="text-lg font-medium text-white mb-4">Recebimentos por Forma de Pagamento</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setPaymentMethodFilter(paymentMethodFilter === 'PIX' ? 'ALL' : 'PIX')}
              className={`p-4 rounded-xl border text-left transition-colors ${paymentMethodFilter === 'PIX' ? 'bg-[#00C85322] border-[#00C853] shadow-[0_0_15px_#00C85333]' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
            >
              <h3 className={`text-[10px] uppercase tracking-wider mb-2 ${paymentMethodFilter === 'PIX' ? 'text-[#00C853]' : 'text-[#888]'}`}>PIX</h3>
              <p className={`text-xl font-medium ${paymentMethodFilter === 'PIX' ? 'text-[#00C853]' : 'text-white'}`}>R$ {totalsByMethod['PIX'].toFixed(2)}</p>
            </button>
            <button 
              onClick={() => setPaymentMethodFilter(paymentMethodFilter === 'Cartão de Crédito' ? 'ALL' : 'Cartão de Crédito')}
              className={`p-4 rounded-xl border text-left transition-colors ${paymentMethodFilter === 'Cartão de Crédito' ? 'bg-[#00C85322] border-[#00C853] shadow-[0_0_15px_#00C85333]' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
            >
              <h3 className={`text-[10px] uppercase tracking-wider mb-2 ${paymentMethodFilter === 'Cartão de Crédito' ? 'text-[#00C853]' : 'text-[#888]'}`}>Crédito</h3>
              <p className={`text-xl font-medium ${paymentMethodFilter === 'Cartão de Crédito' ? 'text-[#00C853]' : 'text-white'}`}>R$ {totalsByMethod['Cartão de Crédito'].toFixed(2)}</p>
            </button>
            <button 
              onClick={() => setPaymentMethodFilter(paymentMethodFilter === 'Cartão de Débito' ? 'ALL' : 'Cartão de Débito')}
              className={`p-4 rounded-xl border text-left transition-colors ${paymentMethodFilter === 'Cartão de Débito' ? 'bg-[#00C85322] border-[#00C853] shadow-[0_0_15px_#00C85333]' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
            >
              <h3 className={`text-[10px] uppercase tracking-wider mb-2 ${paymentMethodFilter === 'Cartão de Débito' ? 'text-[#00C853]' : 'text-[#888]'}`}>Débito</h3>
              <p className={`text-xl font-medium ${paymentMethodFilter === 'Cartão de Débito' ? 'text-[#00C853]' : 'text-white'}`}>R$ {totalsByMethod['Cartão de Débito'].toFixed(2)}</p>
            </button>
            <button 
              onClick={() => setPaymentMethodFilter(paymentMethodFilter === 'Dinheiro' ? 'ALL' : 'Dinheiro')}
              className={`p-4 rounded-xl border text-left transition-colors ${paymentMethodFilter === 'Dinheiro' ? 'bg-[#00C85322] border-[#00C853] shadow-[0_0_15px_#00C85333]' : 'bg-[#1A1A1A] border-[#333] hover:border-[#555]'}`}
            >
              <h3 className={`text-[10px] uppercase tracking-wider mb-2 ${paymentMethodFilter === 'Dinheiro' ? 'text-[#00C853]' : 'text-[#888]'}`}>Dinheiro</h3>
              <p className={`text-xl font-medium ${paymentMethodFilter === 'Dinheiro' ? 'text-[#00C853]' : 'text-white'}`}>R$ {totalsByMethod['Dinheiro'].toFixed(2)}</p>
            </button>
          </div>
          {paymentMethodFilter !== 'ALL' && (
             <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-[#E0E0E0]">Filtrando por: <strong className="text-[#00C853]">{paymentMethodFilter}</strong></span>
                <button onClick={() => setPaymentMethodFilter('ALL')} className="text-[#FF3D00] hover:underline text-xs flex items-center gap-1">
                   Limpar Filtro <X size={12} />
                </button>
             </div>
          )}
        </div>
        <h2 className="text-lg font-medium text-white p-6 border-b border-[#222]">Histórico de Transações</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0C0C0C] border-b border-[#222]">
                <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Data</th>
                <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Descrição</th>
                <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Tipo</th>
                <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#777]">Nenhuma transação registrada.</td>
                </tr>
              ) : (
                sortedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#161616] transition-colors">
                    <td className="p-4 text-sm font-mono text-[#888]">{format(parseISO(t.date), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="p-4 font-medium text-white">{t.description}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold ${
                        t.type === 'INCOME' ? 'bg-[#00C85322] text-[#00C853]' : 'bg-[#FF3D0022] text-[#FF3D00]'
                      }`}>
                        {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-medium ${t.type === 'INCOME' ? 'text-[#00C853]' : 'text-[#FF3D00]'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
