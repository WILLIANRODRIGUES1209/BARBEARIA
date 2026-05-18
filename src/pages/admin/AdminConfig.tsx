import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Settings } from 'lucide-react';
import { Service } from '../../types';

export default function AdminConfig() {
  const { state, updateServices } = useAppContext();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newService, setNewService] = useState({ name: '', durationMinutes: 30, price: 0 });
  const [editForm, setEditForm] = useState({ name: '', durationMinutes: 30, price: 0 });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || newService.price <= 0) return;
    
    const service: Service = {
      id: Date.now().toString(),
      name: newService.name,
      durationMinutes: newService.durationMinutes,
      price: newService.price
    };
    
    updateServices([...state.services, service]);
    setIsAdding(false);
    setNewService({ name: '', durationMinutes: 30, price: 0 });
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ name: service.name, durationMinutes: service.durationMinutes, price: service.price });
  };

  const handleUpdate = (id: string) => {
    const updatedServices = state.services.map(s => 
      s.id === id ? { ...s, ...editForm } : s
    );
    updateServices(updatedServices);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      const updatedServices = state.services.filter(s => s.id !== id);
      updateServices(updatedServices);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <Settings className="text-[#C5A059]" /> Configurações de Serviços
        </h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancelar' : 'Novo Serviço'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222] grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Nome do Serviço</label>
            <input 
              type="text" 
              required
              value={newService.name}
              onChange={e => setNewService({...newService, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Tempo (Minutos)</label>
            <input 
              type="number" 
              required
              min="1"
              step="5"
              value={newService.durationMinutes}
              onChange={e => setNewService({...newService, durationMinutes: Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Preço (R$)</label>
            <input 
              type="number" 
              required
              min="0" step="0.01"
              value={newService.price}
              onChange={e => setNewService({...newService, price: Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded hover:bg-[#8E6D31] transition-colors">
              Salvar Serviço
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0C0C0C] border-b border-[#222]">
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Serviço</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Tempo</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Valor</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {state.services.map(svc => (
              <tr key={svc.id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4">
                  {editingId === svc.id ? (
                    <input 
                      type="text" 
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="font-medium text-white">{svc.name}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === svc.id ? (
                    <input 
                      type="number" 
                      value={editForm.durationMinutes}
                      step="5"
                      onChange={e => setEditForm({...editForm, durationMinutes: Number(e.target.value)})}
                      className="w-24 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="text-[#888]">{svc.durationMinutes} min</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === svc.id ? (
                    <input 
                      type="number" step="0.01"
                      value={editForm.price}
                      onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                      className="w-28 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="text-[#C5A059] font-bold">R$ {svc.price.toFixed(2)}</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {editingId === svc.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={() => handleUpdate(svc.id)} className="p-2 text-[#00C853] hover:bg-[#00C85322] rounded transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(svc)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(svc.id)} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {state.services.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[#777]">Nenhum serviço cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
