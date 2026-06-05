import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ShoppingCart, Plus, Minus, Trash2, Check } from 'lucide-react';
import { Product, Client } from '../../types';
import toast from 'react-hot-toast';

export default function AdminPDV() {
  const { state, addTransaction, updateProduct, refreshData } = useAppContext();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [cartItems, setCartItems] = useState<{ id: string, type: 'PRODUCT', name: string, price: number, quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (item: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === 'PRODUCT');
      if (existing) {
        // Stock guard check
        if (existing.quantity >= item.quantity) {
          toast.error(`Quantidade máxima em estoque atingida (${item.quantity}).`);
          return prev;
        }
        return prev.map(i => i.id === item.id && i.type === 'PRODUCT' ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, type: 'PRODUCT', name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    setCartItems(prev => prev.map(i => {
      if (i.id === id && i.type === 'PRODUCT') {
        const nextQty = i.quantity + delta;
        if (nextQty > product.quantity) {
          toast.error(`Limite de estoque atingido (${product.quantity} unidades disponíveis).`);
          return i;
        }
        return { ...i, quantity: Math.max(1, nextQty) };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(i => !(i.id === id && i.type === 'PRODUCT')));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Update product quantities in database
      const productUpdates = cartItems.map(async (item) => {
        const product = state.products.find(p => p.id === item.id);
        if (product) {
          await updateProduct(product.id, { quantity: Math.max(0, product.quantity - item.quantity) });
        }
      });
      await Promise.all(productUpdates);

      const checkoutDateStr = new Date().toISOString();
      const clientName = state.clients.find(c => c.id === selectedClient)?.name || 'Cliente Avulso';
      const itemsLabel = cartItems.map(i => `${i.name} (x${i.quantity})`).join(', ');

      // 2. Record Transaction
      await addTransaction({
        type: 'INCOME',
        amount: total,
        description: `Venda PDV Produtos - ${clientName} - Itens: ${itemsLabel} (Desconto: R$ ${discount.toFixed(2)}) (${paymentMethod})`,
        date: checkoutDateStr,
      });

      toast.success('Venda de produtos finalizada com sucesso!');
      setCartItems([]);
      setSelectedClient('');
      setDiscount(0);
      
      // 3. Refresh Context Stock
      if (refreshData) {
        await refreshData();
      }
    } catch (err: any) {
      console.error("Erro ao finalizar venda:", err);
      toast.error('Ocorreu um erro ao registrar a venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <ShoppingCart className="text-[#C5A059]" /> Caixa / PDV (Venda de Produtos)
        </h1>
        <p className="text-[#777] text-xs mt-2">Dedicado exclusivamente para a venda rápida de produtos e consumíveis do estoque.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Products catalog */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#121212] rounded-2xl border border-[#222] p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Produtos Disponíveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {state.products.map(p => {
                const cartItem = cartItems.find(i => i.id === p.id && i.type === 'PRODUCT');
                const isSelected = !!cartItem;
                return (
                  <button
                    key={`prod-${p.id}`}
                    onClick={() => addToCart(p)}
                    disabled={p.quantity <= 0}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[120px] ${
                      isSelected 
                        ? 'border-[#C5A059] bg-[#C5A05915] shadow-[0_0_12px_rgba(197,160,89,0.2)] font-semibold' 
                        : p.quantity > 0 
                          ? 'border-[#222] bg-[#161616] hover:border-[#C5A059]' 
                          : 'border-[#1a1a1a] bg-[#0c0c0c] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#C5A059] text-black text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                        <Check size={10} strokeWidth={3} />
                        <span>{cartItem.quantity}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white truncate pr-6 text-sm">{p.name}</p>
                      <p className="text-[#C5A059] font-black text-sm mt-1">R$ {p.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] mt-2 font-bold uppercase tracking-wider">Estoque: {p.quantity}</p>
                    </div>
                  </button>
                );
              })}
              {state.products.length === 0 && (
                <p className="text-[#555] text-xs font-semibold col-span-full py-8 text-center uppercase tracking-widest">Nenhum produto cadastrado no estoque.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Cart summary */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Resumo da Venda</h2>
            
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-bold mb-1.5">Cliente (Opcional)</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#161616] border border-[#222] text-white rounded-xl focus:border-[#C5A059] focus:outline-none text-xs font-bold transition-colors"
              >
                <option value="">Cliente Avulso</option>
                {state.clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[180px] max-h-[300px] custom-scrollbar">
              {cartItems.length === 0 ? (
                <p className="text-[#555] text-center text-xs font-bold uppercase tracking-widest py-10 mt-6">O carrinho está vazio</p>
              ) : (
                cartItems.map(item => (
                  <div key={`cart-${item.id}`} className="flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-[#222]">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-xs font-black text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-[#C5A059] font-bold">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-[#777] hover:text-white bg-[#1F1F1F] rounded border border-[#2A2A2A]"><Minus size={12} /></button>
                      <span className="text-white text-xs font-black w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-[#777] hover:text-white bg-[#1F1F1F] rounded border border-[#2A2A2A]"><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500 hover:bg-red-500/10 ml-1.5 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#222] pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs text-[#777] font-bold">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#777] font-bold">
                <span>Desconto (R$)</span>
                <input 
                  type="number"
                  min="0"
                  step="0.10"
                  value={discount}
                  onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 px-2 py-1 bg-[#161616] border border-[#222] text-white text-right rounded focus:border-[#C5A059] focus:outline-none font-bold text-xs"
                />
              </div>
              <div className="flex justify-between items-center text-sm font-black text-white pt-2 border-t border-[#222]">
                <span>Total</span>
                <span className="text-[#C5A059] text-base">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 mb-4">
              <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-bold mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['PIX', 'Cartão', 'Dinheiro'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                      paymentMethod === method 
                        ? 'bg-[#C5A05922] text-[#C5A059] border-[#C5A059]' 
                        : 'bg-[#161616] text-[#777] border-[#222] hover:border-[#333]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0 || isSubmitting}
              className={`w-full py-3.5 text-[#0A0A0A] font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                cartItems.length > 0 && !isSubmitting
                  ? 'bg-[#00C853] shadow-[0_0_15px_#00C85344] hover:bg-[#00E676]' 
                  : 'bg-[#1A1A1A] text-[#444] cursor-not-allowed border border-[#222]'
              }`}
            >
              <Check size={14} /> {isSubmitting ? 'Processando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
