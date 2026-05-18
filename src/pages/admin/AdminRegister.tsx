import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserPlus, Mail, Building, User } from 'lucide-react';
import { supabase } from '../../supabase';

export default function AdminRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [barbeariaName, setBarbeariaName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Gerar slug básico
      let slug = barbeariaName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      // Verificar se o slug já existe antes de tentar inserir (evita erro 409 feio)
      const { data: existingBarb } = await supabase
        .from('barbearias')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingBarb) {
        // Se existir, adiciona um sufixo aleatório simples
        slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
      }

      // 2. Criar a Barbearia
      const { data: barbearia, error: barbError } = await supabase
        .from('barbearias')
        .insert({ nome: barbeariaName, slug })
        .select()
        .single();

      if (barbError) throw barbError;

      // 2. Criar o Usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            barbearia_id: barbearia.id,
          }
        }
      });

      if (authError) throw authError;

      // 3. Criar o Perfil (Dependendo se você tem um trigger no banco, isso pode ser automático, mas vamos garantir)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('perfis')
          .insert({
            id: authData.user.id,
            barbearia_id: barbearia.id,
            full_name: fullName,
            role: 'admin'
          });
        
        // Se houver erro no perfil (ex: trigger já criou), podemos ignorar ou tratar
        if (profileError && !profileError.message.includes('unique constraint')) {
           console.warn('Profile creation warning:', profileError);
        }
      }

      setSuccessMsg('Conta criada com sucesso! Verifique seu e-mail se necessário.');
      setTimeout(() => navigate('/admin/login'), 3000);

    } catch (err: any) {
      if (err.message?.includes('rate limit')) {
        setErrorMsg('Limite de tentativas excedido. Por favor, aguarde alguns minutos ou use outro e-mail.');
      } else {
        setErrorMsg(err.message || 'Erro ao cadastrar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#121212] p-8 rounded-3xl w-full max-w-md border border-[#222] shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center border border-[#333]">
            <UserPlus className="text-[#C5A059]" size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Criar Nova Barbearia</h1>
        <p className="text-[#777] text-center mb-8 text-sm">Preencha os dados abaixo para começar</p>

        {successMsg ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-500 text-sm text-center mb-6">
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
              <input
                type="text"
                placeholder="Nome da Barbearia"
                value={barbeariaName}
                onChange={(e) => setBarbeariaName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                required
              />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
              <input
                type="text"
                placeholder="Seu Nome Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" size={20} />
              <input
                type="email"
                placeholder="E-mail de Acesso"
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
                placeholder="Crie uma Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                required
                minLength={6}
              />
            </div>
            
            {errorMsg && (
               <p className="text-red-500 text-xs mt-2 text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-[#C5A059] text-[#0A0A0A] rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#A38245] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Cadastrar Barbeiria'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-[#222] pt-6">
          <p className="text-[#555] text-xs mb-4">Já tem uma conta?</p>
          <button 
            onClick={() => navigate('/admin/login')}
            className="text-[#C5A059] hover:text-white transition-colors text-xs uppercase tracking-widest font-bold"
          >
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
}
