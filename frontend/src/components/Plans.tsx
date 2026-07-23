import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft, 
  CreditCard, 
  FileText, 
  QrCode,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { PSAILogo } from './PSAILogo';

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: 39.00,
    period: "mês",
    description: "Ideal para começar a cuidar do seu bem-estar diário.",
    features: [
      "Sessões ilimitadas de conversa por texto",
      "Histórico de diários de até 30 dias",
      "Mapeamento básico de sentimentos",
      "Relatório semanal de humor simplificado",
    ],
    highlight: false,
    color: "sage",
  },
  {
    id: "profundo",
    name: "Profundo",
    price: 79.00,
    period: "mês",
    description: "Nosso plano mais completo para suporte e reflexão profundos.",
    features: [
      "Tudo do plano Essencial",
      "Histórico de conversas completo e ilimitado",
      "Insights emocionais personalizados avançados",
      "Acesso ao Modo de Voz do PSAI",
      "Acesso imediato ao canal de crise",
    ],
    highlight: true,
    color: "gold",
  },
  {
    id: "familia",
    name: "Família",
    price: 129.00,
    period: "mês",
    description: "Cuide de quem você ama com perfis independentes.",
    features: [
      "Até 4 perfis familiares independentes",
      "Tudo do plano Profundo incluído para todos",
      "Painel de bem-estar familiar consolidado",
      "Relatórios de humor compartilháveis e exportáveis",
    ],
    highlight: false,
    color: "brown",
  },
];

export const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Subscription status state
  const [subStatus, setSubStatus] = useState<{ active: boolean; nextDueDate: string | null } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Checkout states
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [billingType, setBillingType] = useState('PIX'); // PIX, CREDIT_CARD, BOLETO
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('psai_token');
    const storedUser = localStorage.getItem('psai_user');
    
    if (!storedToken || !storedUser) {
      navigate('/login');
      return;
    }
    
    setToken(storedToken);
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setCpf(parsedUser.cpf || '');
    setTelefone(parsedUser.telefone || '');

    // Fetch subscription status from backend
    const checkSubStatus = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/payments/status', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setSubStatus(response.data);
      } catch (err) {
        console.error('Erro ao verificar status de assinatura:', err);
      } finally {
        setLoadingStatus(false);
      }
    };

    checkSubStatus();
  }, [navigate]);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf.trim() || !telefone.trim()) {
      setErrorMsg('CPF e Telefone são obrigatórios.');
      return;
    }
    
    setLoadingCheckout(true);
    setErrorMsg('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/payments/create_payment',
        {
          planType: selectedPlan.id,
          billingType,
          cpf: cpf.trim(),
          telefone: telefone.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Se tiver sucesso e retornar o link de checkout/fatura da Asaas
      if (response.data.invoiceUrl) {
        // Atualiza os dados de contato do usuário no localStorage
        if (user) {
          const updatedUser = { ...user, cpf, telefone };
          localStorage.setItem('psai_user', JSON.stringify(updatedUser));
        }
        // Redireciona para o checkout da Asaas
        window.location.href = response.data.invoiceUrl;
      } else {
        setErrorMsg('Erro: Link de pagamento não gerado pela Asaas.');
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      const msg = err.response?.data?.errors?.[0]?.description || 
                  err.response?.data?.error || 
                  'Erro ao criar pagamento. Tente novamente.';
      setErrorMsg(msg);
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-gold/20 pb-20 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[120px] bg-brand-gold pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.02] blur-[120px] bg-brand-textMuted pointer-events-none" />

      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between z-10 relative">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-brand-textMuted hover:text-brand-text transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Voltar ao Chat
        </button>
        <div className="flex items-center gap-2">
          <PSAILogo size={20} />
          <span className="font-serif font-semibold text-brand-gold tracking-wide">psai</span>
        </div>
      </div>

      {/* Page Title */}
      <div className="max-w-4xl mx-auto text-center mt-12 mb-16 px-6 z-10 relative">
        {subStatus?.active && (
          <div className="mb-6 inline-flex items-center gap-2.5 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider animate-fade-in shadow-sm">
            <ShieldCheck size={16} />
            Seu plano atual está ativo e renovado!
          </div>
        )}
        <h1 
          className="text-4xl md:text-5xl font-medium text-brand-text leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Invista no que mais importa: seu bem-estar.
        </h1>
        <p className="text-brand-textMuted text-base font-light max-w-xl mx-auto leading-relaxed">
          Escolha o plano ideal para a sua jornada e tenha acesso a suporte terapêutico humanizado, a qualquer hora do dia ou da noite.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch relative z-10">
        {PLANS.map((plan) => {
          const isCurrentPlan = user?.subscriptionPlan === plan.id && subStatus?.active;
          return (
            <div 
              key={plan.id}
              className={`rounded-2xl border p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.highlight 
                  ? 'bg-brand-card/75 border-brand-gold shadow-md shadow-brand-gold/5 scale-[1.02]' 
                  : 'bg-brand-card/30 border-brand-border hover:border-brand-gold/30 hover:bg-brand-card/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-brand-textMuted">{plan.name}</span>
                  {plan.highlight && (
                    <span className="bg-brand-gold text-brand-bg text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm shadow-brand-gold/20">
                      <Sparkles size={10} /> Recomendado
                    </span>
                  )}
                </div>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-serif font-medium text-brand-text" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    R$ {plan.price.toFixed(0)}
                  </span>
                  <span className="text-sm text-brand-textMuted font-light">/{plan.period}</span>
                </div>
                
                <p className="text-xs text-brand-textMuted font-light mb-8 leading-relaxed">
                  {plan.description}
                </p>
                
                <ul className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm font-light text-brand-text/90">
                      <Check size={14} className="text-brand-gold mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || loadingStatus}
                className={`w-full py-3.5 rounded-full text-sm font-semibold tracking-wide transition-all shadow-sm ${
                  isCurrentPlan
                    ? 'bg-brand-gold/10 text-brand-gold cursor-default border border-brand-gold/25'
                    : plan.highlight
                    ? 'bg-brand-gold text-brand-bg hover:bg-brand-goldHover active:scale-[0.98]'
                    : 'bg-brand-cardLight/70 border border-brand-border text-brand-text hover:bg-brand-cardLight hover:border-brand-gold/30 active:scale-[0.98]'
                }`}
              >
                {isCurrentPlan ? 'Plano Ativo' : 'Escolher Plano'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Checkout */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/40 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden select-none">
            <h3 className="text-xl font-serif font-medium mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Assinatura do Plano {selectedPlan.name}
            </h3>
            <p className="text-xs text-brand-textMuted font-light mb-6">
              Para prosseguir, preencha os dados necessários para o faturamento via Asaas.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs font-sans text-left flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 font-sans text-left">
              {/* CPF input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">CPF</label>
                <input 
                  type="text" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold/50"
                  required
                />
              </div>

              {/* Telephone input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">Celular / WhatsApp</label>
                <input 
                  type="text" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 90000-0000"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-gold/50"
                  required
                />
              </div>

              {/* Billing Type selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBillingType('PIX')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                      billingType === 'PIX'
                        ? 'border-brand-gold bg-brand-gold/5 text-brand-gold shadow-sm shadow-brand-gold/5'
                        : 'border-brand-border hover:border-brand-gold/30 hover:bg-brand-bg/50'
                    }`}
                  >
                    <QrCode size={16} /> PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('CREDIT_CARD')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                      billingType === 'CREDIT_CARD'
                        ? 'border-brand-gold bg-brand-gold/5 text-brand-gold shadow-sm shadow-brand-gold/5'
                        : 'border-brand-border hover:border-brand-gold/30 hover:bg-brand-bg/50'
                    }`}
                  >
                    <CreditCard size={16} /> Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('BOLETO')}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                      billingType === 'BOLETO'
                        ? 'border-brand-gold bg-brand-gold/5 text-brand-gold shadow-sm shadow-brand-gold/5'
                        : 'border-brand-border hover:border-brand-gold/30 hover:bg-brand-bg/50'
                    }`}
                  >
                    <FileText size={16} /> Boleto
                  </button>
                </div>
              </div>

              {/* Bottom values summary */}
              <div className="pt-2 border-t border-brand-border flex items-center justify-between text-sm">
                <span className="font-light text-brand-textMuted">Valor Mensal:</span>
                <span className="font-semibold text-brand-text text-base">R$ {selectedPlan.price.toFixed(2).replace('.', ',')}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loadingCheckout}
                  className="flex-1 py-3 text-sm font-semibold rounded-full border border-brand-border text-brand-textMuted hover:bg-brand-bg hover:text-brand-text transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingCheckout}
                  className="flex-1 py-3 text-sm font-semibold rounded-full bg-brand-gold text-brand-bg hover:bg-brand-goldHover transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  {loadingCheckout ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Processando...
                    </>
                  ) : (
                    'Assinar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
