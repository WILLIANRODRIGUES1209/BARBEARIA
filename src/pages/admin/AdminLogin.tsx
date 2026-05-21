import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail, Building, KeyRound, Scissors } from 'lucide-react';
import { supabase } from '../../supabase';
import { useBarbearia } from '../../context/BarbeariaContext';

export default function AdminLogin({ onLogin }: { onLogin: (role: 'ADMIN' | 'BARBEIRO', barbeiroId: string | null) => void }) {
  const [loginType, setLoginType] = useState<'ADMIN' | 'BARBEIRO'>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acesso, setAcesso] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchBySlug } = useBarbearia();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    if (loginType === 'ADMIN') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        setErrorMsg('Login falhou: ' + error.message);
      } else if (data.session) {
        onLogin('ADMIN', null);
        navigate('/admin/boas-vindas');
      }
    } else {
      // Login Barbeiro
      try {
        const { data: barb, error: barbError } = await supabase.from('barbeiros')
          .select('id, nome, barbearia_id')
          .eq('acesso', acesso)
          .eq('pin', pin)
          .single();

        if (barbError || !barb) {
          throw new Error('Nº de Acesso ou PIN incorretos.');
        }

        const { data: bData, error: bError } = await supabase.from('barbearias').select('slug').eq('id', barb.barbearia_id).single();
        if (bError || !bData) {
          throw new Error('Erro ao carregar os dados da barbearia vinculada.');
        }

        // We fetch the barbearia to populate context
        await fetchBySlug(bData.slug);

        setLoading(false);
        onLogin('BARBEIRO', barb.id);
        navigate('/admin/agenda'); // Barbeiros go direct to agenda
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(err.message || 'Erro ao fazer login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#121212] p-8 rounded-3xl w-full max-w-md border border-[#222] shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center border border-[#333]">
            <Lock className="text-[#C5A059]" size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-6 tracking-tight">Acesso Sistema</h1>
        
        <div className="flex bg-[#1A1A1A] p-1 rounded-xl mb-8">
          <button
            onClick={() => setLoginType('ADMIN')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${loginType === 'ADMIN' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#777] hover:text-white'}`}
          >
            Dono (Admin)
          </button>
          <button
            onClick={() => setLoginType('BARBEIRO')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${loginType === 'BARBEIRO' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#777] hover:text-white'}`}
          >
            Barbeiro
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginType === 'ADMIN' ? (
            <>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
                <input
                  type="email"
                  placeholder="Seu E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
                <input
                  type="password"
                  placeholder="Sua Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border ${errorMsg ? 'border-red-500' : 'border-[#333]'} text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm`}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
                <input
                  type="text"
                  placeholder="Seu Nº de Acesso"
                  value={acesso}
                  onChange={(e) => setAcesso(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                  required
                />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
                <input
                  type="password"
                  placeholder="PIN de Acesso"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border ${errorMsg ? 'border-red-500' : 'border-[#333]'} text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm`}
                  required
                />
              </div>
            </>
          )}
          
          {errorMsg && (
             <p className="text-red-500 text-xs mt-2 text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-[#C5A059] text-[#0A0A0A] rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#A38245] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={18} /> {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#222] pt-6 flex flex-col gap-4">
          <button 
            onClick={() => navigate('/planos')}
            className="text-[#C5A059] hover:text-white transition-colors text-xs uppercase tracking-widest font-bold"
          >
            Ver Planos de Assinatura
          </button>
          <button 
            onClick={() => navigate('/admin/register')}
            className="text-[#555] hover:text-white transition-colors text-xs uppercase tracking-widest font-bold"
          >
            Cadastrar Minha Barbearia
          </button>
        </div>
      </div>
    </div>
  );
}
