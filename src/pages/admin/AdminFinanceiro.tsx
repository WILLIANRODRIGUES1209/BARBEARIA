import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, Calendar as CalendarIcon, Check, Trash2, Users } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import TransactionHistoryList from '../../components/TransactionHistoryList';
import toast from 'react-hot-toast';

export default function AdminFinanceiro() {
  const { state, addTransaction, addAppointment, refreshData } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: 0, type: 'INCOME' as 'INCOME' | 'EXPENSE' });

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('MONTH');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('ALL');

  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');

  // New comanda entry states for Administrator login (where they can select *which* barber performed the service)
  const [comandaClientName, setComandaClientName] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [comandaServices, setComandaServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [comandaPaymentMethod, setComandaPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('Pix');
  const [isSavingComanda, setIsSavingComanda] = useState(false);

  // Set default selected barber
  useEffect(() => {
    if (state.barbers.length > 0 && !selectedBarberId) {
      const activeBarber = state.barbers.find(b => b.active);
      setSelectedBarberId(activeBarber ? activeBarber.id : state.barbers[0].id);
    }
  }, [state.barbers, selectedBarberId]);

  // Add line item service
  const handleAddService = (serviceType: string) => {
    const lowerName = serviceType.toLowerCase();
    const found = state.services.find(s => s.name.toLowerCase().includes(lowerName));
    const defaultPrice = found ? found.price : (serviceType === 'Cabelo' ? 40 : serviceType === 'Barba' ? 30 : serviceType === 'Sobrancelha' ? 15 : 20);

    setComandaServices(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: found ? found.name : serviceType,
        price: defaultPrice
      }
    ]);
  };

  // Remove line item service
  const handleRemoveService = (itemId: string) => {
    setComandaServices(prev => prev.filter(item => item.id !== itemId));
  };

  // Update item price manually
  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setComandaServices(prev => prev.map(item => item.id === itemId ? { ...item, price: newPrice } : item));
  };

  // Selected Barber properties
  const activeBarber = state.barbers.find(b => b.id === selectedBarberId);
  const activeComissaoPercent = activeBarber?.comissao || 50;

  // Dynamic totals
  const totalGross = comandaServices.reduce((acc, curr) => acc + curr.price, 0);
  const barberAmount = (totalGross * activeComissaoPercent) / 100;
  const salonAmount = totalGross - barberAmount;

  // Handle comanda submit (atomic registration)
  const handleSaveComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarberId) {
      toast.error('Por favor, selecione um barbeiro profissional.');
      return;
    }
    if (comandaServices.length === 0) {
      toast.error('Adicione pelo menos um serviço para fechar a comanda.');
      return;
    }
    if (comandaServices.some(s => s.price < 0)) {
      toast.error('Os valores dos serviços não podem ser negativos.');
      return;
    }

    setIsSavingComanda(true);
    try {
      const clientName = comandaClientName.trim() || 'Cliente Avulso';
      const servicesLabel = comandaServices.map(s => s.name).join(' + ');
      const nowIso = new Date().toISOString();
      const firstSvcId = state.services[0]?.id || '1';

      // 1. Create a completed walk-in appointment
      if (addAppointment) {
        await addAppointment({
          clientName,
          clientPhone: '0000000000',
          serviceId: firstSvcId,
          barberId: selectedBarberId,
          date: nowIso
        }, 'COMPLETED');
      }

      // 2. Income Transaction
      await addTransaction({
        type: 'INCOME',
        amount: totalGross,
        description: `Venda PDV - Comanda: ${servicesLabel} (${comandaPaymentMethod}) - Cliente: ${clientName} [Barbeiro: ${selectedBarberId}]`,
        date: nowIso
      });

      // 3. Commission (expense) transaction
      if (barberAmount > 0) {
        await addTransaction({
          type: 'EXPENSE',
          amount: barberAmount,
          description: `Comissão ${activeBarber?.name} - Comanda: ${servicesLabel} (${activeComissaoPercent}%) [Barbeiro: ${selectedBarberId}]`,
          date: nowIso
        });
      }

      toast.success('Comanda registrada com sucesso!');

      // 4. Wipe selection state immediately to avoid double logging
      setComandaClientName('');
      setComandaServices([]);
      setComandaPaymentMethod('Pix');

      if (refreshData) {
        await refreshData();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar comanda.');
    } finally {
      setIsSavingComanda(false);
    }
  };

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
         if (!t.description.includes(paymentMethodFilter)) return false;
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
      const appts = filteredAppointments.filter(a => a.barberId === barber.id);
      
      let totalAmount = 0;
      let commissionAmount = 0;
      const comPercent = barber.comissao || 0;

      // Check if we haveAny tagged transactions in uniqueTransactions for this barber in the active date range
      const hasTaggedTransactions = uniqueTransactions.some(t => t.description.includes(`[Barbeiro: ${barber.id}]`));

      if (hasTaggedTransactions) {
        // Direct, exact, mathematically bulletproof calculation from transactions themselves!
        filteredTransactions.forEach(t => {
          const isThisBarberTag = t.description.includes(`[Barbeiro: ${barber.id}]`) || t.description.includes(`[BarberId: ${barber.id}]`);
          if (isThisBarberTag) {
            if (t.type === 'INCOME') {
              totalAmount += t.amount;
            } else if (t.type === 'EXPENSE' && t.description.includes('Comissão')) {
              commissionAmount += t.amount;
            }
          }
        });
      } else {
        // Legacy fallback calculation
        appts.forEach(appt => {
          const service = state.services.find(s => s.id === appt.serviceId);
          const defaultServicePrice = service?.price || 0;
          
          // Find corresponding INCOME transaction
          const incomeTx = uniqueTransactions.find(t => {
            if (t.type !== 'INCOME') return false;
            if (t.description.includes(`Ref: ${appt.id}`)) return true;
            if (t.description.includes('Venda PDV')) {
              const tTime = new Date(t.date).getTime();
              const aTime = new Date(appt.date).getTime();
              if (Math.abs(tTime - aTime) <= 15000 && t.description.includes(appt.clientName)) {
                return true;
              }
            }
            return false;
          });

          // Find corresponding commission transaction
          let commissionTx = null;
          if (incomeTx) {
            commissionTx = uniqueTransactions.find(other => {
              if (other.type !== 'EXPENSE') return false;
              const isCommission = other.description.toLowerCase().includes('comissão') || other.description.toLowerCase().includes('comissao');
              if (!isCommission) return false;
              
              const targetTime = new Date(incomeTx.date).getTime();
              const otherTime = new Date(other.date).getTime();
              return Math.abs(targetTime - otherTime) <= 15000;
            });
          }

          let valorComissao = 0;
          let valorServico = defaultServicePrice;

          if (commissionTx) {
            valorComissao = commissionTx.amount;
            if (comPercent > 0) {
              valorServico = (valorComissao * 100) / comPercent;
            } else if (incomeTx) {
              valorServico = incomeTx.amount;
            }
          } else if (incomeTx) {
            valorServico = incomeTx.amount;
            valorComissao = (valorServico * comPercent) / 100;
          } else {
            valorServico = defaultServicePrice;
            valorComissao = (valorServico * comPercent) / 100;
          }

          totalAmount += valorServico;
          commissionAmount += valorComissao;
        });
      }

      const netAmount = totalAmount - commissionAmount;

      return {
        barber,
        count: appts.length,
        gross: totalAmount,
        commission: commissionAmount,
        net: netAmount
      };
    });
  }, [state.barbers, filteredAppointments, state.services, uniqueTransactions, filteredTransactions]);

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
      'PIX': incomes.filter(t => t.description.includes('PIX')).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Crédito': incomes.filter(t => t.description.includes('Cartão de Crédito')).reduce((sum, t) => sum + t.amount, 0),
      'Cartão de Débito': incomes.filter(t => t.description.includes('Cartão de Débito')).reduce((sum, t) => sum + t.amount, 0),
      'Dinheiro': incomes.filter(t => t.description.includes('Dinheiro')).reduce((sum, t) => sum + t.amount, 0),
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

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancelar' : 'Nova Transação'}
        </button>
      </div>

      {/* NEW: Admin quick comanda registration panel */}
      <section className="bg-[#121212] rounded-2xl border border-[#C5A05933]/40 shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <div className="w-8 h-8 rounded-lg bg-[#C5A05915] border border-[#C5A05944] flex items-center justify-center">
            <Users size={16} className="text-[#C5A059]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Lançar Nova Comanda (PDV)</h2>
            <p className="text-[10px] text-[#777]">Atribua a qualquer profissional, adicione serviços livremente de forma simplificada</p>
          </div>
        </div>

        <form onSubmit={handleSaveComanda} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Seleção do Barbeiro */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Profissional / Barbeiro</label>
              <select
                value={selectedBarberId}
                onChange={e => setSelectedBarberId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#161616] border border-[#222] hover:border-[#333] focus:border-[#C5A059] text-white rounded-xl focus:outline-none text-xs font-bold transition-all"
              >
                {state.barbers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.comissao || 0}% Comissão)
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Nome do Cliente */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Nome do Cliente (Opcional)</label>
              <input
                type="text"
                value={comandaClientName}
                onChange={e => setComandaClientName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#161616] border border-[#222] hover:border-[#333] focus:border-[#C5A059] text-white rounded-xl focus:outline-none text-xs font-bold transition-all"
                placeholder="Ex: Carlos Vieira (ou em branco)"
              />
            </div>

            {/* Seleção de Tipo de Serviços (Mudar Múltiplos Quadradinhos engessados por Tags Limpas) */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Adicionar Serviço</label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {['Cabelo', 'Barba', 'Sobrancelha', 'Outro'].map((serviceType) => (
                  <button
                    key={serviceType}
                    type="button"
                    onClick={() => handleAddService(serviceType)}
                    className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#C5A05915] border border-[#222] hover:border-[#C5A05955] text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    + {serviceType}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listagem dos Serviços Selecionados com Entrada de Preço Livre */}
          {comandaServices.length > 0 && (
            <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-[#222]">
              <p className="text-[10px] uppercase font-bold text-[#C5A059] tracking-widest mb-1">Serviços Selecionados</p>
              <div className="space-y-3">
                {comandaServices.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#1E1E1E] rounded-xl border border-[#222]">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const val = e.target.value;
                          setComandaServices(prev => prev.map(x => x.id === item.id ? { ...x, name: val } : x));
                        }}
                        className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-[#C5A059] focus:outline-none pb-0.5 select-all"
                        placeholder="Nome do Serviço"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-[#141414] border border-[#333] pl-3 rounded-lg overflow-hidden w-36">
                        <span className="text-xs text-[#555] font-bold">R$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={e => handleUpdatePrice(item.id, Number(e.target.value) || 0)}
                          className="w-full bg-transparent px-2.5 py-1.5 text-white/90 text-sm font-black focus:outline-none"
                          placeholder="0,00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(item.id)}
                        className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                        title="Remover Serviço"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seletor Claro de Forma de Pagamento */}
          <div className="space-y-1.5 pb-2">
            <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold">Forma de Pagamento</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'] as const).map((method) => {
                const isSelected = comandaPaymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setComandaPaymentMethod(method)}
                    className={`py-2 px-3 border text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#C5A059] border-[#C5A059] text-black shadow-md shadow-[#C5A0591a]'
                        : 'bg-[#181818] border-[#252525] text-[#999] hover:text-white hover:border-[#333]'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo da Comanda e Splits com barbeiro selecionado */}
          {comandaServices.length > 0 && (
            <div className="bg-[#171717]/60 border border-[#C5A0591a] p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs text-[#777] pb-2 border-b border-[#222]">
                <span className="font-semibold uppercase tracking-wider">Detalhamento dos Splits em Tempo Real:</span>
                <span className="font-mono text-[10px]">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="space-y-1.5 text-xs text-[#CCC]">
                <p><span className="text-[#555]">Cliente:</span> <span className="font-bold text-white">{comandaClientName.trim() || 'Cliente Avulso'}</span></p>
                <p><span className="text-[#555]">Forma de Pagamento:</span> <span className="font-semibold text-white">{comandaPaymentMethod}</span></p>
                <p><span className="text-[#555]">Profissional Vinculado:</span> <span className="font-bold text-[#C5A059]">{activeBarber?.name || '---'}</span></p>
                <p><span className="text-[#555]">Serviços ({comandaServices.length}):</span> <span className="font-medium text-white">{comandaServices.map(s => `${s.name} (R$ ${s.price.toFixed(2)})`).join(', ')}</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#222] text-center">
                <div className="bg-[#1C1C1C] p-2.5 rounded-lg border border-[#222]">
                  <p className="text-[10px] uppercase font-bold text-[#777]">Faturamento Bruto</p>
                  <p className="text-base font-black text-white mt-0.5">R$ {totalGross.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-500/70">Comissão ({activeComissaoPercent}%)</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">R$ {barberAmount.toFixed(2)}</p>
                </div>
                <div className="bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20">
                  <p className="text-[10px] uppercase font-bold text-amber-500/70">Saldo do Salão ({100 - activeComissaoPercent}%)</p>
                  <p className="text-base font-black text-amber-500 mt-0.5">R$ {salonAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Gravar Comanda */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingComanda || comandaServices.length === 0}
              className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                comandaServices.length > 0
                  ? 'bg-[#C5A059] text-black hover:bg-[#A88443] shadow-[0_0_20px_rgba(197,160,89,0.15)] active:scale-[0.99]'
                  : 'bg-[#222] border border-[#333] text-[#555] cursor-not-allowed'
              }`}
            >
              <Check size={14} />
              {isSavingComanda ? 'Gravando e Sincronizando...' : 'Finalizar e Gravar Comanda Admin'}
            </button>
          </div>
        </form>
      </section>

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
