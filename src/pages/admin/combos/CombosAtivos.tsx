import React, { useState } from 'react';
import { ComboCliente, ComboClienteItem, ComboBaixa, ComboTemplate, ComboTemplateItem } from '../../../types/combos';
import { Client, Service } from '../../../types';
import { Search, Plus, CreditCard, Filter, ChevronRight, X, Check } from 'lucide-react';
import ComboClientPanel from './ComboClientPanel';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Props {
  combos: ComboCliente[];
  itens: ComboClienteItem[];
  baixas: ComboBaixa[];
  clientes: Client[];
  templates: ComboTemplate[];
  templateItems: ComboTemplateItem[];
  servicos: Service[];
  assignCombo: (combo: any, itens: any) => Promise<void>;
  registerBaixa: (comboId: string, itemId: string, valor: number, obs: string) => Promise<void>;
  updateStatus: (comboId: string, status: any, obs?: string) => Promise<void>;
}

export default function CombosAtivos({ combos, itens, baixas, clientes, templates, templateItems, servicos, assignCombo, registerBaixa, updateStatus }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Form states for assigning combo
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [valorPago, setValorPago] = useState<number | ''>('');

  const filteredCombos = combos.filter(c => {
    const client = clientes.find(cl => cl.id === c.cliente_id);
    return client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.nome_personalizado.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAssign = async () => {
    if (!selectedClient) return toast.error('Selecione o cliente');
    if (!selectedTemplate) return toast.error('Selecione o pacote/template');
    if (!valorPago || valorPago <= 0) return toast.error('Informe o valor pago');

    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return;

    const tplItens = templateItems.filter(i => i.combo_template_id === tpl.id);
    
    const comboItensPayload = tplItens.map(ti => {
      const s = servicos.find(s => s.id === ti.procedimento_id);
      // O valor unitário no pacote pode ser rateado, mas vamos colocar o original ou rateado. 
      // Para simplificar, o valor_unitario armazenado serve como base de estorno. Rateio proporcional:
      const originalSum = tplItens.reduce((acc, curr) => acc + ((servicos.find(srv => srv.id === curr.procedimento_id)?.price || 0) * curr.quantidade), 0);
      const ratio = originalSum > 0 ? (s?.price || 0) / originalSum : 0;
      const calcVal = (Number(valorPago) * ratio); // valor rateado

      return {
        procedimento_id: ti.procedimento_id,
        nome_procedimento: s?.name || 'Serviço',
        valor_unitario: Number(calcVal.toFixed(2)),
        quantidade_contratada: ti.quantidade
      };
    });

    await assignCombo({
      cliente_id: selectedClient,
      combo_template_id: tpl.id,
      nome_personalizado: tpl.nome,
      valor_pago: Number(valorPago),
      observacoes: ''
    }, comboItensPayload);

    setIsAssigning(false);
    setSelectedClient('');
    setSelectedTemplate('');
    setValorPago('');
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplate(tId);
    const tpl = templates.find(t => t.id === tId);
    if (tpl) {
      setValorPago(tpl.valor_total);
    }
  };

  if (selectedComboId) {
    const activeCombo = combos.find(c => c.id === selectedComboId);
    if (!activeCombo) {
      setSelectedComboId(null);
      return null;
    }
    return (
      <ComboClientPanel 
        combo={activeCombo}
        itens={itens.filter(i => i.combo_cliente_id === activeCombo.id)}
        baixas={baixas.filter(b => b.combo_cliente_id === activeCombo.id)}
        client={clientes.find(c => c.id === activeCombo.cliente_id)!}
        onBack={() => setSelectedComboId(null)}
        registerBaixa={registerBaixa}
        updateStatus={updateStatus}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121212] p-4 border border-[#222] rounded-2xl">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Buscar por cliente ou pacote..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#C5A059]"
          />
        </div>
        <button 
          onClick={() => setIsAssigning(true)}
          className="bg-[#C5A059] text-black px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#d4af66] transition-colors cursor-pointer w-full lg:w-auto"
        >
          <Plus size={18} /> Vender Combo
        </button>
      </div>

      {isAssigning && (
        <div className="bg-[#1A1A1A] border border-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.1)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#C5A059] flex items-center gap-2"><CreditCard size={20} /> Vender Pacote / Combo</h3>
            <button onClick={() => setIsAssigning(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Cliente</label>
              <select 
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="">Selecione o cliente...</option>
                {clientes.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Template do Combo</label>
              <select 
                value={selectedTemplate}
                onChange={handleTemplateSelect}
                className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="">Selecione o pacote...</option>
                {templates.filter(t => t.ativo).map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Valor Pago (R$)</label>
              <input 
                type="number"
                value={valorPago}
                onChange={e => setValorPago(Number(e.target.value))}
                className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-[#00C853] font-bold focus:outline-none focus:border-[#C5A059]"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#333]">
             <button onClick={() => setIsAssigning(false)} className="px-6 py-3 text-sm font-bold uppercase text-gray-400 hover:text-white cursor-pointer bg-[#222] sm:bg-transparent rounded-xl sm:rounded-none">Cancelar</button>
             <button onClick={handleAssign} className="bg-[#C5A059] text-black px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#d4af66] transition-colors cursor-pointer flex items-center justify-center gap-2">
               <Check size={18} /> Confirmar Venda
             </button>
          </div>
        </div>
      )}

      {/* Lista Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCombos.map(combo => {
          const client = clientes.find(c => c.id === combo.cliente_id);
          const comboItens = itens.filter(i => i.combo_cliente_id === combo.id);
          
          let totalContratado = 0;
          let totalUsado = 0;
          comboItens.forEach(i => {
            totalContratado += i.quantidade_contratada;
            totalUsado += i.quantidade_usada;
          });

          const percent = totalContratado > 0 ? (totalUsado / totalContratado) * 100 : 0;
          let progressColor = 'bg-[#00C853]'; // Verde
          if (percent > 50) progressColor = 'bg-[#F5C518]'; // Amarelo
          if (percent > 80) progressColor = 'bg-red-500'; // Vermelho esgotando

          // Saldo financeiro
          const comboBaixas = baixas.filter(b => b.combo_cliente_id === combo.id);
          const totalDescontado = comboBaixas.reduce((acc, curr) => acc + Number(curr.valor_descontado), 0);
          const saldo = combo.valor_pago - totalDescontado;

          return (
            <div key={combo.id} className="bg-[#161616] border border-[#333] rounded-2xl p-5 hover:border-[#C5A05966] transition-colors flex flex-col h-full cursor-pointer group" onClick={() => setSelectedComboId(combo.id)}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-white text-lg group-hover:text-[#C5A059] transition-colors">{client?.name || 'Cliente Excluído'}</h4>
                  <p className="text-xs text-gray-400 font-medium">{combo.nome_personalizado}</p>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-gray-500 font-bold uppercase block">Saldo</span>
                   <span className={`font-bold ${saldo <= 0 ? 'text-gray-500' : 'text-[#00C853]'}`}>R$ {saldo.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-[#222]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Uso ({totalUsado}/{totalContratado})</span>
                  <span className="text-[10px] font-bold text-white">{percent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#222] flex justify-between items-center">
                 <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Início: {format(parseISO(combo.data_inicio), 'dd/MM/yyyy')}</span>
                 <span className="text-xs font-bold text-[#C5A059] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                   Gerenciar <ChevronRight size={14} />
                 </span>
              </div>
            </div>
          );
        })}

        {filteredCombos.length === 0 && (
          <div className="col-span-full py-16 text-center border border-[#222] rounded-2xl bg-[#121212]">
            <p className="text-gray-400 font-medium">Nenhum combo ativo encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
