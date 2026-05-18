import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, DollarSign, ChevronRight, User, Scissors, Calendar as CalendarIcon } from 'lucide-react';
import { Appointment } from '../../types';

export default function AdminAgenda() {
  const { state, updateAppointmentStatus, payAppointment } = useAppContext();
  
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payApptId, setPayApptId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const sortedAppointments = [...state.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleOpenDetails = (appt: Appointment) => {
    setSelectedAppt(appt);
    setDetailsModalOpen(true);
  };

  const handleOpenPay = (id: string) => {
    setPayApptId(id);
    setPayModalOpen(true);
    setDetailsModalOpen(false);
  };

  const handleConfirmPay = () => {
    if (payApptId) {
      const appt = state.appointments.find(a => a.id === payApptId);
      const service = state.services.find(s => s.id === appt?.serviceId);
      if (appt && service) {
        payAppointment(appt.id, paymentMethod, service.price, service.name);
      }
      setPayModalOpen(false);
      setPayApptId(null);
    }
  };

  const handleCancelAppointment = (id: string) => {
    updateAppointmentStatus(id, 'CANCELLED');
    setDetailsModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center bg-[#0C0C0C] border border-[#222] p-4 sm:p-6 rounded-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Agenda Completa</h1>
      </div>

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        {/* Table Header (Hidden on small mobile) */}
        <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 gap-4 p-4 bg-[#0C0C0C] border-b border-[#222] text-xs tracking-wider uppercase text-[#555] font-semibold">
          <div className="col-span-1">Data/Hora</div>
          <div className="col-span-2">Cliente</div>
          <div className="col-span-1">Profissional</div>
          <div className="col-span-1 hidden md:block">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Mobile Header (similar to screenshot) */}
        <div className="sm:hidden flex justify-between p-3 border-b border-[#222] bg-[#0C0C0C]">
          <span className="text-[10px] text-[#555] font-bold uppercase tracking-widest w-1/3">Data/Hora</span>
          <span className="text-[10px] text-[#555] font-bold uppercase tracking-widest w-1/3 text-center">Cliente</span>
          <span className="text-[10px] text-[#555] font-bold uppercase tracking-widest w-1/3 text-right">Profissional</span>
        </div>

        <div className="divide-y divide-[#222]">
          {sortedAppointments.length === 0 ? (
            <div className="p-8 text-center text-[#777]">Nenhum agendamento encontrado.</div>
          ) : (
            sortedAppointments.map((appt) => {
              const service = state.services.find(s => s.id === appt.serviceId);
              const barber = state.barbers.find(b => b.id === appt.barberId);
              const dateObj = parseISO(appt.date);
              const isPending = appt.status === 'PENDING';

              return (
                <div 
                  key={appt.id} 
                  onClick={() => handleOpenDetails(appt)}
                  className="p-3 sm:p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer group flex flex-col sm:grid sm:grid-cols-5 md:grid-cols-6 items-center gap-4 relative"
                >
                  {/* MOBILE LAYOUT (flex row for main info) */}
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

                  {/* DESKTOP LAYOUT */}
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

                  {/* Desktop Only Actions (Quick actions without opening modal, optional but good for mouse users) */}
                  <div className="hidden sm:flex col-span-1 justify-end items-center space-x-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenPay(appt.id); }}
                          className="p-2 text-[#00C853] bg-[#00C85322] hover:bg-[#00C85344] rounded transition-colors text-xs font-bold uppercase tracking-wider items-center justify-center inline-flex"
                          title="Receber Pagamento"
                        >
                          <DollarSign size={16} /> <span className="ml-1 hidden lg:inline">Receber</span>
                        </button>
                      </>
                    ) : (
                       <ChevronRight className="w-5 h-5 text-[#444] group-hover:text-[#C5A059]" />
                    )}
                  </div>
                  
                  {/* Status Indicator Bar for Mobile */}
                  <div className={`sm:hidden absolute left-0 top-0 bottom-0 w-1 ${
                      appt.status === 'COMPLETED' ? 'bg-[#00C853]' :
                      appt.status === 'CANCELLED' ? 'bg-[#FF3D00]' :
                      'bg-[#C5A059]'
                  }`}></div>
                </div>
              )
            })
          )}
        </div>
      </div>

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
                                 <div className="text-white font-medium truncate">{service?.name}</div>
                              </div>
                           </div>
                           <div className="text-right shrink-0 ml-2">
                              <div className="text-[10px] text-[#777] uppercase tracking-widest font-bold mb-0.5">Valor</div>
                              <div className="text-[#C5A059] font-bold">R$ {service?.price.toFixed(2)}</div>
                           </div>
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
