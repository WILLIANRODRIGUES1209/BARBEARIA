import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Scissors, LayoutDashboard, Calendar as CalendarIcon, Package, DollarSign, User, Users, Settings, LogOut, BarChart3, ShoppingCart } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { BarbeariaProvider, useBarbearia } from './context/BarbeariaContext';
import { supabase } from './supabase';

// Pages
import ClientBooking from './pages/client/ClientBooking';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAgenda from './pages/admin/AdminAgenda';
import AdminEstoque from './pages/admin/AdminEstoque';
import AdminFinanceiro from './pages/admin/AdminFinanceiro';
import AdminConfig from './pages/admin/AdminConfig';
import AdminLogin from './pages/admin/AdminLogin';
import AdminRegister from './pages/admin/AdminRegister';
import AdminClientes from './pages/admin/AdminClientes';
import AdminBarbeiros from './pages/admin/AdminBarbeiros';
import AdminMeuHistorico from './pages/admin/AdminMeuHistorico';
import AdminRelatorios from './pages/admin/AdminRelatorios';
import AdminPDV from './pages/admin/AdminPDV';
import LandingPage from './pages/LandingPage';
import WelcomeDashboard from './pages/admin/WelcomeDashboard';
import InstallPrompt from './components/InstallPrompt';
import NotificationPrompt from './components/NotificationPrompt';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { loadConfig } from './utils/configHelper';

const AdminLayout = ({ children, onLogout, authState }: { children: React.ReactNode, onLogout: () => void, authState: any }) => {
  const location = useLocation();
  const { state } = useAppContext();
  const { barbearia } = useBarbearia();
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (barbearia?.id) {
      loadConfig(barbearia.id)
        .then(data => {
          if (data && data.logoUrl) {
            setLogoUrl(data.logoUrl);
          }
        })
        .catch(err => console.error("Error loading logo in App layout:", err));
    }
  }, [barbearia?.id]);

  const allNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, adminOnly: true },
    { name: 'Agenda', path: '/admin/agenda', icon: CalendarIcon, adminOnly: false },
    { name: 'PDV / Caixa', path: '/admin/pdv', icon: ShoppingCart, adminOnly: false },
    { name: 'Clientes', path: '/admin/clientes', icon: Users, adminOnly: false },
    { name: 'Meu Histórico', path: '/admin/meu-historico', icon: DollarSign, barbeiroOnly: true },
    { name: 'Barbeiros', path: '/admin/barbeiros', icon: Scissors, adminOnly: true },
    { name: 'Estoque', path: '/admin/estoque', icon: Package, adminOnly: true },
    { name: 'Financeiro', path: '/admin/financeiro', icon: DollarSign, adminOnly: true },
    { name: 'Relatórios', path: '/admin/relatorios', icon: BarChart3, adminOnly: true },
    { name: 'Configurações', path: '/admin/configuracoes', icon: Settings, adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => {
    if (authState.role === 'ADMIN') return !item.barbeiroOnly;
    return !item.adminOnly;
  });

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden">
      <aside className="w-64 bg-[#0F0F0F] border-r border-[#222] flex flex-col hidden sm:flex">
        <div className="p-8">
          <div className="text-xl font-bold tracking-tighter text-[#C5A059] flex items-center gap-2">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-[#121212] border border-[#222]" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 shrink-0 bg-[#C5A059] rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-[#0A0A0A]"></div>
              </div>
            )}
            <span className="truncate">{barbearia?.nome || 'Carregando...'}</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#555] mt-2">PROFISSIONALIZE SUA BARBEARIA</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-[#1A1A1A] text-[#C5A059] border border-[#C5A05933] font-medium' 
                    : 'text-[#777] border border-transparent hover:bg-[#151515] hover:text-[#E0E0E0]'
                }`}
              >
                {isActive ? <div className="w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_8px_#C5A059]"></div> : <Icon size={20} />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-[#222] space-y-2">
          <button onClick={onLogout} className="w-full py-3 bg-transparent border border-[#222] text-[#FF3D00] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#FF3D0011] hover:border-[#FF3D0033] transition-all flex items-center justify-center gap-2">
            <LogOut size={16} /> Sair
          </button>
          <Link 
            to={barbearia ? `/agendar/${barbearia.slug}` : "/"} 
            className="w-full py-3 bg-transparent border border-[#C5A059] text-[#C5A059] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#C5A05911] transition-all flex items-center justify-center gap-2"
          >
            Visão do Cliente
          </Link>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0C0C0C]/95 backdrop-blur-md border-t border-[#222] z-50 flex overflow-x-auto hide-scrollbar px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center justify-center min-w-[72px] p-2 rounded-xl transition-colors ${
                isActive ? 'text-[#C5A059] bg-[#1A1A1A] border border-[#C5A05922]' : 'text-[#777] border border-transparent'
              }`}
            >
              <Icon size={18} className="mb-1" />
              <span className="text-[9px] font-medium tracking-wide truncate max-w-full">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden sm:flex h-20 border-b border-[#222] items-center justify-between px-10 bg-[#0C0C0C]">
          <div>
            <h2 className="text-xl font-semibold">Dashboard Admin</h2>
            <p className="text-xs text-[#555]">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
              <span className="text-[10px] text-[#777] uppercase tracking-wider">{state.isConnected ? 'Banco de Dados Online' : 'Banco de Dados Offline'}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{authState.role === 'ADMIN' ? 'Administrador' : 'Barbeiro'}</p>
              <p className="text-[10px] text-[#C5A059] uppercase">Status: Online</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#C5A059] to-[#8E6D31] p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center font-bold text-xs text-[#C5A059]">{authState.role === 'ADMIN' ? 'AD' : 'BB'}</div>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sm:hidden bg-[#0C0C0C] border-b border-[#222] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#C5A059] text-base font-bold max-w-[80%]">
             {logoUrl ? (
               <img 
                 src={logoUrl} 
                 alt="Logo" 
                 className="w-5 h-5 rounded object-contain bg-[#121212] border border-[#222]" 
                 referrerPolicy="no-referrer"
               />
             ) : (
               <div className="w-5 h-5 shrink-0 bg-[#C5A059] rounded flex items-center justify-center">
                  <div className="w-2.5 h-2.5 border-2 border-[#0A0A0A]"></div>
               </div>
             )}
             <span className="truncate">{barbearia?.nome || 'Carregando...'}</span>
          </div>
          <button onClick={onLogout} className="p-2 text-[#FF3D00] hover:bg-[#FF3D0022] rounded-full transition-colors flex shrink-0">
            <LogOut size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-10 pb-24 sm:pb-10 content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState<{ isAuthenticated: boolean; role: 'ADMIN' | 'BARBEIRO'; barbeiroId: string | null }>(() => {
    const authData = sessionStorage.getItem('app_auth_state');
    if (authData) {
      try {
        return JSON.parse(authData);
      } catch (e) {}
    }
    return { isAuthenticated: false, role: 'ADMIN', barbeiroId: null };
  });

  // Log out or change login state
  const handleLogin = (role: 'ADMIN' | 'BARBEIRO', barbeiroId: string | null = null) => {
    const newState = { isAuthenticated: true, role, barbeiroId };
    setAuthState(newState);
    sessionStorage.setItem('app_auth_state', JSON.stringify(newState));
  };

  const handleLogout = async () => {
    setAuthState({ isAuthenticated: false, role: 'ADMIN', barbeiroId: null });
    sessionStorage.removeItem('app_auth_state');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut warning:', e);
    }
  };

  const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) => {
    if (!authState.isAuthenticated) {
      return <Navigate to="/admin/login" replace />;
    }
    if (requireAdmin && authState.role !== 'ADMIN') {
      return <Navigate to="/admin/agenda" replace />;
    }
    return <AdminLayout onLogout={handleLogout} authState={authState}>{children}</AdminLayout>;
  };

  return (
    <BarbeariaProvider>
      <AppProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1A1A1A',
                color: '#FFF',
                border: '1px solid #333',
                borderRadius: '12px',
                fontSize: '13px',
              }
            }}
          >
            {(t) => (
              <div 
                onClick={() => toast.dismiss(t.id)}
                className="cursor-pointer active:scale-95 transition-all select-none"
              >
                <ToastBar toast={t} />
              </div>
            )}
          </Toaster>
          <InstallPrompt />
          <NotificationPrompt />
          <Routes>
            {/* Client Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/agendar/:slug" element={<ClientBooking />} />
            <Route path="/agendar" element={<ClientBooking />} />
            
            {/* Admin Login */}
            <Route path="/admin/login" element={
              authState.isAuthenticated ? <Navigate to={authState.role === 'ADMIN' ? "/admin" : "/admin/agenda"} replace /> : <AdminLogin onLogin={handleLogin} />
            } />
            <Route path="/admin/register" element={<AdminRegister />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/boas-vindas" element={<ProtectedRoute requireAdmin><WelcomeDashboard /></ProtectedRoute>} />
            <Route path="/admin/pdv" element={<ProtectedRoute><AdminPDV /></ProtectedRoute>} />
            <Route path="/admin/agenda" element={<ProtectedRoute><AdminAgenda /></ProtectedRoute>} />
            <Route path="/admin/clientes" element={<ProtectedRoute><AdminClientes /></ProtectedRoute>} />
            <Route path="/admin/meu-historico" element={<ProtectedRoute><AdminMeuHistorico /></ProtectedRoute>} />
            <Route path="/admin/barbeiros" element={<ProtectedRoute requireAdmin><AdminBarbeiros /></ProtectedRoute>} />
            <Route path="/admin/estoque" element={<ProtectedRoute requireAdmin><AdminEstoque /></ProtectedRoute>} />
            <Route path="/admin/financeiro" element={<ProtectedRoute requireAdmin><AdminFinanceiro /></ProtectedRoute>} />
            <Route path="/admin/relatorios" element={<ProtectedRoute requireAdmin><AdminRelatorios /></ProtectedRoute>} />
            <Route path="/admin/configuracoes" element={<ProtectedRoute requireAdmin><AdminConfig /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </BarbeariaProvider>
  );
}
