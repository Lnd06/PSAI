import React from 'react';
import { ShieldAlert, ExternalLink, X, Phone } from 'lucide-react';

export interface EmergencyResource {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="relative w-full max-w-md card p-6 animate-slide-up border-l-4 border-zen-danger">
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zen-textMuted hover:bg-zen-surface hover:text-zen-text transition-all">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-zen-dangerSoft text-zen-danger flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-zen-danger">Alerta de Segurança</h2>
            <p className="text-[10px] text-zen-textMuted">Proteção contra ideação de risco ativada</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs text-zen-textSecondary leading-relaxed mb-5 bg-zen-dangerSoft bg-opacity-50 border border-zen-danger border-opacity-10 p-3.5 rounded-2xl">
          {message}
        </p>

        {/* Resources */}
        <div className="space-y-3 mb-5">
          <h3 className="label-zen text-zen-danger">Canais de Ajuda Imediata</h3>
          {resources.map((r, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-white border border-zen-border hover:border-zen-danger hover:border-opacity-30 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zen-text">{r.name}</span>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener noreferrer"
                    className="text-zen-accent hover:text-zen-accentDark transition-colors">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-zen-danger text-[11px] font-bold mb-1">
                <Phone size={10} /> {r.contact}
              </div>
              <p className="text-[10px] text-zen-textMuted leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button onClick={onClose}
          className="w-full py-3 rounded-2xl bg-zen-surface text-zen-textSecondary text-sm font-semibold hover:bg-zen-border transition-all">
          Entendo, obrigado(a)
        </button>

        <p className="text-center text-[9px] text-zen-textMuted mt-3 leading-relaxed">
          Este aplicativo não substitui atendimento profissional de saúde mental.
        </p>
      </div>
    </div>
  );
};
