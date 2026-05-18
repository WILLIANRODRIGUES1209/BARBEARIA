import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';

export default function AdminRelatorios() {
  const { state } = useAppContext();

  // Basic report data calculations
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const filterCurrentMonth = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: currentMonthStart, end: currentMonthEnd });
  const filterLastMonth = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: lastMonthStart, end: lastMonthEnd });

  // Faturamento
  const currentMonthIncome = state.transactions.filter(t => t.type === 'INCOME' && filterCurrentMonth(t.date)).reduce((a, b) => a + b.amount, 0);
  const currentMonthExpense = state.transactions.filter(t => t.type === 'EXPENSE' && filterCurrentMonth(t.date)).reduce((a, b) => a + b.amount, 0);
  const currentMonthProfit = currentMonthIncome - currentMonthExpense;

  const lastMonthIncome = state.transactions.filter(t => t.type === 'INCOME' && filterLastMonth(t.date)).reduce((a, b) => a + b.amount, 0);

  // Agendamentos
  const currentMonthAppointments = state.appointments.filter(a => filterCurrentMonth(a.date));
  const completedAppointments = currentMonthAppointments.filter(a => a.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="text-[#C5A059]" /> Relatórios Gerenciais
        </h1>
        <p className="text-[#777] text-sm mt-2">Resumo das métricas e desempenho do mês atual.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C5A05922] flex items-center justify-center text-[#C5A059]">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Faturamento (Mês)</p>
              <h3 className="text-2xl font-bold text-white mt-1">R$ {currentMonthIncome.toFixed(2)}</h3>
              <p className="text-xs text-[#777] mt-1">
                {lastMonthIncome > 0 ? (
                   <span className={currentMonthIncome >= lastMonthIncome ? 'text-green-500' : 'text-red-500'}>
                     {(((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(1)}% vs Mês Anterior
                   </span>
                ) : 'Sem dados do mês anterior'}
              </p>
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
              <h3 className="text-2xl font-bold text-white mt-1">R$ {currentMonthProfit.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#121212] p-6 rounded-2xl border border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2979FF22] flex items-center justify-center text-[#2979FF]">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#555] uppercase tracking-wider">Agendamentos (Mês)</p>
              <h3 className="text-2xl font-bold text-white mt-1">{currentMonthAppointments.length}</h3>
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
          <h2 className="text-lg font-semibold text-white mb-4">Serviços Mais Agendados</h2>
          <div className="space-y-4">
            {state.services.map(s => {
              const count = state.appointments.filter(a => a.serviceId === s.id).length;
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
    </div>
  );
}
