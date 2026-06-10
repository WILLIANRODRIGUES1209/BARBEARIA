import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, X, Terminal, Database, HelpCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RlsHelpModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'SETUP' | 'RLS'>('SETUP');

  if (!isOpen) return null;

  const sqlRlsCode = `-- EXECUTAR NO SQL EDITOR DO SEU SUPABASE PARA CORRIGIR PERMISSÕES EM TODO O SISTEMA:

-- 1. Desativar RLS para tabelas operacionais (Recomendado para arquiteturas de login por PIN local)
ALTER TABLE transacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE perfis DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que as tabelas aceitem todas as operações locais através de políticas públicas se ainda habilitadas
DROP POLICY IF EXISTS "Transacoes: public" ON transacoes;
CREATE POLICY "Transacoes: public" ON transacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Agendamentos: public" ON agendamentos;
CREATE POLICY "Agendamentos: public" ON agendamentos FOR ALL USING (true) WITH CHECK (true);`;

  const sqlSetupCode = `-- PASSO 1: ABRA O ARQUIVO "supabase-schema.sql" NA BARRA LATERAL ESQUERDA DESTE EDITOR
-- PASSO 2: COPIE TODO O CONTEÚDO DELE
-- PASSO 3: COLE NO "SQL EDITOR" DO SEU SUPABASE E CLIQUE EM "RUN" (EXECUTAR)

-- Caso queira criar apenas a tabela inicial de Barbearias rapidamente, execute:
CREATE TABLE IF NOT EXISTS barbearias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Código SQL copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
      <div className="bg-[#121212] border border-[#222] rounded-3xl w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#222] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Assistente de Conexão Supabase</h3>
              <p className="text-[10px] text-[#777] uppercase font-bold mt-0.5">Como sincronizar e liberar seu banco</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#555] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#161616] p-1 rounded-xl mb-4 gap-1">
          <button
            onClick={() => setActiveTab('SETUP')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'SETUP' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#777] hover:text-white hover:bg-zinc-800/50'}`}
          >
            <FileText size={12} /> 1. Criar Tabelas (Banco Novo)
          </button>
          <button
            onClick={() => setActiveTab('RLS')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'RLS' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#777] hover:text-white hover:bg-zinc-800/50'}`}
          >
            <ShieldAlert size={12} /> 2. Ajustar Permissões (RLS)
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-xs text-[#AAA] overflow-y-auto pr-1 flex-1 py-1">
          {activeTab === 'SETUP' ? (
            <>
              <p>
                Se este é um <span className="text-white font-bold">banco de dados novo</span>, você precisa primeiro criar a estrutura de tabelas para que os agendamentos, barbeiros, e transações funcionem.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3.5 rounded-xl text-[#C5A059] space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-[10px]">Atenção: Instrução Importante</p>
                <p className="text-[11px] leading-relaxed">
                  Para criar todas as tabelas corretamente, abra o arquivo <span className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">supabase-schema.sql</span> na raiz deste projeto, copie o conteúdo completo dele, cole no <strong>SQL Editor</strong> do seu painel do Supabase e execute (clique em Run).
                </p>
              </div>

              {/* Mini Helper Code box */}
              <div className="relative mt-2 rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A] font-mono text-[10px] text-zinc-300">
                <div className="flex justify-between items-center px-4 py-2 bg-[#161616] border-b border-[#222]">
                  <span className="flex items-center gap-1.5 text-[#777] font-sans font-bold uppercase tracking-wider text-[9px]">
                    <Terminal size={10} /> instrucoes-schema.sql
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(sqlSetupCode)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[9px]"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied ? 'Copiado!' : 'Como fazer'}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto max-h-32 text-[#E2E8F0] whitespace-pre-wrap select-all">
                  {sqlSetupCode}
                </pre>
              </div>
            </>
          ) : (
            <>
              <p>
                Se você já criou as tabelas, o erro de <span className="text-red-400 font-semibold font-mono">Row-Level Security (RLS)</span> impede que barbeiros efetuem login ou façam alterações no sistema como usuários locais.
              </p>
              <p>
                Copie as instruções abaixo e execute-as da mesma forma no <strong>SQL Editor</strong> do Supabase para destravar todas as operações do seu painel:
              </p>

              {/* SQL RLS Code Box */}
              <div className="relative mt-2 rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A] font-mono text-[10px] text-zinc-300">
                <div className="flex justify-between items-center px-4 py-2 bg-[#161616] border-b border-[#222]">
                  <span className="flex items-center gap-1.5 text-[#777] font-sans font-bold uppercase tracking-wider text-[9px]">
                    <Terminal size={10} /> desativar-rls.sql
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(sqlRlsCode)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[9px]"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied ? 'Copiar SQL' : 'Copiar'}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto max-h-44 text-[#E2E8F0] whitespace-pre-wrap select-all">
                  {sqlRlsCode}
                </pre>
              </div>
            </>
          )}

          {/* Core Tutorial Steps */}
          <div className="bg-[#161616] p-3 rounded-xl border border-[#222] space-y-2">
            <p className="text-[9px] uppercase font-bold text-white tracking-widest">Passo a Passo de Execução:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-[#888]">
              <li>Abra a ferramenta <span className="text-white">Supabase Console</span> e acesse seu projeto.</li>
              <li>No menu lateral esquerdo, busque por <span className="text-white">SQL Editor</span> (ícone <span className="font-mono">{`>_`}</span>).</li>
              <li>Clique em <span className="text-white">"New Query"</span> (Nova Consulta) no topo.</li>
              <li>Cole o código SQL correspondente selecionado acima no editor de texto.</li>
              <li>Clique no botão verde <span className="text-emerald-400 font-bold">"Run"</span> (ou aperte Ctrl+Enter/Btn Executar) no canto inferior direito.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#222] pt-4 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#C5A059] text-[#0A0A0A] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#A88443] transition-all cursor-pointer shadow-[0_0_15px_rgba(197,160,89,0.2)]"
          >
            Entendi, vou aplicar no Supabase
          </button>
        </div>

      </div>
    </div>
  );
}
