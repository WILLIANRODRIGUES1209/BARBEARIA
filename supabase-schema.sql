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

-- Ajuda: As políticas abaixo usam 'app_metadata' e 'user_metadata' para pegar o barbearia_id

-- Helper function to avoid repeating the COALESCE logic
CREATE OR REPLACE FUNCTION get_user_barbearia_id()
RETURNS uuid AS $$
DECLARE
  jwt_val text;
  profile_barbearia_id uuid;
BEGIN
  -- 1. Tenta obter de 'app_metadata' no JWT
  jwt_val := auth.jwt() -> 'app_metadata' ->> 'barbearia_id';
  IF jwt_val IS NOT NULL THEN
    RETURN jwt_val::uuid;
  END IF;

  -- 2. Tenta obter de 'user_metadata' no JWT
  jwt_val := auth.jwt() -> 'user_metadata' ->> 'barbearia_id';
  IF jwt_val IS NOT NULL THEN
    RETURN jwt_val::uuid;
  END IF;

  -- 3. Fallback: Busca diretamente na tabela public.perfis usando auth.uid()
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Barbearias
CREATE POLICY "Barbearias: select own" ON barbearias FOR SELECT USING (id = get_user_barbearia_id());
CREATE POLICY "Barbearias: public select" ON barbearias FOR SELECT USING (true); -- Para os clientes verem a barbearia antes de agendar
CREATE POLICY "Barbearias: public insert" ON barbearias FOR INSERT WITH CHECK (true); -- Para permitir cadastro inicial

-- Perfis
CREATE POLICY "Perfis: select own" ON perfis FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Perfis: isolation" ON perfis FOR ALL USING (barbearia_id = get_user_barbearia_id());
CREATE POLICY "Perfis: insert own" ON perfis FOR INSERT WITH CHECK (auth.uid() = id);

-- Servicos
CREATE POLICY "Servicos: isolation" ON servicos FOR ALL USING (barbearia_id = get_user_barbearia_id());
CREATE POLICY "Servicos: public select" ON servicos FOR SELECT USING (true);

-- Barbeiros
CREATE POLICY "Barbeiros: isolation" ON barbeiros FOR ALL USING (barbearia_id = get_user_barbearia_id());
CREATE POLICY "Barbeiros: public select" ON barbeiros FOR SELECT USING (ativo = true);

-- Clientes
CREATE POLICY "Clientes: isolation" ON clientes FOR ALL USING (barbearia_id = get_user_barbearia_id());

-- Agendamentos
CREATE POLICY "Agendamentos: isolation" ON agendamentos FOR ALL USING (barbearia_id = get_user_barbearia_id());
CREATE POLICY "Agendamentos: public insert" ON agendamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Agendamentos: public select" ON agendamentos FOR SELECT USING (true);

-- Produtos
CREATE POLICY "Produtos: isolation" ON produtos FOR ALL USING (barbearia_id = get_user_barbearia_id());

-- Transacoes
CREATE POLICY "Transacoes: isolation" ON transacoes FOR ALL USING (barbearia_id = get_user_barbearia_id());

-- ==========================================
-- 7. DADOS INICIAIS (Opcional - Para Testes)
-- ==========================================
-- Você pode inserir uma barbearia manualmente aqui ou via App.
-- Exemplo:
-- INSERT INTO barbearias (nome, slug) VALUES ('Barbearia do Fenômeno', 'fenomeno');
