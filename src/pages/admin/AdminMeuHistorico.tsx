import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { DollarSign, Scissors, Calendar as CalendarIcon, RefreshCw, Pencil, Trash2, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionHistoryList from '../../components/TransactionHistoryList';
import { confirmUI } from '../../utils/confirmUI';
import toast from 'react-hot-toast';
import { supabase } from '../../supabase';

export default function AdminMeuHistorico() {
  const { state, refreshData, updateTransaction, deleteTransaction, addAppointment, addTransaction } = useAppContext();
  const { barbearia } = useBarbearia();
  const [selectedCorte, setSelectedCorte] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  useEffect(() => {
    refreshData();
  }, []);
  
  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const currentBarbeiroId = authState?.barbeiroId;
  
  const barbeiro = state.barbers.find(b => b.id === currentBarbeiroId);
  const comissaoPercent = barbeiro?.comissao || 0;

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
    setSelectedCorte(appt);
    setEditAmount(appt.valorServico);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorte) return;
    if (editAmount < 0) return;

    setIsSubmittingModal(true);
    try {
      if (selectedCorte.incomeTx) {
        await updateTransaction(selectedCorte.incomeTx.id, {
          amount: editAmount
        });
        toast.success('Valor atualizado com sucesso!');
      } else {
        // No transaction exists yet, let's create it dynamically!
        const authData = sessionStorage.getItem('app_auth_state');
        const authState = authData ? JSON.parse(authData) : null;
        const barbeariaId = barbearia?.id || authState?.barbeariaId;
        
        if (!barbeariaId) {
          toast.error('Erro de permissão: Barbearia não identificada.');
          return;
        }

        const incomeDesc = `Serviço recebido: ${selectedCorte.serviceName} (Ref: ${selectedCorte.id})`;
        const apptDateIso = selectedCorte.date || new Date().toISOString();

        // 1. Insert INCOME record
        const { data: newIncome, error: incError } = await supabase.from('transacoes').insert({
          barbearia_id: barbeariaId,
          tipo: 'ENTRADA',
          valor: editAmount,
          descricao: incomeDesc,
          data: apptDateIso
        }).select().single();

        if (incError) throw incError;

        // 2. Insert Commission EXPENSE record if applicable
        if (comissaoPercent > 0) {
          const comValue = (editAmount * comissaoPercent) / 100;
          const { error: expError } = await supabase.from('transacoes').insert({
            barbearia_id: barbeariaId,
            tipo: 'SAIDA',
            valor: comValue,
            descricao: `Comissão Barbeiro (${barbeiro?.name || 'Barbeiro'}) - ${selectedCorte.serviceName} - ${comissaoPercent}%`,
            data: apptDateIso
          });
          if (expError) console.error('Erro ao salvar comissão para corte recriado:', expError);
        }

        toast.success('Transação financeira criada e atualizada com sucesso!');
        await refreshData();
      }
      setSelectedCorte(null);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao atualizar corte: ${err?.message || 'Erro de permissão'}`);
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
          toast.success('Lançamentos excluídos com sucesso!');
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
        <div className="p-6 border-b border-[#222] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#161616]">
          <h2 className="text-lg font-bold text-white">Histórico de Serviços Concluídos</h2>
          <span className="text-[10px] text-[#777] uppercase tracking-widest font-extrabold text-right">
            💡 Clique em 'Editar Valor' ao lado de qualquer corte para corrigir o valor recebido e a comissão correspondente em todo o sistema.
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
                    <th className="p-4 text-xs font-medium text-[#777] uppercase tracking-wider text-center w-28 border-l border-[#222]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {agendamentos.map((appt) => (
                    <tr 
                      key={appt.id} 
                      className="hover:bg-[#161616] transition-colors"
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
                      <td className="p-4 border-l border-[#222]">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleCorteClick(appt)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059]/30 border border-[#C5A059]/30 hover:border-[#C5A059] text-[#C5A059] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Pencil size={12} />
                            Editar Valor
                          </button>
                        </div>
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
                   className="bg-[#161616] border border-[#222] p-4 rounded-xl space-y-2"
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

                  <div className="flex justify-end pt-2 border-t border-[#222]/30 mt-1">
                    <button
                      onClick={() => handleCorteClick(appt)}
                      className="flex items-center gap-1 px-3 py-1 bg-[#C5A059]/10 hover:bg-[#C5A059]/30 border border-[#C5A059]/30 text-[#C5A059] rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <Pencil size={11} />
                      Editar Valor
                    </button>
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
