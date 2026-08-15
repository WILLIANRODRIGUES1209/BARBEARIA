import React, { useState } from 'react';
import { ComboCliente, ComboClienteItem, ComboBaixa } from '../../../types/combos';
import { Client } from '../../../types';
import { ArrowLeft, CheckCircle2, History, XCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  combo: ComboCliente;
  itens: ComboClienteItem[];
  baixas: ComboBaixa[];
  client: Client;
  onBack: () => void;
  registerBaixa: (comboId: string, itemId: string, valor: number, obs: string) => Promise<void>;
  updateStatus: (comboId: string, status: any, obs?: string) => Promise<void>;
}

export default function ComboClientPanel({ combo, itens, baixas, client, onBack, registerBaixa, updateStatus }: Props) {
  const totalDescontado = baixas.reduce((acc, curr) => acc + Number(curr.valor_descontado), 0);
  const saldo = combo.valor_pago - totalDescontado;
  
  let totalContratado = 0;
  let totalUsado = 0;
  itens.forEach(i => {
    totalContratado += i.quantidade_contratada;
    totalUsado += i.quantidade_usada;
  });
  
  const pct = totalContratado > 0 ? (totalUsado / totalContratado) * 100 : 0;
  const isEsgotando = saldo <= (combo.valor_pago * 0.15) || (totalContratado - totalUsado) <= 1;

  const [obsBaixa, setObsBaixa] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleBaixa = async (item: ComboClienteItem) => {
    if (item.quantidade_usada >= item.quantidade_contratada) {
      toast.error('Todos os procedimentos deste tipo já foram utilizados.');
      return;
    }
    
    // Confirmação para evitar clique acidental, ou baixar direto? Melhor ser em um modalzinho, mas vamos fazer direto se não tiver selecionado.
    if (selectedItemId !== item.id) {
      setSelectedItemId(item.id);
      return; // Abre a mini div de obs
    }

    // Processar baixa
    await registerBaixa(combo.id, item.id, item.valor_unitario, obsBaixa);
    setSelectedItemId(null);
    setObsBaixa('');
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm font-bold">
        <ArrowLeft size={16} /> Voltar para lista
      </button>

      {isEsgotando && combo.status === 'ATIVO' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl flex items-center gap-3 text-yellow-500 text-sm font-bold">
          <AlertTriangle size={18} />
          <p>Atenção: Este combo está próximo do fim (saldo quase zerado ou resta apenas 1 serviço).</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ESQUERDA - INFOS E ITENS */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-[#121212] border border-[#222] rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-[#C5A059] text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-md">
               {combo.status}
             </div>
             
             <h2 className="text-2xl font-bold text-white">{client?.name || 'Cliente'}</h2>
             <p className="text-sm text-[#C5A059] font-bold mb-6">{combo.nome_personalizado}</p>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Valor Pago</span>
                  <span className="text-lg font-bold text-white">R$ {combo.valor_pago.toFixed(2)}</span>
                </div>
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Saldo Restante</span>
                  <span className={`text-lg font-bold ${saldo > 0 ? 'text-[#00C853]' : 'text-gray-500'}`}>R$ {saldo.toFixed(2)}</span>
                </div>
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Início</span>
                  <span className="text-sm font-bold text-gray-300 mt-1 block">{format(parseISO(combo.data_inicio), 'dd/MM/yyyy')}</span>
                </div>
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333]">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Uso</span>
                  <span className="text-lg font-bold text-white">{pct.toFixed(0)}%</span>
                </div>
             </div>
          </div>

          <div className="bg-[#121212] border border-[#222] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-[#C5A059]" /> Procedimentos do Combo
            </h3>

            <div className="space-y-4">
              {itens.map(item => {
                const restam = item.quantidade_contratada - item.quantidade_usada;
                const esgotado = restam <= 0;
                const isSelected = selectedItemId === item.id;

                return (
                  <div key={item.id} className={`bg-[#1A1A1A] border rounded-xl p-4 transition-all ${isSelected ? 'border-[#C5A059]' : 'border-[#333]'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white text-base">{item.nome_procedimento}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${esgotado ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-[#00C85322] text-[#00C853] border-[#00C85344]'}`}>
                            {esgotado ? 'ESGOTADO' : `${restam} RESTANTE${restam > 1 ? 'S' : ''}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                           <span>Usados: {item.quantidade_usada} / {item.quantidade_contratada}</span>
                           <span>V. Base: R$ {item.valor_unitario.toFixed(2)}</span>
                        </div>
                        
                        <div className="w-full bg-[#222] rounded-full h-2 mt-2 overflow-hidden">
                          <div className={`h-full transition-all ${esgotado ? 'bg-gray-600' : 'bg-[#C5A059]'}`} style={{ width: `${(item.quantidade_usada / item.quantidade_contratada) * 100}%` }}></div>
                        </div>
                      </div>

                      {combo.status === 'ATIVO' && !esgotado && (
                        <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                          {isSelected ? (
                            <div className="animate-fade-in space-y-2">
                              <input 
                                type="text"
                                placeholder="Observação (Opcional)"
                                value={obsBaixa}
                                onChange={e => setObsBaixa(e.target.value)}
                                className="w-full bg-[#111] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A059]"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setSelectedItemId(null)} className="flex-1 px-3 py-3 bg-[#222] text-gray-400 hover:text-white text-[10px] sm:text-xs font-bold uppercase rounded-lg cursor-pointer">
                                  Cancelar
                                </button>
                                <button onClick={() => handleBaixa(item)} className="flex-1 px-3 py-3 bg-[#C5A059] text-black hover:bg-[#d4af66] text-[10px] sm:text-xs font-bold uppercase rounded-lg cursor-pointer flex justify-center items-center gap-1 shadow-sm">
                                  <CheckCircle2 size={14} /> Confirmar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setSelectedItemId(item.id)} className="w-full sm:w-[130px] bg-[#C5A059] hover:bg-[#d4af66] text-black px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow">
                              Dar Baixa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DIREITA - HISTÓRICO DE BAIXAS */}
        <div className="col-span-1 space-y-6">
           <div className="bg-[#121212] border border-[#222] rounded-2xl p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <History className="text-[#C5A059]" /> Histórico de Uso
              </h3>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                 {baixas.length === 0 ? (
                   <p className="text-gray-500 text-xs text-center py-8">Nenhum serviço foi utilizado deste combo ainda.</p>
                 ) : (
                   baixas.sort((a,b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()).map(baixa => {
                     const item = itens.find(i => i.id === baixa.combo_cliente_item_id);
                     return (
                       <div key={baixa.id} className="relative pl-4 border-l-2 border-[#333] pb-4 last:pb-0">
                         <div className="absolute w-2.5 h-2.5 bg-[#C5A059] rounded-full -left-[5px] top-1 border-[2px] border-[#121212]"></div>
                         <p className="text-xs text-gray-500 font-bold mb-1">{format(parseISO(baixa.data_hora), 'dd/MM/yyyy HH:mm')}</p>
                         <p className="text-sm font-bold text-white">{item?.nome_procedimento || 'Procedimento deletado'}</p>
                         <p className="text-[10px] text-[#00C853] font-bold mt-0.5">Saldo debitado: R$ {baixa.valor_descontado.toFixed(2)}</p>
                         {baixa.observacao && <p className="text-[10px] text-gray-400 mt-1 italic">"{baixa.observacao}"</p>}
                       </div>
                     );
                   })
                 )}
              </div>

              {combo.status === 'ATIVO' && (
                 <div className="mt-6 pt-4 border-t border-[#222]">
                   <button onClick={() => {
                     if (confirm('Tem certeza que deseja cancelar este combo? Esta ação não pode ser desfeita.')) {
                        updateStatus(combo.id, 'CANCELADO', 'Cancelado manualmente pelo admin.');
                     }
                   }} className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer">
                     <XCircle size={18} /> Cancelar Combo
                   </button>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
