import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  User, 
  Scissors, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  ChevronDown 
} from 'lucide-react';
import { Appointment } from '../../types';
import toast from 'react-hot-toast';

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function AdminAgenda() {
  const { state, updateAppointmentStatus, payAppointment, addAppointment } = useAppContext();
  const { barbearia } = useBarbearia();
  
  const [config, setConfig] = useState({
    workStart: "08:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    workEnd: "19:00"
  });

  React.useEffect(() => {
    if (barbearia?.id) {
      fetch(`/api/config?barbeariaId=${barbearia.id}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setConfig({
              workStart: data.workStart || "08:00",
              lunchStart: data.lunchStart || "12:00",
              lunchEnd: data.lunchEnd || "13:00",
              workEnd: data.workEnd || "19:00"
            });
          }
        })
        .catch(err => console.error("Error fetching admin config:", err));
    }
  }, [barbearia?.id]);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const dynamicTimes = (() => {
    const list = [];
    const startMin = timeToMinutes(config.workStart);
    const endMin = timeToMinutes(config.workEnd);
    const lunchStartMin = timeToMinutes(config.lunchStart);
    const lunchEndMin = timeToMinutes(config.lunchEnd);

    for (let m = startMin; m < endMin; m += 15) {
      if (m >= lunchStartMin && m < lunchEndMin) {
        continue;
      }
      const hr = Math.floor(m / 60);
      const mn = m % 60;
      list.push(`${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`);
    }
    return list;
  })();

  const [activeTab, setActiveTab] = useState<'agenda' | 'bloqueios' | 'clientes-fixos'>('agenda');

  // Modal controls
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payApptId, setPayApptId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [agendaSubTab, setAgendaSubTab] = useState<'hoje' | 'proximos'>('hoje');

  // Form states for Block
  const [blockDate, setBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [blockTime, setBlockTime] = useState('09:00');
  const [blockBarberId, setBlockBarberId] = useState('');
  const [blockReason, setBlockReason] = useState('Compromisso');

  // Form states for Fixed Clients
  const [fixoName, setFixoName] = useState('');
  const [fixoPhone, setFixoPhone] = useState('');
  const [fixoDayOfWeek, setFixoDayOfWeek] = useState(1); // Monday default
  const [fixoTime, setFixoTime] = useState('10:00');
  const [fixoBarberId, setFixoBarberId] = useState('');

  // Expansion controls for Day Cards
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});

  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const isBarbeiro = authState?.role === 'BARBEIRO';
  const currentBarbeiroId = authState?.barbeiroId;

  // Set default barber IDs when state finishes loading if not already set
  React.useEffect(() => {
    const barbers = state.barbers.filter(b => b.active);
    if (barbers.length > 0) {
      if (!blockBarberId) setBlockBarberId(isBarbeiro ? (currentBarbeiroId || barbers[0].id) : barbers[0].id);
      if (!fixoBarberId) setFixoBarberId(isBarbeiro ? (currentBarbeiroId || barbers[0].id) : barbers[0].id);
    }
  }, [state.barbers, isBarbeiro, currentBarbeiroId]);

  // Filters to exclude blocks and fixed client metadata rows from standard daily lists
  const filteredAppointments = [...state.appointments]
    .filter(a => !isBarbeiro || a.barberId === currentBarbeiroId)
    .filter(a => a.clientName !== 'CLIENTE_FIXO' && a.clientName !== 'AGENDA_BLOQUEADA');

  // Group normal appointments by calendar day
  const groupedByDay: { [key: string]: Appointment[] } = {};
  filteredAppointments.forEach(appt => {
    if (!appt.date) return;
    const dayKey = appt.date.split('T')[0];
    if (!groupedByDay[dayKey]) {
      groupedByDay[dayKey] = [];
    }
    groupedByDay[dayKey].push(appt);
  });

  // Sort Day Cards (Past to Future ascending, or descending so newest / today is on top)
  // Let's sort ascending so closest upcoming schedules display sequentially
  const sortedDays = Object.keys(groupedByDay).sort((a, b) => a.localeCompare(b));

  // Handlers
  const handleOpenDetails = (appt: Appointment) => {
    setSelectedAppt(appt);
    const service = state.services.find(s => s.id === appt.serviceId);
    setCustomPrice(service ? service.price.toFixed(2) : '0.00');
    setDetailsModalOpen(true);
  };

  const handleOpenPay = (id: string) => {
    setPayApptId(id);
    const appt = state.appointments.find(a => a.id === id);
    const service = state.services.find(s => s.id === appt?.serviceId);
    setCustomPrice(service ? service.price.toFixed(2) : '0.00');
    setPayModalOpen(true);
    setDetailsModalOpen(false);
  };

  const handleConfirmPay = () => {
    if (payApptId) {
      const appt = state.appointments.find(a => a.id === payApptId);
      const service = state.services.find(s => s.id === appt?.serviceId);
      if (appt && service) {
        const amt = parseFloat(customPrice);
        const finalPrice = isNaN(amt) || amt < 0 ? service.price : amt;
        payAppointment(appt.id, paymentMethod, finalPrice, service.name);
      }
      setPayModalOpen(false);
      setPayApptId(null);
    }
  };

  const handleCancelAppointment = (id: string) => {
    updateAppointmentStatus(id, 'CANCELLED');
    setDetailsModalOpen(false);
  };

  // Block handlers
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const barberIdToUse = isBarbeiro ? currentBarbeiroId : blockBarberId;
    if (!barberIdToUse) {
      toast.error('Selecione um barbeiro disponível.');
      return;
    }
    try {
      // Date structure
      const dateLocalISO = `${blockDate}T${blockTime}:00`;
      
      addAppointment({
        clientName: 'AGENDA_BLOQUEADA',
        clientPhone: blockReason || 'Compromisso',
        serviceId: '',
        barberId: barberIdToUse,
        date: dateLocalISO
      });
      toast.success('Horário bloqueado com sucesso!');
      setBlockReason('Compromisso');
    } catch (err: any) {
      toast.error('Falhou ao adicionar bloqueio');
    }
  };

  // Fixed client handlers
  const handleAddFixo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixoName.trim() || !fixoPhone.trim()) {
      toast.error('Informe o nome e celular do cliente.');
      return;
    }
    const barberIdToUse = isBarbeiro ? currentBarbeiroId : fixoBarberId;
    if (!barberIdToUse) {
      toast.error('Selecione um barbeiro disponível.');
      return;
    }
    try {
      const dayNum = fixoDayOfWeek + 2; // Sunday: Jan 2nd, etc.
      const dateStr = `2000-01-0${dayNum}T${fixoTime}:00`;
      
      addAppointment({
        clientName: 'CLIENTE_FIXO',
        clientPhone: `${fixoName.trim()}|${fixoPhone.trim()}`,
        serviceId: '',
        barberId: barberIdToUse,
        date: dateStr
      });
      toast.success('Cliente Fixo cadastrado!');
      setFixoName('');
      setFixoPhone('');
    } catch (err: any) {
      toast.error('Falhou ao cadastrar cliente fixo');
    }
  };

  // Parsing helper for Client Fixo Phone Field
  const getFixoDetails = (phoneField: string) => {
    const parts = phoneField.split('|');
    return {
      name: parts[0] || 'Cliente Fixo',
      phone: parts[1] || ''
    };
  };

  const renderAppointmentItem = (appt: Appointment) => {
    const service = state.services.find(s => s.id === appt.serviceId);
    const barber = state.barbers.find(b => b.id === appt.barberId);
    const dateObj = parseISO(appt.date);
    const isPending = appt.status === 'PENDING';

    return (
      <div 
        key={appt.id} 
        onClick={() => handleOpenDetails(appt)}
        className="p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer group flex flex-col sm:grid sm:grid-cols-5 md:grid-cols-6 items-center gap-3 relative"
      >
        {/* MOBILE DETAIL LAYOUT */}
        <div className="flex w-full justify-between items-center sm:hidden">
          <div className="w-1/3">
            <div className="font-medium text-white text-sm">{format(dateObj, 'dd/MM/yyyy')}</div>
            <div className="text-[11px] font-mono text-[#C5A059] mt-0.5">{format(dateObj, 'HH:mm')}</div>
          </div>
          <div className="w-1/3 text-center truncate px-1">
            <div className="font-medium text-white text-sm truncate uppercase">{appt.clientName}</div>
            <div className="text-[10px] text-[#777] mt-0.5 truncate">{appt.clientPhone}</div>
          </div>
          <div className="w-1/3 text-right flex items-center justify-end">
            <div className="font-medium text-white text-sm uppercase truncate max-w-[80%]">{barber?.name || '-'}</div>
            <ChevronRight className="w-4 h-4 text-[#444] ml-1 shrink-0 group-hover:text-[#C5A059] transition-colors" />
          </div>
        </div>

        {/* DESKTOP DETAIL LAYOUT */}
        <div className="hidden sm:block col-span-1">
          <div className="font-medium text-white">{format(dateObj, 'dd/MM/yyyy')}</div>
          <div className="text-sm font-mono text-[#C5A059]">{format(dateObj, 'HH:mm')}</div>
        </div>
        <div className="hidden sm:block col-span-2">
          <div className="font-medium text-white">{appt.clientName}</div>
          <div className="text-sm text-[#777]">{appt.clientPhone}</div>
        </div>
        <div className="hidden sm:block col-span-1 text-[#888]">
          <div className="font-medium text-white uppercase">{barber?.name || '-'}</div>
        </div>
        <div className="hidden md:block col-span-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            appt.status === 'COMPLETED' ? 'bg-[#00C85322] text-[#00C853]' :
            appt.status === 'CANCELLED' ? 'bg-[#FF3D0022] text-[#FF3D00]' :
            'bg-[#C5A05922] text-[#C5A059]'
          }`}>
            {appt.status === 'PENDING' && <Clock size={12} />}
            {appt.status === 'COMPLETED' && <CheckCircle2 size={12} />}
            {appt.status === 'CANCELLED' && <XCircle size={12} />}
            {appt.status === 'PENDING' ? 'Pendente' : appt.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
          </span>
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex col-span-1 justify-end items-center space-x-2">
          {isPending ? (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenPay(appt.id); }}
              className="p-2 text-[#00C853] bg-[#00C85322] hover:bg-[#00C85344] rounded transition-colors text-xs font-bold uppercase tracking-wider items-center justify-center inline-flex"
              title="Receber Pagamento"
            >
              <DollarSign size={16} /> <span className="ml-1 hidden lg:inline">Receber</span>
            </button>
          ) : (
            <ChevronRight className="w-5 h-5 text-[#444] group-hover:text-[#C5A059]" />
          )}
        </div>

        {/* Status Accent Bar */}
        <div className={`sm:hidden absolute left-0 top-0 bottom-0 w-1 ${
          appt.status === 'COMPLETED' ? 'bg-[#00C853]' :
          appt.status === 'CANCELLED' ? 'bg-[#FF3D00]' :
          'bg-[#C5A059]'
        }`}></div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-[#0C0C0C] border border-[#222] p-5 sm:p-6 rounded-2xl gap-4 md:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Agenda Completa</h1>
          <p className="text-xs text-[#777] mt-1">Gerencie a agenda, bloqueios e horários recorrentes.</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex border-b border-[#222] gap-1 bg-[#0F0F0F] p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'agenda' 
              ? 'bg-[#C5A059] text-[#0A0A0A] shadow' 
              : 'text-[#888] hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          Agenda Diária
        </button>
        <button
          onClick={() => setActiveTab('bloqueios')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'bloqueios' 
              ? 'bg-[#C5A059] text-[#0A0A0A] shadow' 
              : 'text-[#888] hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          Agenda Bloqueada
        </button>
        <button
          onClick={() => setActiveTab('clientes-fixos')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'clientes-fixos' 
              ? 'bg-[#C5A059] text-[#0A0A0A] shadow' 
              : 'text-[#888] hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          Clientes Fixos
        </button>
      </div>

      {/* Content Areas */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Sub-tab Toggles (Hoje vs Próximos Dias) */}
          <div className="flex bg-[#0C0C0C] p-1 rounded-xl border border-[#222] w-fit">
            <button
              onClick={() => setAgendaSubTab('hoje')}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                agendaSubTab === 'hoje'
                  ? 'bg-[#C5A059] text-black shadow-md font-black'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Agenda de Hoje
            </button>
            <button
              onClick={() => setAgendaSubTab('proximos')}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                agendaSubTab === 'proximos'
                  ? 'bg-[#C5A059] text-black shadow-md font-black'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Próximos Dias
            </button>
          </div>

          {/* Sub-tab: HOJE */}
          {agendaSubTab === 'hoje' && (() => {
            const todayKey = format(new Date(), 'yyyy-MM-dd');
            const todayAppts = (groupedByDay[todayKey] || []).sort((a, b) => a.date.localeCompare(b.date));
            const formattedTodayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

            return (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center bg-[#161616] border border-[#222] p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-[#777] uppercase font-black tracking-widest block mb-0.5">Fila Corrida</span>
                    <h2 className="text-[#C5A059] font-bold text-sm sm:text-base capitalize flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse"></span>
                       {formattedTodayLabel}
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#C5A05922] text-[#C5A059] px-3 py-1 rounded-lg border border-[#C5A05915]">
                    {todayAppts.length} {todayAppts.length === 1 ? 'cliente' : 'clientes'}
                  </span>
                </div>

                {todayAppts.length === 0 ? (
                  <div className="p-12 text-center text-[#777] bg-[#121212] border border-[#222] rounded-2xl">
                    Nenhum agendamento diário ativo para o dia de hoje.
                  </div>
                ) : (
                  <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden divide-y divide-[#222]">
                    {todayAppts.map((appt) => renderAppointmentItem(appt))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Sub-tab: OUTROS / PRÓXIMOS DIAS */}
          {agendaSubTab === 'proximos' && (() => {
            const todayKey = format(new Date(), 'yyyy-MM-dd');
            // Show any day after today
            const otherDays = sortedDays.filter(dayKey => dayKey > todayKey);

            return (
              <div className="space-y-4 animate-in fade-in duration-200">
                {otherDays.length === 0 ? (
                  <div className="p-12 text-center text-[#777] bg-[#121212] border border-[#222] rounded-2xl">
                    Nenhum agendamento para os próximos dias.
                  </div>
                ) : (
                  otherDays.map((dayKey) => {
                    const dayAppts = groupedByDay[dayKey].sort((a, b) => a.date.localeCompare(b.date));
                    const isExpanded = !!expandedDays[dayKey];
                    const parsedDayDate = parseISO(dayKey + 'T12:00:00');
                    const formattedDayLabel = format(parsedDayDate, "EEEE, dd/MM", { locale: ptBR });

                    return (
                      <div 
                        key={dayKey} 
                        className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden"
                      >
                        {/* Day Header Trigger Card */}
                        <button 
                          onClick={() => setExpandedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }))}
                          className="w-full flex justify-between items-center p-4 sm:p-5 bg-[#0C0C0C] hover:bg-[#161616] transition-colors border-b border-[#222] text-left shrink-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-2.5 bg-[#C5A05922] text-[#C5A059] rounded-xl">
                              <CalendarIcon size={20} />
                            </div>
                            <div>
                              <span className="text-white font-semibold text-base sm:text-lg capitalize">
                                {formattedDayLabel}
                              </span>
                              <div className="text-xs text-[#777] mt-0.5 font-medium">
                                {dayAppts.length} {dayAppts.length === 1 ? 'agendamento' : 'agendamentos'}
                              </div>
                            </div>
                          </div>
                          <ChevronDown 
                            size={20} 
                            className={`text-[#777] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#C5A059]' : ''}`} 
                          />
                        </button>

                        {/* Expanded Items */}
                        {isExpanded && (
                          <div className="divide-y divide-[#222] bg-[#121212]">
                            {dayAppts.map((appt) => renderAppointmentItem(appt))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Blocks Tab */}
      {activeTab === 'bloqueios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Create block Form */}
          <div className="bg-[#121212] p-6 rounded-2xl border border-[#222] shadow-xl h-fit">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Lock className="text-[#C5A059]" size={20} /> Bloquear Horário
            </h2>
            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Data</label>
                <input 
                  type="date"
                  required
                  value={blockDate}
                  onChange={e => setBlockDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all placeholder-[#555]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Horário</label>
                <select
                  value={blockTime}
                  onChange={e => setBlockTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all"
                >
                  {dynamicTimes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {!isBarbeiro && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Barbeiro</label>
                  <select
                    value={blockBarberId}
                    onChange={e => setBlockBarberId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all"
                  >
                    {state.barbers.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Motivo / Descrição</label>
                <input 
                  type="text"
                  required
                  placeholder="EX: Saída médica, Almoço, Folga"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all placeholder-[#555]"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#C5A059] text-black font-bold text-xs uppercase tracking-widest py-3.5 sm:py-4 rounded-xl hover:bg-[#8E6D31] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Lock size={15} /> Cadastrar Bloqueio
              </button>
            </form>
          </div>

          {/* Active Bloqueios Table */}
          <div className="lg:col-span-2 bg-[#121212] rounded-2xl border border-[#222] overflow-hidden">
            <div className="bg-[#0C0C0C] p-4 border-b border-[#222]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#888]">Bloqueios Ativos</h2>
            </div>
            {state.appointments.filter(a => a.clientName === 'AGENDA_BLOQUEADA' && a.status !== 'CANCELLED').length === 0 ? (
              <div className="p-12 text-center text-[#777]">
                Nenhum horário bloqueado no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#0C0C0C] border-b border-[#222] text-[10px] text-[#555] uppercase tracking-widest font-bold">
                      <th className="p-4">Data/Hora</th>
                      <th className="p-4">Barbeiro</th>
                      <th className="p-4">Motivo</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {state.appointments
                      .filter(a => a.clientName === 'AGENDA_BLOQUEADA' && a.status !== 'CANCELLED')
                      .sort((a,b) => b.date.localeCompare(a.date))
                      .map(appt => {
                        const barber = state.barbers.find(b => b.id === appt.barberId);
                        const apptDate = parseISO(appt.date);
                        return (
                          <tr key={appt.id} className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="p-4">
                              <span className="text-white font-medium block">{format(apptDate, 'dd/MM/yyyy')}</span>
                              <span className="text-mono text-xs text-[#C5A059]">{format(apptDate, 'HH:mm')}</span>
                            </td>
                            <td className="p-4 text-sm text-white uppercase">{barber?.name || 'Geral'}</td>
                            <td className="p-4 text-sm text-[#777] italic">{appt.clientPhone}</td>
                            <td className="p-4 text-right shrink-0">
                              <button
                                onClick={() => {
                                  updateAppointmentStatus(appt.id, 'CANCELLED');
                                  toast.success('Horário desbloqueado!');
                                }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Remover Bloqueio"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clientes Fixos Tab */}
      {activeTab === 'clientes-fixos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Create Fixo Form */}
          <div className="bg-[#121212] p-6 rounded-2xl border border-[#222] shadow-xl h-fit">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <User className="text-[#C5A059]" size={20} /> Cadastrar Cliente Fixo
            </h2>
            <form onSubmit={handleAddFixo} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Nome Cliente</label>
                <input 
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={fixoName}
                  onChange={e => setFixoName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all placeholder-[#555]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Celular (WhatsApp)</label>
                <input 
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={fixoPhone}
                  onChange={e => setFixoPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all placeholder-[#555]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Dia da Semana</label>
                <select
                  value={fixoDayOfWeek}
                  onChange={e => setFixoDayOfWeek(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all"
                >
                  <option value={0}>Domingo</option>
                  <option value={1}>Segunda-feira</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira</option>
                  <option value={6}>Sábado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Horário Fixo</label>
                <select
                  value={fixoTime}
                  onChange={e => setFixoTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all"
                >
                  {dynamicTimes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {!isBarbeiro && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-1.5">Barbeiro Designado</label>
                  <select
                    value={fixoBarberId}
                    onChange={e => setFixoBarberId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-all"
                  >
                    {state.barbers.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-[#C5A059] text-black font-bold text-xs uppercase tracking-widest py-3.5 sm:py-4 rounded-xl hover:bg-[#8E6D31] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Plus size={15} /> Adicionar Cliente Fixo
              </button>
            </form>
          </div>

          {/* Active Clientes Fixos Table */}
          <div className="lg:col-span-2 bg-[#121212] rounded-2xl border border-[#222] overflow-hidden">
            <div className="bg-[#0C0C0C] p-4 border-b border-[#222]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#888]">Lista de Clientes Recorrentes</h2>
            </div>
            {state.appointments.filter(a => a.clientName === 'CLIENTE_FIXO' && a.status !== 'CANCELLED').length === 0 ? (
              <div className="p-12 text-center text-[#777]">
                Nenhum cliente fixo cadastrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#0C0C0C] border-b border-[#222] text-[10px] text-[#555] uppercase tracking-widest font-bold">
                      <th className="p-4">Cliente / Celular</th>
                      <th className="p-4">Dia Recorrência</th>
                      <th className="p-4 font-mono">Horário</th>
                      <th className="p-4">Barbeiro</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {state.appointments
                      .filter(a => a.clientName === 'CLIENTE_FIXO' && a.status !== 'CANCELLED')
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(appt => {
                        const barber = state.barbers.find(b => b.id === appt.barberId);
                        const apptDate = parseISO(appt.date);
                        const dayOfWeek = apptDate.getDay();
                        const details = getFixoDetails(appt.clientPhone);

                        return (
                          <tr key={appt.id} className="hover:bg-[#1A1A1A] transition-colors">
                            <td className="p-4">
                              <span className="text-white font-medium block">{details.name}</span>
                              <span className="text-xs text-[#777]">{details.phone}</span>
                            </td>
                            <td className="p-4 text-sm text-[#C5A059] font-semibold">{WEEKDAYS[dayOfWeek]}</td>
                            <td className="p-4 text-sm font-mono text-white">{format(apptDate, 'HH:mm')}</td>
                            <td className="p-4 text-sm text-white uppercase">{barber?.name || '-'}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  updateAppointmentStatus(appt.id, 'CANCELLED');
                                  toast.success('Cliente recorrente cancelado!');
                                }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Remover Recorrência Fixo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModalOpen && selectedAppt && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-[#121212] p-6 sm:p-8 rounded-3xl w-full max-w-md border border-[#333] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="text-[#C5A059]" /> Detalhes do Agendamento
              </h2>
              <button onClick={() => setDetailsModalOpen(false)} className="text-[#777] hover:text-white transition-colors p-1 bg-[#1A1A1A] rounded-full">
                <XCircle size={24} />
              </button>
            </div>

            {(() => {
              const service = state.services.find(s => s.id === selectedAppt.serviceId);
              const barber = state.barbers.find(b => b.id === selectedAppt.barberId);
              const dateObj = parseISO(selectedAppt.date);
              const isPending = selectedAppt.status === 'PENDING';

              return (
                <div className="space-y-6">
                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1A1A1A] p-3 sm:p-4 rounded-xl border border-[#222]">
                      <div className="text-[10px] sm:text-xs text-[#777] uppercase tracking-widest font-bold mb-1">Data</div>
                      <div className="text-white font-medium text-sm">{format(dateObj, 'dd/MM/yyyy')}</div>
                      <div className="text-[#C5A059] font-mono text-xs">{format(dateObj, 'HH:mm')}</div>
                    </div>
                    <div className="bg-[#1A1A1A] p-3 sm:p-4 rounded-xl border border-[#222]">
                      <div className="text-[10px] sm:text-xs text-[#777] uppercase tracking-widest font-bold mb-1">Status</div>
                      <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedAppt.status === 'COMPLETED' ? 'bg-[#00C85322] text-[#00C853]' :
                        selectedAppt.status === 'CANCELLED' ? 'bg-[#FF3D0022] text-[#FF3D00]' :
                        'bg-[#C5A05922] text-[#C5A059]'
                      }`}>
                        {selectedAppt.status === 'PENDING' && <Clock size={12} />}
                        {selectedAppt.status === 'COMPLETED' && <CheckCircle2 size={12} />}
                        {selectedAppt.status === 'CANCELLED' && <XCircle size={12} />}
                        {selectedAppt.status === 'PENDING' ? 'Pendente' : selectedAppt.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#222] space-y-3">
                    <div className="flex items-center gap-3 border-b border-[#333] pb-3">
                      <User className="text-[#C5A059] shrink-0" size={20} />
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#777] uppercase tracking-widest font-bold mb-0.5">Cliente</div>
                        <div className="text-white font-medium truncate">{selectedAppt.clientName}</div>
                        <div className="text-sm text-[#777] truncate">{selectedAppt.clientPhone}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#333] pb-3">
                      <div className="flex items-center gap-3">
                        <Scissors className="text-[#888] shrink-0" size={20} />
                        <div className="min-w-0">
                          <div className="text-[10px] text-[#777] uppercase tracking-widest font-bold mb-0.5">Serviço</div>
                          <div className="text-white font-medium truncate">{service?.name || 'Bloqueio / Especial'}</div>
                        </div>
                      </div>
                      {service && (
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-[10px] text-[#777] uppercase tracking-widest font-bold mb-1">Valor</div>
                          <div className="flex items-center gap-1 bg-[#222] border border-[#333] px-2 py-1 rounded-lg focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059]">
                            <span className="text-[10px] text-[#C5A059] font-extrabold">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              className="bg-transparent text-[#C5A059] font-extrabold text-xs w-16 text-right focus:outline-none border-none p-0 outline-none select-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-5 h-5 rounded-full bg-[#333] flex items-center justify-center shrink-0">
                        <User size={12} className="text-[#888]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#777] uppercase tracking-widest font-bold mb-0.5">Profissional</div>
                        <div className="text-white font-medium truncate uppercase">{barber?.name || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleCancelAppointment(selectedAppt.id)}
                        className="w-1/3 py-4 bg-[#FF3D0011] text-[#FF3D00] border border-[#FF3D0033] rounded-xl uppercase tracking-widest text-[10px] font-bold hover:bg-[#FF3D0022] transition-colors flex flex-col items-center justify-center gap-1"
                      >
                        <XCircle size={18} />
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleOpenPay(selectedAppt.id)}
                        className="w-2/3 py-4 bg-[#00C853] text-[#0A0A0A] shadow-[0_0_15px_#00C85344] rounded-xl uppercase tracking-widest text-xs font-bold hover:bg-[#00E676] transition-colors flex items-center justify-center gap-2"
                      >
                        <DollarSign size={20} />
                        Receber Pagamento
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-[#121212] p-6 sm:p-8 rounded-3xl w-full max-w-md border border-[#333] shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="text-[#C5A059]" /> Receber Pagamento
            </h2>
            <div className="space-y-6">
              {/* Ajustar Valor do Recebimento */}
              <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#222] space-y-2">
                <label className="block text-[10px] text-[#777] uppercase tracking-widest font-extrabold text-center">Ajustar Valor a Receber</label>
                <div className="flex items-center justify-center gap-2 max-w-[180px] mx-auto bg-[#222] border border-[#333] px-3 py-2 rounded-xl focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all">
                  <span className="text-xs text-[#C5A059] font-black">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="bg-transparent text-[#C5A059] font-extrabold text-base w-full text-center focus:outline-none border-none p-0 outline-none select-all [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-white font-medium">
                <label className="flex flex-col items-center justify-center gap-2 p-4 border border-[#333] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-colors bg-[#161616]">
                  <input type="radio" name="payment" value="PIX" checked={paymentMethod === 'PIX'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-[#C5A059]" />
                  <span className="text-xs uppercase tracking-wider">PIX</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 border border-[#333] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-colors bg-[#161616]">
                  <input type="radio" name="payment" value="Cartão de Crédito" checked={paymentMethod === 'Cartão de Crédito'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-[#C5A059]" />
                  <span className="text-xs uppercase tracking-wider text-center">Crédito</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 border border-[#333] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-colors bg-[#161616]">
                  <input type="radio" name="payment" value="Cartão de Débito" checked={paymentMethod === 'Cartão de Débito'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-[#C5A059]" />
                  <span className="text-xs uppercase tracking-wider text-center">Débito</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 border border-[#333] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-colors bg-[#161616]">
                  <input type="radio" name="payment" value="Dinheiro" checked={paymentMethod === 'Dinheiro'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-[#C5A059]" />
                  <span className="text-xs uppercase tracking-wider">Dinheiro</span>
                </label>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="w-1/3 py-4 bg-[#1A1A1A] text-[#888] rounded-xl uppercase tracking-widest text-[10px] font-bold hover:bg-[#222] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPay}
                  className="w-2/3 py-4 bg-[#00C853] text-[#0A0A0A] shadow-[0_0_15px_#00C85344] rounded-xl uppercase tracking-widest text-[10px] sm:text-xs font-bold hover:bg-[#00E676] transition-colors"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
