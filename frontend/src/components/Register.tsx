import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Shield, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PSAILogo } from './PSAILogo';

const PREDEFINED_QUESTIONS_1 = [
  "Qual o nome do seu primeiro animal de estimação?",
  "Qual a cidade onde seus pais se conheceram?",
  "Qual o nome da sua primeira escola?",
  "Qual era o seu livro de infância favorito?",
  "Outra pergunta..."
];

const PREDEFINED_QUESTIONS_2 = [
  "Qual o nome do seu melhor amigo de infância?",
  "Qual foi a marca do seu primeiro carro/celular?",
  "Qual o nome da rua onde você cresceu?",
  "Qual é o seu filme favorito da vida?",
  "Outra pergunta..."
];

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Security questions states
  const [selectedQ1, setSelectedQ1] = useState(PREDEFINED_QUESTIONS_1[0]);
  const [customQ1, setCustomQ1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');

  const [selectedQ2, setSelectedQ2] = useState(PREDEFINED_QUESTIONS_2[0]);
  const [customQ2, setCustomQ2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // If the user came from LandingPage, pull the email they pre-filled in CTA
  useEffect(() => {
    if (location.state && (location.state as any).email) {
      setEmail((location.state as any).email);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const question1 = selectedQ1 === 'Outra pergunta...' ? customQ1.trim() : selectedQ1;
    const question2 = selectedQ2 === 'Outra pergunta...' ? customQ2.trim() : selectedQ2;

    if (selectedQ1 === 'Outra pergunta...' && !customQ1.trim()) {
      setError('Por favor, digite a sua pergunta de segurança 1.');
      return;
    }
    if (!securityAnswer1.trim()) {
      setError('Por favor, responda à pergunta de segurança 1.');
      return;
    }
    if (selectedQ2 === 'Outra pergunta...' && !customQ2.trim()) {
      setError('Por favor, digite a sua pergunta de segurança 2.');
      return;
    }
    if (!securityAnswer2.trim()) {
      setError('Por favor, responda à pergunta de segurança 2.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password,
        securityQuestion1: question1,
        securityAnswer1: securityAnswer1.trim(),
        securityQuestion2: question2,
        securityAnswer2: securityAnswer2.trim()
      });

      setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Ocorreu um erro ao realizar o cadastro.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brand-bg text-brand-text">
      {/* Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-gold rounded-full opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-goldMuted rounded-full opacity-[0.03] blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-8 relative z-10 shadow-2xl text-left"
      >
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <PSAILogo size={52} className="mb-3" />
          <h1 className="text-3xl font-serif font-bold text-brand-text mt-1">
            psai
          </h1>
          <p className="text-[10px] text-brand-gold uppercase tracking-[0.15em] mt-2 font-bold font-sans">
            Crie seu perfil seguro
          </p>
        </div>

        {/* Status Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-5 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs leading-relaxed font-sans overflow-hidden"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-700 text-xs leading-relaxed font-sans overflow-hidden"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider" htmlFor="name">
              Nome de Exibição
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                <User size={15} />
              </span>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como deseja ser chamado?"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs placeholder-brand-textMuted/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider" htmlFor="email">
              E-mail Seguro
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                <Mail size={15} />
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: seuemail@provedor.com"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs placeholder-brand-textMuted/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider" htmlFor="password">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs placeholder-brand-textMuted/40"
              />
            </div>
          </div>

          {/* Pergunta de Segurança 1 */}
          <div className="space-y-2 p-3 rounded-2xl border border-brand-border bg-brand-card/30">
            <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block mb-1">
              Pergunta de Segurança 1 (Recuperação de Senha)
            </span>
            <div className="space-y-2">
              <select
                value={selectedQ1}
                onChange={(e) => setSelectedQ1(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:border-brand-gold/60 focus:bg-brand-card outline-none text-xs transition-all cursor-pointer font-sans"
              >
                {PREDEFINED_QUESTIONS_1.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              {selectedQ1 === 'Outra pergunta...' && (
                <input
                  type="text"
                  required
                  value={customQ1}
                  onChange={(e) => setCustomQ1(e.target.value)}
                  placeholder="Digite sua própria pergunta de segurança 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs placeholder-brand-textMuted/40 font-sans"
                />
              )}

              <input
                type="text"
                required
                value={securityAnswer1}
                onChange={(e) => setSecurityAnswer1(e.target.value)}
                placeholder="Resposta para a pergunta 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs placeholder-brand-textMuted/40 font-sans"
              />
            </div>
          </div>

          {/* Pergunta de Segurança 2 */}
          <div className="space-y-2 p-3 rounded-2xl border border-brand-border bg-brand-card/30">
            <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block mb-1">
              Pergunta de Segurança 2 (Recuperação de Senha)
            </span>
            <div className="space-y-2">
              <select
                value={selectedQ2}
                onChange={(e) => setSelectedQ2(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:border-brand-gold/60 focus:bg-brand-card outline-none text-xs transition-all cursor-pointer font-sans"
              >
                {PREDEFINED_QUESTIONS_2.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              {selectedQ2 === 'Outra pergunta...' && (
                <input
                  type="text"
                  required
                  value={customQ2}
                  onChange={(e) => setCustomQ2(e.target.value)}
                  placeholder="Digite sua própria pergunta de segurança 2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs placeholder-brand-textMuted/40 font-sans"
                />
              )}

              <input
                type="text"
                required
                value={securityAnswer2}
                onChange={(e) => setSecurityAnswer2(e.target.value)}
                placeholder="Resposta para a pergunta 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs placeholder-brand-textMuted/40 font-sans"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-bg font-bold transition-all duration-300 shadow-md shadow-brand-gold/5 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-1.5 mt-6 text-xs uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-brand-bg" />
                Registrando...
              </>
            ) : (
              <>
                Concluir cadastro
                <ArrowRight size={14} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-brand-border text-center font-sans">
          <p className="text-xs text-brand-textMuted">
            Já possui cadastro?{' '}
            <Link to="/login" className="text-brand-gold font-bold hover:underline">
              Fazer login
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-brand-textMuted/60 mt-4 uppercase tracking-wider font-semibold">
            <Shield size={10} className="text-brand-gold/50" />
            <span>Dados confidenciais protegidos pela LGPD</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
