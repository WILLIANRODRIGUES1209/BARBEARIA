import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { Users, DollarSign, Calendar, TrendingUp, Copy, Check, ExternalLink } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

export default function AdminDashboard() {
  const { state, refreshData } = useAppContext();
  const { barbearia } = useBarbearia();
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (refreshData) {
      refreshData(true);
    }
  }, []);

  const todayAppointments = state.appointments.filter(a => isToday(parseISO(a.date)));
  const completedToday = todayAppointments.filter(a => a.status === 'COMPLETED').length;
  
  const todayRevenue = state.transactions
    .filter(t => t.type === 'INCOME' && isToday(parseISO(t.date)))
    .reduce((acc, t) => acc + t.amount, 0);

  const lowStockProducts = state.products.filter(p => p.quantity <= 5);

  const bookingLink = `${window.location.origin}/agendar/${barbearia?.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        
        {/* Link de Agendamento */}
        {barbearia && (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1A1A1A] border border-[#C5A05933] p-1.5 pl-3 sm:pl-4 rounded-xl shadow-lg w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#C5A059] tracking-widest hidden md:inline shrink-0">Link:</span>
            <code className="text-[10px] sm:text-xs text-[#777] bg-black/30 px-2 py-1.5 rounded border border-[#222] truncate flex-1 md:max-w-xs">{bookingLink}</code>
            <button 
              onClick={copyToClipboard}
              className="p-1.5 sm:p-2 hover:bg-[#C5A05911] text-[#C5A059] rounded-lg transition-colors relative group shrink-0"
              title="Copiar Link"
            >
              {copied ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Copy size={14} className="sm:w-4 sm:h-4" />}
              {copied && <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#C5A059] text-black text-[10px] font-bold px-2 py-1 rounded">Copiado!</span>}
            </button>
            <a 
              href={bookingLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 hover:bg-[#C5A05911] text-[#C5A059] rounded-lg transition-colors shrink-0"
              title="Abrir Link"
            >
              <ExternalLink size={14} className="sm:w-4 sm:h-4" />
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121212] p-4 sm:p-6 rounded-2xl shadow-xl border border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <p className="text-[#777] text-[9px] sm:text-xs uppercase tracking-[0.1em] font-medium">Agendamentos Hoje</p>
            <p className="text-2xl sm:text-3xl font-light text-white mt-1 sm:mt-2">{todayAppointments.length}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] text-[#C5A059] p-2 sm:p-3 rounded-xl shadow-lg self-start sm:self-auto">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-[#121212] p-4 sm:p-6 rounded-2xl shadow-xl border border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <p className="text-[#777] text-[9px] sm:text-xs uppercase tracking-[0.1em] font-medium">Concluídos</p>
            <p className="text-2xl sm:text-3xl font-light text-white mt-1 sm:mt-2">{completedToday}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] text-[#00C853] p-2 sm:p-3 rounded-xl shadow-lg self-start sm:self-auto">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-[#121212] p-4 sm:p-6 rounded-2xl shadow-xl border border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <p className="text-[#777] text-[9px] sm:text-xs uppercase tracking-[0.1em] font-medium">Receita do Dia</p>
            <p className="text-xl sm:text-3xl font-light text-white mt-1 sm:mt-2">R$ {todayRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] text-[#C5A059] p-2 sm:p-3 rounded-xl shadow-lg self-start sm:self-auto">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-[#121212] p-4 sm:p-6 rounded-2xl shadow-xl border border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <p className="text-[#777] text-[9px] sm:text-xs uppercase tracking-[0.1em] font-medium">Avisos Estoque</p>
            <p className="text-2xl sm:text-3xl font-light text-white mt-1 sm:mt-2">{lowStockProducts.length}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] text-[#FF3D00] p-2 sm:p-3 rounded-xl shadow-lg self-start sm:self-auto">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#121212] rounded-2xl shadow-2xl border border-[#222] flex flex-col relative overflow-hidden">
          <div className="p-6 border-b border-[#222] flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">Próximos Agendamentos (Hoje)</h2>
          </div>
          <div className="flex-1 p-6 space-y-4">
          {todayAppointments.filter(a => a.status === 'PENDING').length === 0 ? (
            <p className="text-[#777] text-sm">Nenhum agendamento pendente para hoje.</p>
          ) : (
            <div className="space-y-4">
              {todayAppointments
                .filter(a => a.status === 'PENDING')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map(appt => {
                  const service = state.services.find(s => s.id === appt.serviceId);
                  const time = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={appt.id} className="flex items-center gap-6 p-4 bg-[#1A1A1A] rounded-xl border-l-4 border-[#C5A059] shadow-lg transition-transform hover:translate-x-1">
                      <span className="text-sm font-mono text-[#C5A059]">{time}</span>
                      <div className="flex-1">
                        <p className="font-medium text-white">{appt.clientName}</p>
                        <p className="text-xs text-[#666]">{service?.name} <span className="text-[#444]">|</span> Profissional: {state.barbers.find(b => b.id === appt.barberId)?.name || '-'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-[#C5A05922] text-[#C5A059] px-2 py-1 rounded">R$ {service?.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#121212] rounded-2xl shadow-2xl border border-[#222] flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#555]">Estoque Baixo</h2>
            {lowStockProducts.length > 0 && <span className="w-2 h-2 rounded-full bg-[#FF3D00] shadow-[0_0_8px_#FF3D00]"></span>}
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-[#777] text-sm">Estoque regular. Nenhum produto abaixo de 5 unidades.</p>
          ) : (
            <div className="space-y-4">
              {lowStockProducts.map(product => {
                const fraction = Math.max(10, (product.quantity / 5) * 100);
                return (
                  <div key={product.id} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-white">{product.name}</p>
                        <p className="text-[10px] text-[#FF3D00]">{product.quantity} unidades restantes</p>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF3D00]" style={{ width: `${fraction}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
