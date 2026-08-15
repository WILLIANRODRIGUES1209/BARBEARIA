import React, { useState, useMemo } from 'react';
import { Layers, ListTodo, History, Plus } from 'lucide-react';
import { useCombos } from '../../hooks/useCombos';
import { useAppContext } from '../../context/AppContext';
import CombosAtivos from './combos/CombosAtivos';
import CombosTemplates from './combos/CombosTemplates';
import CombosHistorico from './combos/CombosHistorico';

export default function AdminCombos() {
  const [activeTab, setActiveTab] = useState<'ATIVOS' | 'TEMPLATES' | 'HISTORICO'>('ATIVOS');
  const { templates, templateItems, combosClientes, comboClienteItens, baixas, loading, createTemplate, assignComboToClient, registerBaixa, updateComboStatus } = useCombos();
  const { state } = useAppContext(); // For services and clients

  const tabs = [
    { id: 'ATIVOS', label: 'Combos Ativos', icon: Layers },
    { id: 'TEMPLATES', label: 'Templates', icon: ListTodo },
    { id: 'HISTORICO', label: 'Histórico', icon: History }
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C5A059]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Layers className="text-[#C5A059]" /> Gestão de Combos
          </h1>
          <p className="text-[#777] text-sm mt-1">
            Gerencie combos, templates e acompanhe saldos de clientes.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#121212] border border-[#222] rounded-2xl p-1 inline-flex w-full sm:w-auto overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-[#C5A059] shadow-sm border border-[#333]'
                : 'text-[#666] hover:text-[#E0E0E0] hover:bg-[#151515] border border-transparent'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-[#C5A059]' : 'text-[#666]'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'ATIVOS' && (
          <CombosAtivos 
            combos={combosClientes.filter(c => c.status === 'ATIVO')} 
            itens={comboClienteItens}
            baixas={baixas}
            clientes={state.clients}
            templates={templates}
            templateItems={templateItems}
            servicos={state.services}
            assignCombo={assignComboToClient}
            registerBaixa={registerBaixa}
            updateStatus={updateComboStatus}
          />
        )}
        {activeTab === 'TEMPLATES' && (
          <CombosTemplates 
            templates={templates} 
            itens={templateItems} 
            servicos={state.services} 
            createTemplate={createTemplate} 
          />
        )}
        {activeTab === 'HISTORICO' && (
          <CombosHistorico 
            combos={combosClientes.filter(c => c.status !== 'ATIVO')} 
            itens={comboClienteItens}
            baixas={baixas}
            clientes={state.clients}
          />
        )}
      </div>
    </div>
  );
}
