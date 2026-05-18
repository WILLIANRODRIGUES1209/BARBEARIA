import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

interface BarbeariaState {
  id: string;
  nome: string;
  slug: string;
}

interface BarbeariaContextType {
  user: User | null;
  barbearia: BarbeariaState | null;
  loading: boolean;
  logout: () => Promise<void>;
  fetchBySlug: (slug: string) => Promise<void>;
}

const BarbeariaContext = createContext<BarbeariaContextType | undefined>(undefined);

export const BarbeariaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [barbearia, setBarbearia] = useState<BarbeariaState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBySlug = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('id, nome, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (data) {
        setBarbearia(data);
      }
    } catch (err) {
      console.error('Erro ao buscar barbearia por slug:', err);
    }
  };

  useEffect(() => {
    // Carregar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBarbeariaData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBarbeariaData(session.user);
      } else {
        setBarbearia(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchBarbeariaData = async (currentUser: User) => {
    try {
      // Tenta pegar o barbearia_id do app_metadata (se definido por trigger), ou do user_metadata (se definido no registro), ou buscando na tabela perfis.
      let barbeariaId = currentUser.app_metadata?.barbearia_id || currentUser.user_metadata?.barbearia_id;
      
      if (!barbeariaId) {
        // Fallback: buscar na tabela perfis
        const { data: perfil } = await supabase
          .from('perfis')
          .select('barbearia_id')
          .eq('id', currentUser.id)
          .single();
        if (perfil) {
          barbeariaId = perfil.barbearia_id;
        }
      }

      if (barbeariaId) {
        const { data, error } = await supabase
          .from('barbearias')
          .select('id, nome, slug')
          .eq('id', barbeariaId)
          .maybeSingle();

        if (error) {
          console.warn('Erro ao buscar dados da barbearia (verifique RLS):', error);
        } else if (data) {
          setBarbearia(data);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados da barbearia:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <BarbeariaContext.Provider value={{ user, barbearia, loading, logout, fetchBySlug }}>
      {children}
    </BarbeariaContext.Provider>
  );
};

export const useBarbearia = () => {
  const context = useContext(BarbeariaContext);
  if (context === undefined) {
    throw new Error('useBarbearia must be used within a BarbeariaProvider');
  }
  return context;
};
