import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Users, Search } from 'lucide-react';
import { Client } from '../../types';

import { confirmUI } from '../../utils/confirmUI';

export default function AdminClientes() {
  const { state, updateClients } = useAppContext();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newClient, setNewClient] = useState({ name: '', phone: '', birthDate: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', birthDate: '', notes: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) return;
    
    const client: Client = {
      id: Date.now().toString(),
      name: newClient.name,
      phone: newClient.phone,
      birthDate: newClient.birthDate,
      notes: newClient.notes,
    };
    
    updateClients([...state.clients, client]);
    setIsAdding(false);
    setNewClient({ name: '', phone: '', birthDate: '', notes: '' });
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditForm({ name: client.name, phone: client.phone, birthDate: client.birthDate || '', notes: client.notes || '' });
  };

  const handleUpdate = (id: string) => {
    const updated = state.clients.map(c => 
      c.id === id ? { ...c, ...editForm } : c
    );
    updateClients(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    confirmUI('Tem certeza que deseja excluir este cliente?', () => {
      const updated = state.clients.filter(c => c.id !== id);
      updateClients(updated);
    });
  };

  const filteredClients = state.clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

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
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all whitespace-nowrap"
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            {isAdding ? 'Cancelar' : 'Novo'}
          </button>
        </div>
      </div>

      {isAdding && (
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
              <tr key={c.id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4">
                  {editingId === c.id ? (
                    <div className="space-y-2">
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
                      <button onClick={() => setEditingId(null)} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={() => handleUpdate(c.id)} className="p-2 text-[#00C853] hover:bg-[#00C85322] rounded transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(c)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded transition-colors">
                        <X size={18} />
                      </button>
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
    </div>
  );
}
