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

  const [newSourceTab, setNewSourceTab] = useState<'upload' | 'url'>('upload');
  const [editSourceTab, setEditSourceTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to ~10MB for smooth DB storage
    if (file.size > 12 * 1024 * 1024) {
      alert("O arquivo é muito grande! Escolha um vídeo ou imagem de no máximo 12MB para não comprometer a velocidade da página.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const determinedType = file.type.startsWith('video/') ? 'video' : 'image';
      
      if (isEdit) {
        setEditForm(prev => ({
          ...prev,
          mediaUrl: result,
          mediaType: determinedType
        }));
      } else {
        setNewBarber(prev => ({
          ...prev,
          mediaUrl: result,
          mediaType: determinedType
        }));
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Erro ao processar o arquivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

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
          <div className="md:col-span-2 space-y-4">
            <div className="flex border-b border-[#222]">
              <button
                type="button"
                onClick={() => setNewSourceTab('upload')}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-all border-b-2 ${
                  newSourceTab === 'upload'
                    ? 'border-[#C5A059] text-[#C5A059]'
                    : 'border-transparent text-[#555] hover:text-white'
                }`}
              >
                📁 Enviar Arquivo (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setNewSourceTab('url')}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-bold transition-all border-b-2 ${
                  newSourceTab === 'url'
                    ? 'border-[#C5A059] text-[#C5A059]'
                    : 'border-transparent text-[#555] hover:text-white'
                }`}
              >
                🔗 Inserir Link da Internet
              </button>
            </div>

            {newSourceTab === 'upload' ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-[#C5A059] bg-[#121212] rounded-xl p-6 transition-all relative">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    onChange={(e) => handleFileChange(e, false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  
                  {isUploading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C5A059] mx-auto mb-2"></div>
                      <p className="text-xs text-[#777] uppercase tracking-wider">Processando e compactando arquivo...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Plus className="mx-auto text-[#C5A059] mb-2" size={24} />
                      <p className="text-xs text-white font-bold uppercase tracking-wider">Escolha uma Foto ou Vídeo MP4</p>
                      <p className="text-[10px] text-[#555] mt-1">Arraste ou clique para selecionar. Tamanho limite: 12MB.</p>
                    </div>
                  )}
                </div>

                {newBarber.mediaUrl && (
                  <div className="p-4 bg-[#1A1A1A] border border-[#222] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#C5A059] tracking-widest">
                        Visualização da Mídia do Barbeiro:
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewBarber(prev => ({ ...prev, mediaUrl: '', mediaType: 'image' }))}
                        className="text-[9px] uppercase tracking-wider font-bold text-red-400 bg-red-950/40 border border-red-900/30 px-2 py-1 rounded"
                      >
                        Remover Arquivo
                      </button>
                    </div>

                    <div className="w-48 aspect-square bg-[#0C0C0C] rounded-lg overflow-hidden border border-[#333] flex items-center justify-center mx-auto">
                      {newBarber.mediaType === 'video' ? (
                        <video
                          src={newBarber.mediaUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={newBarber.mediaUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="text-center text-[10px] text-[#555]">
                      Mídia selecionada: {newBarber.mediaType === 'video' ? 'Vídeo MP4' : 'Foto/Imagem'} salva em base64.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Tipo de Mídia do Link</label>
                    <select
                      value={newBarber.mediaType || 'image'}
                      onChange={e => setNewBarber({...newBarber, mediaType: e.target.value as 'image' | 'video'})}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded text-xs focus:border-[#C5A059] focus:outline-none"
                    >
                      <option value="image">Foto (Imagem)</option>
                      <option value="video">Vídeo (YouTube / Vimeo / MP4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Endereço URL (Link)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: https://dominio.com/video.mp4"
                      value={newBarber.mediaUrl || ''}
                      onChange={e => setNewBarber({...newBarber, mediaUrl: e.target.value})}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded text-xs focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#555]">Utilize links da web como imagens hospedadas ou links do YouTube/Vimeo se possuir vídeos pesados.</p>
              </div>
            )}
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
                        
                        <div className="flex border-b border-[#222] my-1">
                          <button
                            type="button"
                            onClick={() => setEditSourceTab('upload')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editSourceTab === 'upload' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            Enviar Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditSourceTab('url')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editSourceTab === 'url' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            Link URL
                          </button>
                        </div>

                        {editSourceTab === 'upload' ? (
                          <div className="space-y-1">
                            <div className="relative border border-dashed border-[#444] hover:border-[#C5A059] bg-[#0E0E0E] rounded p-2 text-center transition-all cursor-pointer">
                              <input
                                type="file"
                                accept="image/*,video/mp4,video/quicktime,video/webm"
                                onChange={(e) => handleFileChange(e, true)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                              />
                              <span className="text-[9px] text-[#C5A059] font-bold block">
                                {isUploading ? 'Processando...' : '📁 Escolher Vídeo/Foto'}
                              </span>
                            </div>
                            {editForm.mediaUrl && (
                              <div className="flex items-center justify-between text-[9px] text-[#555] bg-[#0A0A0A] p-1.5 rounded border border-[#222] mt-1">
                                <span className="truncate max-w-[120px] text-green-400">✓ {editForm.mediaType === 'video' ? 'Vídeo Carregado' : 'Foto Carregada'}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditForm(prev => ({ ...prev, mediaUrl: '', mediaType: 'image' }))}
                                  className="text-red-400 hover:underline font-bold"
                                >
                                  Remover
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
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
                        )}
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
