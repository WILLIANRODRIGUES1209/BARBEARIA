import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X, Scissors, Search } from 'lucide-react';
import { Barber } from '../../types';

import { confirmUI } from '../../utils/confirmUI';

const compressImage = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
};

export default function AdminBarbeiros() {
  const { state, addBarber, editBarber, deleteBarber, refreshData } = useAppContext();
  
  React.useEffect(() => {
    if (refreshData) {
      refreshData(true);
    }
  }, []);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newBarber, setNewBarber] = useState<Omit<Barber, 'id'>>({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image', photoUrl: '', videoUrl: '' });
  const [editForm, setEditForm] = useState<Omit<Barber, 'id'>>({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image', photoUrl: '', videoUrl: '' });

  const [newPhotoTab, setNewPhotoTab] = useState<'upload' | 'url'>('upload');
  const [newVideoTab, setNewVideoTab] = useState<'upload' | 'url'>('upload');
  const [editPhotoTab, setEditPhotoTab] = useState<'upload' | 'url'>('upload');
  const [editVideoTab, setEditVideoTab] = useState<'upload' | 'url'>('upload');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl' | 'videoUrl', isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert("O arquivo é muito grande! Escolha um arquivo de no máximo 12MB.");
      return;
    }

    if (field === 'photoUrl') {
      setIsUploadingPhoto(true);
      try {
        const compressedBase64 = await compressImage(file, 350, 350, 0.75);
        if (isEdit) {
          setEditForm(prev => ({
            ...prev,
            [field]: compressedBase64
          }));
        } else {
          setNewBarber(prev => ({
            ...prev,
            [field]: compressedBase64
          }));
        }
      } catch (err) {
        console.error("Erro ao comprimir imagem:", err);
        // Fallback to normal upload
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (isEdit) {
            setEditForm(prev => ({ ...prev, [field]: result }));
          } else {
            setNewBarber(prev => ({ ...prev, [field]: result }));
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingPhoto(false);
      }
    } else {
      // For video, do standard read but suggest using links for files larger than 4MB
      if (file.size > 4 * 1024 * 1024) {
        alert("Atenção: Upload de vídeo grande detectado. Para garantir que sua página carregue instantaneamente para todos os clientes, recomendamos usar um link do YouTube ou Vimeo na aba 'Link do Vídeo' em vez de salvar o arquivo inteiro.");
      }
      setIsUploadingVideo(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (isEdit) {
          setEditForm(prev => ({
            ...prev,
            [field]: result
          }));
        } else {
          setNewBarber(prev => ({
            ...prev,
            [field]: result
          }));
        }
        setIsUploadingVideo(false);
      };
      reader.onerror = () => {
        alert("Erro ao processar o arquivo.");
        setIsUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarber.name) return;
    
    addBarber(newBarber);
    setIsAdding(false);
    setNewBarber({ name: '', phone: '', specialties: '', active: true, comissao: 50, pin: '', acesso: '', mediaUrl: '', mediaType: 'image', photoUrl: '', videoUrl: '' });
  };

  const startEdit = (b: Barber) => {
    setEditingId(b.id);
    const photo = b.photoUrl || (b.mediaType !== 'video' ? b.mediaUrl : '') || '';
    const video = b.videoUrl || (b.mediaType === 'video' ? b.mediaUrl : '') || '';
    setEditForm({ name: b.name, phone: b.phone || '', specialties: b.specialties || '', active: b.active, comissao: b.comissao || 0, pin: b.pin || '', acesso: b.acesso || '', mediaUrl: b.mediaUrl || '', mediaType: b.mediaType || 'image', photoUrl: photo, videoUrl: video });
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

  const optimizeBarberPhoto = async (barber: Barber) => {
    const rawUrl = barber.photoUrl || (barber.mediaType !== 'video' ? barber.mediaUrl : '') || '';
    if (!rawUrl) return;
    if (!rawUrl.startsWith('data:image/')) {
      alert("Esta foto já está otimizada ou usa um link externo.");
      return;
    }

    try {
      const img = new Image();
      img.src = rawUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 350;
        const maxHeight = 350;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        editBarber(barber.id, { photoUrl: dataUrl });
        alert(`A foto de ${barber.name} foi otimizada com sucesso e agora está levíssima!`);
      };
    } catch (e) {
      alert("Erro ao processar otimização.");
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
          <div className="md:col-span-2 flex justify-end pt-4 border-t border-[#222]">
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
                      <div className="w-10 h-10 bg-[#C5A05915] text-[#C5A059] border border-[#C5A05933] rounded-full flex items-center justify-center font-bold text-xs tracking-tighter shrink-0 uppercase">
                        {b.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
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

                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-[#777]">{b.phone || '-'}</div>
                      <div className="text-xs text-[#555] mt-1">{b.specialties || 'Sem Especialidades'}</div>
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
