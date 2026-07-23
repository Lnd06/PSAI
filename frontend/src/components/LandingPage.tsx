import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Menu, X, Brain, MessageSquare, ShieldCheck, Clock, 
  ChevronRight, Star, ArrowRight, ShieldAlert, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PSAILogo } from './PSAILogo';

const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Planos", href: "#planos" }
];

const FEATURES = [
  { icon: Brain, title: "Inteligência Empática", desc: "Treinado com técnicas fundamentais de TCC, ACT e mindfulness para guiar suas reflexões." },
  { icon: MessageSquare, title: "Disponível 24 horas", desc: "Uma crise ou momento difícil não escolhe horário. Converse sem julgamentos e sem esperas." },
  { icon: ShieldCheck, title: "Privacidade Absoluta", desc: "Suas conversas são criptografadas localmente e nunca compartilhadas de acordo com a LGPD." },
  { icon: Clock, title: "Progresso Contínuo", desc: "O PSAI monitora e mapeia o seu humor e sentimentos ao longo de cada sessão no painel." },
];

const STEPS = [
  { num: "01", title: "Crie seu perfil seguro", desc: "Cadastro rápido e criptografado. Suas informações protegidas desde o primeiro instante." },
  { num: "02", title: "Compartilhe suas reflexões", desc: "Escreva livremente o que está sentindo. Não existe resposta certa ou errada." },
  { num: "03", title: "Receba suporte socrático", desc: "O PSAI analisa e responde com técnicas cognitivas estruturadas para o seu momento." },
  { num: "04", title: "Acompanhe seu bem-estar", desc: "Visualize gráficos intuitivos de evolução de humor, sentimentos e feedbacks semanais." },
];

const TESTIMONIALS = [
  { name: "Mariana F.", role: "Designer, 29 anos", text: "Comecei a usar o PSAI num momento muito difícil. A disponibilidade e a ausência de julgamento me ajudaram a atravessar semanas que eu não conseguiria sozinha.", stars: 5, img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format" },
  { name: "Rafael S.", role: "Engenheiro, 34 anos", text: "Cético no início, conquistado depois de duas semanas. O PSAI não substitui o terapeuta, mas me ajuda entre as sessões de um jeito que eu não esperava.", stars: 5, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format" },
  { name: "Camila R.", role: "Professora, 41 anos", text: "Finalmente sinto que tenho um espaço só meu. Às 3 da manhã quando a ansiedade bate, o PSAI está lá de forma acolhedora.", stars: 5, img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format" },
];

const PLANS = [
  { name: "Essencial", price: "R$ 39", period: "/mês", desc: "Para quem está começando a jornada de autocuidado.", features: ["Sessões ilimitadas de texto", "Histórico de 30 dias", "Relatório semanal de humor"], highlight: false },
  { name: "Profundo", price: "R$ 79", period: "/mês", desc: "Para quem quer suporte reflexivo completo.", features: ["Tudo do Essencial", "Histórico completo e ilimitado", "Insights personalizados de IA", "Mapeamento avançado de humor"], highlight: true },
  { name: "Família", price: "R$ 129", period: "/mês", desc: "Cuide do bem-estar de quem você ama também.", features: ["Até 4 perfis independentes", "Tudo do plano Profundo", "Painel familiar consolidado"], highlight: false },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('psai_token');
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const handleCTA = () => {
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/register', { state: { email: emailInput } });
    }
  };

  return (
    <div className="min-h-screen text-brand-text relative overflow-hidden bg-brand-bg font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-gold rounded-full opacity-[0.03] blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-goldMuted rounded-full opacity-[0.03] blur-[150px] pointer-events-none"></div>

      {/* HEADER / NAV */}
      <header className="sticky top-0 z-50 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <PSAILogo size={32} />
            <span className="text-xl font-semibold text-brand-gold tracking-tight font-serif">
              psai
            </span>
            <span className="hidden sm:inline-block text-[9px] font-bold text-brand-gold/80 uppercase tracking-widest ml-2.5 font-sans px-1.5 py-0.5 rounded bg-brand-gold/[0.06] border border-brand-gold/[0.15]">
              mente & bem-estar
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a 
                key={link.label} 
                href={link.href} 
                className="text-xs text-brand-textMuted hover:text-brand-gold transition-colors duration-200 uppercase tracking-wider font-bold"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-sans font-bold bg-brand-gold hover:bg-brand-goldHover text-brand-bg transition-all active:scale-[0.98] shadow-lg shadow-brand-gold/5"
              >
                Painel
                <ArrowRight size={13} />
              </motion.button>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-xs font-sans font-semibold text-brand-textMuted hover:text-brand-gold transition-colors px-3"
                >
                  Entrar
                </Link>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/register')}
                  className="px-5 py-2.5 rounded-xl text-xs font-sans font-bold bg-brand-gold hover:bg-brand-goldHover text-brand-bg transition-all active:scale-[0.98] shadow-lg shadow-brand-gold/5"
                >
                  Começar Grátis
                </motion.button>
              </>
            )}
          </div>

          <button className="md:hidden text-brand-text p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-brand-card border-b border-brand-border px-6 pb-6 pt-4 flex flex-col gap-4 overflow-hidden"
            >
              {NAV_LINKS.map((link) => (
                <a 
                  key={link.label} 
                  href={link.href} 
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-brand-text font-semibold hover:text-brand-gold"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-brand-border" />
              {token ? (
                <button 
                  onClick={() => { setMenuOpen(false); navigate('/dashboard'); }} 
                  className="w-full text-center text-sm px-5 py-3 bg-brand-gold text-brand-bg font-bold rounded-xl"
                >
                  Ir para o Painel
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link 
                    to="/login" 
                    onClick={() => setMenuOpen(false)}
                    className="text-center text-sm py-2.5 text-brand-textMuted hover:text-brand-gold"
                  >
                    Fazer Login
                  </Link>
                  <button 
                    onClick={() => { setMenuOpen(false); navigate('/register'); }} 
                    className="w-full text-center text-sm px-5 py-3 bg-brand-gold text-brand-bg font-bold rounded-xl"
                  >
                    Começar Grátis
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20 grid md:grid-cols-[1fr_420px] gap-12 items-center z-10">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
              }
            }
          }}
          className="text-left"
        >
          <motion.span 
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200 } }
            }}
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-brand-gold font-bold mb-6 border border-brand-gold/30 px-3.5 py-1.5 rounded-full bg-brand-gold/[0.04]"
          >
            <Sparkles size={11} className="text-brand-gold" />
            Psicologia com Inteligência Artificial
          </motion.span>
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="text-4xl md:text-6xl font-medium leading-[1.1] text-brand-text mb-6 font-serif"
            style={{ letterSpacing: "-0.02em" }}
          >
            Cuidar da mente <br />
            <em className="not-italic text-brand-gold">começa com</em> <br />
            uma conversa.
          </motion.h1>
          <motion.p 
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="text-sm md:text-base text-brand-textMuted leading-relaxed mb-10 max-w-lg font-light"
          >
            O PSAI combina inteligência artificial avançada e técnicas de <strong>Terapia Cognitivo-Comportamental (TCC)</strong>. Um espaço seguro, sem julgamentos e disponível a qualquer momento para estruturar pensamentos e entender emoções.
          </motion.p>
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 25 } }
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(token ? '/dashboard' : '/register')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-gold text-brand-bg rounded-xl text-sm font-bold hover:bg-brand-goldHover transition-all hover:shadow-lg hover:shadow-brand-gold/10"
            >
              {token ? 'Acessar Meu Painel' : 'Iniciar Diário Grátis'}
              <ArrowRight size={16} />
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="#como-funciona"
              className="flex items-center justify-center gap-2 px-8 py-4 border border-brand-border bg-brand-card/30 text-brand-text rounded-xl text-sm font-semibold hover:border-brand-gold/30 hover:text-brand-gold transition-colors"
            >
              Ver como funciona
            </motion.a>
          </motion.div>
          <motion.p 
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: 0.6 } }
            }}
            className="mt-5 text-xs text-brand-textMuted"
          >
            Período de avaliação gratuito · Cancele quando quiser · Sem compromisso
          </motion.p>
        </motion.div>

        {/* HERO GRAPHIC CARD */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="relative justify-self-center md:justify-self-end w-full max-w-[380px]"
        >
          <div className="relative rounded-3xl overflow-hidden bg-brand-card shadow-2xl border border-brand-border">
            <img
              src="/images.jfif"
              alt="Pessoa em momento de meditação"
              className="w-full h-[400px] object-cover opacity-90"
            />
            {/* Overlay simulation card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute bottom-5 left-5 right-5 bg-brand-bg/95 backdrop-blur-md rounded-2xl p-4 border border-brand-border shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-gold flex items-center justify-center flex-shrink-0">
                  <Brain size={15} className="text-brand-bg" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-brand-gold uppercase tracking-wider font-bold mb-1">PSAI · Companheiro</p>
                  <p className="text-xs text-brand-text leading-relaxed font-serif italic">
                    "Estou aqui com você. Me conta o que está tirando seu sono hoje?"
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
          {/* Badge */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.9 }}
            className="absolute -top-4 -right-4 bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 shadow-xl text-left"
          >
            <p className="text-2xl font-bold text-brand-gold font-serif">98%</p>
            <p className="text-[9px] text-brand-textMuted font-bold uppercase tracking-wider mt-0.5">sentem-se acolhidos</p>
          </motion.div>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><hr className="border-brand-border" /></div>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-10">
        <div className="grid md:grid-cols-[300px_1fr] gap-16 items-start">
          <div className="text-left">
            <p className="text-[10px] tracking-[0.15em] uppercase text-brand-gold font-bold mb-4">Como funciona</p>
            <h2 className="text-4xl font-medium leading-tight text-brand-text font-serif" style={{ letterSpacing: "-0.02em" }}>
              Simples de usar, profundo no efeito.
            </h2>
            <p className="text-xs text-brand-textMuted leading-relaxed font-light mt-4">
              Cada etapa foi pensada para manter seu bem-estar protegido, com acompanhamento clínico socrático e seguro.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            {STEPS.map((step) => (
              <motion.div 
                key={step.num} 
                whileHover={{ scale: 1.02, y: -4, borderColor: "rgba(74, 114, 101, 0.3)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="p-6 bg-brand-card rounded-2xl border border-brand-border hover:shadow-lg hover:shadow-brand-gold/5 transition-all duration-300"
              >
                <span className="text-3xl font-medium text-brand-gold/20 block mb-4 font-serif">{step.num}</span>
                <h3 className="text-sm font-bold text-brand-text mb-2 font-sans">{step.title}</h3>
                <p className="text-xs text-brand-textMuted leading-relaxed font-light font-sans">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" className="bg-brand-card/40 border-y border-brand-border py-24 scroll-mt-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <p className="text-[10px] tracking-[0.15em] uppercase text-brand-gold font-bold mb-4">Recursos</p>
            <h2 className="text-4xl font-medium text-brand-text font-serif" style={{ letterSpacing: "-0.02em" }}>
              Feito para o que você realmente precisa.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {FEATURES.map((f) => (
              <motion.div 
                key={f.title} 
                whileHover={{ scale: 1.02, y: -4, borderColor: "rgba(74, 114, 101, 0.3)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="p-6 bg-brand-card rounded-2xl border border-brand-border hover:shadow-lg hover:shadow-brand-gold/5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-gold/[0.08] border border-brand-gold/[0.2] flex items-center justify-center mb-5 text-brand-gold">
                  <f.icon size={18} />
                </div>
                <h3 className="text-sm font-bold text-brand-text mb-2">{f.title}</h3>
                <p className="text-xs text-brand-textMuted leading-relaxed font-light">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="depoimentos" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-10">
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.15em] uppercase text-brand-gold font-bold mb-4">Depoimentos</p>
          <h2 className="text-4xl font-medium text-brand-text font-serif" style={{ letterSpacing: "-0.02em" }}>
            Histórias reais de transformação.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {TESTIMONIALS.map((t) => (
            <motion.div 
              key={t.name} 
              whileHover={{ y: -4 }}
              className="p-7 bg-brand-card rounded-2xl border border-brand-border flex flex-col gap-5 transition-all duration-300"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="fill-brand-gold text-brand-gold" />
                ))}
              </div>
              <p className="text-xs text-brand-text leading-relaxed italic font-light font-serif flex-1">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-brand-border">
                <img src={t.img} alt={t.name} className="w-9 h-9 rounded-full object-cover bg-neutral-200 border border-brand-border" />
                <div>
                  <p className="text-xs font-bold text-brand-text">{t.name}</p>
                  <p className="text-[10px] text-brand-textMuted font-sans mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="bg-brand-card/30 border-y border-brand-border py-24 scroll-mt-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.15em] uppercase text-brand-gold font-bold mb-4">Planos</p>
            <h2 className="text-4xl font-medium text-brand-text font-serif" style={{ letterSpacing: "-0.02em" }}>
              Invista no que mais importa.
            </h2>
            <p className="mt-3 text-brand-textMuted font-light text-xs">7 dias grátis em qualquer plano. Sem compromisso.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-center max-w-5xl mx-auto text-left">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ scale: plan.highlight ? 1.05 : 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`rounded-2xl border p-8 flex flex-col gap-6 transition-all duration-300 ${
                  plan.highlight
                    ? "bg-brand-gold text-brand-bg border-brand-gold shadow-xl shadow-brand-gold/10 scale-[1.03]"
                    : "bg-brand-card border-brand-border hover:border-brand-gold/30"
                }`}
              >
                <div>
                  <p className={`text-[10px] tracking-[0.15em] uppercase font-bold mb-1.5 ${plan.highlight ? "text-brand-bg/90" : "text-brand-textMuted"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-4xl font-bold font-serif ${plan.highlight ? "text-brand-bg" : "text-brand-text"}`}>{plan.price}</span>
                    <span className={`text-xs ${plan.highlight ? "text-brand-bg/70" : "text-neutral-500"}`}>{plan.period}</span>
                  </div>
                  <p className={`text-xs mt-2.5 leading-relaxed font-light ${plan.highlight ? "text-brand-bg/85" : "text-brand-textMuted"}`}>{plan.desc}</p>
                </div>
                <hr className={plan.highlight ? "border-brand-bg/15" : "border-brand-border"} />
                <ul className="flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs font-light">
                      <ChevronRight size={13} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? "text-brand-bg/60" : "text-brand-gold"}`} />
                      <span className={plan.highlight ? "text-brand-bg/95" : "text-brand-text"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(token ? '/dashboard' : '/register')}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all ${
                    plan.highlight
                      ? "bg-brand-bg text-brand-gold hover:bg-brand-bg/95 shadow-md shadow-black/5"
                      : "bg-brand-gold text-brand-bg hover:bg-brand-goldHover"
                  }`}
                >
                  Começar avaliação grátis
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY / EMERGENCY CVV BANNER */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 relative z-10">
        <div className="p-6 border border-brand-border bg-brand-card/45 rounded-2xl flex flex-col sm:flex-row items-start gap-4 text-left transition-all duration-300">
          <ShieldAlert size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-serif font-bold text-brand-text text-sm">Aviso de Segurança e Canais de Apoio</h4>
            <p className="text-xs text-brand-textMuted leading-relaxed mt-1.5">
              O PSAI é uma ferramenta de suporte reflexivo baseada em TCC e **não substitui** acompanhamento psiquiátrico ou psicológico clínico. Se você estiver vivenciando pensamentos de automutilação ou crise aguda, contate imediatamente o **CVV (Centro de Valorização da Vida)** pelo telefone **188** (ligação gratuita, 24 horas) ou acesse <a href="https://www.cvv.org.br/" target="_blank" rel="noreferrer" className="text-brand-gold hover:underline font-bold">cvv.org.br</a>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA INPUT SECTION */}
      <section className="max-w-4xl mx-auto px-6 py-12 scroll-mt-10">
        <div className="bg-brand-card rounded-3xl border border-brand-border p-10 md:p-12 grid md:grid-cols-[1fr_360px] gap-8 items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.05] bg-brand-gold translate-x-16 -translate-y-16 pointer-events-none" />
          <div className="text-left">
            <h2 className="text-3xl font-medium text-brand-text leading-tight mb-4 font-serif" style={{ letterSpacing: "-0.02em" }}>
              Sua mente merece atenção <br />
              <em className="not-italic text-brand-gold">todos os dias.</em>
            </h2>
            <p className="text-xs text-brand-textMuted font-light leading-relaxed">
              Comece agora de forma gratuita e privada. Dê o primeiro passo rumo à clareza emocional.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-left">
            <label className="text-[10px] text-brand-textMuted uppercase font-bold tracking-wider">Seu e-mail para começar</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="voce@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-brand-bg border border-brand-border text-brand-text placeholder:text-neutral-500 focus:outline-none focus:border-brand-gold/40 text-xs font-sans"
              />
              <button
                onClick={handleCTA}
                className="px-5 py-3 bg-brand-gold text-brand-bg rounded-xl text-xs font-bold hover:bg-brand-goldHover transition-all flex items-center justify-center gap-1.5"
              >
                Começar
                <ArrowRight size={13} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 text-center sm:text-left">Avaliação de 7 dias grátis. Cancele quando quiser.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-brand-border bg-brand-card/25">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-16 text-left">
          <div>
            <div className="flex items-center gap-2">
              <PSAILogo size={24} />
              <span className="text-base font-semibold text-brand-gold font-serif">psai</span>
            </div>
            <p className="mt-4 text-xs text-brand-textMuted font-light leading-relaxed max-w-xs">
              Tecnologia, sigilo e reflexão aplicados à saúde mental. Não substitui o acompanhamento profissional.
            </p>
          </div>
          {[
            { title: "Produto", links: [{ l: "Como funciona", h: "#como-funciona" }, { l: "Recursos", h: "#recursos" }, { l: "Planos", h: "#planos" }] },
            { title: "Empresa", links: [{ l: "Sobre nós", h: "#" }, { l: "Blog", h: "#" }, { l: "Carreiras", h: "#" }] },
            { title: "Suporte", links: [{ l: "Ajuda", h: "#" }, { l: "Termos", h: "#" }, { l: "Privacidade", h: "#" }] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-[10px] tracking-[0.12em] uppercase text-brand-textMuted font-bold mb-4">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link, idx) => (
                  <li key={idx}>
                    <a href={link.h} className="text-xs text-brand-textMuted hover:text-brand-text transition-colors font-light">{link.l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <hr className="border-brand-border mb-6" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-brand-textMuted font-sans">
            <span>© {new Date().getFullYear()} PSAI Tecnologia em Saúde Mental Ltda. Todos os direitos reservados.</span>
            <div className="flex gap-4">
              <a href="https://www.cvv.org.br" target="_blank" rel="noreferrer" className="text-rose-600 hover:text-rose-500 font-bold uppercase tracking-wider">CVV 188</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
