import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Users, Search, History, Calendar as CalendarIcon, Clock, CheckCircle2, Scissors } from 'lucide-react';
import { Client, Appointment } from '../../types';
import { format, parseISO } from 'date-fns';

import { confirmUI } from '../../utils/confirmUI';

export default function AdminClientes() {
  const { state, addClient, editClient, deleteClient } = useAppContext();
  
  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const isBarbeiro = authState?.role === 'BARBEIRO';
  const currentBarbeiroId = authState?.barbeiroId;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  const [newClient, setNewClient] = useState({ name: '', phone: '', birthDate: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', birthDate: '', notes: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) return;
    
    await addClient({
      name: newClient.name,
      phone: newClient.phone,
      birthDate: newClient.birthDate,
      notes: newClient.notes,
    });
    
    setIsAdding(false);
    setNewClient({ name: '', phone: '', birthDate: '', notes: '' });
  };

  const startEdit = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingId(client.id);
    setEditForm({ name: client.name, phone: client.phone, birthDate: client.birthDate || '', notes: client.notes || '' });
  };

  const handleUpdate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await editClient(id, editForm);
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    confirmUI('Tem certeza que deseja excluir este cliente?', async () => {
      await deleteClient(id);
    });
  };

  // Restrict to Barbeiro's clients if logged in as barbeiro
  const barbeiroPhones = new Set(state.appointments.filter(a => a.barberId === currentBarbeiroId).map(a => a.clientPhone.replace(/\D/g, '')));

  const filteredClients = state.clients.filter(c => {
    if (isBarbeiro && !barbeiroPhones.has(c.phone.replace(/\D/g, ''))) return false;
    
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.phone.includes(searchTerm);
  });

  const getClientHistory = (client: Client): Appointment[] => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    return state.appointments
      .filter(a => a.clientPhone.replace(/\D/g, '') === cleanPhone)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <Users className="text-[#C5A059]" /> Clientes
        </h1>
        <div className="flex w-full sm:w-auto items-center gap-4">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#333] text-white rounded text-sm focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          {!isBarbeiro && (
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all whitespace-nowrap"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              {isAdding ? 'Cancelar' : 'Novo'}
            </button>
          )}
        </div>
      </div>

      {isAdding && !isBarbeiro && (
        <form onSubmit={handleAdd} className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222] grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Nome</label>
            <input 
              type="text" 
              required
              value={newClient.name}
              onChange={e => setNewClient({...newClient, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Telefone (WhatsApp)</label>
            <input 
              type="text" 
              required
              value={newClient.phone}
              onChange={e => setNewClient({...newClient, phone: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Aniversário (Opcional)</label>
            <input 
              type="date"
              value={newClient.birthDate}
              onChange={e => setNewClient({...newClient, birthDate: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Observações</label>
            <input 
              type="text"
              value={newClient.notes}
              onChange={e => setNewClient({...newClient, notes: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded hover:bg-[#8E6D31] transition-colors">
              Salvar Cliente
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0C0C0C] border-b border-[#222]">
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Cliente</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold hidden md:table-cell">Aniversário</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold hidden lg:table-cell">Última Visita</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {filteredClients.map(c => (
              <tr 
                key={c.id} 
                className="hover:bg-[#161616] transition-colors cursor-pointer"
                onClick={() => setSelectedClientForHistory(c)}
              >
                <td className="p-4">
                  {editingId === c.id ? (
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editForm.name}
                        placeholder="Nome"
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={editForm.phone}
                        placeholder="Telefone"
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-sm text-[#777]">{c.phone}</div>
                      {c.notes && <div className="text-xs text-[#555] mt-1 italic">{c.notes}</div>}
                    </div>
                  )}
                </td>
                <td className="p-4 hidden md:table-cell">
                  {editingId === c.id ? (
                    <input 
                      type="date"
                      value={editForm.birthDate}
                      onChange={e => setEditForm({...editForm, birthDate: e.target.value})}
                      onClick={e => e.stopPropagation()}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none [color-scheme:dark]"
                    />
                  ) : (
                    <span className="text-[#888]">{c.birthDate ? new Date(c.birthDate).toLocaleDateString('pt-BR') : '-'}</span>
                  )}
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className="text-[#888]">{c.lastVisit || '-'}</span>
                </td>
                <td className="p-4 text-right align-top">
                  {editingId === c.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={(e) => handleUpdate(e, c.id)} className="p-2 text-[#00C853] hover:bg-[#00C85322] rounded transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button 
                         onClick={(e) => { e.stopPropagation(); setSelectedClientForHistory(c); }} 
                         className="p-2 text-white hover:bg-[#333] rounded transition-colors"
                         title="Ver Histórico"
                      >
                         <History size={18} />
                      </button>
                      {!isBarbeiro && (
                       <>
                        <button onClick={(e) => startEdit(e, c)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={(e) => handleDelete(e, c.id)} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded transition-colors">
                          <X size={18} />
                        </button>
                       </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[#777]">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-[#121212] flex flex-col p-6 sm:p-8 rounded-3xl w-full max-w-lg border border-[#333] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="flex justify-between items-start mb-6 shrink-0">
               <div>
                 <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <History className="text-[#C5A059]" /> Histórico de Apontamentos
                 </h2>
                 <p className="text-[#777] mt-1 text-sm">{selectedClientForHistory.name} - {selectedClientForHistory.phone}</p>
               </div>
               <button onClick={() => setSelectedClientForHistory(null)} className="text-[#777] hover:text-white transition-colors p-1 bg-[#1A1A1A] rounded-full">
                  <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-8 pr-1">
               {(() => {
                  const history = getClientHistory(selectedClientForHistory);
                  if (history.length === 0) {
                     return <div className="text-center p-8 border border-[#222] rounded-xl text-[#777]">Nenhum histórico registrado para este cliente.</div>;
                  }
                  return history.map(appt => {
                     const service = state.services.find(s => s.id === appt.serviceId);
                     const barber = state.barbers.find(b => b.id === appt.barberId);
                     const d = parseISO(appt.date);
                     return (
                        <div key={appt.id} className="bg-[#1A1A1A] border border-[#222] p-4 rounded-xl flex items-center justify-between">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <CalendarIcon size={14} className="text-[#C5A059]" />
                                 <span className="text-white font-medium text-sm">{format(d, 'dd/MM/yyyy')}</span>
                                 <span className="text-[#777] text-xs font-mono ml-2">{format(d, 'HH:mm')}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                 <Scissors size={14} className="text-[#888]" />
                                 <span className="text-sm text-white">{service?.name || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                 <Users size={14} className="text-[#888]" />
                                 <span className="text-xs text-[#777] uppercase">Profissional: {barber?.name || '-'}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                 appt.status === 'COMPLETED' ? 'bg-[#00C85322] text-[#00C853]' :
                                 appt.status === 'CANCELLED' ? 'bg-[#FF3D0022] text-[#FF3D00]' :
                                 'bg-[#C5A05922] text-[#C5A059]'
                              }`}>
                                 {appt.status === 'PENDING' ? 'Pendente' : appt.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                              </span>
                           </div>
                        </div>
                     );
                  });
               })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
