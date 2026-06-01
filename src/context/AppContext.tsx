import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Appointment, Product, Transaction, Service, Client, Barber } from '../types';
import { supabase } from '../supabase';
import { useBarbearia } from './BarbeariaContext';
import toast from 'react-hot-toast';

export interface AppContextType {
  state: AppState;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status'>, initialStatus?: Appointment['status']) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  payAppointment: (id: string, paymentMethod: string, amount: number, description: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateServices: (services: Service[]) => void;
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  editService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  updateClients: (clients: Client[]) => void;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  editClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addBarber: (barber: Omit<Barber, 'id'>) => Promise<void>;
  editBarber: (id: string, updates: Partial<Barber>) => Promise<void>;
  deleteBarber: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
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

const mapAppointment = (a: any) => ({
  id: a.id,
  clientName: a.cliente_nome,
  clientPhone: a.cliente_telefone,
  serviceId: a.servico_id,
  barberId: a.barbeiro_id,
  date: a.data_hora,
  status: a.status === 'PENDENTE' ? 'PENDING' : (a.status === 'CONCLUIDO' ? 'COMPLETED' : 'CANCELLED'),
});

const mapProduct = (p: any) => ({
  id: p.id,
  name: p.nome,
  price: Number(p.preco),
  quantity: p.quantidade
});

const mapTransaction = (t: any) => ({
  id: t.id,
  type: t.tipo === 'ENTRADA' ? 'INCOME' : 'EXPENSE',
  amount: Number(t.valor),
  description: t.descricao,
  date: t.data
});

const mapService = (s: any) => ({
  id: s.id,
  name: s.nome,
  price: Number(s.preco),
  durationMinutes: s.duracao_minutos
});

const mapBarber = (b: any) => ({
  id: b.id,
  name: b.nome,
  phone: b.telefone,
  active: b.ativo,
  comissao: b.comissao,
  pin: b.pin,
  acesso: b.acesso
});

const mapClient = (c: any) => ({
  id: c.id,
  name: c.nome,
  phone: c.telefone
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const { barbearia, user } = useBarbearia();

  const refreshData = async () => {
    if (!barbearia) return;
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
      
      setState(prev => ({
        ...prev,
        services: (servicos || []).map(mapService),
        barbers: (barbeiros || []).map(mapBarber),
        clients: (clientes || []).map(mapClient),
        appointments: (agendamentos || []).map(mapAppointment),
        products: (produtos || []).map(mapProduct),
        transactions: (transacoes || []).map(mapTransaction),
        isConnected: true
      }));
    } catch (err) {
      console.error("Supabase load error:", err);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  };

  useEffect(() => {
    if (!barbearia) return;

    // Initial load
    refreshData();

    // Auto-refresh when tab gains focus or visibility state changes
    const handleFocusOrVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocusOrVisibilityChange);
    document.addEventListener('visibilitychange', handleFocusOrVisibilityChange);

    // High fidelity backup timer (every 15 seconds)
    const backupInterval = setInterval(() => {
      refreshData();
    }, 15000);

    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.error(e);
      }
    };

    const channelAgendamentos = supabase.channel(`realtime-agendamentos-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
             setState(prev => {
                // Prevent duplicate additions if optimistic update already added it temporarily
                const exists = prev.appointments.some(a => a.id === payload.new.id || 
                    (a.clientName === payload.new.cliente_nome && a.date === payload.new.data_hora && a.serviceId === payload.new.servico_id && (a.id as string).startsWith('temp-')));
                if (exists) {
                   return {
                      ...prev,
                      appointments: prev.appointments.map(a => 
                         (a.clientName === payload.new.cliente_nome && a.date === payload.new.data_hora && a.serviceId === payload.new.servico_id && (a.id as string).startsWith('temp-')) 
                         ? mapAppointment(payload.new) : a)
                   };
                }
                return { ...prev, appointments: [...prev.appointments, mapAppointment(payload.new)] };
             });

             if (window.location.pathname.startsWith('/admin')) {
               toast.success(`Novo agendamento: ${payload.new.cliente_nome}!`, {
                 duration: 6000,
                 icon: '🚀'
               });
               playBeep();
             }
          } else if (payload.eventType === 'UPDATE') {
             setState(prev => ({
                ...prev,
                appointments: prev.appointments.map(a => a.id === payload.new.id ? mapAppointment(payload.new) : a)
             }));
             
             if (payload.new.status === 'CANCELADO' && window.location.pathname.startsWith('/admin')) {
               toast.error(`Agendamento cancelado: ${payload.new.cliente_nome}`, {
                 duration: 6000
               });
               playBeep();
             }
          } else if (payload.eventType === 'DELETE') {
             setState(prev => ({
                ...prev,
                appointments: prev.appointments.filter(a => a.id !== payload.old.id)
             }));
          }
      })
      .subscribe();

    const channelProdutos = supabase.channel(`realtime-produtos-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.products.some(p => p.id === payload.new.id || (p.name === payload.new.nome && typeof p.id === 'string' && p.id.startsWith('temp-')))) {
                  return { ...prev, products: prev.products.map(p => (p.name === payload.new.nome && typeof p.id === 'string' && p.id.startsWith('temp-')) ? mapProduct(payload.new) : p) };
               }
               return { ...prev, products: [...prev.products, mapProduct(payload.new)] };
            });
         } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({ ...prev, products: prev.products.map(p => p.id === payload.new.id ? mapProduct(payload.new) : p) }));
         } else if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== payload.old.id) }));
         }
      })
      .subscribe();

    const channelTransacoes = supabase.channel(`realtime-transacoes-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.transactions.some(t => t.id === payload.new.id || (t.description === payload.new.descricao && typeof t.id === 'string' && t.id.startsWith('temp-')))) {
                  return { ...prev, transactions: prev.transactions.map(t => (t.description === payload.new.descricao && typeof t.id === 'string' && t.id.startsWith('temp-')) ? mapTransaction(payload.new) : t) };
               }
               return { ...prev, transactions: [...prev.transactions, mapTransaction(payload.new)] };
            });
         } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === payload.new.id ? mapTransaction(payload.new) : t) }));
         } else if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== payload.old.id) }));
         }
      })
      .subscribe();

    const channelServicos = supabase.channel(`realtime-servicos-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.services.some(s => s.id === payload.new.id || (s.name === payload.new.nome && typeof s.id === 'string' && s.id.startsWith('temp-')))) {
                  return { ...prev, services: prev.services.map(s => (s.name === payload.new.nome && typeof s.id === 'string' && s.id.startsWith('temp-')) ? mapService(payload.new) : s) };
               }
               return { ...prev, services: [...prev.services, mapService(payload.new)] };
            });
         } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({ ...prev, services: prev.services.map(s => s.id === payload.new.id ? mapService(payload.new) : s) }));
         } else if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== payload.old.id) }));
         }
      })
      .subscribe();

    const channelBarbeiros = supabase.channel(`realtime-barbeiros-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbeiros', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.barbers.some(b => b.id === payload.new.id || (b.name === payload.new.nome && typeof b.id === 'string' && b.id.startsWith('temp-')))) {
                  return { ...prev, barbers: prev.barbers.map(b => (b.name === payload.new.nome && typeof b.id === 'string' && b.id.startsWith('temp-')) ? mapBarber(payload.new) : b) };
               }
               return { ...prev, barbers: [...prev.barbers, mapBarber(payload.new)] };
            });
         } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({ ...prev, barbers: prev.barbers.map(b => b.id === payload.new.id ? mapBarber(payload.new) : b) }));
         } else if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, barbers: prev.barbers.filter(b => b.id !== payload.old.id) }));
         }
      })
      .subscribe();

    const channelClientes = supabase.channel(`realtime-clientes-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.clients.some(c => c.id === payload.new.id || (c.name === payload.new.nome && typeof c.id === 'string' && c.id.startsWith('temp-')))) {
                  return { ...prev, clients: prev.clients.map(c => (c.name === payload.new.nome && typeof c.id === 'string' && c.id.startsWith('temp-')) ? mapClient(payload.new) : c) };
               }
               return { ...prev, clients: [...prev.clients, mapClient(payload.new)] };
            });
         } else if (payload.eventType === 'UPDATE') {
            setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === payload.new.id ? mapClient(payload.new) : c) }));
         } else if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== payload.old.id) }));
         }
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibilityChange);
      document.removeEventListener('visibilitychange', handleFocusOrVisibilityChange);
      clearInterval(backupInterval);
      supabase.removeChannel(channelAgendamentos);
      supabase.removeChannel(channelProdutos);
      supabase.removeChannel(channelTransacoes);
      supabase.removeChannel(channelServicos);
      supabase.removeChannel(channelBarbeiros);
      supabase.removeChannel(channelClientes);
    };
  }, [barbearia]);

  const addAppointment = async (appt: Omit<Appointment, 'id' | 'status'>, initialStatus: Appointment['status'] = 'PENDING') => {
    if (!barbearia) return;
    
    // Generate high-fidelity UUID on the client side
    const appointmentId = (() => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    })();
    
    // Auto-cadastro do Cliente - Only run if user is authenticated (to avoid 401 Unauthorized errors for guests)
    if (user) {
      try {
        const existingClient = state.clients.find(c => c.phone.replace(/\D/g, '') === appt.clientPhone.replace(/\D/g, ''));
        if (!existingClient) {
          await supabase.from('clientes').insert({
            barbearia_id: barbearia.id,
            nome: appt.clientName,
            telefone: appt.clientPhone
          });
        } else if (existingClient.name !== appt.clientName) {
          await supabase.from('clientes').update({ nome: appt.clientName }).eq('id', existingClient.id);
        }
      } catch(e) { console.error('Auto-cadastro falhou:', e); }
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      appointments: [...prev.appointments, {
        ...appt,
        id: appointmentId,
        status: initialStatus
      }]
    }));

    try {
      const { error } = await supabase.from('agendamentos').insert({
        id: appointmentId,
        barbearia_id: barbearia.id,
        cliente_nome: appt.clientName,
        cliente_telefone: appt.clientPhone,
        servico_id: appt.serviceId || null,
        barbeiro_id: appt.barberId,
        data_hora: appt.date,
        status: initialStatus === 'COMPLETED' ? 'CONCLUIDO' : (initialStatus === 'PENDING' ? 'PENDENTE' : 'CANCELADO'),
      });
      
      if (error) {
        console.error('Error inserting appointment:', error);
        toast.error('Erro ao agendar: ' + error.message);
        // Revert optimistic update on failure
        setState(prev => ({
          ...prev,
          appointments: prev.appointments.filter(a => a.id !== appointmentId)
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
            time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            deviceId: typeof window !== 'undefined' ? localStorage.getItem('deviceId') : undefined,
            appointmentId: appointmentId
          })
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update on failure
      setState(prev => ({
        ...prev,
        appointments: prev.appointments.filter(a => a.id !== appointmentId)
      }));
    }
  };

  const payAppointment = async (id: string, paymentMethod: string, amount: number, description: string) => {
    if (!barbearia) return;
    
    // Calculate Commission
    const appt = state.appointments.find(a => a.id === id);
    let commissionTransaction: any = null;
    let commissionEntity: any = null;

    if (appt && appt.barberId) {
       const barber = state.barbers.find(b => b.id === appt.barberId);
       if (barber && barber.comissao && barber.comissao > 0) {
          const comValue = (amount * barber.comissao) / 100;
          commissionTransaction = {
            id: `temp-com-${Date.now()}`,
            type: 'EXPENSE',
            amount: comValue,
            description: `Comissão Barbeiro (${barber.name}) - ${description} - ${barber.comissao}%`,
            date: new Date().toISOString()
          };
          
          commissionEntity = {
            barbearia_id: barbearia.id,
            tipo: 'SAIDA',
            valor: comValue,
            descricao: `Comissão Barbeiro (${barber.name}) - ${description} - ${barber.comissao}%`,
            data: new Date().toISOString(),
          };
       }
    }

    // Optimistic update
    setState(prev => {
      const newTransactions = [...prev.transactions, {
        id: `temp-${Date.now()}`,
        type: 'INCOME' as const,
        amount,
        description: `Serviço recebido via ${paymentMethod}: ${description}`,
        date: new Date().toISOString()
      }];
      if (commissionTransaction) {
        newTransactions.push(commissionTransaction as Transaction);
      }
      return {
        ...prev,
        appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'COMPLETED' as const } : a),
        transactions: newTransactions
      };
    });

    try {
      const { error: updateError } = await supabase.from('agendamentos').update({ status: 'CONCLUIDO' }).eq('id', id);
      if (updateError) throw updateError;

      const rows = [{
        barbearia_id: barbearia.id,
        tipo: 'ENTRADA',
        valor: amount,
        descricao: `Serviço recebido via ${paymentMethod}: ${description}`,
        data: new Date().toISOString(),
      }];
      if (commissionEntity) {
        rows.push(commissionEntity);
      }
      const { error: insertError } = await supabase.from('transacoes').insert(rows);
      if (insertError) throw insertError;

      toast.success('Pagamento recebido com sucesso!');
    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err);
      toast.error(`Falha ao registrar pagamento: ${err?.message || 'Permissão negada ou erro de rede.'}`);
      refreshData();
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

    try {
      const { error: updateError } = await supabase.from('agendamentos').update({ status: statusMap[status] || status }).eq('id', id);
      if (updateError) throw updateError;
      toast.success('Status do agendamento atualizado!');
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      toast.error(`Falha ao atualizar status: ${err?.message || 'Permissão negada ou erro de rede.'}`);
      refreshData();
    }

    if (status === 'CANCELLED') {
       const appt = state.appointments.find(a => a.id === id);
       if (appt) {
         const dateObj = new Date(appt.date);
         fetch('/api/notify-cancel', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             clientName: appt.clientName,
             date: dateObj.toLocaleDateString('pt-BR'),
             time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
           })
         }).catch(console.error);
       }
    }
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
      const { data, error } = await supabase.from('produtos').insert({
        barbearia_id: barbearia.id,
        nome: prod.name,
        preco: prod.price,
        quantidade: prod.quantity
      }).select().single();
      if (error) {
        setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== tempId) }));
      } else if (data) {
        setState(prev => ({ ...prev, products: prev.products.map(p => p.id === tempId ? { ...p, id: data.id } : p) }));
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
      const { error } = await supabase.from('produtos').update(mappedUpdates).eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao atualizar produto:', err);
      toast.error(`Falha ao salvar produto: ${err?.message || 'Permissão negada ou erro de rede.'}`);
      refreshData();
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
      const { data, error } = await supabase.from('transacoes').insert({
        barbearia_id: barbearia.id,
        tipo: t.type === 'INCOME' ? 'ENTRADA' : 'SAIDA',
        valor: t.amount,
        descricao: t.description,
        data: t.date || new Date().toISOString()
      }).select().single();
      if (error) {
        toast.error(`Falha ao registrar transação: ${error.message || 'Permissão negada.'}`);
        setState(prev => ({ ...prev, transactions: prev.transactions.filter(tr => tr.id !== tempId) }));
      } else if (data) {
        setState(prev => ({ ...prev, transactions: prev.transactions.map(tr => tr.id === tempId ? { ...tr, id: data.id } : tr) }));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha ao registrar transação: ${err?.message || 'Permissão negada ou erro de rede.'}`);
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(tr => tr.id !== tempId) }));
    }
  };

  const updateServices = async (services: Service[]) => {
    setState(prev => ({ ...prev, services }));
  };

  const addService = async (service: Omit<Service, 'id'>) => {
    if (!barbearia) return;
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({ ...prev, services: [...prev.services, { ...service, id: tempId }] }));
    try {
      const { data, error } = await supabase.from('servicos').insert({
        barbearia_id: barbearia.id,
        nome: service.name,
        preco: service.price,
        duracao_minutos: service.durationMinutes
      }).select().single();
      if(data) setState(prev => ({ ...prev, services: prev.services.map(s => s.id === tempId ? { ...s, id: data.id } : s) }));
    } catch(e) {}
  };

  const editService = async (id: string, updates: Partial<Service>) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, services: prev.services.map(s => s.id === id ? { ...s, ...updates } : s) }));
    const map: any = {};
    if (updates.name) map.nome = updates.name;
    if (updates.price !== undefined) map.preco = updates.price;
    if (updates.durationMinutes !== undefined) map.duracao_minutos = updates.durationMinutes;
    try { await supabase.from('servicos').update(map).eq('id', id); } catch(e) {}
  };

  const deleteService = async (id: string) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
    try { await supabase.from('servicos').delete().eq('id', id); } catch(e) {}
  };

  const updateClients = async (clients: Client[]) => {
    setState(prev => ({ ...prev, clients }));
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    if (!barbearia) return;
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({ ...prev, clients: [...prev.clients, { ...client, id: tempId }] }));
    try {
      const { data, error } = await supabase.from('clientes').insert({
        barbearia_id: barbearia.id,
        nome: client.name,
        telefone: client.phone
      }).select().single();
      if(data) setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === tempId ? { ...c, id: data.id } : c) }));
    } catch(e) {}
  };

  const editClient = async (id: string, updates: Partial<Client>) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? { ...c, ...updates } : c) }));
    const map: any = {};
    if (updates.name) map.nome = updates.name;
    if (updates.phone) map.telefone = updates.phone;
    try { await supabase.from('clientes').update(map).eq('id', id); } catch(e) {}
  };

  const deleteClient = async (id: string) => {
    if (!barbearia) return;
    setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
    try { await supabase.from('clientes').delete().eq('id', id); } catch(e) {}
  };

  const addBarber = async (barber: Omit<Barber, 'id'>) => {
    if (!barbearia) return;
    const tempId = `temp-${Date.now()}`;
    setState(prev => ({ ...prev, barbers: [...prev.barbers, { ...barber, id: tempId }] }));
    
    try {
      const { data, error } = await supabase.from('barbeiros').insert({
        barbearia_id: barbearia.id,
        nome: barber.name,
        telefone: barber.phone,
        ativo: barber.active,
        comissao: barber.comissao,
        pin: barber.pin,
        acesso: barber.acesso
      }).select().single();
      if (error) throw error;
      if (data) {
        setState(prev => ({ ...prev, barbers: prev.barbers.map(b => b.id === tempId ? { ...b, id: data.id } : b) }));
      }
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, barbers: prev.barbers.filter(b => b.id !== tempId) }));
    }
  };

  const editBarber = async (id: string, updates: Partial<Barber>) => {
    if (!barbearia) return;
    setState(prev => ({
      ...prev,
      barbers: prev.barbers.map(b => b.id === id ? { ...b, ...updates } : b)
    }));

    const mappedData: any = {};
    if (updates.name !== undefined) mappedData.nome = updates.name;
    if (updates.phone !== undefined) mappedData.telefone = updates.phone;
    if (updates.active !== undefined) mappedData.ativo = updates.active;
    if (updates.comissao !== undefined) mappedData.comissao = updates.comissao;
    if (updates.pin !== undefined) mappedData.pin = updates.pin;
    if (updates.acesso !== undefined) mappedData.acesso = updates.acesso;

    try {
      await supabase.from('barbeiros').update(mappedData).eq('id', id);
    } catch(e) { console.error(e); }
  };

  const deleteBarber = async (id: string) => {
    if (!barbearia) return;
    setState(prev => ({
      ...prev,
      barbers: prev.barbers.filter(b => b.id !== id)
    }));
    try {
      await supabase.from('barbeiros').delete().eq('id', id);
    } catch(e) { console.error(e); }
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
        addService,
        editService,
        deleteService,
        updateClients,
        addClient,
        editClient,
        deleteClient,
        addBarber,
        editBarber,
        deleteBarber,
        refreshData,
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
