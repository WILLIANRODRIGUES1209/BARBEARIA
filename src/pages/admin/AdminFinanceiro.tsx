import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Bot, Send, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export default function AdminFinanceiro() {
  const { state, addTransaction } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: 0, type: 'INCOME' as 'INCOME' | 'EXPENSE' });

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('MONTH');

  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return state.transactions.filter(t => {
      if (dateFilter === 'ALL') return true;
      const tDate = parseISO(t.date);
      if (dateFilter === 'TODAY') {
        return isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) });
      }
      if (dateFilter === 'MONTH') {
        return isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) });
      }
      return true;
    });
  }, [state.transactions, dateFilter]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setIsSendingChat(true);
    setChatResponse('');
    
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro no servidor.");
      }
      
      setChatResponse(data.replyText || "Lançamento processado.");
      setChatInput('');
    } catch (err) {
      console.error(err);
      setChatResponse(err instanceof Error ? err.message : "Ocorreu um erro ao comunicar com a IA.");
    } finally {
      setIsSendingChat(false);
    }
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
          <div className="bg-[#2563EB22] text-[#2563EB] p-2 rounded">
            <Bot size={20} />
          </div>
          <h2 className="text-lg font-medium text-white">Assistente Financeiro</h2>
        </div>
        <p className="text-xs text-[#888] mb-4">
          Digite seus gastos ou ganhos como se estivesse conversando. Ex: "Gastei 50 reais em navalha hoje"
        </p>
        
        <form onSubmit={handleChatSubmit} className="flex gap-4">
          <input 
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            disabled={isSendingChat}
            placeholder="O que você gastou ou recebeu?"
            className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#2563EB] focus:outline-none transition-colors"
          />
          <button 
            type="submit" 
            disabled={isSendingChat || !chatInput.trim()}
            className="bg-[#2563EB] text-white font-bold p-3 rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[56px]"
          >
            {isSendingChat ? <Loader2 size={24} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>

        {chatResponse && (
          <div className="mt-4 p-4 bg-[#1A1A1A] border border-[#333] rounded-xl flex gap-3">
            <Bot size={20} className="text-[#2563EB] shrink-0 mt-0.5" />
            <p className="text-sm text-[#E0E0E0]">{chatResponse}</p>
          </div>
        )}
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
              min="0.01" step="0.01"
              value={newTx.amount}
              onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
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
