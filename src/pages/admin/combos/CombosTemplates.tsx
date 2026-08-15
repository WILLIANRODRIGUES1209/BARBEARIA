import React, { useState } from 'react';
import { ComboTemplate, ComboTemplateItem } from '../../../types/combos';
import { Service } from '../../../types';
import { Plus, X, ListPlus, Edit2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  templates: ComboTemplate[];
  itens: ComboTemplateItem[];
  servicos: Service[];
  createTemplate: (t: Omit<ComboTemplate, 'id'>, i: Omit<ComboTemplateItem, 'id' | 'combo_template_id'>[]) => Promise<void>;
}

export default function CombosTemplates({ templates, itens, servicos, createTemplate }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState<number | ''>('');
  
  const [selectedItens, setSelectedItens] = useState<{ procedimento_id: string; quantidade: number }[]>([]);

  const toggleItem = (servicoId: string) => {
    const exists = selectedItens.find(i => i.procedimento_id === servicoId);
    if (exists) {
      setSelectedItens(selectedItens.filter(i => i.procedimento_id !== servicoId));
    } else {
      setSelectedItens([...selectedItens, { procedimento_id: servicoId, quantidade: 1 }]);
    }
  };

  const updateQuantity = (servicoId: string, qtd: number) => {
    if (qtd < 1) return;
    setSelectedItens(selectedItens.map(i => i.procedimento_id === servicoId ? { ...i, quantidade: qtd } : i));
  };

  const handleCreate = async () => {
    if (!nome.trim()) return toast.error('Nome do combo é obrigatório');
    if (!valorTotal || valorTotal <= 0) return toast.error('Valor total inválido');
    if (selectedItens.length === 0) return toast.error('Selecione pelo menos um serviço');

    await createTemplate({
      nome,
      descricao,
      valor_total: Number(valorTotal),
      ativo: true
    }, selectedItens);

    setNome('');
    setDescricao('');
    setValorTotal('');
    setSelectedItens([]);
    setIsCreating(false);
  };

  // Calcular valor original somado para comparar
  const sumOriginalValue = selectedItens.reduce((acc, curr) => {
    const s = servicos.find(s => s.id === curr.procedimento_id);
    return acc + ((s?.price || 0) * curr.quantidade);
  }, 0);

  return (
    <div className="space-y-6">
      {isCreating ? (
        <div className="bg-[#121212] border border-[#222] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b border-[#222] pb-4 gap-4">
            <h2 className="text-lg font-bold text-[#C5A059]">Novo Template de Combo</h2>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white cursor-pointer w-full sm:w-auto flex justify-end"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Nome do Combo</label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C5A059]" 
                  placeholder="Ex: Combo Mensal Premium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Descrição / Regras</label>
                <textarea 
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C5A059] min-h-[80px]" 
                  placeholder="Detalhes sobre uso..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Valor Cobrado pelo Combo (R$)</label>
                <input 
                  type="number" 
                  value={valorTotal}
                  onChange={e => setValorTotal(Number(e.target.value))}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-[#00C853] font-bold focus:outline-none focus:border-[#C5A059]" 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-400 mb-1">Serviços Inclusos no Combo</label>
              <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                {servicos.map(s => {
                  const isSelected = selectedItens.find(i => i.procedimento_id === s.id);
                  return (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#222] border border-[#333] gap-3">
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => toggleItem(s.id)}
                      >
                        <input 
                          type="checkbox" 
                          checked={!!isSelected}
                          readOnly
                          className="w-5 h-5 accent-[#C5A059] pointer-events-none"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">{s.name}</p>
                          <p className="text-xs text-gray-400">R$ {s.price.toFixed(2)} avulso</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-between sm:justify-end gap-2 bg-[#111] rounded-lg border border-[#333] p-1.5 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(s.id, isSelected.quantidade - 1); }} className="px-3 py-1 bg-[#222] rounded text-gray-400 hover:text-white cursor-pointer active:bg-[#333]">-</button>
                          <span className="text-sm font-bold w-6 text-center text-white">{isSelected.quantidade}</span>
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(s.id, isSelected.quantidade + 1); }} className="px-3 py-1 bg-[#222] rounded text-gray-400 hover:text-white cursor-pointer active:bg-[#333]">+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded-xl flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">Valor Original Somado:</span>
                <span className="text-sm text-gray-300 line-through decoration-red-500 font-bold">R$ {sumOriginalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#222] pt-4">
            <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-sm font-bold uppercase text-gray-400 hover:text-white cursor-pointer bg-[#222] sm:bg-transparent rounded-xl sm:rounded-none">Cancelar</button>
            <button onClick={handleCreate} className="bg-[#C5A059] text-black px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#d4af66] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg">
              <Check size={18} /> Salvar Combo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#121212] p-4 border border-[#222] rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-[#C5A05922] p-2.5 rounded-lg">
              <ListPlus size={20} className="text-[#C5A059]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Templates Pré-definidos</h3>
              <p className="text-xs text-gray-500">Crie pacotes recorrentes para os clientes.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#222] text-[#C5A059] border border-[#C5A05944] px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={18} /> Novo Template
          </button>
        </div>
      )}

      {/* Lista de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map(tpl => {
          const tplItens = itens.filter(i => i.combo_template_id === tpl.id);
          const originalSum = tplItens.reduce((acc, curr) => {
            const s = servicos.find(s => s.id === curr.procedimento_id);
            return acc + ((s?.price || 0) * curr.quantidade);
          }, 0);
          const discount = originalSum > 0 ? ((originalSum - tpl.valor_total) / originalSum) * 100 : 0;

          return (
            <div key={tpl.id} className="bg-[#121212] border border-[#333] rounded-2xl overflow-hidden hover:border-[#C5A05955] transition-all relative flex flex-col">
              <div className="p-5 border-b border-[#222]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-lg pr-8">{tpl.nome}</h4>
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${tpl.ativo ? 'bg-[#00C85322] text-[#00C853] border border-[#00C85344]' : 'bg-red-500/20 text-red-500 border border-red-500/40'}`}>
                    {tpl.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {tpl.descricao && <p className="text-xs text-gray-400 line-clamp-2">{tpl.descricao}</p>}
                
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider mb-1">Valor do Combo</span>
                    <span className="text-xl font-bold text-[#C5A059]">R$ {tpl.valor_total.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block line-through">R$ {originalSum.toFixed(2)}</span>
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Economia {discount.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-5 bg-[#161616] flex-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Serviços Inclusos</span>
                <ul className="space-y-2">
                  {tplItens.map(ti => {
                    const serv = servicos.find(s => s.id === ti.procedimento_id);
                    return (
                      <li key={ti.id} className="flex justify-between items-center text-sm border-b border-[#222] pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-300 font-medium">{serv?.name || 'Serviço deletado'}</span>
                        <span className="bg-[#222] text-[#C5A059] text-xs font-bold px-2 py-0.5 rounded border border-[#333]">{ti.quantidade}x</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
        {templates.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center border border-dashed border-[#333] rounded-2xl bg-[#121212]">
            <ListPlus size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum template de combo criado ainda.</p>
            <p className="text-xs text-gray-600 mt-1">Crie templates para facilitar a venda de pacotes para seus clientes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
