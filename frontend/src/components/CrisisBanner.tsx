import React from 'react';
import { ShieldAlert, Phone, ExternalLink, X } from 'lucide-react';

interface EmergencyResource {
  name: string;
  contact: string;
  description: string;
  link?: string;
}

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: EmergencyResource[];
  message: string;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose, resources, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-85 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-red-950 bg-brand-card p-6 shadow-2xl md:p-8 animate-in fade-in zoom-in duration-300">
        
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-900 rounded-full opacity-[0.08] blur-3xl pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-950/50 border border-red-900/40 text-red-400">
            <ShieldAlert size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-serif font-semibold text-red-500 tracking-tight">Apoio e Canais de Ajuda</h2>
            <p className="text-xs text-brand-textMuted mt-1 font-sans">Sua segurança e bem-estar são a nossa maior prioridade.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-500 hover:bg-brand-cardLight hover:text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message body */}
        <div className="bg-red-950/20 border border-red-950/45 rounded-2xl p-4 mb-6 text-xs text-red-200 leading-relaxed font-sans">
          {message || 'Nossa inteligência artificial identificou termos que podem indicar momentos de crise ou sofrimento severo. Lembramos que o PSAI é apenas um assistente de reflexão e não substitui ajuda médica ou psicológica profissional.'}
        </div>

        <h3 className="text-[10px] font-bold text-brand-textMuted uppercase tracking-widest mb-3 font-sans">Canais Oficiais Disponíveis:</h3>
        
        {/* Resource listing */}
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {resources.map((res, idx) => (
            <div 
              key={idx}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all"
            >
              <div className="flex-1 text-left">
                <h4 className="font-serif font-semibold text-slate-200 text-base">{res.name}</h4>
                <p className="text-xs text-brand-textMuted mt-1 font-sans leading-relaxed">{res.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {res.contact.includes('188') || res.contact.includes('192') ? (
                  <a 
                    href={`tel:${res.contact.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md font-sans"
                  >
                    <Phone size={14} />
                    {res.contact}
                  </a>
                ) : (
                  <span className="text-brand-gold font-semibold text-xs bg-brand-gold/[0.06] border border-brand-gold/[0.15] px-3 py-1.5 rounded-xl font-sans">
                    {res.contact}
                  </span>
                )}
                
                {res.link && (
                  <a 
                    href={res.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-white/[0.06] text-neutral-400 hover:bg-brand-cardLight hover:text-white transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-white/[0.06] text-neutral-400 hover:bg-brand-cardLight hover:text-slate-200 font-medium transition-all text-sm font-sans"
          >
            Fechar aviso
          </button>
          <a
            href="https://www.cvv.org.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-center font-semibold transition-all shadow-lg text-sm font-sans"
          >
            Falar com CVV Online
          </a>
        </div>
      </div>
    </div>
  );
};
