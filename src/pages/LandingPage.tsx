import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, ShieldCheck, TrendingUp, Gem, Check, ArrowRight, Facebook, Instagram, Twitter } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-[#E5B869] selection:text-black">
      
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[90vh] flex flex-col overflow-hidden">
        {/* Background Image with Dark Overlays */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 grayscale mix-blend-luminosity"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1920&q=80")' }}
        ></div>
        {/* Film grain / noise overlay */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        {/* Gradient mask to focus right side */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/90"></div>

        {/* Top Navbar */}
        <style>
          {`
            @keyframes barberpole {
              from { background-position: 0 0; }
              to { background-position: 113.13px 0; }
            }
            @keyframes barberpole-vertical {
              from { background-position: 0 0; }
              to { background-position: 0 113.13px; }
            }
            .text-barber-pole {
              background-image: repeating-linear-gradient(
                -45deg,
                #DC2626 0,
                #DC2626 20px,
                #FFFFFF 20px,
                #FFFFFF 40px,
                #1E3A8A 40px,
                #1E3A8A 60px,
                #FFFFFF 60px,
                #FFFFFF 80px
              );
              background-size: 113.13px 113.13px;
              color: transparent;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: barberpole 2.5s linear infinite;
              display: inline-block;
            }
            .bg-barber-pole {
              background-image: repeating-linear-gradient(
                -45deg,
                #DC2626 0,
                #DC2626 20px,
                #FFFFFF 20px,
                #FFFFFF 40px,
                #1E3A8A 40px,
                #1E3A8A 60px,
                #FFFFFF 60px,
                #FFFFFF 80px
              );
              background-size: 113.13px 113.13px;
              animation: barberpole-vertical 2.5s linear infinite;
            }
          `}
        </style>

        <header className="relative z-50 py-6 px-8 md:px-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-black text-lg tracking-[0.2em] uppercase drop-shadow-md">
            {/* Mustache Icon approximation using an SVG or Lucide Icon */}
            <svg width="28" height="14" viewBox="0 0 24 12" className="text-white" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 0C3.5 0 1 2 0 4C1.5 2.5 3.5 2 5.5 2.5C7.5 3 8 4.5 9.5 5C11 5.5 12 3.5 12 3.5C12 3.5 13 5.5 14.5 5C16 4.5 16.5 3 18.5 2.5C20.5 2 22.5 2.5 24 4C23 2 20.5 0 17.5 0C15 0 13.5 2 12 2C10.5 2 9 0 6.5 0Z"/>
            </svg>
            <span className="text-white">GESTÃO</span>
            <span className="text-barber-pole -ml-1 pr-1 pb-1">PRO</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] text-[#AAA] uppercase">
            <button onClick={() => window.scrollTo({ top: document.getElementById('planos')?.offsetTop, behavior: 'smooth' })} className="hover:text-[#E5B869] transition-colors">Planos</button>
            <button className="hover:text-[#E5B869] transition-colors">Sobre</button>
            <button className="hover:text-[#E5B869] transition-colors">Contato</button>
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-[#E5B869] hover:text-white transition-colors ml-4 border border-[#E5B869]/30 px-6 py-2"
            >
              Fazer Login
            </button>
          </nav>
        </header>

        {/* Main Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-8 md:px-16 pb-20">
          
          {/* Social Links (Left Sidebar) */}
          <div className="hidden md:flex flex-col justify-end pb-20">
            <div className="border border-[#E5B869] p-4 flex flex-col gap-6 w-14 items-center mb-8 relative">
              <div className="absolute -bottom-16 w-[1px] h-16 bg-[#E5B869]"></div>
              <a href="#" className="text-[#E5B869] hover:text-white transition-colors transform hover:scale-110"><Facebook size={18} /></a>
              <a href="#" className="text-[#E5B869] hover:text-white transition-colors transform hover:scale-110"><Instagram size={18} /></a>
              <a href="#" className="text-[#E5B869] hover:text-white transition-colors transform hover:scale-110"><Twitter size={18} /></a>
            </div>
          </div>

          {/* Center Space for Image focus */}
          <div className="flex-1"></div>

          {/* Typography Content (Right Side) */}
          <div className="flex flex-col justify-center items-center md:items-end text-center md:text-right mt-20 md:mt-0 pt-[10vh] max-w-3xl">
            <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-cinzel text-[#E5B869] drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] mb-2 pr-4 leading-none relative group cursor-default">
              <span className="relative inline-block pr-6 md:pr-10 italic">
                Gestão
                {/* Vintage Barber Pole Hanging from the 'o' */}
                <div className="absolute top-[60%] right-0 md:-right-2 z-20 w-4 h-20 md:w-5 md:h-28 flex flex-col items-center">
                  {/* The Chain / Hook */}
                  <div className="w-1.5 h-6 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] -mb-1 z-10 relative">
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 border-[3px] border-gray-400 rounded-full"></div>
                  </div>
                  
                  {/* Top Silver Cap (Dome) */}
                  <div className="w-8 md:w-10 h-5 md:h-6 bg-gradient-to-b from-gray-100 via-gray-300 to-gray-500 rounded-t-full shadow-md z-10 border border-gray-400 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-[50%] h-full transform skew-x-12 translate-x-1/2"></div>
                  </div>
                  
                  {/* Glass Tube containing the spinning pole */}
                  <div className="w-6 md:w-8 h-full bg-white relative overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.6)] border-x border-white/40 flex-1 z-0">
                     <div className="absolute inset-0 bg-barber-pole opacity-90"></div>
                     {/* Glass Reflection */}
                     <div className="absolute top-0 bottom-0 left-[15%] w-[10%] bg-white/50 z-10"></div>
                     <div className="absolute top-0 bottom-0 right-[15%] w-[5%] bg-black/20 z-10"></div>
                  </div>
                  
                  {/* Bottom Silver Cap (Bowl) */}
                  <div className="w-8 md:w-10 h-5 md:h-6 bg-gradient-to-t from-gray-500 via-gray-300 to-gray-100 rounded-b-full shadow-md z-10 border border-gray-400 flex justify-center items-end pb-1 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-[50%] h-full transform -skew-x-12 translate-x-1/2"></div>
                     <div className="w-1.5 h-3 bg-gray-400 rounded-b-sm border-x border-gray-500 z-20"></div>
                  </div>
                </div>
              </span>
              <br />
              <span className="inline-block mt-2 ml-16 md:ml-24 italic no-underline">
                Pro
              </span>
            </h1>
            
            <h2 className="text-sm md:text-base font-bold tracking-[0.3em] text-white uppercase mt-8 mb-8" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              A Revolução na sua Barbearia
            </h2>
            
            <button 
              onClick={() => window.scrollTo({ top: document.getElementById('planos')?.offsetTop, behavior: 'smooth' })}
              className="border-2 border-[#E5B869] text-[#E5B869] font-bold uppercase tracking-[0.2em] text-sm py-4 px-10 hover:bg-[#E5B869] hover:text-black transition-all duration-300"
            >
              Ver Planos de Assinatura
            </button>

            {/* Circular Stamp / Badge */}
            <div className="mt-16 md:mt-24 relative w-32 h-32 flex items-center justify-center opacity-80 self-center md:self-end md:mr-10">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-[spin_20s_linear_infinite]">
                <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                <text className="text-[12px] font-bold uppercase tracking-[0.1em]" fill="#E5B869">
                  <textPath href="#circlePath" startOffset="0%">
                    • Organize • Controle • Fature • Evolua 
                  </textPath>
                </text>
              </svg>
              <ShieldCheck className="text-[#E5B869]" size={24} />
            </div>
          </div>
          
          {/* Decorative Corner Element Right */}
          <div className="hidden md:block absolute bottom-8 right-8 border-b border-r border-[#E5B869] w-24 h-24"></div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-24 bg-[#0a0a0a] border-t-2 border-[#111] relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 relative">
            <h2 className="text-3xl md:text-5xl font-serif text-[#E5B869] mb-4 tracking-wider uppercase">Nossos Planos</h2>
            <div className="h-1 w-24 bg-[#E5B869] mx-auto mb-6"></div>
            <p className="text-[#888] font-mono text-sm tracking-widest uppercase">Transparência total. Sem taxas ocultas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Plano 1 */}
            <div className="bg-[#121212] p-10 border border-[#222] relative group hover:border-[#E5B869]/50 transition-colors flex flex-col">
              <div className="mb-8 flex-1">
                <h3 className="text-2xl font-serif text-[#F9F6EE] mb-2 uppercase tracking-wide">Navalha Inicial</h3>
                <div className="h-px w-full bg-gradient-to-r from-[#222] via-[#444] to-[#222] my-6"></div>
                <p className="text-[#999] text-sm h-16 italic font-serif">"Pare de usar caderno. Organize sua barbearia no celular."</p>
                <div className="my-8 flex items-end gap-2">
                  <span className="text-4xl font-serif text-[#E5B869]">R$ 49,99</span>
                  <span className="text-[#666] text-sm mb-1 uppercase tracking-widest font-bold">/mês</span>
                </div>
                <ul className="space-y-4 font-mono text-xs tracking-wider uppercase">
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Agenda digital</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Cadastro de clientes</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Controle básico</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/admin/register')}
                className="w-full py-4 border border-[#333] text-white uppercase tracking-[0.2em] text-xs hover:border-[#E5B869] hover:text-[#E5B869] transition-all mt-auto font-bold"
              >
                Assinar
              </button>
            </div>

            {/* Plano 2 */}
            <div className="bg-[#1a1a1a] p-10 border-2 border-[#E5B869] relative transform md:-translate-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#E5B869] text-black font-black uppercase tracking-[0.2em] text-[10px] px-6 py-2 shadow-lg">
                Mais Vendido
              </div>
              <div className="mb-8 flex-1 mt-4">
                <h3 className="text-2xl font-serif text-white mb-2 uppercase tracking-wide">Profissional</h3>
                <div className="h-px w-full bg-gradient-to-r from-[#E5B869]/20 via-[#E5B869]/50 to-[#E5B869]/20 my-6"></div>
                <p className="text-[#DDD] text-sm h-16 italic font-serif">"Saiba exatamente quanto você ganha por dia, por serviço e por cliente."</p>
                <div className="my-8 flex items-end gap-2">
                  <span className="text-5xl font-serif text-[#E5B869]">R$ 89,99</span>
                  <span className="text-[#888] text-sm mb-2 uppercase tracking-widest font-bold">/mês</span>
                </div>
                <ul className="space-y-4 font-mono text-xs tracking-wider uppercase">
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-white">Tudo do Navalha Inicial</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Dashboard Financeiro</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Gorjetas e Vales</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Gestão de Estoque</span></li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-[#E5B869] shrink-0" /><span className="text-[#CCC]">Relatórios Extras</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/admin/register')}
                className="w-full py-4 bg-[#E5B869] text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-colors mt-auto"
              >
                Assinar Profissional
              </button>
            </div>

            {/* Plano 3 */}
            <div className="bg-[#121212] p-10 border border-[#222] relative group hover:border-[#E5B869]/50 transition-colors flex flex-col">
              <div className="mb-8 flex-1">
                <h3 className="text-2xl font-serif text-[#F9F6EE] mb-2 uppercase tracking-wide">Barbearia Elite</h3>
                <div className="h-px w-full bg-gradient-to-r from-[#222] via-[#444] to-[#222] my-6"></div>
                <p className="text-[#999] text-sm h-16 italic font-serif">"Transforme clientes casuais em fiéis e aumente seu faturamento."</p>
                <div className="my-8 flex items-end gap-2">
                  <span className="text-4xl font-serif text-[#E5B869]">R$ 129,99</span>
                  <span className="text-[#666] text-sm mb-1 uppercase tracking-widest font-bold">/mês</span>
                </div>
                <ul className="space-y-4 font-mono text-xs tracking-wider uppercase">
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#E5B869] shrink-0 mt-0.5" /><span className="text-white font-bold">Fidelidade Automática</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#E5B869] shrink-0 mt-0.5" /><span className="text-[#CCC]">Cálculo de Comissões</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#E5B869] shrink-0 mt-0.5" /><span className="text-[#CCC]">Clubes de Assinatura</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#E5B869] shrink-0 mt-0.5" /><span className="text-[#CCC]">Marketing WhatsApp</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#E5B869] shrink-0 mt-0.5" /><span className="text-[#CCC]">Múltiplos Barbeiros</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/admin/register')}
                className="w-full py-4 border border-[#333] text-white uppercase tracking-[0.2em] text-xs hover:border-[#E5B869] hover:text-[#E5B869] transition-all mt-auto font-bold"
              >
                Assinar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-[#050505] border-t border-[#111]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 text-white font-mono text-sm tracking-widest uppercase mb-6">
             <ShieldCheck className="text-[#DC2626]" size={20} />
             <span className="text-barber-pole font-black tracking-widest pr-1">Plataforma Segura</span>
          </div>
          <p className="text-[#555] font-serif italic text-xs tracking-widest uppercase">© {new Date().getFullYear()} Gestão Pro. Estilo Autêntico.</p>
        </div>
      </footer>
    </div>
  );
}

