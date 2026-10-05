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
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Ban,
  CreditCard
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
  
  const [subData, setSubData] = useState<{
    active: boolean;
    plan: string;
    status: string;
    nextDueDate: string | null;
    cycle?: string | null;
    cancelAtPeriodEnd?: boolean;
  } | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const fetchSubscriptionStatus = async () => {
    try {
      setLoadingSub(true);
      const res = await axios.get('http://localhost:5000/api/payments/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubData(res.data);
    } catch (err) {
      console.warn('Falha ao carregar status de assinatura:', err);
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCpf(user.cpf || '');
      setTelefone(user.telefone || '');
    }
    const savedMode = localStorage.getItem('psai_default_mode') || 'natural';
    setSelectedMode(savedMode);
    fetchSubscriptionStatus();
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza de que deseja cancelar sua assinatura? O cancelamento evitará cobranças futuras.')) {
      return;
    }

    try {
      setCancellingSub(true);
      setError('');
      setSuccess('');
      const res = await axios.post(
        'http://localhost:5000/api/payments/cancel_subscription',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message || 'Assinatura cancelada com sucesso.');
      await fetchSubscriptionStatus();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Erro ao cancelar assinatura.');
    } finally {
      setCancellingSub(false);
    }
  };

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

          {/* Section 3: Assinatura & Plano */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-2">
              <CreditCard size={16} className="text-brand-gold" />
              <h3 className="text-sm font-semibold text-brand-text">Assinatura & Plano</h3>
            </div>

            <div className="p-4 rounded-2xl bg-brand-bg/50 border border-brand-border space-y-4">
              {loadingSub ? (
                <div className="flex items-center gap-2.5 text-xs text-brand-textMuted py-3 font-sans">
                  <Loader2 size={15} className="animate-spin text-brand-gold" />
                  <span>Carregando dados da assinatura...</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Plano Atual</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-text capitalize">
                          {subData?.plan && subData.plan !== 'trial' ? `Plano ${subData.plan}` : 'Plano Gratuito (Trial)'}
                        </span>
                        {subData?.active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                            <ShieldCheck size={11} /> Ativo
                          </span>
                        ) : subData?.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/25">
                            <AlertCircle size={11} /> Pendente / Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-textMuted/10 text-brand-textMuted border border-brand-border">
                            Sem assinatura ativa
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/plans')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold text-xs font-bold transition-all border border-brand-gold/25 cursor-pointer self-start sm:self-auto"
                    >
                      <Sparkles size={12} /> {subData?.active ? 'Mudar de Plano' : 'Ver Planos & Assinar'}
                    </button>
                  </div>

                  {subData?.nextDueDate && (
                    <div className="flex items-center gap-2 text-xs text-brand-textMuted font-sans pt-2 border-t border-brand-border/60">
                      <Calendar size={13} className="text-brand-gold" />
                      <span>Próximo vencimento / renovação: <strong>{new Date(subData.nextDueDate).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  )}

                  {subData?.cancelAtPeriodEnd && (
                    <div className="p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-amber-700 text-xs font-sans">
                      Assinatura programada para encerramento ao final do ciclo pago. Não haverá novas cobranças.
                    </div>
                  )}

                  {subData?.active && !subData?.cancelAtPeriodEnd && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCancelSubscription}
                        disabled={cancellingSub}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Ban size={12} /> {cancellingSub ? 'Cancelando...' : 'Cancelar Assinatura'}
                      </button>
                    </div>
                  )}
                </>
              )}
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
