import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Appointment, Product, Transaction, Service, Client, Barber } from '../types';
import { supabase } from '../supabase';
import { useBarbearia } from './BarbeariaContext';

export interface AppContextType {
  state: AppState;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  payAppointment: (id: string, paymentMethod: string, amount: number, description: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateServices: (services: Service[]) => void;
  updateClients: (clients: Client[]) => void;
  updateBarbers: (barbers: Barber[]) => void;
}

const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Corte de Cabelo', price: 40, durationMinutes: 30 },
  { id: '2', name: 'Barba', price: 30, durationMinutes: 30 },
  { id: '3', name: 'Corte + Barba', price: 60, durationMinutes: 60 },
  { id: '4', name: 'Sobrancelha', price: 15, durationMinutes: 15 },
  { id: '5', name: 'Pezinho', price: 10, durationMinutes: 15 },
];

const getStoredData = <T,>(key: string, defaultData: T): T => {
  try {
    const d = localStorage.getItem(key);
    if (d) return JSON.parse(d);
  } catch(e) {}
  return defaultData;
};

const INITIAL_STATE: AppState = {
  services: getStoredData('barbearia_services', DEFAULT_SERVICES),
  clients: getStoredData('barbearia_clients', []),
  barbers: getStoredData('barbearia_barbers', []),
  appointments: [],
  products: [],
  transactions: [],
  isConnected: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const { barbearia } = useBarbearia();

  useEffect(() => {
    if (!barbearia) return;
    let mounted = true;

    async function loadData() {
      try {
        const [
          { data: agendamentos }, 
          { data: produtos }, 
          { data: transacoes },
          { data: servicos },
          { data: barbeiros },
          { data: clientes }
        ] = await Promise.all([
          supabase.from('agendamentos').select('*').eq('barbearia_id', barbearia.id),
          supabase.from('produtos').select('*').eq('barbearia_id', barbearia.id),
          supabase.from('transacoes').select('*').eq('barbearia_id', barbearia.id),
          supabase.from('servicos').select('*').eq('barbearia_id', barbearia.id),
          supabase.from('barbeiros').select('*').eq('barbearia_id', barbearia.id),
          supabase.from('clientes').select('*').eq('barbearia_id', barbearia.id)
        ]);
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            services: (servicos || []).map((s: any) => ({
              id: s.id,
              name: s.nome,
              price: Number(s.preco),
              durationMinutes: s.duracao_minutos
            })),
            barbers: (barbeiros || []).map((b: any) => ({
              id: b.id,
              name: b.nome,
              phone: b.telefone,
              active: b.ativo,
              specialties: '' 
            })),
            clients: (clientes || []).map((c: any) => ({
              id: c.id,
              name: c.nome,
              phone: c.telefone
            })),
            appointments: (agendamentos || []).map((a: any) => ({
              id: a.id,
              clientName: a.cliente_nome,
              clientPhone: a.cliente_telefone,
              serviceId: a.servico_id,
              barberId: a.barbeiro_id,
              date: a.data_hora,
              status: a.status === 'PENDENTE' ? 'PENDING' : (a.status === 'CONCLUIDO' ? 'COMPLETED' : 'CANCELLED'),
            })),
            products: (produtos || []).map((p: any) => ({
              id: p.id,
              name: p.nome,
              price: Number(p.preco),
              quantity: p.quantidade
            })),
            transactions: (transacoes || []).map((t: any) => ({
              id: t.id,
              type: t.tipo === 'ENTRADA' ? 'INCOME' : 'EXPENSE',
              amount: Number(t.valor),
              description: t.descricao,
              date: t.data
            })),
            isConnected: true
          }));
        }
      } catch (err) {
        console.error("Supabase load error:", err);
        if (mounted) {
          setState(prev => ({ ...prev, isConnected: false }));
        }
      }
    }
    
    loadData();

    const channel = supabase.channel(`barbearia-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbeiros', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `barbearia_id=eq.${barbearia.id}` }, () => loadData())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [barbearia]);

  const addAppointment = async (appt: Omit<Appointment, 'id' | 'status'>) => {
    if (!barbearia) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({
      ...prev,
      appointments: [...prev.appointments, {
        ...appt,
        id: tempId,
        status: 'PENDING' as const
      }]
    }));

    try {
      const { data, error } = await supabase.from('agendamentos').insert({
        barbearia_id: barbearia.id,
        cliente_nome: appt.clientName,
        cliente_telefone: appt.clientPhone,
        servico_id: appt.serviceId,
        barbeiro_id: appt.barberId,
        data_hora: appt.date,
        status: 'PENDENTE',
      });
      
      if (error) {
        console.error('Error inserting appointment:', error);
        alert('Erro ao agendar: ' + error.message);
        // Revert optimistic update on failure
        setState(prev => ({
          ...prev,
          appointments: prev.appointments.filter(a => a.id !== tempId)
        }));
      } else {
        // Find service name
        const service = state.services.find(s => s.id === appt.serviceId);
        // Format time properly to send to notify
        const dateObj = new Date(appt.date);
        
        // Fire notification in background
        fetch('/api/notify-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: appt.clientName,
            serviceName: service ? service.name : 'Serviço',
            date: dateObj.toLocaleDateString('pt-BR'),
            time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          })
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update on failure
      setState(prev => ({
        ...prev,
        appointments: prev.appointments.filter(a => a.id !== tempId)
      }));
    }
  };

  const payAppointment = async (id: string, paymentMethod: string, amount: number, description: string) => {
    if (!barbearia) return;
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'COMPLETED' as const } : a),
      transactions: [...prev.transactions, {
        id: `temp-${Date.now()}`,
        type: 'INCOME',
        amount,
        description: `Serviço recebido via ${paymentMethod}: ${description}`,
        date: new Date().toISOString()
      }]
    }));

    try {
      await supabase.from('agendamentos').update({ status: 'CONCLUIDO' }).eq('id', id);
      await supabase.from('transacoes').insert({
        barbearia_id: barbearia.id,
        tipo: 'ENTRADA',
        valor: amount,
        descricao: `Serviço recebido via ${paymentMethod}: ${description}`,
        data: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    if (!barbearia) return;
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status } : a)
    }));

    const statusMap: Record<string, string> = {
      'PENDING': 'PENDENTE',
      'COMPLETED': 'CONCLUIDO',
      'CANCELLED': 'CANCELADO'
    };
    await supabase.from('agendamentos').update({ status: statusMap[status] || status }).eq('id', id);
  };

  const addProduct = async (prod: Omit<Product, 'id'>) => {
    if (!barbearia) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...prod, id: tempId }]
    }));

    try {
      const { error } = await supabase.from('produtos').insert({
        barbearia_id: barbearia.id,
        nome: prod.name,
        preco: prod.price,
        quantidade: prod.quantity
      });
      if (error) {
        setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== tempId) }));
      }
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== tempId) }));
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!barbearia) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
    }));

    const mappedUpdates: any = {};
    if (updates.name) mappedUpdates.nome = updates.name;
    if (updates.price) mappedUpdates.preco = updates.price;
    if (updates.quantity !== undefined) mappedUpdates.quantidade = updates.quantity;
    
    try {
      await supabase.from('produtos').update(mappedUpdates).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!barbearia) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, { ...t, id: tempId, date: t.date || new Date().toISOString() }]
    }));

    try {
      const { error } = await supabase.from('transacoes').insert({
        barbearia_id: barbearia.id,
        tipo: t.type === 'INCOME' ? 'ENTRADA' : 'SAIDA',
        valor: t.amount,
        descricao: t.description,
        data: t.date || new Date().toISOString()
      });
      if (error) {
        setState(prev => ({ ...prev, transactions: prev.transactions.filter(tr => tr.id !== tempId) }));
      }
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(tr => tr.id !== tempId) }));
    }
  };

  const updateServices = async (services: Service[]) => {
    if (!barbearia) return;
    
    // Identifica o que mudou (simplificado para sincronizar com o estado local)
    // Para uma implementação robusta, o ideal seria ter addService, deleteService, updateService
    // Mas vamos manter a assinatura atual e tentar sincronizar
    setState(prev => ({ ...prev, services }));
    
    // Sincroniza a última alteração (assumindo que o Admin enviou a lista atualizada)
    const lastService = services[services.length - 1];
    if (lastService && !state.services.find(s => s.id === lastService.id)) {
      await supabase.from('servicos').insert({
        barbearia_id: barbearia.id,
        nome: lastService.name,
        preco: lastService.price,
        duracao_minutos: lastService.durationMinutes
      });
    }
  };

  const updateClients = async (clients: Client[]) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, clients }));
    
    const lastClient = clients[clients.length - 1];
    if (lastClient && !state.clients.find(c => c.id === lastClient.id)) {
      await supabase.from('clientes').insert({
        barbearia_id: barbearia.id,
        nome: lastClient.name,
        telefone: lastClient.phone
      });
    }
  };

  const updateBarbers = async (barbers: Barber[]) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, barbers }));
    
    const lastBarber = barbers[barbers.length - 1];
    if (lastBarber && !state.barbers.find(b => b.id === lastBarber.id)) {
      await supabase.from('barbeiros').insert({
        barbearia_id: barbearia.id,
        nome: lastBarber.name,
        telefone: lastBarber.phone,
        ativo: lastBarber.active
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addAppointment,
        updateAppointmentStatus,
        payAppointment,
        addProduct,
        updateProduct,
        addTransaction,
        updateServices,
        updateClients,
        updateBarbers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
