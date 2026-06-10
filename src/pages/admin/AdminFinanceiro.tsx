import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Calendar as CalendarIcon, Check, Trash2, Users, RefreshCw } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import TransactionHistoryList from '../../components/TransactionHistoryList';
import toast from 'react-hot-toast';

export default function AdminFinanceiro() {
  const { state, addTransaction, addAppointment, refreshData } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: 0, type: 'INCOME' as 'INCOME' | 'EXPENSE' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const initFetch = async () => {
      setIsRefreshing(true);
      try {
        await refreshData(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRefreshing(false);
      }
    };
    initFetch();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const loadToast = toast.loading('Buscando novos dados do banco...');
    try {
      await refreshData(true);
      toast.success('Finanças sincronizadas com sucesso!', { id: loadToast });
    } catch (err: any) {
      toast.error('Erro ao buscar dados: ' + err.message, { id: loadToast });
    } finally {
      setIsRefreshing(false);
    }
  };

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('MONTH');

  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('ALL');

  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');

  // Unique/Deduplicated transactions in-memory to prevent historic race conditions from corrupting totals
  const uniqueTransactions = useMemo(() => {
    const seenRefs = new Set<string>();
    return state.transactions.filter(t => {
      const match = t.description.match(/\(Ref:\s*([^)]+)\)/);
      if (match) {
        const refId = match[1];
        const uniqueKey = `${t.type}-${refId}`;
        if (seenRefs.has(uniqueKey)) {
          return false; // Skip duplicate of same type and reference
        }
        seenRefs.add(uniqueKey);
      }
      return true;
    });
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return uniqueTransactions.filter(t => {
      // 1. Date Filter
      if (dateFilter !== 'ALL') {
         const tDate = parseISO(t.date);
         if (dateFilter === 'TODAY' && !isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) })) return false;
         if (dateFilter === 'MONTH' && !isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      }
      
      // 2. Payment Method Filter (only applies to INCOME)
      if (paymentMethodFilter !== 'ALL' && t.type === 'INCOME') {
         const desc = t.description.toUpperCase();
         if (paymentMethodFilter === 'PIX') {
           if (!desc.includes('PIX')) return false;
         } else if (paymentMethodFilter === 'Cartão de Crédito') {
           const matchesCredit = desc.includes('CREDITO') || desc.includes('CRÉDITO') || 
                                 ((desc.includes('CARTÃO') || desc.includes('CARTAO')) && !desc.includes('DEBITO') && !desc.includes('DÉBITO'));
           if (!matchesCredit) return false;
         } else if (paymentMethodFilter === 'Cartão de Débito') {
           if (!desc.includes('DEBITO') && !desc.includes('DÉBITO')) return false;
         } else if (paymentMethodFilter === 'Dinheiro') {
           if (!desc.includes('DINHEIRO')) return false;
         }
      }

      return true;
    });
  }, [uniqueTransactions, dateFilter, paymentMethodFilter]);

  // Individualized Finance calculations per Barber respecting active Date Filter
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    
    // Deduplicate appointments by unique ID (avoid twin entries)
    const uniqueMap = new Map<string, typeof state.appointments[0]>();
    state.appointments.forEach(a => {
      if (a.id && a.status === 'COMPLETED') {
        uniqueMap.set(a.id, a);
      }
    });

    return Array.from(uniqueMap.values()).filter(a => {
      // Date Filter
      if (dateFilter !== 'ALL') {
         const tDate = parseISO(a.date);
         if (dateFilter === 'TODAY' && !isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) })) return false;
         if (dateFilter === 'MONTH' && !isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      }
      return true;
    });
  }, [state.appointments, dateFilter]);

  const barberFinances = useMemo(() => {
    return state.barbers.map(barber => {
      // Find all transactions directly linked or related to this barber
      const barberTransactions = filteredTransactions.filter(t => {
        // 1. Direct tag check
        if (t.description.includes(`[Barbeiro: ${barber.id}]`)) {
          return true;
        }
        
        // 2. Reference check via appointment
        const match = t.description.match(/Ref:\s*([^\s)]+)/);
        if (match) {
          const appointmentId = match[1];
          const appt = state.appointments.find(a => a.id === appointmentId);
          if (appt && appt.barberId === barber.id) {
            return true;
          }
        }
        
        // 3. Name fallback check for Commissions (expense)
        if (t.type === 'EXPENSE') {
          const descLower = t.description.toLowerCase();
          const cleanBarberName = barber.name.toLowerCase().trim();
          if (descLower.includes('comissão') || descLower.includes('comissao')) {
            if (cleanBarberName && (descLower.includes(cleanBarberName) || descLower.includes(`(${cleanBarberName})`))) {
              return true;
            }
          }
        }

        return false;
      });

      const incomeTxs = barberTransactions.filter(t => t.type === 'INCOME');
      const expenseTxs = barberTransactions.filter(t => t.type === 'EXPENSE');

      let gross = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
      let commission = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
      let count = incomeTxs.length;

      // Fallback: If there are completed appointments in the active filter range 
      // check if any of them are not accounted for in incomeTxs
      const apptsOfBarber = filteredAppointments.filter(a => a.barberId === barber.id);
      apptsOfBarber.forEach(appt => {
        const isRepresented = incomeTxs.some(t => 
          t.description.includes(`Ref: ${appt.id}`) ||
          (t.description.includes('Venda PDV') && Math.abs(new Date(t.date).getTime() - new Date(appt.date).getTime()) <= 45000)
        );
        
        if (!isRepresented) {
          const service = state.services.find(s => s.id === appt.serviceId);
          const price = service?.price || 0;
          const comPercent = barber.comissao || 0;
          const comm = (price * comPercent) / 100;
          
          gross += price;
          commission += comm;
          count += 1;
        }
      });

      const net = gross - commission;

      return {
        barber,
        count,
        gross,
        commission,
        net
      };
    });
  }, [state.barbers, filteredAppointments, state.services, filteredTransactions, state.appointments]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Calculate totals by payment method ignoring the current paymentMethodFilter
  // but respecting the date filter to show accurate boxes
  const totalsByMethod = useMemo(() => {
    const now = new Date();
    const dateFiltered = uniqueTransactions.filter(t => {
      if (dateFilter === 'ALL') return true;
      const tDate = parseISO(t.date);
      if (dateFilter === 'TODAY') return isWithinInterval(tDate, { start: startOfDay(now), end: endOfDay(now) });
      if (dateFilter === 'MONTH') return isWithinInterval(tDate, { start: startOfMonth(now), end: endOfMonth(now) });
      return true;
    });

    const incomes = dateFiltered.filter(t => t.type === 'INCOME');
    
    return {
      'PIX': incomes.filter(t => t.description.toUpperCase().includes('PIX')).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Crédito': incomes.filter(t => {
        const desc = t.description.toUpperCase();
        return desc.includes('CREDITO') || desc.includes('CRÉDITO') || 
               ((desc.includes('CARTÃO') || desc.includes('CARTAO')) && !desc.includes('DEBITO') && !desc.includes('DÉBITO'));
      }).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Débito': incomes.filter(t => {
        const desc = t.description.toUpperCase();
        return desc.includes('DEBITO') || desc.includes('DÉBITO');
      }).reduce((sum, t) => sum + t.amount, 0),
      'Dinheiro': incomes.filter(t => t.description.toUpperCase().includes('DINHEIRO')).reduce((sum, t) => sum + t.amount, 0),
    };
  }, [uniqueTransactions, dateFilter]);

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

        <div className="flex items-center gap-3">
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest border border-dashed border-[#C5A059]/40 hover:border-[#C5A059] text-[#C5A059]/90 hover:text-[#C5A059] bg-[#121212] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Sincronizando...' : 'Atualizar'}
          </button>

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all cursor-pointer"
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            {isAdding ? 'Cancelar' : 'Nova Transação'}
          </button>
        </div>
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

      {/* SEÇÃO: FATURAMENTO INDIVIDUALIZADO POR BARBEIRO */}
      <div className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222]">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#C5A05922] text-[#C5A059] p-2 rounded">
            <DollarSign size={20} />
          </div>
          <h2 className="text-lg font-medium text-white">Faturamento por Barbeiro</h2>
        </div>
        <p className="text-xs text-[#888] mb-6">
          Acompanhe o desempenho de cada profissional de acordo com o intervalo selecionado (<span className="text-[#C5A059]">{dateFilter === 'TODAY' ? 'Hoje' : dateFilter === 'MONTH' ? 'Este Mês' : 'Todo o Período'}</span>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barberFinances.map(({ barber, count, gross, commission, net }) => (
            <div key={barber.id} className="bg-[#1A1A1A] border border-[#333] hover:border-[#C5A05944] rounded-xl p-5 transition-all">
              <div className="flex justify-between items-start border-b border-[#222] pb-3 mb-4">
                <div>
                  <h4 className="font-semibold text-white uppercase tracking-wider text-sm">{barber.name}</h4>
                  <p className="text-[10px] text-[#777] mt-0.5">Comissão: {barber.comissao || 0}%</p>
                </div>
                <span className="bg-[#C5A05922] text-[#C5A059] text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                  {count} {count === 1 ? 'Atendimento' : 'Atendimentos'}
                </span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#888]">Faturamento Bruto:</span>
                  <span className="text-white font-medium">R$ {gross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Comissão {barber.comissao || 0}%:</span>
                  <span className="text-[#FF3D00] font-medium">- R$ {commission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-[#222] pt-2 mt-2 font-medium">
                  <span className="text-white">Líquido Barbearia:</span>
                  <span className="text-[#00C853] font-bold">R$ {net.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
          {barberFinances.length === 0 && (
            <div className="col-span-full py-8 text-center text-[#777] bg-[#1A1A1A] rounded-xl border border-[#222]">
              Nenhum profissional cadastrado.
            </div>
          )}
        </div>
      </div>

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
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-medium text-white mb-2">Histórico de Transações</h2>
        <TransactionHistoryList showFilters={true} />
      </div>
      </div>
    </div>
  );
}
