import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Edit2, Save, X } from 'lucide-react';

export default function AdminEstoque() {
  const { state, addProduct, updateProduct } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({ name: '', quantity: 0, price: 0 });
  const [editForm, setEditForm] = useState({ name: '', quantity: 0, price: 0 });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;
    addProduct(newProduct);
    setIsAdding(false);
    setNewProduct({ name: '', quantity: 0, price: 0 });
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, quantity: product.quantity, price: product.price });
  };

  const handleUpdate = (id: string) => {
    updateProduct(id, editForm);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Controle de Estoque</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-transparent border border-[#C5A059] text-[#C5A059] font-bold px-4 py-2 rounded text-xs uppercase tracking-widest hover:bg-[#C5A05911] flex items-center gap-2 transition-all"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancelar' : 'Novo Produto'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#222] grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Nome do Produto</label>
            <input 
              type="text" 
              required
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Quantidade</label>
            <input 
              type="number" 
              required
              min="0"
              value={newProduct.quantity}
              onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Preço Venda (R$)</label>
            <input 
              type="number" 
              required
              min="0" step="0.01"
              value={newProduct.price}
              onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="bg-[#C5A059] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest px-6 py-3 rounded hover:bg-[#8E6D31] transition-colors">
              Salvar Produto
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#121212] rounded-2xl shadow-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0C0C0C] border-b border-[#222]">
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Produto</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Quantidade</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold">Preço (R$)</th>
              <th className="p-4 text-xs tracking-wider uppercase text-[#555] font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {state.products.map(product => (
              <tr key={product.id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4">
                  {editingId === product.id ? (
                    <input 
                      type="text" 
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="font-medium text-white">{product.name}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <input 
                      type="number" 
                      value={editForm.quantity}
                      onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})}
                      className="w-24 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className={`font-bold ${product.quantity <= 5 ? 'text-[#FF3D00]' : 'text-[#888]'}`}>
                      {product.quantity}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <input 
                      type="number" step="0.01"
                      value={editForm.price}
                      onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                      className="w-28 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  ) : (
                    <span className="text-[#888]">R$ {product.price.toFixed(2)}</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {editingId === product.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="p-2 text-[#777] hover:bg-[#222] rounded transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={() => handleUpdate(product.id)} className="p-2 text-[#00C853] hover:bg-[#00C85322] rounded transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(product)} className="p-2 text-[#C5A059] hover:bg-[#C5A05922] rounded transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {state.products.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[#777]">Nenhum produto cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
