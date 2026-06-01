import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Check } from 'lucide-react';
import { Product, Service, Client } from '../../types';
import toast from 'react-hot-toast';

export default function AdminPDV() {
  const { state, addTransaction, updateProduct, addAppointment } = useAppContext();

  const authData = sessionStorage.getItem('app_auth_state');
  const authState = authData ? JSON.parse(authData) : null;
  const isBarbeiro = authState?.role === 'BARBEIRO';
  const currentBarbeiroId = authState?.barbeiroId;

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>(isBarbeiro ? currentBarbeiroId : '');
  const [cartItems, setCartItems] = useState<{ id: string, type: 'PRODUCT' | 'SERVICE', name: string, price: number, quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (item: Product | Service, type: 'PRODUCT' | 'SERVICE') => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, type, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, type: 'PRODUCT' | 'SERVICE', delta: number) => {
    setCartItems(prev => prev.map(i => {
      if (i.id === id && i.type === type) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string, type: 'PRODUCT' | 'SERVICE') => {
    setCartItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0 || isSubmitting) return;

    // Guard: Prevent checkout of services without identifying the responsible professional
    const hasService = cartItems.some(i => i.type === 'SERVICE');
    if (hasService && !selectedBarber) {
      toast.error('Selecione o profissional (barbeiro) responsável pelo serviço antes de prosseguir!', {
        icon: '⚠️'
      });
      return;
    }

    setIsSubmitting(true);

    // Remove from stock
    cartItems.forEach(item => {
      if (item.type === 'PRODUCT') {
        const product = state.products.find(p => p.id === item.id);
        if (product) {
          updateProduct(product.id, { quantity: Math.max(0, product.quantity - item.quantity) });
        }
      }
    });

    const checkoutDateStr = new Date().toISOString();
    const clientName = state.clients.find(c => c.id === selectedClient)?.name || 'Cliente Avulso';

    // Record Transaction
    addTransaction({
      type: 'INCOME',
      amount: total,
      description: `Venda PDV - ${clientName} - ${cartItems.length} itens (${paymentMethod})`,
      date: checkoutDateStr,
    });

    // Commission logic for Services in PDV
    const servicesTotal = cartItems.filter(i => i.type === 'SERVICE').reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (servicesTotal > 0 && selectedBarber) {
      const barber = state.barbers.find(b => b.id === selectedBarber);
      if (barber && barber.comissao && barber.comissao > 0) {
        // Proportionally apply discount to services, or just use raw services total for commission? Usually raw.
        const comissionValue = (servicesTotal * barber.comissao) / 100;
        addTransaction({
          type: 'EXPENSE',
          amount: comissionValue,
          description: `Comissão Barbeiro (${barber.name}) - Venda PDV - ${barber.comissao}%`,
          date: checkoutDateStr,
        });
      }

      // Record completed appointments for services sold in PDV so they appear in Meu Historico and reports
      cartItems.forEach(item => {
        if (item.type === 'SERVICE') {
          const clientPhone = state.clients.find(c => c.id === selectedClient)?.phone || '0000000000';
          for (let k = 0; k < item.quantity; k++) {
            addAppointment({
              clientName,
              clientPhone,
              serviceId: item.id,
              barberId: selectedBarber,
              date: checkoutDateStr
            }, 'COMPLETED');
          }
        }
      });
    }

    toast.success('Venda finalizada com sucesso!');
    setCartItems([]);
    setSelectedClient('');
    if (!isBarbeiro) setSelectedBarber('');
    setDiscount(0);
    setTimeout(() => setIsSubmitting(false), 800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0C0C0C] border border-[#222] p-6 rounded-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          <ShoppingCart className="text-[#C5A059]" /> Caixa / PDV
        </h1>
        <p className="text-[#777] text-sm mt-2">Venda rápida de produtos e serviços avulsos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#121212] rounded-2xl border border-[#222] p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Produtos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {state.products.map(p => {
                const cartItem = cartItems.find(i => i.id === p.id && i.type === 'PRODUCT');
                const isSelected = !!cartItem;
                return (
                  <button
                    key={`prod-${p.id}`}
                    onClick={() => addToCart(p, 'PRODUCT')}
                    disabled={p.quantity <= 0}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
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
                    <p className="font-medium text-white truncate pr-8">{p.name}</p>
                    <p className="text-[#C5A059] font-bold text-sm mt-1">R$ {p.price.toFixed(2)}</p>
                    <p className="text-[10px] text-[#777] mt-2">Estoque: {p.quantity}</p>
                  </button>
                );
              })}
              {state.products.length === 0 && <p className="text-[#777] text-sm col-span-full">Nenhum produto em estoque.</p>}
            </div>
          </div>

          <div className="bg-[#121212] rounded-2xl border border-[#222] p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Serviços</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {state.services.map(s => {
                const cartItem = cartItems.find(i => i.id === s.id && i.type === 'SERVICE');
                const isSelected = !!cartItem;
                return (
                  <button
                    key={`svc-${s.id}`}
                    onClick={() => addToCart(s, 'SERVICE')}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                      isSelected 
                        ? 'border-[#C5A059] bg-[#C5A05915] shadow-[0_0_12px_rgba(197,160,89,0.2)] font-semibold' 
                        : 'border-[#222] bg-[#161616] hover:border-[#C5A059]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#C5A059] text-black text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                        <Check size={10} strokeWidth={3} />
                        <span>{cartItem.quantity}</span>
                      </div>
                    )}
                    <p className="font-medium text-white truncate pr-8">{s.name}</p>
                    <p className="text-[#C5A059] font-bold text-sm mt-1">R$ {s.price.toFixed(2)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#121212] rounded-2xl border border-[#222] p-6 flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Resumo da Venda</h2>
            
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-medium mb-1">Cliente (Opcional)</label>
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none"
                >
                  <option value="">Cliente Avulso</option>
                  {state.clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {cartItems.some(i => i.type === 'SERVICE') && (
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-medium mb-1">Profissional Responsável (Comissão)</label>
                  <select
                    value={selectedBarber}
                    onChange={e => setSelectedBarber(e.target.value)}
                    disabled={isBarbeiro}
                    className={`w-full px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white rounded focus:border-[#C5A059] focus:outline-none ${isBarbeiro ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecione um Profissional</option>
                    {state.barbers.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[200px]">
              {cartItems.length === 0 ? (
                <p className="text-[#555] text-center text-sm mt-10">O carrinho está vazio</p>
              ) : (
                cartItems.map(item => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#333]">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-xs text-[#C5A059]">R$ {item.price.toFixed(2)} {item.type === 'SERVICE' && '(Serviço)'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.type, -1)} className="p-1 text-[#777] hover:text-white bg-[#222] rounded"><Minus size={14} /></button>
                      <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.type, 1)} className="p-1 text-[#777] hover:text-white bg-[#222] rounded"><Plus size={14} /></button>
                      <button onClick={() => removeFromCart(item.id, item.type)} className="p-1 text-[#FF3D00] hover:bg-[#FF3D0022] ml-1 rounded"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#333] pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm text-[#777]">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-[#777]">
                <span>Desconto (R$)</span>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-[#1A1A1A] border border-[#333] text-white text-right rounded focus:border-[#C5A059] focus:outline-none"
                />
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-white pt-2 border-t border-[#333]">
                <span>Total</span>
                <span className="text-[#C5A059]">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 mb-4">
              <label className="block text-[10px] uppercase tracking-[0.1em] text-[#555] font-medium mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                 {['PIX', 'Cartão', 'Dinheiro'].map(method => (
                   <button
                     key={method}
                     onClick={() => setPaymentMethod(method)}
                     className={`py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${
                       paymentMethod === method 
                         ? 'bg-[#C5A05922] text-[#C5A059] border-[#C5A059]' 
                         : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:border-[#555]'
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
              className={`w-full py-4 text-[#0A0A0A] font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                cartItems.length > 0 && !isSubmitting
                  ? 'bg-[#00C853] shadow-[0_0_15px_#00C85344] hover:bg-[#00E676]' 
                  : 'bg-[#222] text-[#555] cursor-not-allowed'
              }`}
            >
              <Check size={18} /> {isSubmitting ? 'Processando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
