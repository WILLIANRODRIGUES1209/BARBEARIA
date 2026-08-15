import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useBarbearia } from '../context/BarbeariaContext';
import { ComboTemplate, ComboTemplateItem, ComboCliente, ComboClienteItem, ComboBaixa } from '../types/combos';
import toast from 'react-hot-toast';

export function useCombos() {
  const { barbearia } = useBarbearia();
  const [templates, setTemplates] = useState<ComboTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<ComboTemplateItem[]>([]);
  const [combosClientes, setCombosClientes] = useState<ComboCliente[]>([]);
  const [comboClienteItens, setComboClienteItens] = useState<ComboClienteItem[]>([]);
  const [baixas, setBaixas] = useState<ComboBaixa[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback to local storage if DB fails
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const loadData = async () => {
    if (!barbearia) return;
    setLoading(true);
    try {
      // Tenta buscar da tabela (se existir)
      const { data: tpls, error: errTpls } = await supabase.from('combos_template').select('*').eq('barbearia_id', barbearia.id);
      
      if (errTpls) {
        console.warn('Tabelas de combo não existem no Supabase, usando LocalStorage fallback.', errTpls.message);
        setUseLocalFallback(true);
        loadLocalData();
        setLoading(false);
        return;
      }

      setTemplates(tpls || []);

      const { data: tplItems } = await supabase.from('combo_template_itens').select('*');
      setTemplateItems(tplItems || []);

      const { data: cClientes } = await supabase.from('combos_cliente').select('*').eq('barbearia_id', barbearia.id);
      setCombosClientes(cClientes || []);

      const { data: cItens } = await supabase.from('combo_cliente_itens').select('*');
      setComboClienteItens(cItens || []);

      const { data: bxs } = await supabase.from('combo_baixas').select('*').eq('barbearia_id', barbearia.id);
      setBaixas(bxs || []);

    } catch (e) {
      console.error(e);
      setUseLocalFallback(true);
      loadLocalData();
    }
    setLoading(false);
  };

  const loadLocalData = () => {
    setTemplates(JSON.parse(localStorage.getItem('cb_templates') || '[]'));
    setTemplateItems(JSON.parse(localStorage.getItem('cb_template_itens') || '[]'));
    setCombosClientes(JSON.parse(localStorage.getItem('cb_clientes') || '[]'));
    setComboClienteItens(JSON.parse(localStorage.getItem('cb_cliente_itens') || '[]'));
    setBaixas(JSON.parse(localStorage.getItem('cb_baixas') || '[]'));
  };

  const saveLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  useEffect(() => {
    loadData();
  }, [barbearia]);

  const generateId = () => crypto.randomUUID();

  // --- ACTIONS ---

  const createTemplate = async (template: Omit<ComboTemplate, 'id'>, itens: Omit<ComboTemplateItem, 'id' | 'combo_template_id'>[]) => {
    const newTemplateId = generateId();
    const newTemplate = { ...template, id: newTemplateId, barbearia_id: barbearia?.id };
    const newItens = itens.map(i => ({ ...i, id: generateId(), combo_template_id: newTemplateId }));

    // Optimistic Update Local State
    const updatedTpls = [...templates, newTemplate];
    const updatedItens = [...templateItems, ...newItens];
    setTemplates(updatedTpls as any);
    setTemplateItems(updatedItens as any);

    if (useLocalFallback) {
      saveLocalData('cb_templates', updatedTpls);
      saveLocalData('cb_template_itens', updatedItens);
      toast.success('Template criado localmente!');
      return;
    }

    const { error: tplErr } = await supabase.from('combos_template').insert([newTemplate]);
    if (tplErr) { 
      toast.error('Erro ao criar template'); 
      // Revert optimistic update
      setTemplates(templates);
      setTemplateItems(templateItems);
      return; 
    }

    const { error: itensErr } = await supabase.from('combo_template_itens').insert(newItens);
    if (itensErr) { toast.error('Erro ao salvar itens do template'); return; }

    toast.success('Template criado com sucesso!');
  };

  const assignComboToClient = async (
    comboData: Omit<ComboCliente, 'id' | 'status' | 'data_inicio'>, 
    itens: Omit<ComboClienteItem, 'id' | 'combo_cliente_id' | 'quantidade_usada'>[]
  ) => {
    const newComboId = generateId();
    const newCombo = {
      ...comboData,
      id: newComboId,
      barbearia_id: barbearia?.id,
      status: 'ATIVO',
      data_inicio: new Date().toISOString()
    };

    const newItens = itens.map(i => ({
      ...i,
      id: generateId(),
      combo_cliente_id: newComboId,
      quantidade_usada: 0
    }));

    // Optimistic update
    const updatedCombos = [...combosClientes, newCombo];
    const updatedItens = [...comboClienteItens, ...newItens];
    setCombosClientes(updatedCombos as any);
    setComboClienteItens(updatedItens as any);

    if (useLocalFallback) {
      saveLocalData('cb_clientes', updatedCombos);
      saveLocalData('cb_cliente_itens', updatedItens);
      toast.success('Combo atribuído (modo offline)');
      return;
    }

    const { error: comboErr } = await supabase.from('combos_cliente').insert([newCombo]);
    if (comboErr) { 
      toast.error('Erro ao atribuir combo'); 
      setCombosClientes(combosClientes); // revert
      setComboClienteItens(comboClienteItens);
      return; 
    }

    const { error: itensErr } = await supabase.from('combo_cliente_itens').insert(newItens);
    if (itensErr) { toast.error('Erro ao salvar itens do combo'); return; }

    toast.success('Combo atribuído ao cliente!');
  };

  const registerBaixa = async (comboId: string, itemId: string, valorDescontado: number, observacao: string) => {
    const novaBaixa = {
      id: generateId(),
      barbearia_id: barbearia?.id,
      combo_cliente_id: comboId,
      combo_cliente_item_id: itemId,
      valor_descontado: valorDescontado,
      observacao,
      data_hora: new Date().toISOString()
    };

    // Optimistic Update
    const updatedItens = comboClienteItens.map(i => 
      i.id === itemId ? { ...i, quantidade_usada: i.quantidade_usada + 1 } : i
    );
    setComboClienteItens(updatedItens);
    const updatedBaixas = [...baixas, novaBaixa];
    setBaixas(updatedBaixas as any);

    if (useLocalFallback) {
      saveLocalData('cb_cliente_itens', updatedItens);
      saveLocalData('cb_baixas', updatedBaixas);
      checkComboCompletion(comboId, updatedItens);
      toast.success('Baixa registrada!');
      return;
    }

    const { error: errBaixa } = await supabase.from('combo_baixas').insert([novaBaixa]);
    if (errBaixa) { 
      toast.error('Erro ao registrar baixa'); 
      setComboClienteItens(comboClienteItens); // revert
      setBaixas(baixas);
      return; 
    }

    const { data: itemData } = await supabase.from('combo_cliente_itens').select('quantidade_usada').eq('id', itemId).single();
    
    if (itemData) {
      await supabase.from('combo_cliente_itens').update({ quantidade_usada: itemData.quantidade_usada + 1 }).eq('id', itemId);
    }
    
    checkComboCompletion(comboId, updatedItens); // Check locally
    toast.success('Baixa registrada com sucesso!');
  };

  const checkComboCompletion = async (comboId: string, currentItens: ComboClienteItem[]) => {
    const comboItens = currentItens.filter(i => i.combo_cliente_id === comboId);
    const allUsed = comboItens.every(i => i.quantidade_usada >= i.quantidade_contratada);
    
    if (allUsed) {
      const updatedCombos = combosClientes.map(c => c.id === comboId ? { ...c, status: 'CONCLUIDO' as const } : c);
      setCombosClientes(updatedCombos);

      if (useLocalFallback) {
        saveLocalData('cb_clientes', updatedCombos);
        toast.success('Combo concluído automaticamente!');
        return;
      }

      await supabase.from('combos_cliente').update({ status: 'CONCLUIDO' }).eq('id', comboId);
      toast.success('Combo concluído automaticamente!');
    }
  };

  const updateComboStatus = async (comboId: string, status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO', observacao?: string) => {
    const updated = combosClientes.map(c => c.id === comboId ? { ...c, status, observacoes: observacao || c.observacoes } : c);
    setCombosClientes(updated);

    if (useLocalFallback) {
      saveLocalData('cb_clientes', updated);
      toast.success('Status atualizado!');
      return;
    }

    const updates: any = { status };
    if (observacao) updates.observacoes = observacao;
    
    const { error } = await supabase.from('combos_cliente').update(updates).eq('id', comboId);
    if (error) {
      toast.error('Erro ao atualizar status');
      setCombosClientes(combosClientes); // revert
    } else {
      toast.success('Status atualizado!');
    }
  };

  return {
    templates,
    templateItems,
    combosClientes,
    comboClienteItens,
    baixas,
    loading,
    createTemplate,
    assignComboToClient,
    registerBaixa,
    updateComboStatus
  };
}
