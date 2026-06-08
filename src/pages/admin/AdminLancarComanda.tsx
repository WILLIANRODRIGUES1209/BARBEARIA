import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DollarSign, Users, Trash2, Check, Scissors, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLancarComanda() {
  const { state, addTransaction, addAppointment, refreshData } = useAppContext();

  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const isBarbeiro = authState?.role === 'BARBEIRO';
  const currentBarbeiroId = authState?.barbeiroId;

  // Active barbers to perform service
  const activeBarbers = useMemo(() => {
    return state.barbers.filter(b => b.active);
  }, [state.barbers]);

  // Initializing selected professional
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');

  useEffect(() => {
    if (isBarbeiro && currentBarbeiroId) {
      setSelectedBarberId(currentBarbeiroId);
    } else if (activeBarbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [isBarbeiro, currentBarbeiroId, activeBarbers, selectedBarberId]);

  // Form states
  const [comandaClientName, setComandaClientName] = useState('');
  const [comandaServices, setComandaServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [comandaPaymentMethod, setComandaPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('Pix');
  const [isSavingComanda, setIsSavingComanda] = useState(false);

  // Selected Barber properties
  const activeBarber = useMemo(() => {
    return state.barbers.find(b => b.id === selectedBarberId);
  }, [state.barbers, selectedBarberId]);

  const activeComissaoPercent = activeBarber?.comissao !== undefined ? activeBarber.comissao : 50;

  // Add line item service
  const handleAddService = (serviceType: string) => {
    const lowerName = serviceType.toLowerCase();
    const found = state.services.find(s => s.name.toLowerCase().includes(lowerName));
    const defaultPrice = found ? found.price : (serviceType === 'Cabelo' ? 40 : serviceType === 'Barba' ? 30 : serviceType === 'Sobrancelha' ? 15 : 20);

    setComandaServices(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: found ? found.name : serviceType,
        price: defaultPrice
      }
    ]);
  };

  // Add specific catalog service from database
  const handleAddCatalogService = (svcId: string) => {
    const svc = state.services.find(s => s.id === svcId);
    if (!svc) return;

    setComandaServices(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: svc.name,
        price: svc.price
      }
    ]);
    toast.success(`${svc.name} adicionado!`);
  };

  // Remove line item service
  const handleRemoveService = (itemId: string) => {
    setComandaServices(prev => prev.filter(item => item.id !== itemId));
  };

  // Update item price manually
  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setComandaServices(prev => prev.map(item => item.id === itemId ? { ...item, price: newPrice } : item));
  };

  // Dynamic calculations
  const totalGross = comandaServices.reduce((acc, curr) => acc + curr.price, 0);
  const barberAmount = (totalGross * activeComissaoPercent) / 100;
  const salonAmount = totalGross - barberAmount;

  // Handle comanda submit (atomic registration of services)
  const handleSaveComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarberId) {
      toast.error('Por favor, selecione um profissional.');
      return;
    }
    if (comandaServices.length === 0) {
      toast.error('Adicione pelo menos um serviço para registrar a comanda.');
      return;
    }
    if (comandaServices.some(s => s.price < 0)) {
      toast.error('Os valores dos serviços não podem ser negativos.');
      return;
    }

    setIsSavingComanda(true);
    try {
      const clientName = comandaClientName.trim() || 'Cliente Avulso';
      const servicesLabel = comandaServices.map(s => s.name).join(' + ');
      const nowIso = new Date().toISOString();
      const firstSvcId = state.services[0]?.id || '1';

      // 1. Create completed appointment for this comanda
      await addAppointment({
        clientName,
        clientPhone: '0000000000',
        serviceId: firstSvcId,
        barberId: selectedBarberId,
        date: nowIso
      }, 'COMPLETED');

      // 2. Insert corresponding Income Transaction with Barber tag [Barbeiro: ID]
      await addTransaction({
        type: 'INCOME',
        amount: totalGross,
        description: `Venda PDV - Comanda: ${servicesLabel} (${comandaPaymentMethod}) - Cliente: ${clientName} [Barbeiro: ${selectedBarberId}]`,
        date: nowIso
      });

      // 3. Insert corresponding Expense (Out) Transaction for the barber commission
      if (barberAmount > 0) {
        await addTransaction({
          type: 'EXPENSE',
          amount: barberAmount,
          description: `Comissão ${activeBarber?.name || 'Barbeiro'} - Comanda: ${servicesLabel} (${activeComissaoPercent}%) [Barbeiro: ${selectedBarberId}]`,
          date: nowIso
        });
      }

      toast.success('Comanda lançada com sucesso!');

      // 4. Reset form state cleanly
      setComandaClientName('');
      setComandaServices([]);
      setComandaPaymentMethod('Pix');

      await refreshData(true);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar a comanda.');
    } finally {
      setIsSavingComanda(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="text-[#C5A059]" /> Lançar Comanda de Serviço
          </h1>
          <p className="text-[#777] text-xs mt-2">Dedicado ao registro rápido de atendimentos realizados pelos profissionais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Comanda registration and catalog */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveComanda} className="bg-[#121212] rounded-2xl border border-[#C5A05933]/40 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
              <div className="w-8 h-8 rounded-lg bg-[#C5A05915] border border-[#C5A05944] flex items-center justify-center">
                <Scissors size={16} className="text-[#C5A059]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Registo de Atendimento</h2>
                <p className="text-[10px] text-[#777]">Informe os dados do atendimento e as comissões serão calculadas automaticamente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo Nome do Cliente */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Nome do Cliente (Opcional)</label>
                <input
                  type="text"
                  value={comandaClientName}
                  onChange={e => setComandaClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#161616] border border-[#222] hover:border-[#333] focus:border-[#C5A059] text-white rounded-xl focus:outline-none text-xs font-bold transition-all"
                  placeholder="Ex: João Silva (deixe vazio para Cliente Avulso)"
                />
              </div>

              {/* Seletor do Profissional / Barbeiro */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">
                  Profissional / Barbeiro Responsável
                </label>
                {isBarbeiro ? (
                  <div className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#222] text-[#C5A059] rounded-xl text-xs font-black flex items-center gap-2">
                    <Scissors size={14} />
                    <span>{activeBarber?.name || 'Seu Perfil'}</span>
                  </div>
                ) : (
                  <select
                    value={selectedBarberId}
                    onChange={e => setSelectedBarberId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#161616] border border-[#222] hover:border-[#333] focus:border-[#C5A059] text-white rounded-xl focus:outline-none text-xs font-bold transition-all"
                  >
                    <option value="">Selecione um profissional...</option>
                    {state.barbers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.comissao || 0}% de comissão)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Quick Service Tags and Catalog Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold">Lançamento Rápido</label>
                <div className="flex flex-wrap gap-2">
                  {['Cabelo', 'Barba', 'Sobrancelha', 'Outro'].map((serviceType) => (
                    <button
                      key={serviceType}
                      type="button"
                      onClick={() => handleAddService(serviceType)}
                      className="px-3.5 py-2 bg-[#161616] hover:bg-[#C5A05922] border border-[#222] hover:border-[#C5A05955] text-white text-xs font-black rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span> {serviceType}
                    </button>
                  ))}
                </div>
              </div>

              {state.services.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold">Serviços do Catálogo</label>
                  <div className="max-h-24 overflow-y-auto border border-[#222] rounded-xl bg-[#161616] p-2 space-y-1.5 custom-scrollbar">
                    {state.services.map(svc => (
                      <button
                        key={`cat-svc-${svc.id}`}
                        type="button"
                        onClick={() => handleAddCatalogService(svc.id)}
                        className="w-full text-left px-2 sm:px-3 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#C5A05915] text-white text-[10px] font-bold flex justify-between items-center transition-colors border border-transparent hover:border-[#C5A05944]"
                      >
                        <span className="truncate">{svc.name}</span>
                        <span className="text-[#C5A059] font-black shrink-0">R$ {svc.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Seletor de Forma de Pagamento */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold">Forma de Pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'] as const).map((method) => {
                  const isSelected = comandaPaymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setComandaPaymentMethod(method)}
                      className={`py-2 px-3 border text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#C5A059] border-[#C5A059] text-black shadow-md shadow-[#C5A0591a]'
                          : 'bg-[#181818] border-[#252525] text-[#999] hover:text-white hover:border-[#333]'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botão Principal de Conclusão */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingComanda || comandaServices.length === 0}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                  comandaServices.length > 0
                    ? 'bg-[#00C853] text-[#0A0A0A] hover:bg-[#00E676] shadow-[0_0_20px_rgba(0,199,83,0.25)] active:scale-[0.99]'
                    : 'bg-[#1C1C1C] border border-[#222] text-[#555] cursor-not-allowed'
                }`}
              >
                <Check size={16} />
                {isSavingComanda ? 'Gravando e Sincronizando...' : 'Finalizar e Gravar Comanda'}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Selected items and calculation summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#121212] rounded-2xl border border-[#222] p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest pb-3 border-b border-[#222] flex items-center justify-between">
              <span>Carrinho de Serviços</span>
              <span className="text-xs text-[#C5A059] font-black">{comandaServices.length} selecionado(s)</span>
            </h2>

            {comandaServices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="text-[#444]" size={28} />
                <p className="text-[#555] text-xs font-bold uppercase tracking-wider">Comanda vazia</p>
                <p className="text-[#444] text-[10px] max-w-[180px]">Selecione os atendimentos realizados ao lado para compor a comanda.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {comandaServices.map((item) => (
                  <div key={item.id} className="p-3 bg-[#161616] rounded-xl border border-[#222] flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center pr-6">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const val = e.target.value;
                          setComandaServices(prev => prev.map(x => x.id === item.id ? { ...x, name: val } : x));
                        }}
                        className="bg-transparent text-xs font-black text-white border-b border-transparent focus:border-[#C5A059] focus:outline-none w-full mr-2"
                        placeholder="Nome do Serviço"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveService(item.id)}
                        className="absolute top-3 right-3 p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex items-center bg-[#1F1F1F] border border-[#2c2c2c] pl-2 rounded w-full">
                      <span className="text-[10px] text-[#555] font-black">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={e => handleUpdatePrice(item.id, Number(e.target.value) || 0)}
                        className="w-full bg-transparent px-2 py-1 text-white text-xs font-black focus:outline-none text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comandaServices.length > 0 && (
              <div className="border-t border-[#222] pt-4 space-y-3">
                <div className="space-y-2 bg-[#161616] p-4.5 rounded-xl border border-[#222]">
                  <p className="text-[10px] uppercase font-bold text-[#C5A059] tracking-widest pb-1.5 border-b border-[#222]/60">Resumo Real-Time</p>
                  <p className="text-[11px] text-[#888] flex justify-between">
                    <span>Profissional:</span>
                    <span className="font-bold text-white">{activeBarber?.name || 'Não selecionado'}</span>
                  </p>
                  <p className="text-[11px] text-[#888] flex justify-between">
                    <span>Método:</span>
                    <span className="font-semibold text-white">{comandaPaymentMethod}</span>
                  </p>
                  <p className="text-[11px] text-[#888] flex justify-between pb-1">
                    <span>Cliente:</span>
                    <span className="font-semibold text-white truncate max-w-[120px]">{comandaClientName.trim() || 'Cliente Avulso'}</span>
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222]/60 text-center">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[#555]">Bruto</p>
                      <p className="text-xs font-black text-white mt-0.5">R$ {totalGross.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-emerald-500/70">Prof. ({activeComissaoPercent}%)</p>
                      <p className="text-xs font-black text-emerald-400 mt-0.5">R$ {barberAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-amber-500/70">Salão</p>
                      <p className="text-xs font-black text-amber-500 mt-0.5">R$ {salonAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
