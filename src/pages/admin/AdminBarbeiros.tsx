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
  const { state, addBarber, editBarber, deleteBarber } = useAppContext();
  
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
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#222]">
            {/* Foto Section */}
            <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
              <span className="text-xs uppercase tracking-wider font-bold text-[#C5A059] block">
                📸 Foto do Profissional
              </span>
              <p className="text-[10px] text-[#777] leading-relaxed">
                Esta foto será exibida na tela de seleção de barbeiros para o cliente.
              </p>

              <div className="flex border-b border-[#222] mb-2">
                <button
                  type="button"
                  onClick={() => setNewPhotoTab('upload')}
                  className={`flex-1 text-center py-2 text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 ${
                    newPhotoTab === 'upload'
                      ? 'border-[#C5A059] text-[#C5A059]'
                      : 'border-transparent text-[#555] hover:text-white'
                  }`}
                >
                  📁 Enviar Foto
                </button>
                <button
                  type="button"
                  onClick={() => setNewPhotoTab('url')}
                  className={`flex-1 text-center py-2 text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 ${
                    newPhotoTab === 'url'
                      ? 'border-[#C5A059] text-[#C5A059]'
                      : 'border-transparent text-[#555] hover:text-white'
                  }`}
                >
                  🔗 Link da Foto
                </button>
              </div>

              {newPhotoTab === 'upload' ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-[#C5A059] bg-[#121212] rounded-xl p-4 transition-all relative min-h-[100px] cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMediaUpload(e, 'photoUrl', false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploadingPhoto}
                    />
                    {isUploadingPhoto ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#C5A059] mx-auto mb-1"></div>
                        <p className="text-[9px] text-[#777] uppercase tracking-wider">Processando imagem...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Plus className="mx-auto text-[#C5A059] mb-1" size={20} />
                        <p className="text-[10px] text-white font-bold uppercase tracking-wider">Selecione uma Imagem</p>
                        <p className="text-[8px] text-[#555] mt-0.5">Tamanho limite: 12MB.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-[0.1em] text-[#555] font-medium">Link da Foto (Internet)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: https://imagens.com/minha-foto.jpg"
                    value={newBarber.photoUrl || ''}
                    onChange={e => setNewBarber({...newBarber, photoUrl: e.target.value})}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded text-xs focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              )}

              {newBarber.photoUrl && (
                <div className="mt-2 text-center bg-[#0C0C0C] p-3 rounded-lg border border-[#222]">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-[#C5A059] mx-auto mb-1">
                    <img src={newBarber.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBarber(prev => ({ ...prev, photoUrl: '' }))}
                    className="text-[9px] text-red-500 font-semibold hover:underline"
                  >
                    Excluir Foto
                  </button>
                </div>
              )}
            </div>

            {/* Video Section */}
            <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
              <span className="text-xs uppercase tracking-wider font-bold text-[#C5A059] block">
                🎥 Vídeo de Apresentação
              </span>
              <p className="text-[10px] text-[#777] leading-relaxed">
                Este vídeo rodará de fundo com 25% de opacidade na tela de horários.
              </p>

              <div className="flex border-b border-[#222] mb-2">
                <button
                  type="button"
                  onClick={() => setNewVideoTab('upload')}
                  className={`flex-1 text-center py-2 text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 ${
                    newVideoTab === 'upload'
                      ? 'border-[#C5A059] text-[#C5A059]'
                      : 'border-transparent text-[#555] hover:text-white'
                  }`}
                >
                  📁 Enviar Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setNewVideoTab('url')}
                  className={`flex-1 text-center py-2 text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 ${
                    newVideoTab === 'url'
                      ? 'border-[#C5A059] text-[#C5A059]'
                      : 'border-transparent text-[#555] hover:text-white'
                  }`}
                >
                  🔗 Link do Vídeo
                </button>
              </div>

              {newVideoTab === 'upload' ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-[#C5A059] bg-[#121212] rounded-xl p-4 transition-all relative min-h-[100px] cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleMediaUpload(e, 'videoUrl', false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploadingVideo}
                    />
                    {isUploadingVideo ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#C5A059] mx-auto mb-1"></div>
                        <p className="text-[9px] text-[#777] uppercase tracking-wider">Processando vídeo...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Plus className="mx-auto text-[#C5A059] mb-1" size={20} />
                        <p className="text-[10px] text-white font-bold uppercase tracking-wider">Selecione um Vídeo</p>
                        <p className="text-[8px] text-[#555] mt-0.5">Tamanho limite: 12MB.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-[0.1em] text-[#555] font-medium">Link do Vídeo (Internet)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: https://meusite.com/video.mp4"
                    value={newBarber.videoUrl || ''}
                    onChange={e => setNewBarber({...newBarber, videoUrl: e.target.value})}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded text-xs focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              )}

              {newBarber.videoUrl && (
                <div className="mt-2 text-center bg-[#0C0C0C] p-3 rounded-lg border border-[#222]">
                  <div className="w-32 aspect-video bg-black rounded overflow-hidden mx-auto mb-1 border border-[#333] flex items-center justify-center">
                    {newBarber.videoUrl.startsWith('data:') ? (
                      <video src={newBarber.videoUrl} className="w-full h-full object-cover" muted controls />
                    ) : (
                      <div className="w-full h-full text-[9px] text-green-400 flex items-center justify-center">Link de Vídeo Ativo</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBarber(prev => ({ ...prev, videoUrl: '' }))}
                    className="text-[9px] text-red-500 font-semibold hover:underline"
                  >
                    Excluir Vídeo
                  </button>
                </div>
              )}
            </div>
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
                      {b.photoUrl ? (
                        <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded object-cover border border-[#333] shadow" referrerPolicy="no-referrer" />
                      ) : b.mediaUrl && b.mediaType !== 'video' ? (
                        <img src={b.mediaUrl} alt={b.name} className="w-10 h-10 rounded object-cover border border-[#333] shadow" referrerPolicy="no-referrer" />
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
                      <div className="pt-2 border-t border-[#222] space-y-2">
                        <span className="block text-[10px] uppercase font-bold text-[#C5A059]">📸 Foto do Profissional</span>
                        <div className="flex border-b border-[#222] my-1">
                          <button
                            type="button"
                            onClick={() => setEditPhotoTab('upload')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editPhotoTab === 'upload' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditPhotoTab('url')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editPhotoTab === 'url' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            URL Link
                          </button>
                        </div>

                        {editPhotoTab === 'upload' ? (
                          <div className="space-y-1">
                            <div className="relative border border-dashed border-[#444] hover:border-[#C5A059] bg-[#0E0E0E] rounded p-2 text-center transition-all cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleMediaUpload(e, 'photoUrl', true)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploadingPhoto}
                              />
                              <span className="text-[9px] text-[#C5A059] font-bold block">
                                {isUploadingPhoto ? 'Processando...' : '📁 Escolher Foto'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            value={editForm.photoUrl || ''}
                            placeholder="Link da foto"
                            onChange={e => setEditForm({...editForm, photoUrl: e.target.value})}
                            className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#333] text-white text-xs rounded focus:border-[#C5A059] focus:outline-none"
                          />
                        )}

                        {editForm.photoUrl && (
                          <div className="flex items-center justify-between text-[9px] text-[#555] bg-[#0A0A0A] p-1.5 rounded border border-[#222] mt-1">
                            <span className="truncate max-w-[120px] text-green-400">✓ Foto Configurada</span>
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, photoUrl: '' }))}
                              className="text-red-400 hover:underline font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#222] space-y-2">
                        <span className="block text-[10px] uppercase font-bold text-[#C5A059]">🎥 Vídeo de Apresentação</span>
                        <div className="flex border-b border-[#222] my-1">
                          <button
                            type="button"
                            onClick={() => setEditVideoTab('upload')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editVideoTab === 'upload' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditVideoTab('url')}
                            className={`flex-1 text-center py-1 text-[9px] uppercase font-bold transition-all ${
                              editVideoTab === 'url' ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-[#555]'
                            }`}
                          >
                            URL Link
                          </button>
                        </div>

                        {editVideoTab === 'upload' ? (
                          <div className="space-y-1">
                            <div className="relative border border-dashed border-[#444] hover:border-[#C5A059] bg-[#0E0E0E] rounded p-2 text-center transition-all cursor-pointer">
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleMediaUpload(e, 'videoUrl', true)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploadingVideo}
                              />
                              <span className="text-[9px] text-[#C5A059] font-bold block">
                                {isUploadingVideo ? 'Processando...' : '📁 Escolher Vídeo'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            value={editForm.videoUrl || ''}
                            placeholder="Link do vídeo"
                            onChange={e => setEditForm({...editForm, videoUrl: e.target.value})}
                            className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#333] text-white text-xs rounded focus:border-[#C5A059] focus:outline-none"
                          />
                        )}

                        {editForm.videoUrl && (
                          <div className="flex items-center justify-between text-[9px] text-[#555] bg-[#0A0A0A] p-1.5 rounded border border-[#222] mt-1">
                            <span className="truncate max-w-[120px] text-green-400 font-medium">✓ Vídeo Configurado</span>
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, videoUrl: '' }))}
                              className="text-red-400 hover:underline font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-[#777]">{b.phone || '-'}</div>
                      <div className="text-xs text-[#555] mt-1">{b.specialties || 'Sem Especialidades'}</div>
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        {b.photoUrl ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-green-400 bg-green-500/10 px-1 rounded border border-green-500/20">
                            FOTO ✓
                          </span>
                        ) : b.mediaUrl && b.mediaType !== 'video' ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-green-400 bg-green-500/10 px-1 rounded border border-green-500/20">
                            FOTO ✓ (Legada)
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold text-neutral-500 bg-neutral-800 px-1 rounded">
                            SEM FOTO
                          </span>
                        )}
                        {b.videoUrl ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-1 rounded border border-[#C5A059]/30">
                            VÍDEO ✓
                          </span>
                        ) : b.mediaUrl && b.mediaType === 'video' ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-1 rounded border border-[#C5A059]/30">
                            VÍDEO ✓ (Legado)
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold text-neutral-500 bg-neutral-800 px-1 rounded">
                            SEM VÍDEO
                          </span>
                        )}
                        {(() => {
                          const rawPhoto = b.photoUrl || (b.mediaUrl && b.mediaType !== 'video' ? b.mediaUrl : '');
                          const isHeavy = rawPhoto && rawPhoto.startsWith('data:') && rawPhoto.length > 100000;
                          if (isHeavy) {
                            return (
                              <button
                                onClick={() => optimizeBarberPhoto(b)}
                                title="Esta foto está pesada e pode atrasar o carregamento para os clientes. Clique para otimizar agora mesmo."
                                className="inline-flex items-center text-[9px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-all cursor-pointer animate-pulse"
                              >
                                ⚡ OTIMIZAR FOTO
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
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
