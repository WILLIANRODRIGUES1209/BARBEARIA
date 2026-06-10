import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, X, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RlsHelpModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCode = `-- EXECUTAR NO SQL EDITOR DO SEU SUPABASE PARA CORRIGIR PERMISSÕES EM TODO O SISTEMA:

-- 1. Desativar RLS para tabelas operacionais (Recomendado para arquiteturas de login por PIN local)
ALTER TABLE transacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE perfis DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que as tabelas aceitem todas as operações locais através de políticas públicas se ainda habilitadas
-- (Executar as linhas abaixo também garante compatibilidade total se preferir manter as restrições):
DROP POLICY IF EXISTS "Transacoes: public" ON transacoes;
CREATE POLICY "Transacoes: public" ON transacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Agendamentos: public" ON agendamentos;
CREATE POLICY "Agendamentos: public" ON agendamentos FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    toast.success('Código SQL copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
      <div className="bg-[#121212] border border-[#222] rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#222] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Ajuste de Permissões RLS</h3>
              <p className="text-[10px] text-[#777] uppercase font-bold mt-0.5">Editor SQL do Supabase necessário</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#555] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description body */}
        <div className="space-y-3.5 text-xs text-[#AAA] overflow-y-auto pr-1 flex-1 py-1">
          <p>
            O erro <span className="text-red-400 font-semibold font-mono">Row-Level Security (RLS)</span> ocorre porque seu Supabase está bloqueando inserções e atualizações.
          </p>
          <p>
            Como os barbeiros efetuam o acesso por <span className="text-white font-bold">PIN/Nº de Acesso</span> (e não por login tradicional da biblioteca Supabase Auth), eles são identificados como usuários anônimos pelo banco de dados.
          </p>
          <p className="text-[#C5A059] font-semibold">
            Para liberar o salvamento de cortes, comissões, agendamentos e transações, basta executar as seguintes linhas de comando SQL no painel de controle do seu Supabase:
          </p>

          {/* SQL Code Box */}
          <div className="relative mt-2 rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A] font-mono text-[10px] text-zinc-300">
            <div className="flex justify-between items-center px-4 py-2 bg-[#161616] border-b border-[#222]">
              <span className="flex items-center gap-1.5 text-[#777] font-sans font-bold uppercase tracking-wider text-[9px]">
                <Terminal size={10} /> comando-Rls.sql
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[9px]"
              >
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto max-h-44 text-[#E2E8F0] whitespace-pre-wrap select-all">
              {sqlCode}
            </pre>
          </div>

          {/* Steps */}
          <div className="bg-[#161616] p-3 rounded-xl border border-[#222] space-y-2">
            <p className="text-[9px] uppercase font-bold text-white tracking-widest">Onde executar no Supabase?</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-[#888]">
              <li>Acesse seu projeto no dashboard do <span className="text-white">Supabase</span>.</li>
              <li>No menu lateral esquerdo, clique em <span className="text-white">SQL Editor</span> (ícone de terminal <span className="font-mono">{`>_`}</span>).</li>
              <li>Clique em <span className="text-white">"New query"</span>, cole o código acima no editor.</li>
              <li>Clique no botão <span className="text-emerald-400 font-bold">"Run"</span> no canto inferior direito. Prontinho!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#222] pt-4 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#C5A059] text-[#0A0A0A] font-black rounded-xl text-xs uppercase tracking-widest hover:bg-[#A88443] transition-all cursor-pointer shadow-[0_0_15px_rgba(197,160,89,0.2)]"
          >
            Entendi, vou executar
          </button>
        </div>

      </div>
    </div>
  );
}
