import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Pencil, Trash2, Check, X, Search, Calendar as CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { confirmUI } from '../utils/confirmUI';
import { Transaction } from '../types';

interface Props {
  maxItems?: number;
  showFilters?: boolean;
  barberName?: string;
}

export default function TransactionHistoryList({ maxItems, showFilters = true, barberName }: Props) {
  const { state, updateTransaction, deleteTransaction } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
  // Modal states for correction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const filteredTransactions = useMemo(() => {
    let list = [...state.transactions];

    // Filter by barberName if provided
    if (barberName) {
      const bName = barberName.toLowerCase();
      // Find all commissions specifically for this barber
      const barberCommissions = list.filter(t => 
        t.type === 'EXPENSE' && 
        (t.description.toLowerCase().includes(`(${bName})`) || t.description.toLowerCase().includes(bName))
      );
      
      const commissionTimes = barberCommissions.map(c => new Date(c.date).getTime());
      
      list = list.filter(t => {
        // Show if it is the commission itself
        if (barberCommissions.some(c => c.id === t.id)) return true;

        // Show if it is an income transaction created within 15 seconds of any of this barber's commissions
        if (t.type === 'INCOME') {
          const tTime = new Date(t.date).getTime();
          return commissionTimes.some(cTime => Math.abs(tTime - cTime) <= 15000);
        }

        return false;
      });
    }

    // Filter by type
    if (typeFilter !== 'ALL') {
      list = list.filter(t => t.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        t.description.toLowerCase().includes(term) || 
        t.amount.toString().includes(term)
      );
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply max count if specified
    if (maxItems) {
      list = list.slice(0, maxItems);
    }

    return list;
  }, [state.transactions, typeFilter, searchTerm, maxItems, barberName]);

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditDescription(t.description);
    setEditAmount(t.amount);
    setEditType(t.type);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    if (editAmount < 0) return;

    await updateTransaction(editingTransaction.id, {
      description: editDescription,
      amount: editAmount,
      type: editType
    });
    
    setEditingTransaction(null);
  };

  const handleDelete = (t: Transaction) => {
    confirmUI(
      `Tem certeza que deseja EXCLUIR permanentemente esta transação de R$ ${t.amount.toFixed(2)}? Esta ação não pode ser desfeita e também excluirá uma comissão vinculada automática se houver.`,
      async () => {
        await deleteTransaction(t.id);
      }
    );
  };

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#121212] p-4 rounded-xl border border-[#222]">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição ou valor..."
              className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-[#333] text-white text-xs rounded-lg focus:border-[#C5A059] focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                  typeFilter === type
                    ? 'bg-[#C5A05922] text-[#C5A059] border-[#C5A059]'
                    : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:border-[#555]'
                }`}
              >
                {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#121212] rounded-2xl border border-[#222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#222]">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-[#777] w-[180px]">Data</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-[#777]">Descrição</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-[#777] w-[120px]">Tipo</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-[#777] text-right w-[140px]">Valor</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-[#777] text-center w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#555] text-sm">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  return (
                    <tr key={t.id} className="hover:bg-[#161616] transition-colors">
                      <td className="p-4 text-xs text-[#888] font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon size={12} className="text-[#444]" />
                          {format(parseISO(t.date), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-white font-medium">
                        {t.description}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold ${
                          t.type === 'INCOME' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {t.type === 'INCOME' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-bold text-sm ${
                        t.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            title="Corrigir valor / descrição"
                            className="p-1.5 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(t)}
                            title="Excluir permanentemente"
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Elegant correction Modal/Overlay */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Pencil size={14} className="text-[#C5A059]" /> Corrigir Lançamento
              </h3>
              <button 
                onClick={() => setEditingTransaction(null)}
                className="text-[#555] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Descrição</label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-xs transition-all"
                  placeholder="Descrição da transação"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-xs transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777] font-bold mb-1.5">Tipo</label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as 'INCOME' | 'EXPENSE')}
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-xs transition-all"
                  >
                    <option value="INCOME">Entrada</option>
                    <option value="EXPENSE">Saída</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#222] mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 border border-[#333] text-[#777] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#C5A059] text-[#0A0A0A] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#A88443] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                >
                  <Check size={14} /> Salvar Correção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
