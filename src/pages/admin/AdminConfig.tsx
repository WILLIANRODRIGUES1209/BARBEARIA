import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useBarbearia } from '../../context/BarbeariaContext';
import { Plus, Edit2, Save, X, Settings, Trash2, Clock, Image } from 'lucide-react';
import { Service } from '../../types';
import toast from 'react-hot-toast';

import { confirmUI } from '../../utils/confirmUI';
import { loadConfig, saveConfig } from '../../utils/configHelper';

export default function AdminConfig() {
  const { state, addService, editService, deleteService, clearTestData } = useAppContext();
  const { barbearia } = useBarbearia();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newService, setNewService] = useState({ name: '', durationMinutes: 30, price: 0 });
  const [editForm, setEditForm] = useState({ name: '', durationMinutes: 30, price: 0 });

  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [workEnd, setWorkEnd] = useState("19:00");
  const [workStart, setWorkStart] = useState("08:00");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  React.useEffect(() => {
    if (barbearia?.id) {
      loadConfig(barbearia.id)
        .then(data => {
          setWorkStart(data.workStart);
          setLunchStart(data.lunchStart);
          setLunchEnd(data.lunchEnd);
          setWorkEnd(data.workEnd);
          setLogoUrl(data.logoUrl);
        })
        .catch(err => console.error("Error fetching config:", err));
    }
  }, [barbearia?.id]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbearia?.id) return;

    setIsSavingConfig(true);
    try {
      const result = await saveConfig(barbearia.id, {
        workStart,
        lunchStart,
        lunchEnd,
        workEnd,
        logoUrl
      });
      
      if (result.success) {
        if (result.isLocal) {
          toast.success("Configurações salvas localmente com sucesso! (Hospedagem estática detectada)");
        } else {
          toast.success("Configurações salvas com sucesso!");
        }
      } else {
        toast.error("Erro ao salvar configurações: " + (result.error || "Erro desconhecido"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

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

      {/* Configurações de Expediente e Almoço */}
      <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 mt-12 shadow-xl">
        <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest mb-2 flex items-center gap-2">
          <Clock size={16} /> Configurações de Expediente e Almoço
        </h2>
        <p className="text-xs text-[#777] mb-6 max-w-2xl">
          Defina o início e fim do expediente da barbearia, bem como o período reservado para o almoço. Os horários disponíveis no painel de agendamento do cliente se ajustarão automaticamente.
        </p>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1.5 font-medium">Início do Expediente</label>
            <input 
              type="text" 
              value={workStart}
              onChange={e => setWorkStart(e.target.value)}
              placeholder="e.g. 08:00"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-sm transition-all placeholder-[#555]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1.5 font-medium">Início do Almoço</label>
            <input 
              type="text" 
              value={lunchStart}
              onChange={e => setLunchStart(e.target.value)}
              placeholder="e.g. 12:00"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-sm transition-all placeholder-[#555]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1.5 font-medium">Fim do Almoço</label>
            <input 
              type="text" 
              value={lunchEnd}
              onChange={e => setLunchEnd(e.target.value)}
              placeholder="e.g. 13:00"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-sm transition-all placeholder-[#555]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1.5 font-medium">Último Atendimento / Fim</label>
            <input 
              type="text" 
              value={workEnd}
              onChange={e => setWorkEnd(e.target.value)}
              placeholder="e.g. 19:00"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-sm transition-all placeholder-[#555]"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4 flex justify-end mt-2">
            <button 
              type="submit" 
              disabled={isSavingConfig}
              className="px-6 py-3 rounded-xl bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:bg-[#8E6D31] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? "Salvando..." : "Salvar Horários"}
            </button>
          </div>
        </form>
      </div>

      {/* Logotipo da Barbearia */}
      <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 mt-12 shadow-xl">
        <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest mb-2 flex items-center gap-2">
          <Image size={16} /> Identidade Visual / Logotipo
        </h2>
        <p className="text-xs text-[#777] mb-6 max-w-2xl">
          Personalize a aparência das páginas de agendamento e painéis administrativos configurando um logotipo exclusivo para sua barbearia. Insira um link direto para uma imagem na internet (ex: do Imgur, Postimages ou de canais de hospedagem).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <div className="md:col-span-3">
            <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1.5 font-medium">URL do Logotipo (Imagem)</label>
            <input 
              type="url" 
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://exemplo.com/sua-logo.png"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-sm transition-all placeholder-[#555]"
            />
            <p className="text-[10px] text-[#555] mt-2">
              Para melhores resultados, utilize uma imagem quadrada (proporção 1:1) com fundo transparente ou escuro.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-[#181818] border border-[#282828] rounded-2xl h-full min-h-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-[#555] mb-2 font-medium">Prévia</span>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logotipo Barbearia" 
                className="w-16 h-16 object-contain rounded-xl"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ff3d00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#121212] border border-[#222] flex items-center justify-center text-[#444]">
                <Image size={24} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button 
            type="button" 
            onClick={handleSaveConfig}
            disabled={isSavingConfig}
            className="px-6 py-3 rounded-xl bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:bg-[#8E6D31] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingConfig ? "Salvando..." : "Salvar Logotipo"}
          </button>
        </div>
      </div>

      {/* Zerar dados / Limpeza de Dados */}
      <div className="bg-[#121212] rounded-2xl border border-red-900/40 p-6 mt-12">
        <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Trash2 size={16} /> Zona de Perigo
        </h2>
        <p className="text-xs text-[#777] mb-6 max-w-2xl">
          Zerar todos os dados.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              confirmUI('ATENÇÃO: Isso excluirá permanentemente todos os agendamentos e o histórico de recebimentos desta barbearia. Esta ação não pode ser desfeita. Deseja continuar?', async () => {
                await clearTestData();
              });
            }}
            className="px-5 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 active:bg-red-500/30 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
          >
            <Trash2 size={16} /> Zerar todos os dados
          </button>
        </div>
      </div>
    </div>
  );
}
