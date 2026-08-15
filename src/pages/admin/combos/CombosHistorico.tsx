import React, { useState } from 'react';
import { ComboCliente, ComboClienteItem, ComboBaixa } from '../../../types/combos';
import { Client } from '../../../types';
import { Search, History, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  combos: ComboCliente[];
  itens: ComboClienteItem[];
  baixas: ComboBaixa[];
  clientes: Client[];
}

export default function CombosHistorico({ combos, itens, baixas, clientes }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCombos = combos.filter(c => {
    const client = clientes.find(cl => cl.id === c.cliente_id);
    return client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.nome_personalizado.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a,b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-[#121212] p-4 border border-[#222] rounded-2xl">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Buscar histórico por cliente ou combo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#C5A059]"
          />
        </div>
      </div>

      <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#222] bg-[#161616] flex items-center gap-3">
          <History className="text-[#C5A059]" size={20} />
          <h2 className="text-lg font-bold text-white">Histórico de Combos</h2>
        </div>
        
        {filteredCombos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhum histórico encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5 bg-[#121212]">
            {filteredCombos.map(combo => {
              const client = clientes.find(c => c.id === combo.cliente_id);
              const comboItens = itens.filter(i => i.combo_cliente_id === combo.id);
              let totalContratado = 0; let totalUsado = 0;
              comboItens.forEach(i => { totalContratado += i.quantidade_contratada; totalUsado += i.quantidade_usada; });

              return (
                <div key={combo.id} className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-lg">{client?.name || 'Cliente'}</h4>
                      <p className="text-xs text-gray-400 font-medium">{combo.nome_personalizado}</p>
                    </div>
                    {combo.status === 'CONCLUIDO' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#00C853] bg-[#00C85311] px-2 py-1 rounded border border-[#00C85333] uppercase">
                        <CheckCircle size={12} /> Concluído
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/30 uppercase">
                        <XCircle size={12} /> Cancelado
                      </span>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-[#222]">
                    <div>
                       <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Valor Pago</span>
                       <span className="text-sm font-bold text-white">R$ {combo.valor_pago.toFixed(2)}</span>
                    </div>
                    <div>
                       <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Data Início</span>
                       <span className="text-sm font-bold text-white">{format(parseISO(combo.data_inicio), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="col-span-2">
                       <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Uso Total</span>
                       <span className="text-sm font-bold text-[#C5A059]">{totalUsado} de {totalContratado} serviços</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
