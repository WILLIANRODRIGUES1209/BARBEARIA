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
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
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
  refreshData: (forceAll?: boolean) => Promise<void>;
  clearTestData: () => Promise<void>;
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

const getInitialState = (): AppState => {
  let cachedBarbeariaId = '';
  try {
    const stored = localStorage.getItem('app_barbearia');
    if (stored) {
      cachedBarbeariaId = JSON.parse(stored).id;
    }
  } catch (e) {}

  const bId = cachedBarbeariaId;
  return {
    services: getStoredData(bId ? `barbearia_services_${bId}` : 'barbearia_services', DEFAULT_SERVICES),
    clients: getStoredData(bId ? `barbearia_clients_${bId}` : 'barbearia_clients', []),
    barbers: getStoredData(bId ? `barbearia_barbers_${bId}` : 'barbearia_barbers', []),
    appointments: getStoredData(bId ? `barbearia_appointments_${bId}` : 'barbearia_appointments', []),
    products: getStoredData(bId ? `barbearia_products_${bId}` : 'barbearia_products', []),
    transactions: [],
    isConnected: false,
  };
};

const INITIAL_STATE: AppState = getInitialState();

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

const mapBarber = (b: any) => {
  let phone = b.telefone || '';
  let mediaUrl = '';
  let mediaType: 'image' | 'video' = 'image';
  let photoUrl = '';
  let videoUrl = '';

  if (phone.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(phone);
      phone = parsed.phone || '';
      mediaUrl = parsed.mediaUrl || '';
      mediaType = parsed.mediaType || 'image';
      photoUrl = parsed.photoUrl || '';
      videoUrl = parsed.videoUrl || '';
    } catch (e) {
      // Not JSON JSON format, ignore error
    }
  }

  return {
    id: b.id,
    name: b.nome,
    phone: phone,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    photoUrl: photoUrl,
    videoUrl: videoUrl,
    active: b.ativo,
    comissao: b.comissao,
    pin: b.pin,
    acesso: b.acesso
  };
};

const mapClient = (c: any) => ({
  id: c.id,
  name: c.nome,
  phone: c.telefone
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const { barbearia, user } = useBarbearia();

  const refreshData = async (forceAll = false) => {
    if (!barbearia) return;
    const start = performance.now();
    try {
      const isAdminPage = window.location.pathname.startsWith('/admin') || window.location.pathname.includes('admin') || window.location.pathname.includes('login');
      const isInitialFetch = state.barbers.length === 0 || state.services.length === 0;
      const shouldLoadCatalogAndConfig = forceAll || isInitialFetch;

      const fetchList: { key: string; promise: any }[] = [];

      // 1. agendamentos (Always loaded but heavily optimized with tight filters for clients)
      let agendamentosQuery = supabase.from('agendamentos').select('*').eq('barbearia_id', barbearia.id);
      if (!isAdminPage) {
        // Safe yesterday timestamp in PT-BR timezone minus buffer
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        agendamentosQuery = agendamentosQuery.or(`data_hora.gte.${yesterday},cliente_nome.eq.CLIENTE_FIXO,cliente_nome.eq.AGENDA_BLOQUEADA`);
      }
      fetchList.push({ key: 'agendamentos', promise: agendamentosQuery });

      // 2. transacoes (Admin only - completely skipped on client booking to avoid downloading historical financials)
      if (isAdminPage) {
        fetchList.push({ key: 'transacoes', promise: supabase.from('transacoes').select('*').eq('barbearia_id', barbearia.id) });
      }

      // 3. servicos and barbeiros (Initial or forceAll load)
      if (shouldLoadCatalogAndConfig) {
        fetchList.push({ key: 'servicos', promise: supabase.from('servicos').select('*').eq('barbearia_id', barbearia.id) });
        fetchList.push({ key: 'barbeiros', promise: supabase.from('barbeiros').select('*').eq('barbearia_id', barbearia.id) });

        // 4. produtos and clientes (Admin only catalog loading)
        if (isAdminPage) {
          fetchList.push({ key: 'produtos', promise: supabase.from('produtos').select('*').eq('barbearia_id', barbearia.id) });
          fetchList.push({ key: 'clientes', promise: supabase.from('clientes').select('*').eq('barbearia_id', barbearia.id) });
        }
      }

      const results = await Promise.all(fetchList.map(item => item.promise));
      
      const obj: Record<string, any[]> = {};
      fetchList.forEach((item, idx) => {
        obj[item.key] = results[idx]?.data || [];
      });

      setState(prev => {
        const nextState = { ...prev, isConnected: true };

        if (obj.agendamentos !== undefined) {
          const mappedAppoints = obj.agendamentos.map(mapAppointment);
          nextState.appointments = mappedAppoints;
          try {
            localStorage.setItem(`barbearia_appointments_${barbearia.id}`, JSON.stringify(mappedAppoints));
          } catch (e) {}
        }
        if (obj.transacoes !== undefined) {
          nextState.transactions = obj.transacoes.map(mapTransaction);
        }
        if (obj.services !== undefined || obj.servicos !== undefined) {
          const servs = obj.servicos || obj.services || [];
          const mappedServs = servs.map(mapService);
          nextState.services = mappedServs;
          try {
            localStorage.setItem(`barbearia_services_${barbearia.id}`, JSON.stringify(mappedServs));
          } catch (e) {}
        }
        if (obj.barbeiros !== undefined) {
          const mappedBarbs = obj.barbeiros.filter((b: any) => b.nome !== '__SYSTEM_CONFIG__').map(mapBarber);
          nextState.barbers = mappedBarbs;
          try {
            localStorage.setItem(`barbearia_barbers_${barbearia.id}`, JSON.stringify(mappedBarbs));
          } catch (e) {}
        }
        if (obj.produtos !== undefined) {
          const mappedProds = obj.produtos.map(mapProduct);
          nextState.products = mappedProds;
          try {
            localStorage.setItem(`barbearia_products_${barbearia.id}`, JSON.stringify(mappedProds));
          } catch (e) {}
        }
        if (obj.clientes !== undefined) {
          const mappedClients = obj.clientes.map(mapClient);
          nextState.clients = mappedClients;
          try {
            localStorage.setItem(`barbearia_clients_${barbearia.id}`, JSON.stringify(mappedClients));
          } catch (e) {}
        }

        return nextState;
      });

      const end = performance.now();
      console.log(`[Supabase Load] Completed in ${(end - start).toFixed(1)}ms. Path: ${window.location.pathname}`);
    } catch (err) {
      const end = performance.now();
      console.error(`[Supabase Load] Error after ${(end - start).toFixed(1)}ms:`, err);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  };

  useEffect(() => {
    if (!barbearia) return;

    // Initial load - load everything
    refreshData(true);

    // Auto-refresh when tab gains focus or visibility state changes (only dynamic data)
    const handleFocusOrVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibilityChange);
    document.addEventListener('visibilitychange', handleFocusOrVisibilityChange);

    // High fidelity backup timer (every 15 seconds, only dynamic data)
    const backupInterval = setInterval(() => {
      refreshData(false);
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

    const showNativeNotification = (title: string, body: string) => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const options = {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: false
      };

      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, options);
          }).catch(() => {
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      } catch (err) {
        console.warn('Native notification error:', err);
        try {
          new Notification(title, options);
        } catch (_) {}
      }
    };

    const channelAgendamentos = supabase.channel(`realtime-agendamentos-${barbearia.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_id=eq.${barbearia.id}` }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
             setState(prev => {
                // Prevent duplicate additions if optimistic update already added it temporarily
                if (prev.appointments.some(a => a.id === payload.new.id)) {
                   return prev;
                }
                
                const tempIndex = prev.appointments.findIndex(a => 
                   a.clientName === payload.new.cliente_nome && 
                   a.date === payload.new.data_hora && 
                   a.serviceId === payload.new.servico_id && 
                   typeof a.id === 'string' && 
                   a.id.startsWith('temp-')
                );

                if (tempIndex !== -1) {
                   const newList = [...prev.appointments];
                   newList[tempIndex] = mapAppointment(payload.new);
                   return { ...prev, appointments: newList };
                }
                return { ...prev, appointments: [...prev.appointments, mapAppointment(payload.new)] };
             });

             if (window.location.pathname.startsWith('/admin')) {
               toast.success(`Novo agendamento: ${payload.new.cliente_nome}!`, {
                 duration: 6000,
                 icon: '🚀'
               });
               playBeep();
               setState(prev => {
                 const sObj = prev.services.find(s => s.id === payload.new.servico_id);
                 const sName = sObj ? sObj.name : 'Serviço';
                 showNativeNotification(`🚀 Novo Agendamento!`, `Cliente: ${payload.new.cliente_nome}\nServiço: ${sName}`);
                 return prev;
               });
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
               setState(prev => {
                 const sObj = prev.services.find(s => s.id === payload.new.servico_id);
                 const sName = sObj ? sObj.name : 'Serviço';
                 showNativeNotification(`❌ Agendamento Cancelado`, `Cliente: ${payload.new.cliente_nome}\nServiço: ${sName}`);
                 return prev;
               });
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
               if (prev.products.some(p => p.id === payload.new.id)) {
                  return prev;
               }
               const tempIndex = prev.products.findIndex(p => 
                  p.name === payload.new.nome && 
                  typeof p.id === 'string' && 
                  p.id.startsWith('temp-')
               );
               if (tempIndex !== -1) {
                  const newList = [...prev.products];
                  newList[tempIndex] = mapProduct(payload.new);
                  return { ...prev, products: newList };
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
               if (prev.transactions.some(t => t.id === payload.new.id)) {
                  return prev;
               }
               const tempIndex = prev.transactions.findIndex(t => 
                  t.description === payload.new.descricao && 
                  t.amount === Number(payload.new.valor) &&
                  typeof t.id === 'string' && 
                  t.id.startsWith('temp-')
               );
               if (tempIndex !== -1) {
                  const newList = [...prev.transactions];
                  newList[tempIndex] = mapTransaction(payload.new);
                  return { ...prev, transactions: newList };
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
               if (prev.services.some(s => s.id === payload.new.id)) {
                  return prev;
               }
               const tempIndex = prev.services.findIndex(s => 
                  s.name === payload.new.nome && 
                  typeof s.id === 'string' && 
                  s.id.startsWith('temp-')
               );
               if (tempIndex !== -1) {
                  const newList = [...prev.services];
                  newList[tempIndex] = mapService(payload.new);
                  return { ...prev, services: newList };
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
         if (payload.new && payload.new.nome === '__SYSTEM_CONFIG__') {
            return; // Ignore system config updates
         }
         if (payload.eventType === 'INSERT') {
            setState(prev => {
               if (prev.barbers.some(b => b.id === payload.new.id)) {
                  return prev;
               }
               const tempIndex = prev.barbers.findIndex(b => 
                  b.name === payload.new.nome && 
                  typeof b.id === 'string' && 
                  b.id.startsWith('temp-')
               );
               if (tempIndex !== -1) {
                  const newList = [...prev.barbers];
                  newList[tempIndex] = mapBarber(payload.new);
                  return { ...prev, barbers: newList };
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
               if (prev.clients.some(c => c.id === payload.new.id)) {
                  return prev;
               }
               const tempIndex = prev.clients.findIndex(c => 
                  c.name === payload.new.nome && 
                  typeof c.id === 'string' && 
                  c.id.startsWith('temp-')
               );
               if (tempIndex !== -1) {
                  const newList = [...prev.clients];
                  newList[tempIndex] = mapClient(payload.new);
                  return { ...prev, clients: newList };
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

    // Prevent duplicate bookings on future schedules
    if (initialStatus === 'PENDING') {
      const localDuplicate = state.appointments.some(a => 
        a.barberId === appt.barberId &&
        a.clientName === appt.clientName &&
        a.date === appt.date &&
        a.serviceId === appt.serviceId &&
        a.status !== 'CANCELLED'
      );
      if (localDuplicate) {
        console.warn("Agendamento duplicado detectado localmente.");
        toast.error("Este agendamento já está registrado localmente.");
        return;
      }

      try {
        const { data: dbDuplicates, error: dbCheckErr } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('barbearia_id', barbearia.id)
          .eq('cliente_nome', appt.clientName)
          .eq('barbeiro_id', appt.barberId)
          .eq('data_hora', appt.date)
          .neq('status', 'CANCELADO');

        if (!dbCheckErr && dbDuplicates && dbDuplicates.length > 0) {
          console.warn("Agendamento duplicado detectado no banco.");
          toast.error("Este agendamento já está cadastrado no sistema.");
          return;
        }
      } catch (checkErr) {
        console.error("Erro verificando agendamentos duplicados:", checkErr);
      }
    }
    
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
    
    const appt = state.appointments.find(a => a.id === id);
    if (!appt) {
      toast.error('Agendamento não encontrado!');
      return;
    }

    if (appt.status === 'COMPLETED') {
      console.warn(`Agendamento ${id} já possui status COMPLETED.`);
      return;
    }

    // Direct Database pre-existence check against duplicate records
    try {
      const { data: existingTx, error: checkError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('barbearia_id', barbearia.id)
        .like('descricao', `%(Ref: ${id})%`);

      if (checkError) {
        console.error("Erro ao verificar transações duplicadas:", checkError);
      } else if (existingTx && existingTx.length > 0) {
        console.warn(`Tentativa de recebimento duplicado para agendamento ${id} bloqueada.`);
        toast.error('Este agendamento já possui recebimento registrado.');
        
        // Ensure local status aligns with DB just in case
        setState(prev => ({
          ...prev,
          appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'COMPLETED' as const } : a)
        }));
        return;
      }
    } catch (e) {
      console.error("Erro no pre-check de transações:", e);
    }
    
    // Calculate Commission
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
        description: `Serviço recebido via ${paymentMethod}: ${description} (Ref: ${id})`,
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
        descricao: `Serviço recebido via ${paymentMethod}: ${description} (Ref: ${id})`,
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

    // Optimistic update - collision-proof unique tempId
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!barbearia) return;

    // Check if we are updating an INCOME amount, to conjunctively update the EXPENSE/commission
    const target = state.transactions.find(t => t.id === id);
    const updatesList: { id: string; updates: Partial<Transaction> }[] = [{ id, updates }];

    if (target && target.type === 'INCOME' && updates.amount !== undefined && target.amount > 0) {
      // Find matching commission transaction to update as well
      const targetTime = new Date(target.date).getTime();
      const matchingCommission = state.transactions.find(other => {
        if (other.type !== 'EXPENSE') return false;
        
        // Is it a commission?
        const isCommission = other.description.toLowerCase().includes('comissão') || other.description.toLowerCase().includes('comissao');
        if (!isCommission) return false;

        // Proximity in time: within 10 seconds
        const otherTime = new Date(other.date).getTime();
        const timeDiff = Math.abs(targetTime - otherTime);
        if (timeDiff > 10000) return false;

        return true;
      });

      if (matchingCommission) {
        const ratio = matchingCommission.amount / target.amount;
        const newCommissionAmount = updates.amount * ratio;
        updatesList.push({
          id: matchingCommission.id,
          updates: { amount: newCommissionAmount }
        });
      }
    }
    
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => {
        const up = updatesList.find(x => x.id === t.id);
        return up ? { ...t, ...up.updates } : t;
      })
    }));

    try {
      for (const item of updatesList) {
        const mappedUpdates: any = {};
        if (item.updates.amount !== undefined) mappedUpdates.valor = item.updates.amount;
        if (item.updates.description !== undefined) mappedUpdates.descricao = item.updates.description;
        if (item.updates.type !== undefined) mappedUpdates.tipo = item.updates.type === 'INCOME' ? 'ENTRADA' : 'SAIDA';
        if (item.updates.date !== undefined) mappedUpdates.data = item.updates.date;

        const { error } = await supabase
          .from('transacoes')
          .update(mappedUpdates)
          .eq('id', item.id);

        if (error) throw error;
      }
      toast.success('Transação atualizada com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar transação.');
      await refreshData();
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!barbearia) return;

    const target = state.transactions.find(t => t.id === id);
    const idsToDelete = [id];

    if (target && target.type === 'INCOME') {
      // Find matching commission transaction to delete as well
      const targetTime = new Date(target.date).getTime();
      const matchingCommission = state.transactions.find(other => {
        if (other.type !== 'EXPENSE') return false;
        
        // Is it a commission?
        const isCommission = other.description.toLowerCase().includes('comissão') || other.description.toLowerCase().includes('comissao');
        if (!isCommission) return false;

        // Proximity in time: within 10 seconds
        const otherTime = new Date(other.date).getTime();
        const timeDiff = Math.abs(targetTime - otherTime);
        if (timeDiff > 10000) return false;

        return true;
      });

      if (matchingCommission) {
        idsToDelete.push(matchingCommission.id);
      }
    }

    // Identify linked appointments to process
    let appointmentIdToRevert: string | null = null;
    let appointmentsToDelete: string[] = [];

    if (target && target.type === 'INCOME') {
      // 1. Check for single appointment referenced from Agenda
      const refMatch = target.description.match(/\(Ref:\s*([^\)]+)\)/i);
      if (refMatch && refMatch[1]) {
        appointmentIdToRevert = refMatch[1];
      }

      // 2. Check for PDV sale
      if (target.description.includes('Venda PDV')) {
        const targetTime = new Date(target.date).getTime();
        const matchingAppts = state.appointments.filter(appt => {
          if (appt.status !== 'COMPLETED') return false;
          const apptTime = new Date(appt.date).getTime();
          return Math.abs(apptTime - targetTime) <= 5000;
        });
        appointmentsToDelete = matchingAppts.map(appt => appt.id);
      }
    }

    setState(prev => {
      let updatedAppointments = prev.appointments;
      if (appointmentIdToRevert) {
        updatedAppointments = updatedAppointments.map(a => 
          a.id === appointmentIdToRevert ? { ...a, status: 'PENDING' as const } : a
        );
      }
      if (appointmentsToDelete.length > 0) {
        updatedAppointments = updatedAppointments.filter(a => !appointmentsToDelete.includes(a.id));
      }

      return {
        ...prev,
        transactions: prev.transactions.filter(t => !idsToDelete.includes(t.id)),
        appointments: updatedAppointments
      };
    });

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .in('id', idsToDelete);

      if (error) {
        toast.error(`Falha ao excluir transação: ${error.message}`);
        await refreshData();
      } else {
        // Revert schedule status in DB if relevant
        if (appointmentIdToRevert && !appointmentIdToRevert.startsWith('temp-')) {
          const { error: apptError } = await supabase
            .from('agendamentos')
            .update({ status: 'PENDENTE' })
            .eq('id', appointmentIdToRevert);
          if (apptError) {
            console.error('Erro ao reverter agendamento:', apptError);
          }
        }

        // Delete PDV-created appointments from DB if relevant
        const dbApptsToDelete = appointmentsToDelete.filter(id => !id.startsWith('temp-'));
        if (dbApptsToDelete.length > 0) {
          const { error: apptsDelError } = await supabase
            .from('agendamentos')
            .delete()
            .in('id', dbApptsToDelete);
          if (apptsDelError) {
            console.error('Erro ao excluir histórico do PDV:', apptsDelError);
          }
        }

        toast.success(idsToDelete.length > 1 
          ? 'Transação, comissões e histórico de cortes correspondentes excluídos/estornados com sucesso!' 
          : 'Transação excluída e estornada com sucesso!'
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao excluir transação.');
      await refreshData();
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
      const phoneString = JSON.stringify({
        phone: barber.phone || '',
        mediaUrl: barber.mediaUrl || '',
        mediaType: barber.mediaType || 'image',
        photoUrl: barber.photoUrl || '',
        videoUrl: barber.videoUrl || ''
      });

      const { data, error } = await supabase.from('barbeiros').insert({
        barbearia_id: barbearia.id,
        nome: barber.name,
        telefone: phoneString,
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

    const currentBarberInState = state.barbers.find(b => b.id === id);

    const mappedData: any = {};
    if (updates.name !== undefined) mappedData.nome = updates.name;
    if (updates.active !== undefined) mappedData.ativo = updates.active;
    if (updates.comissao !== undefined) mappedData.comissao = updates.comissao;
    if (updates.pin !== undefined) mappedData.pin = updates.pin;
    if (updates.acesso !== undefined) mappedData.acesso = updates.acesso;

    if (updates.phone !== undefined || updates.mediaUrl !== undefined || updates.mediaType !== undefined || updates.photoUrl !== undefined || updates.videoUrl !== undefined) {
      const phoneVal = updates.phone !== undefined ? updates.phone : (currentBarberInState?.phone || '');
      const mediaUrlVal = updates.mediaUrl !== undefined ? updates.mediaUrl : (currentBarberInState?.mediaUrl || '');
      const mediaTypeVal = updates.mediaType !== undefined ? updates.mediaType : (currentBarberInState?.mediaType || 'image');
      const photoUrlVal = updates.photoUrl !== undefined ? updates.photoUrl : (currentBarberInState?.photoUrl || '');
      const videoUrlVal = updates.videoUrl !== undefined ? updates.videoUrl : (currentBarberInState?.videoUrl || '');

      mappedData.telefone = JSON.stringify({
        phone: phoneVal,
        mediaUrl: mediaUrlVal,
        mediaType: mediaTypeVal,
        photoUrl: photoUrlVal,
        videoUrl: videoUrlVal
      });
    }

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

  const clearTestData = async () => {
    if (!barbearia) return;
    try {
      const { error: apptError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('barbearia_id', barbearia.id);
        
      const { error: txError } = await supabase
        .from('transacoes')
        .delete()
        .eq('barbearia_id', barbearia.id);

      if (apptError) throw apptError;
      if (txError) throw txError;

      setState(prev => ({
        ...prev,
        appointments: [],
        transactions: []
      }));
      toast.success('Todos os agendamentos e recebimentos de teste foram zerados com sucesso!');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao zerar dados: ' + (e.message || e));
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
        updateTransaction,
        deleteTransaction,
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
        clearTestData,
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
