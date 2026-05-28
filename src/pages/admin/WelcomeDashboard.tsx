import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, ArrowRight, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useBarbearia } from '../../context/BarbeariaContext';

export default function WelcomeDashboard() {
  const { barbearia } = useBarbearia();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Fallback to "sua-barbearia" if context hasn't loaded yet, though ideally it should be loaded.
  const barbeariaSlug = barbearia?.slug || 'sua-barbearia';
  const bookingLink = `${window.location.origin}/${barbeariaSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#C5A059] to-[#8E6D31] rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(197,160,89,0.2)]">
            <CheckCircle2 className="text-[#0A0A0A]" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Bem-vindo(a) ao Gestão Pro!</h1>
          <p className="text-[#888]">Sua conta foi configurada e sua barbearia já está online.</p>
        </div>

        {/* Card de Link Direto */}
        <div className="bg-[#121212] border border-[#222] rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
          {/* subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] opacity-[0.02] rounded-full blur-[60px] pointer-events-none"></div>

          <h2 className="text-sm font-bold uppercase tracking-widest text-[#555] mb-4">Seu Link de Agendamento</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[#0A0A0A] border border-[#333] rounded-xl flex items-center px-4 py-4 overflow-hidden group hover:border-[#555] transition-colors relative">
              <LinkIcon className="text-[#777] shrink-0 mr-3" size={18} />
              <span className="text-white text-sm truncate font-mono select-all">
                {bookingLink}
              </span>
            </div>
            <button 
              onClick={handleCopyLink}
              className={`shrink-0 h-full sm:h-auto px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                copied 
                  ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-500' 
                  : 'bg-[#222] text-[#E0E0E0] hover:bg-[#333] border border-[#333]'
              }`}
            >
              <Copy size={16} /> 
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          
          <p className="text-[#666] text-xs mt-4 text-center sm:text-left">
            Dica: Coloque este link na bio do seu Instagram e envie no WhatsApp dos seus clientes.
          </p>
        </div>

        {/* Main Action */}
        <button 
          onClick={() => navigate('/admin')}
          className="w-full py-5 bg-gradient-to-r from-[#C5A059] to-[#8E6D31] text-[#0A0A0A] rounded-xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-opacity shadow-[0_10px_30px_rgba(197,160,89,0.2)] flex items-center justify-center gap-2"
        >
          Entrar no Sistema de Gestão
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
