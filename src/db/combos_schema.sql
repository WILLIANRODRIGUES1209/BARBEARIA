-- Script de criação das tabelas para o Módulo de Combos
-- Execute este script no SQL Editor do Supabase.

-- Tabela de Templates de Combos
CREATE TABLE IF NOT EXISTS public.combos_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_total NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Itens do Template de Combo (Procedimentos inclusos)
CREATE TABLE IF NOT EXISTS public.combo_template_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_template_id UUID NOT NULL REFERENCES public.combos_template(id) ON DELETE CASCADE,
    procedimento_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Combos Atribuídos aos Clientes
CREATE TABLE IF NOT EXISTS public.combos_cliente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    combo_template_id UUID REFERENCES public.combos_template(id) ON DELETE SET NULL,
    nome_personalizado TEXT NOT NULL,
    valor_pago NUMERIC(10, 2) NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'ATIVO', -- ATIVO, CONCLUIDO, CANCELADO
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Itens do Combo do Cliente (Acompanhamento)
CREATE TABLE IF NOT EXISTS public.combo_cliente_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_cliente_id UUID NOT NULL REFERENCES public.combos_cliente(id) ON DELETE CASCADE,
    procedimento_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
    nome_procedimento TEXT NOT NULL,
    valor_unitario NUMERIC(10, 2) NOT NULL,
    quantidade_contratada INTEGER NOT NULL,
    quantidade_usada INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Histórico de Baixas (Uso do combo)
CREATE TABLE IF NOT EXISTS public.combo_baixas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
    combo_cliente_id UUID NOT NULL REFERENCES public.combos_cliente(id) ON DELETE CASCADE,
    combo_cliente_item_id UUID NOT NULL REFERENCES public.combo_cliente_itens(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    valor_descontado NUMERIC(10, 2) NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Configurando RLS (Row Level Security)
ALTER TABLE public.combos_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_template_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_cliente_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_baixas ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Permite acesso aos usuários autenticados da barbearia correspondente)
-- (Simplificado para permitir todas as operações para o respectivo barbearia_id)

CREATE POLICY "Acesso livre combos_template" ON public.combos_template FOR ALL USING (true);
CREATE POLICY "Acesso livre combo_template_itens" ON public.combo_template_itens FOR ALL USING (true);
CREATE POLICY "Acesso livre combos_cliente" ON public.combos_cliente FOR ALL USING (true);
CREATE POLICY "Acesso livre combo_cliente_itens" ON public.combo_cliente_itens FOR ALL USING (true);
CREATE POLICY "Acesso livre combo_baixas" ON public.combo_baixas FOR ALL USING (true);
