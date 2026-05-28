import { useCallback } from 'react';
import { supabase } from '../supabase';
import { useBarbearia } from '../context/BarbeariaContext';

export const useSupabaseWithTenant = () => {
  const { barbearia } = useBarbearia();

  // Para chamadas que precisam do tenant inserido automaticamente
  const insertComTenant = useCallback(async (table: string, data: any) => {
    if (!barbearia) throw new Error("Usuário não possui uma barbearia associada.");
    
    const payload = Array.isArray(data) 
      ? data.map(item => ({ ...item, barbearia_id: barbearia.id }))
      : { ...data, barbearia_id: barbearia.id };

    return await supabase.from(table).insert(payload).select();
  }, [barbearia]);

  const updateComTenant = useCallback(async (table: string, id: string, data: any) => {
    if (!barbearia) throw new Error("Usuário não possui uma barbearia associada.");

    // O Update geralmente só precisa do barbearia_id no WHERE (que o RLS resolve),
    // mas também podemos adicionar no payload por precaução.
    return await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('barbearia_id', barbearia.id)
      .select();
  }, [barbearia]);
  
  const selectComTenant = useCallback((table: string) => {
    // Para selects simples. O próprio RLS garante o isolamento.
    return supabase.from(table).select();
  }, []);

  return {
    insertComTenant,
    updateComTenant,
    selectComTenant,
    supabase // Exporta o cliente base também, se necessário
  };
};
