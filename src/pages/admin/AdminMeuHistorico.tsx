import React, { useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DollarSign, Scissors, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionHistoryList from '../../components/TransactionHistoryList';

export default function AdminMeuHistorico() {
  const { state, refreshData } = useAppContext();

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
        const valorServico = service?.price || 0;
        const valorComissao = (valorServico * comissaoPercent) / 100;
        
        return {
          ...appt,
          serviceName: service?.name || 'Serviço Excluído',
          valorServico,
          valorComissao
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.appointments, state.services, currentBarbeiroId, comissaoPercent]);

  const totalComissoes = agendamentos.reduce((acc, curr) => acc + curr.valorComissao, 0);
  const totalCortes = agendamentos.length;
  
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
        <h2 className="text-lg font-bold text-white p-6 border-b border-[#222]">Histórico de Serviços Concluídos</h2>
        
        {agendamentos.length === 0 ? (
          <div className="p-8 text-center text-[#777]">
            Nenhum serviço concluído até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={appt.id} className="hover:bg-[#1A1A1A] transition-colors">
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
        )}
      </div>

      <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 mt-6">
        <h2 className="text-lg font-bold text-white mb-2">Histórico & Correções de Caixas</h2>
        <p className="text-xs text-[#777] mb-6">Aqui você pode visualizar seus recebimentos e corrigir valores ou excluir lançamentos se registrados com alguma divergência ou por engano.</p>
        <TransactionHistoryList barberName={barbeiro?.name} showFilters={true} />
      </div>
    </div>
  );
}
