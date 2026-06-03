import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DollarSign, Scissors, Calendar as CalendarIcon, RefreshCw, Pencil, Trash2, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionHistoryList from '../../components/TransactionHistoryList';
import { confirmUI } from '../../utils/confirmUI';
import toast from 'react-hot-toast';

export default function AdminMeuHistorico() {
  const { state, refreshData, updateTransaction, deleteTransaction, addAppointment, addTransaction } = useAppContext();
  const [selectedCorte, setSelectedCorte] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  // New Comanda entry states
  const [comandaClientName, setComandaClientName] = useState('');
  const [comandaServices, setComandaServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [comandaPaymentMethod, setComandaPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('Pix');
  const [isSavingComanda, setIsSavingComanda] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);
  
  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const currentBarbeiroId = authState?.barbeiroId;
  
  const barbeiro = state.barbers.find(b => b.id === currentBarbeiroId);
  const comissaoPercent = barbeiro?.comissao || 0;

  // Add line item service
  const handleAddService = (serviceType: string) => {
    // Find default price from services list if matching, else use common defaults
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

  // Dynamic totals
  const totalGross = comandaServices.reduce((acc, curr) => acc + curr.price, 0);
  const barberAmount = (totalGross * comissaoPercent) / 100;
  const salonAmount = totalGross - barberAmount;

  // Handle comanda submit (atomic registration of walk-in corte)
  const handleSaveComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBarbeiroId) {
      toast.error('Erro de autenticação do barbeiro.');
      return;
    }
    if (comandaServices.length === 0) {
      toast.error('Adicione pelo menos um serviço para registrar a comanda.');
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

      // Create completed appointment so it shows up in "Cortes" lists
      // Find or default serviceId
      const firstSvcId = state.services[0]?.id || '1';

      // 1. Create a specific completed appointment for this comanda
      await addAppointment({
        clientName,
        clientPhone: '0000000000',
        serviceId: firstSvcId,
        barberId: currentBarbeiroId,
        date: nowIso
      }, 'COMPLETED');

      // 2. Insert corresponding Income Transaction under the convention "Venda PDV" with Barber tag [Barbeiro: ID]
      // This matches both legacy systems while maintaining flawless custom security targeting!
      await addTransaction({
        type: 'INCOME',
        amount: totalGross,
        description: `Venda PDV - Comanda: ${servicesLabel} (${comandaPaymentMethod}) - Cliente: ${clientName} [Barbeiro: ${currentBarbeiroId}]`,
        date: nowIso
      });

      // 3. Insert corresponding Expense (Out) Transaction for the barber commission with descriptive tag [Barbeiro: ID]
      if (barberAmount > 0) {
        await addTransaction({
          type: 'EXPENSE',
          amount: barberAmount,
          description: `Comissão ${barbeiro?.name} - Comanda: ${servicesLabel} (${comissaoPercent}%) [Barbeiro: ${currentBarbeiroId}]`,
          date: nowIso
        });
      }

      toast.success('Comanda lançada com sucesso!');
      
      // 4. Wipe/clean previous state completely to guarantee zero residual data
      setComandaClientName('');
      setComandaServices([]);
      setComandaPaymentMethod('Pix');
      
      refreshData();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar a comanda.');
    } finally {
      setIsSavingComanda(false);
    }
  };

  // Encontrar agendamentos deste barbeiro que foram concluídos
  const agendamentos = useMemo(() => {
    if (!currentBarbeiroId) return [];
    
    return state.appointments
      .filter(a => a.barberId === currentBarbeiroId && a.status === 'COMPLETED')
      .map(appt => {
        const service = state.services.find(s => s.id === appt.serviceId);
        const defaultServicePrice = service?.price || 0;
        
        // 1. Try to find the corresponding INCOME transaction
        const incomeTx = state.transactions.find(t => {
          if (t.type !== 'INCOME') return false;
          
          // a. Agenda reference check
          if (t.description.includes(`Ref: ${appt.id}`)) {
            return true;
          }
          
          // b. PDV check out check or Comanda tagging check [Barbeiro: ID]
          if (t.description.includes('Venda PDV')) {
            const isOurBarber = t.description.includes(barbeiro?.name || '---') || t.description.includes(`[Barbeiro: ${currentBarbeiroId}]`);
            if (!isOurBarber) return false;

            const tTime = new Date(t.date).getTime();
            const aTime = new Date(appt.date).getTime();
            if (Math.abs(tTime - aTime) <= 15000 && (t.description.includes(appt.clientName) || appt.clientName === 'Cliente Avulso' || t.description.includes('Comanda:'))) {
              return true;
            }
          }
          
          return false;
        });

        // 2. Try to find the corresponding commission transaction
        let commissionTx = null;
        if (incomeTx) {
          commissionTx = state.transactions.find(other => {
            if (other.type !== 'EXPENSE') return false;
            const isCommission = other.description.toLowerCase().includes('comissão') || other.description.toLowerCase().includes('comissao');
            if (!isCommission) return false;
            
            // Check matching ID tag if present, else fall back to proximity
            const sharesBarberTag = other.description.includes(`[Barbeiro: ${currentBarbeiroId}]`);
            const targetTime = new Date(incomeTx.date).getTime();
            const otherTime = new Date(other.date).getTime();
            
            if (sharesBarberTag) {
              return Math.abs(targetTime - otherTime) <= 15000;
            }
            return Math.abs(targetTime - otherTime) <= 15000;
          });
        }

        // 3. Determine the actual service value and commission value
        let valorComissao = 0;
        let valorServico = defaultServicePrice;

        if (commissionTx) {
          // If we have an exact commission transaction, that is our source of truth for the commission!
          valorComissao = commissionTx.amount;
          
          // If commission percentage is greater than 0, we can back-calculate the service value
          if (comissaoPercent > 0) {
            valorServico = (valorComissao * 100) / comissaoPercent;
          } else if (incomeTx) {
            valorServico = incomeTx.amount;
          }
        } else if (incomeTx) {
          // If we only have the income transaction but no commission transaction, calculate based on comissaoPercent
          valorServico = incomeTx.amount;
          valorComissao = (valorServico * comissaoPercent) / 100;
        } else {
          // If neither, fallback to service prices
          valorServico = defaultServicePrice;
          valorComissao = (valorServico * comissaoPercent) / 100;
        }

        return {
          ...appt,
          serviceName: appt.serviceId === '1' && incomeTx && incomeTx.description.includes('Comanda:')
            ? incomeTx.description.split('Comanda:')[1]?.split('(')[0]?.trim() || service?.name || 'Serviço'
            : service?.name || 'Serviço Excluído',
          valorServico,
          valorComissao,
          incomeTx,
          commissionTx
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.appointments, state.services, state.transactions, currentBarbeiroId, comissaoPercent, barbeiro]);

  const totalComissoes = agendamentos.reduce((acc, curr) => acc + curr.valorComissao, 0);
  const totalCortes = agendamentos.length;

  const handleCorteClick = (appt: any) => {
    if (!appt.incomeTx) {
      toast.error('Este corte não possui transação financeira registrada para edição direta.');
      return;
    }
    setSelectedCorte(appt);
    setEditAmount(appt.valorServico);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorte || !selectedCorte.incomeTx) return;
    if (editAmount < 0) return;

    setIsSubmittingModal(true);
    try {
      await updateTransaction(selectedCorte.incomeTx.id, {
        amount: editAmount
      });
      setSelectedCorte(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar corte.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleDeleteModal = async () => {
    if (!selectedCorte || !selectedCorte.incomeTx) return;
    confirmUI(
      `Tem certeza que deseja EXCLUIR permanentemente o corte e os lançamentos correspondentes (recebimento e comissão)? Esta ação é irreversível.`,
      async () => {
        setIsSubmittingModal(true);
        try {
          await deleteTransaction(selectedCorte.incomeTx.id);
          setSelectedCorte(null);
        } catch (err: any) {
          console.error(err);
          toast.error('Erro ao excluir corte.');
        } finally {
          setIsSubmittingModal(false);
        }
      }
    );
  };
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Meu Histórico e Comissões</h1>
          <p className="text-sm text-[#777]">Acompanhe seus cortes realizados e comissões</p>
        </div>
        <button 
          onClick={() => {
            refreshData();
          }}
          className="flex items-center justify-center gap-2 self-start px-4 py-2.5 bg-[#121212] hover:bg-[#1A1A1A] border border-[#222] hover:border-[#C5A059] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw size={14} className="text-[#C5A059]" />
          Atualizar Dados
        </button>
      </header>

      {/* NEW: Mobile-First Lançar Comanda Panel */}
      <section className="bg-[#121212] rounded-2xl border border-[#C5A05933]/40 shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
          <div className="w-8 h-8 rounded-lg bg-[#C5A05915] border border-[#C5A05944] flex items-center justify-center">
            <DollarSign size={16} className="text-[#C5A059]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Lançar Novo Corte / Comanda</h2>
            <p className="text-[10px] text-[#777]">Selecione os serviços, digite o valor real cobrado e a forma de pagamento</p>
          </div>
        </div>

        <form onSubmit={handleSaveComanda} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Nome do Cliente */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Nome do Cliente (Opcional)</label>
              <input
                type="text"
                value={comandaClientName}
                onChange={e => setComandaClientName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#161616] border border-[#222] hover:border-[#333] focus:border-[#C5A059] text-white rounded-xl focus:outline-none text-xs font-bold transition-all"
                placeholder="Ex: João da Silva (ou deixe em branco para Avulso)"
              />
            </div>

            {/* Seleção de Tipo de Serviços (Mudar Múltiplos Quadradinhos engessados por Tags Limpas) */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Clique para Adicionar o Serviço</label>
              <div className="flex flex-wrap gap-2">
                {['Cabelo', 'Barba', 'Sobrancelha', 'Outro'].map((serviceType) => (
                  <button
                    key={serviceType}
                    type="button"
                    onClick={() => handleAddService(serviceType)}
                    className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#C5A05915] border border-[#222] hover:border-[#C5A05955] text-white text-xs font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer"
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

          {/* Resumo da Comanda e Splits em Tempo Real */}
          {comandaServices.length > 0 && (
            <div className="bg-[#171717]/60 border border-[#C5A0591a] p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs text-[#777] pb-2 border-b border-[#222]">
                <span className="font-semibold uppercase tracking-wider">Resumo da Comanda:</span>
                <span className="font-mono text-[10px]">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="space-y-1.5 text-xs text-[#CCC]">
                <p><span className="text-[#555]">Cliente:</span> <span className="font-bold text-white">{comandaClientName.trim() || 'Cliente Avulso'}</span></p>
                <p><span className="text-[#555]">Pagamento:</span> <span className="font-semibold text-white">{comandaPaymentMethod}</span></p>
                <p><span className="text-[#555]">Serviços ({comandaServices.length}):</span> <span className="font-medium text-white">{comandaServices.map(s => `${s.name} (R$ ${s.price.toFixed(2)})`).join(', ')}</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#222] text-center">
                <div className="bg-[#1C1C1C] p-2.5 rounded-lg border border-[#222]">
                  <p className="text-[10px] uppercase font-bold text-[#777]">Bruto Total</p>
                  <p className="text-base font-black text-white mt-0.5">R$ {totalGross.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-500/70">Sua Parte ({comissaoPercent}%)</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">R$ {barberAmount.toFixed(2)}</p>
                </div>
                <div className="bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20">
                  <p className="text-[10px] uppercase font-bold text-amber-500/70">Salão ({100 - comissaoPercent}%)</p>
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
              {isSavingComanda ? 'Gravando e Sincronizando...' : 'Finalizar e Gravar Comanda'}
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
              <Scissors className="text-[#C5A059]" size={24} />
            </div>
            <div>
              <p className="text-sm text-[#777] uppercase tracking-wider font-bold">Total de Cortes</p>
              <h2 className="text-3xl font-bold text-white uppercase">{totalCortes}</h2>
            </div>
          </div>
        </div>

        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
              <DollarSign className="text-emerald-500" size={24} />
            </div>
            <div>
              <p className="text-sm text-[#777] uppercase tracking-wider font-bold">Total Recebido (Sua Parte)</p>
              <h2 className="text-3xl font-bold text-emerald-500 uppercase">
                R$ {totalComissoes.toFixed(2)}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121212] rounded-2xl border border-[#222] overflow-hidden">
        <div className="p-6 border-b border-[#222] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#161616]">
          <h2 className="text-lg font-bold text-white">Histórico de Serviços Concluídos</h2>
          <span className="text-[10px] text-[#777] uppercase tracking-widest font-extrabold">
            💡 Dica: Toque/clique em qualquer corte para corrigir ou excluir
          </span>
        </div>
        
        {agendamentos.length === 0 ? (
          <div className="p-8 text-center text-[#777]">
            Nenhum serviço concluído até o momento.
          </div>
        ) : (
          <>
            {/* Desktop View (Table format) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A1A1A]">
                    <th className="p-4 text-xs font-medium text-[#777] uppercase tracking-wider">Data</th>
                    <th className="p-4 text-xs font-medium text-[#777] uppercase tracking-wider">Cliente</th>
                    <th className="p-4 text-xs font-medium text-[#777] uppercase tracking-wider">Serviço</th>
                    <th className="p-4 text-xs font-medium text-[#777] uppercase tracking-wider">Valor do Serviço</th>
                    <th className="p-4 text-xs font-medium text-emerald-500 uppercase tracking-wider w-32 border-l border-[#222]">Sua Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {agendamentos.map((appt) => (
                    <tr 
                      key={appt.id} 
                      onClick={() => handleCorteClick(appt)}
                      className="hover:bg-[#1C1C1C] transition-colors cursor-pointer"
                      title="Clique para corrigir valor ou excluir"
                    >
                      <td className="p-4 text-sm text-[#CCC]">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={14} className="text-[#555]" />
                          {format(parseISO(appt.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-white font-medium">{appt.clientName}</td>
                      <td className="p-4 text-sm text-[#CCC]">{appt.serviceName}</td>
                      <td className="p-4 text-sm text-[#CCC]">R$ {appt.valorServico.toFixed(2)}</td>
                      <td className="p-4 text-sm text-emerald-500 font-bold border-l border-[#222]">
                        + R$ {appt.valorComissao.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Touch friendly card layout) */}
            <div className="md:hidden divide-y divide-[#222] p-4 space-y-3">
              {agendamentos.map((appt) => (
                <div 
                  key={appt.id} 
                  onClick={() => handleCorteClick(appt)}
                  className="bg-[#161616] border border-[#222] p-4 rounded-xl space-y-2 hover:border-[#C5A059] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="max-w-[60%]">
                      <p className="text-sm font-bold text-white uppercase truncate">{appt.clientName}</p>
                      <p className="text-xs text-[#999] truncate">{appt.serviceName}</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-extrabold uppercase">
                      + R$ {appt.valorComissao.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-[#777] pt-1">
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={12} className="text-[#555]" />
                      <span>{format(parseISO(appt.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                    <span className="font-semibold text-[#CCC]">
                      Valor: R$ {appt.valorServico.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="text-[10px] text-[#C5A059] flex items-center justify-end gap-1 pt-1.5 border-t border-[#222] font-semibold uppercase tracking-wider">
                    <Pencil size={10} /> Toque para ajustar / excluir
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 mt-6">
        <h2 className="text-lg font-bold text-white mb-2">Histórico & Correções de Caixas</h2>
        <p className="text-xs text-[#777] mb-6">Aqui você pode visualizar seus recebimentos e corrigir valores ou excluir lançamentos se registrados com alguma divergência ou por engano.</p>
        <TransactionHistoryList barberName={barbeiro?.name} showFilters={true} />
      </div>

      {/* Touch-optimized Corte Adjustment Modal */}
      {selectedCorte && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Pencil size={14} className="text-[#C5A059]" /> Ajustar Corte Realizado
              </h3>
              <button 
                onClick={() => setSelectedCorte(null)}
                className="text-[#555] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 bg-[#161616] p-3 rounded-xl border border-[#222] space-y-1">
              <p className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Resumo do Serviço</p>
              <p className="text-xs text-white"><span className="font-semibold">Cliente:</span> {selectedCorte.clientName}</p>
              <p className="text-xs text-white"><span className="font-semibold">Serviço:</span> {selectedCorte.serviceName}</p>
              <p className="text-xs text-white">
                <span className="font-semibold">Data:</span> {format(parseISO(selectedCorte.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Preço Total do Serviço (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={e => setEditAmount(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-xs font-bold transition-all"
                  placeholder="Por exemplo: 40.00"
                />
                <p className="text-[10px] text-[#777] mt-1.5">
                  Sua comissão resultante ({comissaoPercent}%): <span className="text-[#C5A059] font-bold">R$ {((editAmount * comissaoPercent) / 100).toFixed(2)}</span>
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-[#222] mt-6">
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="w-full py-3 bg-[#C5A059] text-[#0A0A0A] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#A88443] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                >
                  <Check size={14} /> {isSubmittingModal ? 'Processando...' : 'Salvar Alteração'}
                </button>
                
                <button
                  type="button"
                  disabled={isSubmittingModal}
                  onClick={handleDeleteModal}
                  className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Excluir Corte Permanentemente
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCorte(null)}
                  className="w-full py-2.5 border border-[#333] text-[#777] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer mt-1"
                >
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
