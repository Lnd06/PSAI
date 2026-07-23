import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ChevronLeft, 
  Loader2, 
  Save, 
  User, 
  Mail, 
  Phone, 
  FileText
} from 'lucide-react';
import { PSAILogo } from './PSAILogo';

interface ProfileProps {
  token: string;
  user: { 
    name: string; 
    email: string; 
    cpf?: string | null; 
    telefone?: string | null;
    subscriptionPlan?: string | null;
    subscriptionStatus?: string | null;
  } | null;
  onLogout: () => void;
  onUserUpdate: (newUser: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ token, user, onUserUpdate, onLogout }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedMode, setSelectedMode] = useState('natural');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCpf(user.cpf || '');
      setTelefone(user.telefone || '');
    }
    const savedMode = localStorage.getItem('psai_default_mode') || 'natural';
    setSelectedMode(savedMode);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save credentials in backend
      const response = await axios.put(
        'http://localhost:5000/api/auth/profile',
        {
          name: name.trim(),
          cpf: cpf.trim() || null,
          telefone: telefone.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save therapy mode preference locally
      localStorage.setItem('psai_default_mode', selectedMode);

      onUserUpdate(response.data.user);
      setSuccess('Configurações do perfil atualizadas com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Erro ao salvar configurações no servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pb-16 px-4 md:px-8 max-w-3xl mx-auto bg-brand-bg text-brand-text relative select-none"
    >
      
      {/* Background Blurs */}
      <div className="absolute top-[10%] left-[15%] w-80 h-80 bg-brand-gold rounded-full opacity-[0.015] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] w-80 h-80 bg-brand-textMuted rounded-full opacity-[0.01] blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <header className="flex items-center gap-3 py-8 border-b border-brand-border mb-8 relative z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold hover:border-brand-gold/30 transition-all cursor-pointer"
          title="Voltar ao Painel"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-3 text-left">
          <PSAILogo size={32} />
          <div>
            <span className="text-brand-gold font-bold text-[9px] uppercase tracking-wider font-sans block">Configurações Gerais</span>
            <h1 className="text-xl font-serif font-semibold text-brand-text">Ajustes do Assistente</h1>
          </div>
        </div>
      </header>

      {/* ALERTS */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs leading-relaxed font-sans text-left relative z-10 flex items-start gap-2">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-700 text-xs leading-relaxed font-sans text-left relative z-10 flex items-start gap-2">
          <span>{success}</span>
        </div>
      )}

      {/* FORM CONFIG */}
      <form onSubmit={handleSave} className="space-y-6 text-left relative z-10 font-sans">
        
        <div className="p-6 md:p-8 rounded-3xl border border-brand-border bg-brand-card space-y-8">
          
          {/* Section 1: Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-2">
              <User size={16} className="text-brand-gold" />
              <h3 className="text-sm font-semibold text-brand-text">Informações de Perfil</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Seu Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-brand-border bg-brand-bg text-xs text-brand-text focus:outline-none focus:border-brand-gold/60 font-sans"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Endereço de E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-brand-border bg-brand-bg/50 text-xs text-brand-textMuted/70 font-sans cursor-not-allowed"
                  />
                  <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contato & Faturamento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-2">
              <FileText size={16} className="text-brand-gold" />
              <h3 className="text-sm font-semibold text-brand-text">Contato & Faturamento</h3>
            </div>
            <p className="text-[10px] text-brand-textMuted/80 leading-relaxed font-sans">
              Dados necessários para faturamento e vinculação de sua assinatura com a Asaas de forma segura.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">CPF</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-brand-border bg-brand-bg text-xs text-brand-text focus:outline-none focus:border-brand-gold/60 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Celular / WhatsApp</label>
                <div className="relative">
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-brand-border bg-brand-bg text-xs text-brand-text focus:outline-none focus:border-brand-gold/60 font-sans"
                  />
                  <Phone size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted/40" />
                </div>
              </div>
            </div>
          </div>



          {/* Footer Actions */}
          <div className="pt-4 border-t border-brand-border flex items-center justify-between">
            <button
              type="button"
              onClick={onLogout}
              className="py-3 px-5 text-xs font-semibold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors border border-transparent hover:border-red-500/20 rounded-xl cursor-pointer"
            >
              Fazer Logout
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-3.5 bg-brand-gold text-brand-bg hover:bg-brand-goldHover font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer shadow-sm shadow-brand-gold/10"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-brand-bg" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={13} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>

        </div>
      </form>

    </motion.div>
  );
};
