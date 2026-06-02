import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Scissors, Search } from 'lucide-react';
import { Barber } from '../../types';

import { confirmUI } from '../../utils/confirmUI';

export default function AdminBarbeiros() {
  const { state, addBarber, editBarber, deleteBarber } = useAppContext();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newBarber, setNewBarber] = useState<Omit<Barber, 'id'>>({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image' });
  const [editForm, setEditForm] = useState<Omit<Barber, 'id'>>({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarber.name) return;
    
    addBarber(newBarber);
    setIsAdding(false);
    setNewBarber({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image' });
  };

  const startEdit = (b: Barber) => {
    setEditingId(b.id);
    setEditForm({ name: b.name, phone: b.phone || '', specialties: b.specialties || '', active: b.active, comissao: b.comissao || 0, pin: b.pin || '', acesso: b.acesso || '', mediaUrl: b.mediaUrl || '', mediaType: b.mediaType || 'image' });
  };

  const handleUpdate = (id: string) => {
    editBarber(id, editForm);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    confirmUI('Tem certeza que deseja excluir este barbeiro?', () => {
      deleteBarber(id);
    });
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
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Comissão (%)</label>
            <input 
              type="number" 
              value={newBarber.comissao || ''}
              onChange={e => setNewBarber({...newBarber, comissao: e.target.value === '' ? 0 : Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Login (Nº Acesso)</label>
            <input 
              type="text" 
              placeholder="Ex: 1001"
              value={newBarber.acesso}
              onChange={e => setNewBarber({...newBarber, acesso: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">PIN (Senha)</label>
            <input 
              type="text" 
              placeholder="Senha de acesso"
              value={newBarber.pin}
              onChange={e => setNewBarber({...newBarber, pin: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Aparição (Tipo de Mídia)</label>
            <select
              value={newBarber.mediaType || 'image'}
              onChange={e => setNewBarber({...newBarber, mediaType: e.target.value as 'image' | 'video'})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            >
              <option value="image">Foto (Imagem)</option>
              <option value="video">Vídeo (MP4/YouTube/Vimeo)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Link da Foto ou Vídeo de Apresentação</label>
            <input 
              type="text" 
              placeholder="Ex: https://imgur.com/link_da_foto.png ou link_do_video_mp4"
              value={newBarber.mediaUrl || ''}
              onChange={e => setNewBarber({...newBarber, mediaUrl: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-[#555] mt-1">Insira um link direto de imagem quadrada/vídeo curto ou link completo para exibição no ato de agendar.</p>
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
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Status / Acesso</th>
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
                    <div className="flex items-center gap-3">
                      {b.mediaUrl ? (
                        b.mediaType === 'video' ? (
                          <div className="w-10 h-10 rounded bg-[#C5A059] flex items-center justify-center text-xs font-bold text-black shadow" title="Vídeo">▶</div>
                        ) : (
                          <img src={b.mediaUrl} alt={b.name} className="w-10 h-10 rounded object-cover border border-[#333] shadow" referrerPolicy="no-referrer" />
                        )
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-xs text-[#555]">
                          <Scissors size={14} />
                        </div>
                      )}
                      <span className="font-medium text-white">{b.name}</span>
                    </div>
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
                        value={editForm.specialties || ''}
                        placeholder="Especialidades"
                        onChange={e => setEditForm({...editForm, specialties: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                      <div className="pt-2 border-t border-[#222] space-y-1">
                        <label className="block text-[10px] uppercase text-[#555]">Mídia de Apresentação</label>
                        <select
                          value={editForm.mediaType || 'image'}
                          onChange={e => setEditForm({...editForm, mediaType: e.target.value as 'image' | 'video'})}
                          className="w-full bg-[#1A1A1A] border border-[#333] text-white text-xs rounded focus:border-[#C5A059] focus:outline-none px-2 py-1"
                        >
                          <option value="image">Mídia: Foto (Imagem)</option>
                          <option value="video">Mídia: Vídeo</option>
                        </select>
                        <input 
                          type="text" 
                          value={editForm.mediaUrl || ''}
                          placeholder="Link da foto/vídeo"
                          onChange={e => setEditForm({...editForm, mediaUrl: e.target.value})}
                          className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#333] text-white text-xs rounded focus:border-[#C5A059] focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-[#777]">{b.phone || '-'}</div>
                      <div className="text-xs text-[#555] mt-1">{b.specialties}</div>
                      {b.mediaUrl && (
                        <div className="text-[10px] text-[#C5A059] mt-1 font-semibold flex items-center gap-1">
                          <span>• {b.mediaType === 'video' ? 'Com Vídeo Apresentação' : 'Com Foto Apresentação'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {editingId === b.id ? (
                    <div className="space-y-2">
                      <select
                        value={editForm.active ? 'true' : 'false'}
                        onChange={e => setEditForm({ ...editForm, active: e.target.value === 'true' })}
                        className="w-full bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none px-3 py-2"
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                      <input 
                        type="number" 
                        value={editForm.comissao}
                        placeholder="Comissão %"
                        onChange={e => setEditForm({...editForm, comissao: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={editForm.acesso}
                        placeholder="Nº Acesso"
                        onChange={e => setEditForm({...editForm, acesso: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={editForm.pin}
                        placeholder="PIN"
                        onChange={e => setEditForm({...editForm, pin: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded focus:border-[#C5A059] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${b.active ? 'bg-[#00C85322] text-[#00C853]' : 'bg-[#FF3D0022] text-[#FF3D00]'}`}>
                          {b.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="text-xs text-[#777]">Comissão: {b.comissao || 0}%</div>
                      <div className="text-xs text-[#777]">Acesso: {b.acesso || 'N/A'} - PIN: {b.pin ? '***' : 'Nenhum'}</div>
                    </div>
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
