/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { useParams } from 'react-router-dom';
import { Scissors, Calendar, Clock, CheckCircle2, User, Users, ChevronLeft } from 'lucide-react';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientBooking() {
  const { state, addAppointment } = useAppContext();
  const { barbearia, fetchBySlug } = useBarbearia();
  const { slug } = useParams();
  
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '' });
  const [config, setConfig] = useState({
    workStart: "08:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    workEnd: "19:00",
    logoUrl: ""
  });

  useEffect(() => {
    if (slug) {
      fetchBySlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (barbearia?.id) {
      fetch(`/api/config?barbeariaId=${barbearia.id}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setConfig({
              workStart: data.workStart || "08:00",
              lunchStart: data.lunchStart || "12:00",
              lunchEnd: data.lunchEnd || "13:00",
              workEnd: data.workEnd || "19:00",
              logoUrl: data.logoUrl || ""
            });
          }
        })
        .catch(err => console.error("Error fetching config:", err));
    }
  }, [barbearia?.id, slug]);

  // Se não tem barbearia carregada e tem slug, estamos carregando
  if (slug && !barbearia) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-[#C5A059]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C5A059]"></div>
      </div>
    );
  }

  // Se não tem slug e não tem barbearia carregada (usuário acessou a home direta sem ser admin)
  if (!slug && !barbearia) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <Scissors size={48} className="text-[#333] mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Bem-vindo(a) ao Gestão Pro</h1>
        <p className="text-[#777] max-w-xs">Use o link de agendamento compartilhado pela sua barbearia para marcar um horário.</p>
        <a href="/admin/login" className="mt-8 text-[#C5A059] uppercase tracking-widest text-xs font-bold border border-[#C5A059]/30 px-6 py-3 rounded-xl hover:bg-[#C5A05911]">Acesso Administrativo</a>
      </div>
    );
  }

  // Generate next 14 days for selection
  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));
  
  // Convert "HH:mm" to minutes since midnight for comparison
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const service = state.services.find(s => s.id === selectedService);
  const barber = state.barbers.find(b => b.id === selectedBarber);

  // Helper to check if a specific slot is busy/fits within working hours limit
  const isTimeSlotBooked = (timeStr: string) => {
    if (!selectedDate || !selectedBarber) return false;
    
    const slotStart = timeToMinutes(timeStr);
    const selectedServiceDuration = service ? service.durationMinutes : 30;
    const slotEnd = slotStart + selectedServiceDuration;
    
    // Check shift boundaries using dynamic config:
    const startMin = timeToMinutes(config.workStart);
    const lunchStartMin = timeToMinutes(config.lunchStart);
    const lunchEndMin = timeToMinutes(config.lunchEnd);
    const endMin = timeToMinutes(config.workEnd);
    
    if (slotStart < startMin || slotEnd > endMin) return true; // Outside custom work hours
    
    // Overlaps with lunch
    if (slotStart < lunchEndMin && slotEnd > lunchStartMin) return true;

    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const selectedDayOfWeek = selectedDate.getDay();

    return state.appointments.some(a => {
      if (a.status === 'CANCELLED' || !a.date || a.barberId !== selectedBarber) return false;

      // 1. Recurring/Fixed Client
      if (a.clientName === 'CLIENTE_FIXO') {
        const apptDate = parseISO(a.date);
        if (apptDate.getDay() !== selectedDayOfWeek) return false;

        const apptTimeStr = format(apptDate, 'HH:mm');
        const apptStart = timeToMinutes(apptTimeStr);
        const apptDuration = 30; // default duration
        const apptEnd = apptStart + apptDuration;

        return slotStart < apptEnd && apptStart < slotEnd;
      }

      // 2. Regular appointments & Blocks (AGENDA_BLOQUEADA)
      const apptDate = parseISO(a.date);
      const apptDateStr = format(apptDate, 'yyyy-MM-dd');
      
      if (apptDateStr !== selectedDateStr) return false;

      const apptTimeStr = format(apptDate, 'HH:mm');
      const apptStart = timeToMinutes(apptTimeStr);
      
      let apptDuration = 30;
      if (a.clientName === 'AGENDA_BLOQUEADA') {
        apptDuration = 60; // blocks are usually 60 minutes
      } else {
        const apptService = state.services.find(s => s.id === a.serviceId);
        apptDuration = apptService ? apptService.durationMinutes : 30;
      }
      
      const apptEnd = apptStart + apptDuration;

      return slotStart < apptEnd && apptStart < slotEnd;
    });
  };

  // Generate 15-minute slot times list using dynamic configs
  const baseTimes: string[] = [];
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
    baseTimes.push(`${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`);
  }

  // Filter out past times for today
  let availableTimes = [...baseTimes];
  if (selectedDate && isSameDay(selectedDate, new Date())) {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    availableTimes = availableTimes.filter(time => {
      const [hour, minute] = time.split(':').map(Number);
      return hour > currentHour || (hour === currentHour && minute > currentMinute);
    });
  }
  availableTimes = availableTimes.sort((a, b) => a.localeCompare(b));

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.phone) return;

    // Create full ISO string for the appointment
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const isoDateTime = `${dateStr}T${selectedTime}:00-03:00`;

    addAppointment({
      serviceId: selectedService,
      barberId: selectedBarber,
      date: isoDateTime,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
    });

    setStep(5); // Success step
  };

  const getWhatsappLink = () => {
    const text = `Olá! Gostaria de confirmar meu agendamento.\n\nNome: *${clientInfo.name}*\nServiço: *${service?.name}*\nProfissional: *${barber?.name}*\nData: *${selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : ''}*\nHorário: *${selectedTime}*`;
    
    let numberToUse = import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER || "5544999107360";
    if (barber?.phone) {
      numberToUse = barber.phone.replace(/\D/g, ''); // Extract only digits
    }
    
    return `https://wa.me/${numberToUse}?text=${encodeURIComponent(text)}`;
  };

  const reset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setClientInfo({ name: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center py-6 sm:py-12 px-4 font-sans text-[#E0E0E0]">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        {config.logoUrl ? (
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#121212] border border-[#222] rounded-2xl mb-3 sm:mb-4 overflow-hidden shadow-[0_0_15px_#C5A05922]">
            <img 
              src={config.logoUrl} 
              alt={barbearia?.nome || "Logo"} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#121212] border border-[#222] rounded-2xl mb-3 sm:mb-4 shadow-[0_0_15px_#C5A05933]">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#C5A059] rounded flex items-center justify-center">
               <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-[#0A0A0A]"></div>
            </div>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-[#C5A059] uppercase tracking-tight">{barbearia?.nome}</h1>
        <p className="text-[#777] text-sm sm:text-base font-medium tracking-wide">Agende seu horário com praticidade</p>
      </div>

      <div className="w-full max-w-md bg-[#121212] rounded-3xl sm:rounded-[32px] shadow-2xl border border-[#222] p-5 sm:p-8 relative overflow-hidden">
        {/* Progress Bar */}
        {step < 5 && (
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#222] -z-10 -translate-y-1/2 rounded-full"></div>
            <div className={`absolute top-1/2 left-0 h-1 bg-[#C5A059] -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/3' : step === 3 ? 'w-2/3' : 'w-full'} shadow-[0_0_8px_#C5A059]`}></div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step >= i ? 'bg-[#C5A059] text-[#0A0A0A] shadow-[0_0_10px_#C5A05988]' : 'bg-[#1A1A1A] text-[#555] border border-[#333]'
              }`}>
                {i}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <Scissors size={20} className="text-[#C5A059]" />
              Escolha o Serviço
            </h2>
            <div className="space-y-3">
              {state.services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s.id)}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                    selectedService === s.id 
                      ? 'border-[#C5A059] bg-[#1A1A1A] shadow-[0_0_10px_#C5A05922]' 
                      : 'border-[#222] bg-[#121212] hover:border-[#333] hover:bg-[#161616]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="font-bold text-[#C5A059]">R$ {s.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#777]">
                    <Clock size={14} /> {s.durationMinutes} min
                  </div>
                </button>
              ))}
            </div>
            <button
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="w-full mt-6 sm:mt-8 bg-[#C5A059] text-[#0A0A0A] font-bold py-3 sm:py-4 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8E6D31] transition-colors uppercase tracking-widest text-[10px] sm:text-xs"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Professional */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <Users size={20} className="text-[#C5A059]" />
              Escolha o Profissional
            </h2>
            <div className="space-y-3">
              {state.barbers.filter(b => b.active).length === 0 && (
                <div className="text-center p-6 bg-[#1A1A1A] rounded-xl border border-[#333]">
                  <p className="text-[#777]">Nenhum barbeiro disponível no momento.</p>
                </div>
              )}
              {state.barbers.filter(b => b.active).map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarber(b.id)}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                    selectedBarber === b.id 
                      ? 'border-[#C5A059] bg-[#1A1A1A] shadow-[0_0_10px_#C5A05922]' 
                      : 'border-[#222] bg-[#121212] hover:border-[#333] hover:bg-[#161616]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center text-[#777]">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="font-medium text-white">{b.name}</div>
                      <div className="text-xs text-[#777] mt-1">{b.specialties || 'Barbeiro Clássico'}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#1A1A1A] text-[#888] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl hover:bg-[#222] transition-colors"
              >
                Voltar
              </button>
              <button
                disabled={!selectedBarber}
                onClick={() => setStep(3)}
                className="w-2/3 bg-[#C5A059] text-[#0A0A0A] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8E6D31] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date and Time */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-[#C5A059]" />
              Escolha a Data e Hora
            </h2>
            
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-3">Datas Disponíveis</label>
              <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
                {availableDates.map((date, i) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 snap-start w-20 p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-[#C5A059] bg-[#1A1A1A] text-[#C5A059]' 
                          : 'border-[#222] bg-[#121212] text-[#777] hover:border-[#333]'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">{format(date, 'eee', { locale: ptBR })}</span>
                      <span className={`text-2xl font-light ${isSelected ? 'text-white' : ''}`}>{format(date, 'dd')}</span>
                      <span className="text-[10px] uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-3">Horários Disponíveis (Profissional: {barber?.name})</label>
                <div className="grid grid-cols-3 gap-3">
                  {availableTimes.map(time => {
                    const isSelected = selectedTime === time;
                    const isBooked = isTimeSlotBooked(time);
                    return (
                      <button
                        key={time}
                        disabled={isBooked}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-xl font-medium border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected 
                            ? 'border-[#C5A059] bg-[#1A1A1A] text-[#C5A059]' 
                            : isBooked
                              ? 'border-red-900/30 bg-red-950/20 opacity-70 cursor-not-allowed text-red-500'
                              : 'border-[#222] bg-[#121212] text-[#777] hover:border-[#333]'
                        }`}
                      >
                        <span>{time}</span>
                        {isBooked && <span className="text-[9px] uppercase tracking-widest font-bold">Ocupado</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 bg-[#1A1A1A] text-[#888] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl hover:bg-[#222] transition-colors"
              >
                Voltar
              </button>
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(4)}
                className="w-2/3 bg-[#C5A059] text-[#0A0A0A] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8E6D31] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Client Info */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <User size={20} className="text-[#C5A059]" />
              Seus Dados
            </h2>
            
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="p-4 bg-[#1A1A1A] border-l-4 border-[#C5A059] rounded-xl mb-6 flex justify-between items-center shadow-lg">
                <div>
                  <p className="text-sm font-medium text-white">{service?.name}</p>
                  <p className="text-xs text-[#C5A059] font-medium mb-1">Com: {barber?.name}</p>
                  <p className="text-xs text-[#777]">{selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ''} às <span className="font-mono text-[#C5A059]">{selectedTime}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#C5A059]">R$ {service?.price.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                  className="w-full px-4 py-3 sm:py-4 bg-[#1A1A1A] border border-[#333] rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] text-white outline-none transition-all placeholder-[#555]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Celular (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({...clientInfo, phone: e.target.value})}
                  className="w-full px-4 py-3 sm:py-4 bg-[#1A1A1A] border border-[#333] rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] text-white outline-none transition-all placeholder-[#555]"
                />
              </div>

              <div className="flex gap-3 mt-6 sm:mt-8">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 bg-[#1A1A1A] text-[#888] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl hover:bg-[#222] transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={!clientInfo.name || !clientInfo.phone}
                  className="w-2/3 bg-[#C5A059] text-[#0A0A0A] font-bold uppercase tracking-widest text-[10px] sm:text-xs py-3 sm:py-4 rounded-xl disabled:opacity-50 hover:bg-[#8E6D31] transition-colors shadow-[0_0_15px_#C5A05944]"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="text-center animate-in zoom-in duration-500 py-8">
            <div className="mx-auto w-20 h-20 bg-[#C5A05922] text-[#C5A059] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_#C5A05944]">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Agendamento Confirmado! ✂️</h2>
            <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#333] mb-8 shadow-inner">
              <p className="text-[#E0E0E0] text-sm sm:text-base leading-relaxed">
                Seu horário para <strong className="text-[#C5A059] font-bold">{service?.name}</strong> está garantido no dia <strong className="text-white font-bold">{selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : ''}</strong> às <strong className="text-white font-mono text-lg bg-[#222] px-2 py-0.5 rounded">{selectedTime}</strong>.
              </p>
              <p className="text-[#888] text-xs mt-4 bt-4 border-t border-[#333] pt-4">
                No dia, aguardamos você pontualmente com o profissional {barber?.name}.
              </p>
            </div>
            <a
              href={getWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-[#0A0A0A] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl hover:bg-[#20ba56] transition-colors flex items-center justify-center gap-2 mb-3 shadow-[0_0_15px_rgba(37,211,102,0.3)] min-h-[44px]"
            >
              Confirmar Agendamento pelo WhatsApp
            </a>
            <button
              onClick={reset}
              className="w-full bg-[#1A1A1A] border border-[#333] text-[#E0E0E0] font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 sm:py-4 rounded-xl hover:bg-[#222] transition-colors"
            >
              Fazer Novo Agendamento
            </button>
          </div>
        )}
      </div>

      <a href="/admin" className="mt-8 text-xs font-bold uppercase tracking-widest text-[#555] hover:text-[#C5A059] transition-colors flex items-center gap-2 bg-[#121212] border border-[#222] px-4 py-2 rounded-full">
        <User size={14} /> Acesso Restrito
      </a>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
