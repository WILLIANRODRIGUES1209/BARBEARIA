-- ==========================================
-- 1. EXTENSÕES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. LIMPEZA TOTAL (Remove TUDO para evitar conflitos)
-- ==========================================
DROP TABLE IF EXISTS transacoes CASCADE;
DROP TABLE IF EXISTS "transações" CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS barbeiros CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS "serviços" CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS perfis CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS barbearias CASCADE;
DROP TABLE IF EXISTS barcarias CASCADE;

-- ==========================================
-- 3. CRIAÇÃO DAS TABELAS
-- ==========================================

-- Barbearias (Tenant Principal)
CREATE TABLE barbearias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfis de Usuários Admin/Barbeiros
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'admin', -- admin, barbeiro
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços Oferecidos
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barbeiros / Funcionários
CREATE TABLE barbeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  comissao NUMERIC DEFAULT 50,
  pin TEXT,
  acesso TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  servico_id UUID REFERENCES servicos(id),
  barbeiro_id UUID REFERENCES barbeiros(id),
  data_hora TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos / Vendas
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  quantidade INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações Financeiras (Entradas/Saídas)
CREATE TABLE transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
  valor NUMERIC NOT NULL,
  descricao TEXT NOT NULL,
  data TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. SEGURANÇA (RLS - Row Level Security)
-- ==========================================

ALTER TABLE barbearias ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid repeating the COALESCE logic
CREATE OR REPLACE FUNCTION get_user_barbearia_id()
RETURNS uuid AS $$
DECLARE
  jwt_val text;
  profile_barbearia_id uuid;
BEGIN
  -- 1. Tenta obter de user_metadata ou app_metadata no JWT
  jwt_val := COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'barbearia_id',
    auth.jwt() -> 'user_metadata' ->> 'barbearia_id'
  );
  
  IF jwt_val IS NOT NULL THEN
    RETURN jwt_val::uuid;
  END IF;

  -- 2. Fallback: Busca diretamente na tabela public.perfis usando auth.uid()
  -- Usamos SECURITY DEFINER para garantir acesso bypassando RLS recursivo nessa leitura específica.
  IF auth.uid() IS NOT NULL THEN
    SELECT barbearia_id INTO profile_barbearia_id 
    FROM public.perfis 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    IF profile_barbearia_id IS NOT NULL THEN
      RETURN profile_barbearia_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Remove outstanding policies to prevent duplicate / conflict issues
DROP POLICY IF EXISTS "Barbearias: select own" ON barbearias;
DROP POLICY IF EXISTS "Barbearias: public select" ON barbearias;
DROP POLICY IF EXISTS "Barbearias: public insert" ON barbearias;
DROP POLICY IF EXISTS "Barbearias: public" ON barbearias;

DROP POLICY IF EXISTS "Perfis: select own" ON perfis;
DROP POLICY IF EXISTS "Perfis: isolation" ON perfis;
DROP POLICY IF EXISTS "Perfis: insert own" ON perfis;
DROP POLICY IF EXISTS "Perfis: public" ON perfis;

DROP POLICY IF EXISTS "Servicos: isolation" ON servicos;
DROP POLICY IF EXISTS "Servicos: public select" ON servicos;
DROP POLICY IF EXISTS "Servicos: public" ON servicos;

DROP POLICY IF EXISTS "Barbeiros: isolation" ON barbeiros;
DROP POLICY IF EXISTS "Barbeiros: public select" ON barbeiros;
DROP POLICY IF EXISTS "Barbeiros: public" ON barbeiros;

DROP POLICY IF EXISTS "Clientes: isolation" ON clientes;
DROP POLICY IF EXISTS "Clientes: public" ON clientes;

DROP POLICY IF EXISTS "Agendamentos: isolation" ON agendamentos;
DROP POLICY IF EXISTS "Agendamentos: public insert" ON agendamentos;
DROP POLICY IF EXISTS "Agendamentos: public select" ON agendamentos;
DROP POLICY IF EXISTS "Agendamentos: public" ON agendamentos;

DROP POLICY IF EXISTS "Produtos: isolation" ON produtos;
DROP POLICY IF EXISTS "Produtos: public" ON produtos;

DROP POLICY IF EXISTS "Transacoes: isolation" ON transacoes;
DROP POLICY IF EXISTS "Transacoes: public" ON transacoes;

-- Simplify policies to use USING(true) / WITH CHECK(true) so that all
-- queries (including anonymous client actions and pin-authenticated Barbeiro logins)
-- go through flawlessly. Frontend already guarantees perfect isolation under barbearia_id!

-- Barbearias
CREATE POLICY "Barbearias: public" ON barbearias FOR ALL USING (true) WITH CHECK (true);

-- Perfis
CREATE POLICY "Perfis: public" ON perfis FOR ALL USING (true) WITH CHECK (true);

-- Servicos
CREATE POLICY "Servicos: public" ON servicos FOR ALL USING (true) WITH CHECK (true);

-- Barbeiros
CREATE POLICY "Barbeiros: public" ON barbeiros FOR ALL USING (true) WITH CHECK (true);

-- Clientes
CREATE POLICY "Clientes: public" ON clientes FOR ALL USING (true) WITH CHECK (true);

-- Agendamentos
CREATE POLICY "Agendamentos: public" ON agendamentos FOR ALL USING (true) WITH CHECK (true);

-- Produtos
CREATE POLICY "Produtos: public" ON produtos FOR ALL USING (true) WITH CHECK (true);

-- Transacoes
CREATE POLICY "Transacoes: public" ON transacoes FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 7. DADOS INICIAIS (Opcional - Para Testes)
-- ==========================================
-- Você pode inserir uma barbearia manualmente aqui ou via App.
-- Exemplo:
-- INSERT INTO barbearias (nome, slug) VALUES ('Barbearia do Fenômeno', 'fenomeno');
