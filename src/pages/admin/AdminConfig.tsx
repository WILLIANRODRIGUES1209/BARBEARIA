import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Settings } from 'lucide-react';
import { Service } from '../../types';

import { confirmUI } from '../../utils/confirmUI';

export default function AdminConfig() {
  const { state, addService, editService, deleteService } = useAppContext();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newService, setNewService] = useState({ name: '', durationMinutes: 30, price: 0 });
  const [editForm, setEditForm] = useState({ name: '', durationMinutes: 30, price: 0 });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || newService.price <= 0) return;
    
    await addService({
      name: newService.name,
      durationMinutes: newService.durationMinutes,
      price: newService.price
    });
    
    setIsAdding(false);
    setNewService({ name: '', durationMinutes: 30, price: 0 });
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ name: service.name, durationMinutes: service.durationMinutes, price: service.price });
  };

  const handleUpdate = async (id: string) => {
    await editService(id, {
      name: editForm.name,
      price: editForm.price,
      durationMinutes: editForm.durationMinutes
    });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    confirmUI('Tem certeza que deseja excluir este serviço?', async () => {
      await deleteService(id);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl gap-4 md:gap-0">
        <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <Settings className="text-[#C5A059]" /> Configurações de Serviços
        </h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-3 md:py-2 w-full md:w-auto justify-center md:justify-start rounded-xl md:rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all"
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
              value={newService.durationMinutes || ''}
              onChange={e => setNewService({...newService, durationMinutes: e.target.value === '' ? 0 : Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Preço (R$)</label>
            <input 
              type="number" 
              required
              min="0" step="any"
              value={newService.price || ''}
              onChange={e => setNewService({...newService, price: e.target.value === '' ? 0 : Number(e.target.value)})}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.services.map(svc => (
          <div key={svc.id} className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-5 flex flex-col hover:border-[#333] transition-colors relative">
            {editingId === svc.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1">Serviço</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1">Tempo (min)</label>
                    <input 
                      type="number" 
                      value={editForm.durationMinutes || ''}
                      onChange={e => setEditForm({...editForm, durationMinutes: e.target.value === '' ? 0 : Number(e.target.value)})}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1">Valor (R$)</label>
                    <input 
                      type="number" step="any"
                      value={editForm.price || ''}
                      onChange={e => setEditForm({...editForm, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[#222] mt-2">
                  <button onClick={() => setEditingId(null)} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors w-1/2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <X size={16} /> Cancelar
                  </button>
                  <button onClick={() => handleUpdate(svc.id)} className="p-2 text-[#00C853] bg-[#00C85311] hover:bg-[#00C85322] rounded transition-colors w-1/2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Save size={16} /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight mb-3">{svc.name}</h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-[#777]">Tempo</span>
                      <span className="text-sm text-[#CCC] font-medium">{svc.durationMinutes} min</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-[#777]">Valor</span>
                      <span className="text-lg text-[#C5A059] font-bold">R$ {svc.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[#222]">
                  <button onClick={() => startEdit(svc)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors flex bg-[#C5A05911]">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(svc.id)} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded transition-colors flex bg-[#FF3D0011]">
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {state.services.length === 0 && (
          <div className="col-span-full bg-[#121212] rounded-2xl shadow-xl border border-[#222] p-8 text-center text-[#777]">
            Nenhum serviço cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
