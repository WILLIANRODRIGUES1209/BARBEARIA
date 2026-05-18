import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail } from 'lucide-react';
import { supabase } from '../../supabase';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Login falhou: ' + error.message);
    } else if (data.session) {
      onLogin(); // Tell App.tsx that we logged in
      navigate('/admin/boas-vindas');
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
        
        <h1 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Acesso Portal Barbearia</h1>
        <p className="text-[#777] text-center mb-8 text-sm">Insira suas credenciais para continuar</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
              required
            />
          </div>
          <div>
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
            <div className="relative">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border ${errorMsg ? 'border-red-500' : 'border-[#333]'} text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm`}
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
            </div>
          </div>
          
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
