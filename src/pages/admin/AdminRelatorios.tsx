import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, ChevronDown, ChevronUp, Filter, RefreshCw, Bell, FileText } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, parseISO, subMonths, startOfWeek, endOfWeek, subDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportBarberReportPdf } from '../../utils/pdfExport';

export default function AdminRelatorios() {
  const { state, triggerTestNotification } = useAppContext();
  const { barbearia } = useBarbearia();

  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const isBarbeiro = authState?.role === 'BARBEIRO';
  const currentBarbeiroId = authState?.barbeiroId;

  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(isBarbeiro ? (currentBarbeiroId || null) : null);

  useEffect(() => {
    if (isBarbeiro && currentBarbeiroId && !expandedBarberId) {
      setExpandedBarberId(currentBarbeiroId);
    }
  }, [isBarbeiro, currentBarbeiroId]);

  // Date Filter State
  const now = new Date();
  const [filterMode, setFilterMode] = useState<'DEFAULT' | 'CLOSED_WEEK' | 'CUSTOM'>('DEFAULT');
  const [closedWeekOffset, setClosedWeekOffset] = useState<number>(1);
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(endOfMonth(now), 'yyyy-MM-dd'));

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === 'CLOSED_WEEK') {
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const targetWeekStart = subDays(currentWeekStart, closedWeekOffset * 7);
      const targetWeekEnd = endOfWeek(targetWeekStart, { weekStartsOn: 1 });
      return {
        startDate: format(targetWeekStart, 'yyyy-MM-dd'),
        endDate: format(targetWeekEnd, 'yyyy-MM-dd')
      };
    } else if (filterMode === 'CUSTOM') {
      return {
        startDate: customStartDate,
        endDate: customEndDate
      };
    } else {
      // DEFAULT (THIS_MONTH / ALL)
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    }
  }, [filterMode, closedWeekOffset, customStartDate, customEndDate, now]);

  const isDateInInterval = (dateStr: string) => {
    if (!dateStr) return false;
    if (!startDate || !endDate) return true;
    try {
      const d = parseISO(dateStr);
      if (isNaN(d.getTime())) return false;
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));
      return isWithinInterval(d, { start, end });
    } catch (e) {
      return false;
    }
  };

  // Filtered Data Sets
  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => isDateInInterval(t.date));
  }, [state.transactions, startDate, endDate, filterMode]);

  const filteredAppointments = useMemo(() => {
    return state.appointments.filter(a => isDateInInterval(a.date));
  }, [state.appointments, startDate, endDate, filterMode]);

  // Last Month comparison values
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const lastMonthIncome = state.transactions
    .filter(t => t.type === 'INCOME' && isWithinInterval(parseISO(t.date), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((a, b) => a + b.amount, 0);

  // Financial Metrics
  const currentPeriodIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const currentPeriodExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const currentPeriodProfit = currentPeriodIncome - currentPeriodExpense;

  // Appointment metrics
  const completedAppointments = filteredAppointments.filter(a => a.status === 'COMPLETED').length;

  // Barber Finances Logic
  const barberFinances = useMemo(() => {
    return state.barbers.map(barber => {
      const targetBarberIdLower = barber.id.toLowerCase();
      const comissaoPercent = barber.comissao || 0;
      
      const apptsOfBarber = filteredAppointments.filter(a => 
        a.status === 'COMPLETED' && a.barberId?.toLowerCase() === targetBarberIdLower
      );

      const detailedServices = apptsOfBarber.map(appt => {
        const service = state.services.find(s => s.id === appt.serviceId);
        const defaultServicePrice = service?.price || 0;
        
        const incomeTx = state.transactions.find(t => {
          if (t.type !== 'INCOME') return false;
          const descLower = t.description.toLowerCase();
          if (descLower.includes(`ref: ${appt.id.toLowerCase()}`)) return true;
          if (descLower.includes('venda pdv')) {
            const isOurBarber = descLower.includes((barber.name || '---').toLowerCase()) || descLower.includes(`[barbeiro: ${targetBarberIdLower}]`);
            if (!isOurBarber) return false;
            const tTime = new Date(t.date).getTime();
            const aTime = new Date(appt.date).getTime();
            if (Math.abs(tTime - aTime) <= 15000 && (descLower.includes(appt.clientName.toLowerCase()) || appt.clientName === 'Cliente Avulso' || descLower.includes('comanda:'))) {
              return true;
            }
          }
          return false;
        });

        let commissionTx = null;
        if (incomeTx) {
          commissionTx = state.transactions.find(other => {
            if (other.type !== 'EXPENSE') return false;
            const descLower = other.description.toLowerCase();
            if (!descLower.includes('comissão') && !descLower.includes('comissao')) return false;
            const targetTime = new Date(incomeTx.date).getTime();
            const otherTime = new Date(other.date).getTime();
            return Math.abs(targetTime - otherTime) <= 15000;
          });
        }

        let valorComissao = 0;
        let valorServico = defaultServicePrice;

        if (commissionTx) {
          valorComissao = commissionTx.amount;
          if (comissaoPercent > 0) valorServico = (valorComissao * 100) / comissaoPercent;
          else if (incomeTx) valorServico = incomeTx.amount;
        } else if (incomeTx) {
          valorServico = incomeTx.amount;
          valorComissao = (valorServico * comissaoPercent) / 100;
        } else {
          valorServico = defaultServicePrice;
          valorComissao = (valorServico * comissaoPercent) / 100;
        }

        return {
          ...appt,
          serviceName: appt.serviceId === '1' && incomeTx && incomeTx.description.includes('Comanda:')
            ? incomeTx.description.split('Comanda:')[1]?.split('(')[0]?.trim() || service?.name || 'Serviço'
            : service?.name || 'Serviço Excluído',
          valorServico,
          valorComissao
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const count = detailedServices.length;
      const gross = detailedServices.reduce((acc, curr) => acc + curr.valorServico, 0);
      const commission = detailedServices.reduce((acc, curr) => acc + curr.valorComissao, 0);
      const net = gross - commission;

      return {
        barber,
        count,
        gross,
        commission,
        net,
        detailedServices
      };
    });
  }, [state.barbers, filteredAppointments, state.transactions, state.services]);

  const displayedBarberFinances = useMemo(() => {
    if (isBarbeiro && currentBarbeiroId) {
      return barberFinances.filter(bf => bf.barber.id.toLowerCase() === currentBarbeiroId.toLowerCase());
    }
    return barberFinances;
  }, [barberFinances, isBarbeiro, currentBarbeiroId]);

  const periodLabel = useMemo(() => {
    if (filterMode === 'ALL_NOT_USED') return 'Todo o Histórico';
    if (!startDate || !endDate) return 'Período Personalizado';
    try {
      const s = format(parseISO(startDate), 'dd/MM/yyyy');
      const e = format(parseISO(endDate), 'dd/MM/yyyy');
      return `${s} até ${e}`;
    } catch {
      return 'Período Selecionado';
    }
  }, [filterMode, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* HEADER E FILTRO DE DATA */}
      <div className="bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full xl:w-auto">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="text-[#C5A059]" /> Relatórios Gerenciais
            </h1>
            <p className="text-[#777] text-sm mt-1">
              Exibindo dados do período: <strong className="text-[#C5A059]">{periodLabel}</strong>
            </p>
          </div>

          <button 
            onClick={() => triggerTestNotification()}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C5A059] px-3.5 py-2 rounded-xl border border-[#C5A05944] transition-all cursor-pointer text-xs font-semibold shadow-sm hover:border-[#C5A059] self-start sm:self-auto"
            title="Testar Notificação em Tempo Real e Alarme Sonoro"
          >
            <Bell size={16} className="text-[#C5A059]" />
            <span>Testar Som & Notificações</span>
          </button>
        </div>

                {/* SELETOR DE INTERVALO DE DATAS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-[#141414] border border-[#333] p-2.5 rounded-xl">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 lg:pb-0 shrink-0">
            <button
              onClick={() => setFilterMode('DEFAULT')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${filterMode === 'DEFAULT' ? 'bg-[#C5A059] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#222]'}`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setFilterMode('CLOSED_WEEK')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${filterMode === 'CLOSED_WEEK' ? 'bg-[#C5A059] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#222]'}`}
            >
              Semana Fechada
            </button>
            <button
              onClick={() => setFilterMode('CUSTOM')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${filterMode === 'CUSTOM' ? 'bg-[#C5A059] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#222]'}`}
            >
              <Calendar size={14} /> Período Personalizado
            </button>
            {filterMode !== 'DEFAULT' && (
              <button
                onClick={() => setFilterMode('DEFAULT')}
                className="ml-2 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
              >
                <Filter size={14} /> Limpar Filtro
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-[#333] pt-2 lg:pt-0 lg:pl-3 flex-1">
            {filterMode === 'CLOSED_WEEK' && (
              <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                <button 
                  onClick={() => setClosedWeekOffset(o => o + 1)}
                  className="p-1.5 bg-[#222] text-gray-300 hover:text-white hover:bg-[#333] rounded-lg cursor-pointer"
                  title="Semana Anterior"
                >
                  <span className="text-lg leading-none transform rotate-90 inline-block font-bold">❮</span>
                </button>
                <span className="text-xs font-bold text-[#C5A059] text-center min-w-[150px]">
                  {startDate && endDate ? `${format(parseISO(startDate), "dd/MM")} até ${format(parseISO(endDate), "dd/MM")}` : ''}
                </span>
                <button 
                  disabled={closedWeekOffset === 1}
                  onClick={() => setClosedWeekOffset(o => Math.max(1, o - 1))}
                  className={`p-1.5 rounded-lg ${closedWeekOffset === 1 ? 'text-gray-600 bg-[#111] cursor-not-allowed' : 'bg-[#222] text-gray-300 hover:text-white hover:bg-[#333] cursor-pointer'}`}
                  title="Semana Seguinte"
                >
                  <span className="text-lg leading-none transform -rotate-90 inline-block font-bold">❯</span>
                </button>
              </div>
            )}

            {filterMode === 'CUSTOM' && (
              <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
                <input 
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#1A1A1A] text-white border border-[#333] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C5A059] cursor-pointer"
                />
                <span className="text-gray-500 text-xs">até</span>
                <input 
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#1A1A1A] text-white border border-[#333] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C5A059] cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* METRICAS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C5A05922] flex items-center justify-center text-[#C5A059]">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Faturamento ({filterMode === 'DEFAULT' ? 'Mês' : 'Período'})</p>
              <h3 className="text-2xl font-bold text-white mt-1">R$ {currentPeriodIncome.toFixed(2)}</h3>
              {filterMode === 'DEFAULT' && (
                <p className="text-xs text-[#777] mt-1">
                  {lastMonthIncome > 0 ? (
                     <span className={currentPeriodIncome >= lastMonthIncome ? 'text-green-500' : 'text-red-500'}>
                       {(((currentPeriodIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(1)}% vs Mês Anterior
                     </span>
                  ) : 'Sem dados do mês anterior'}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#00C85322] flex items-center justify-center text-[#00C853]">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Lucro Líquido</p>
              <h3 className="text-2xl font-bold text-white mt-1">R$ {currentPeriodProfit.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2979FF22] flex items-center justify-center text-[#2979FF]">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Agendamentos ({filterMode === 'DEFAULT' ? 'Mês' : 'Período'})</p>
              <h3 className="text-2xl font-bold text-white mt-1">{filteredAppointments.length}</h3>
              <p className="text-xs text-[#777] mt-1">{completedAppointments} concluídos</p>
            </div>
          </div>
        </div>

        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#AA00FF22] flex items-center justify-center text-[#AA00FF]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Total de Clientes</p>
              <h3 className="text-2xl font-bold text-white mt-1">{state.clients.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <h2 className="text-lg font-semibold text-white mb-4">Serviços Mais Agendados ({periodLabel})</h2>
          <div className="space-y-4">
            {state.services.map(s => {
              const count = filteredAppointments.filter(a => a.serviceId === s.id).length;
              if(count === 0) return null;
              return (
                <div key={s.id} className="flex justify-between items-center group">
                  <span className="text-[#888] group-hover:text-white transition-colors">{s.name}</span>
                  <span className="text-[#C5A059] font-bold">{count} agendamentos</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <h2 className="text-lg font-semibold text-white mb-4">Status dos Produtos</h2>
          <div className="space-y-4">
            {state.products.length === 0 ? (
              <p className="text-[#777] text-sm">Nenhum produto cadastrado.</p>
            ) : (
              state.products.map(p => (
                <div key={p.id} className="flex justify-between items-center group">
                  <span className="text-[#888] group-hover:text-white transition-colors">{p.name}</span>
                  <span className={`font-bold ${p.quantity <= 2 ? 'text-red-500' : 'text-[#C5A059]'}`}>
                    {p.quantity} unid.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO: FATURAMENTO INDIVIDUALIZADO POR BARBEIRO */}
      <div className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-[#C5A05922] text-[#C5A059] p-2 rounded">
              <DollarSign size={20} />
            </div>
            <h2 className="text-lg font-medium text-white">Desempenho por Barbeiro</h2>
          </div>
          <span className="text-xs text-[#C5A059] font-semibold bg-[#C5A05915] border border-[#C5A05933] px-3 py-1 rounded-lg self-start sm:self-auto">
            {periodLabel}
          </span>
        </div>
        <p className="text-xs text-[#888] mb-6">
          Acompanhe o faturamento detalhado e o histórico de atendimentos de cada profissional no intervalo selecionado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedBarberFinances.map(({ barber, count, gross, commission, net, detailedServices }) => {
            const isExpanded = expandedBarberId === barber.id;
            return (
              <div key={barber.id} className={`bg-[#1A1A1A] border ${isExpanded ? 'border-[#C5A059]' : 'border-[#333] hover:border-[#C5A05944]'} rounded-xl transition-all overflow-hidden`}>
                <div className="p-5">
                  <div className="flex justify-between items-start border-b border-[#222] pb-3 mb-4">
                    <div>
                      <h4 className="font-semibold text-white uppercase tracking-wider text-sm">{barber.name}</h4>
                      <p className="text-[10px] text-[#777] mt-0.5">Comissão: {barber.comissao || 0}%</p>
                    </div>
                    <span className="bg-[#C5A05922] text-[#C5A059] text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                      {count} {count === 1 ? 'Serviço' : 'Serviços'}
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
                    <div className="flex justify-between border-t border-[#222] pt-2 mt-2 font-medium mb-3">
                      <span className="text-white">Líquido Barbearia:</span>
                      <span className="text-[#00C853] font-bold">R$ {net.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-[#222] pt-3 mt-3">
                      <button
                        onClick={() => setExpandedBarberId(isExpanded ? null : barber.id)}
                        className="py-2 bg-[#C5A05915] hover:bg-[#C5A05930] text-[#C5A059] border border-[#C5A05944] rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        onClick={() => exportBarberReportPdf({
                          barbeariaName: barbearia?.nome || 'Barbearia',
                          barberName: barber.name,
                          periodLabel,
                          comissaoPercent: barber.comissao || 0,
                          detailedServices,
                          totalCortes: count,
                          totalBruto: gross,
                          totalComissao: commission
                        })}
                        className="py-2 bg-[#C5A059] hover:bg-[#d4af66] text-black rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        title="Exportar PDF com todos os cortes deste barbeiro"
                      >
                        <FileText size={14} />
                        <span>Exportar PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-[#111] border-t border-[#333] p-4 max-h-96 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#222]">
                      <span className="text-xs font-bold text-gray-300">Detalhamento dos Cortes</span>
                      <button
                        onClick={() => exportBarberReportPdf({
                          barbeariaName: barbearia?.nome || 'Barbearia',
                          barberName: barber.name,
                          periodLabel,
                          comissaoPercent: barber.comissao || 0,
                          detailedServices,
                          totalCortes: count,
                          totalBruto: gross,
                          totalComissao: commission
                        })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#d4af66] text-black text-xs font-bold rounded-lg transition-all shadow cursor-pointer"
                        title="Exportar relatório em PDF com todos os cortes"
                      >
                        <FileText size={14} />
                        <span>Exportar PDF</span>
                      </button>
                    </div>

                    {detailedServices.length === 0 ? (
                      <p className="text-center text-[#777] text-xs py-4">Nenhum serviço realizado neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {detailedServices.map(appt => (
                          <div key={appt.id} className="bg-[#1A1A1A] border border-[#222] p-3 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-white text-xs uppercase">{appt.clientName}</p>
                                <p className="text-[10px] text-[#777]">{appt.serviceName}</p>
                              </div>
                              <span className="text-[10px] text-[#555] bg-[#000] px-1.5 py-0.5 rounded">
                                {format(parseISO(appt.date), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] border-t border-[#222] pt-2 mt-1">
                              <span className="text-[#888]">Valor: <strong className="text-white">R$ {appt.valorServico.toFixed(2)}</strong></span>
                              <span className="text-[#888]">Comissão: <strong className="text-emerald-500">R$ {appt.valorComissao.toFixed(2)}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {barberFinances.length === 0 && (
            <div className="col-span-full py-8 text-center text-[#777] bg-[#1A1A1A] rounded-xl border border-[#222]">
              Nenhum profissional cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

