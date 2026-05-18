import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Scissors, Search } from 'lucide-react';
import { Barber } from '../../types';

export default function AdminBarbeiros() {
  const { state, updateBarbers } = useAppContext();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newBarber, setNewBarber] = useState({ name: '', phone: '', specialties: '', active: true });
  const [editForm, setEditForm] = useState({ name: '', phone: '', specialties: '', active: true });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarber.name) return;
    
    const barber: Barber = {
      id: Date.now().toString(),
      name: newBarber.name,
      phone: newBarber.phone,
      specialties: newBarber.specialties,
      active: newBarber.active,
    };
    
    updateBarbers([...state.barbers, barber]);
    setIsAdding(false);
    setNewBarber({ name: '', phone: '', specialties: '', active: true });
  };

  const startEdit = (b: Barber) => {
    setEditingId(b.id);
    setEditForm({ name: b.name, phone: b.phone || '', specialties: b.specialties || '', active: b.active });
  };

  const handleUpdate = (id: string) => {
    const updated = state.barbers.map(b => 
      b.id === id ? { ...b, ...editForm } : b
    );
    updateBarbers(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este barbeiro?')) {
      const updated = state.barbers.filter(b => b.id !== id);
      updateBarbers(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl gap-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <Scissors className="text-[#C5A059]" /> Barbeiros / Funcionários
        </h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all whitespace-nowrap"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancelar' : 'Novo Barbeiro'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222] grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Nome</label>
            <input 
              type="text" 
              required
              value={newBarber.name}
              onChange={e => setNewBarber({...newBarber, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Telefone</label>
            <input 
              type="text" 
              value={newBarber.phone}
              onChange={e => setNewBarber({...newBarber, phone: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Especialidades (separadas por vírgula)</label>
            <input 
              type="text"
              placeholder="Ex: Degrade, Sombrancelha, Barba Terapia"
              value={newBarber.specialties}
              onChange={e => setNewBarber({...newBarber, specialties: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded hover:bg-[#8E6D31] transition-colors">
              Salvar Barbeiro
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0C0C0C] border-b border-[#222]">
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Barbeiro</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold hidden md:table-cell">Contatos / Info</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Status</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {state.barbers.map(b => (
              <tr key={b.id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4">
                  {editingId === b.id ? (
                    <input 
                      type="text" 
                      value={editForm.name}
                      placeholder="Nome"
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="font-medium text-white">{b.name}</span>
                  )}
                </td>
                <td className="p-4 hidden md:table-cell">
                  {editingId === b.id ? (
                    <div className="space-y-2">
                       <input 
                        type="text" 
                        value={editForm.phone}
                        placeholder="Telefone"
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={editForm.specialties}
                        placeholder="Especialidades"
                        onChange={e => setEditForm({...editForm, specialties: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-[#777]">{b.phone || '-'}</div>
                      <div className="text-xs text-[#555] mt-1">{b.specialties}</div>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {editingId === b.id ? (
                    <select
                      value={editForm.active ? 'true' : 'false'}
                      onChange={e => setEditForm({ ...editForm, active: e.target.value === 'true' })}
                      className="bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none px-3 py-2"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${b.active ? 'bg-[#00C85322] text-[#00C853]' : 'bg-[#FF3D0022] text-[#FF3D00]'}`}>
                      {b.active ? 'Ativo' : 'Inativo'}
                    </span>
                  )}
                </td>
                <td className="p-4 text-right align-top">
                  {editingId === b.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={() => handleUpdate(b.id)} className="p-2 text-[#00C853] hover:bg-[#00C85322] rounded transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(b)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {state.barbers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[#777]">Nenhum barbeiro cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
