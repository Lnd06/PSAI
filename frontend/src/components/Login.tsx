import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PSAILogo } from './PSAILogo';

interface LoginProps {
  onLoginSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Recovery States
  const [view, setView] = useState<'login' | 'forgot-email' | 'forgot-answers' | 'success' | 'verify-login'>('login');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login Verification States
  const [loginQuestion, setLoginQuestion] = useState('');
  const [loginAnswer, setLoginAnswer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      if (response.data && response.data.status === 'verification_required') {
        setLoginQuestion(response.data.question);
        setView('verify-login');
      } else if (response.data && response.data.token) {
        onLoginSuccess(response.data.token, response.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Erro ao conectar. Por favor, tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAnswer.trim()) {
      setError('Por favor, responda à pergunta de verificação.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login/verify-step', {
        email: email.trim(),
        password,
        securityAnswer: loginAnswer.trim()
      });

      if (response.data && response.data.token) {
        onLoginSuccess(response.data.token, response.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Resposta de verificação incorreta. Acesso negado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/recover-password/questions', {
        email: recoverEmail.trim()
      });

      setQuestion1(response.data.question1);
      setQuestion2(response.data.question2);
      setView('forgot-answers');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'E-mail não encontrado ou sem perguntas de segurança configuradas.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answer1.trim() || !answer2.trim()) {
      setError('Por favor, responda a ambas as perguntas de segurança.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/recover-password/verify', {
        email: recoverEmail.trim(),
        answer1: answer1.trim(),
        answer2: answer2.trim(),
        newPassword
      });

      // Clear states
      setRecoverEmail('');
      setAnswer1('');
      setAnswer2('');
      setNewPassword('');
      setConfirmPassword('');
      setView('success');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Erro ao verificar respostas de segurança. Tente novamente.'
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
            {view === 'login' ? 'Diário Terapêutico Inteligente' : 'Recuperação de Acesso'}
          </p>
        </div>

        {/* Error Alert */}
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

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider" htmlFor="email">
                E-mail
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
                Senha
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
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs placeholder-brand-textMuted/40"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setView('forgot-email'); setError(''); }}
                  className="text-[10px] font-bold text-brand-gold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Esqueceu sua senha?
                </button>
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
                  Validando...
                </>
              ) : (
                <>
                  Entrar no diário
                  <ArrowRight size={14} />
                </>
              )}
            </motion.button>

            {/* Separator and Create Account Button */}
            <div className="relative flex py-3 items-center font-sans">
              <div className="flex-grow border-t border-brand-border"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase tracking-wider text-brand-textMuted font-bold">Ou</span>
              <div className="flex-grow border-t border-brand-border"></div>
            </div>

            <Link 
              to="/register" 
              className="w-full py-3.5 rounded-xl border border-brand-border bg-brand-card/30 hover:border-brand-gold/30 text-brand-textMuted hover:text-brand-gold font-bold transition-all duration-300 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              Criar Nova Conta
            </Link>
          </form>
        )}

        {/* FORGOT EMAIL VIEW */}
        {view === 'forgot-email' && (
          <form onSubmit={handleFetchQuestions} className="space-y-4 font-sans">
            <p className="text-xs text-brand-textMuted leading-relaxed mb-4">
              Informe seu e-mail cadastrado. Se o seu perfil possuir perguntas de segurança ativas, nós as exibiremos no próximo passo para que você possa redefinir sua senha de forma segura.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  required
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  placeholder="seuemail@provedor.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); }}
                className="flex-1 py-3 border border-brand-border text-brand-text hover:bg-brand-bg transition-colors rounded-xl text-xs uppercase tracking-wider font-bold"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-gold hover:bg-brand-goldHover text-brand-bg rounded-xl text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={13} className="animate-spin text-brand-bg" /> : 'Prosseguir'}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT ANSWERS & RESET PASSWORD VIEW */}
        {view === 'forgot-answers' && (
          <form onSubmit={handleResetPassword} className="space-y-4 font-sans">
            <p className="text-xs text-brand-textMuted leading-relaxed mb-2">
              Responda às perguntas abaixo exatamente como configurado no seu cadastro para criar uma nova senha de acesso.
            </p>

            {/* Pergunta 1 */}
            <div className="space-y-1.5 p-3 rounded-2xl border border-brand-border bg-brand-card/30">
              <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block">
                Pergunta 1:
              </span>
              <p className="text-xs text-brand-text font-serif italic mb-2">{question1}</p>
              <input
                type="text"
                required
                value={answer1}
                onChange={(e) => setAnswer1(e.target.value)}
                placeholder="Sua resposta"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs"
              />
            </div>

            {/* Pergunta 2 */}
            <div className="space-y-1.5 p-3 rounded-2xl border border-brand-border bg-brand-card/30">
              <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block">
                Pergunta 2:
              </span>
              <p className="text-xs text-brand-text font-serif italic mb-2">{question2}</p>
              <input
                type="text"
                required
                value={answer2}
                onChange={(e) => setAnswer2(e.target.value)}
                placeholder="Sua resposta"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs"
              />
            </div>

            {/* Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">
                Nova Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs"
                />
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-textMuted/60 pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 focus:bg-brand-card/90 outline-none text-brand-text transition-all text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setView('forgot-email'); setError(''); }}
                className="flex-1 py-3 border border-brand-border text-brand-text hover:bg-brand-bg transition-colors rounded-xl text-xs uppercase tracking-wider font-bold"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-gold hover:bg-brand-goldHover text-brand-bg rounded-xl text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={13} className="animate-spin text-brand-bg" /> : 'Redefinir'}
              </button>
            </div>
          </form>
        )}

        {/* SUCCESS VIEW */}
        {view === 'success' && (
          <div className="text-center space-y-4 font-sans">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-serif font-bold text-brand-text">Senha redefinida!</h2>
            <p className="text-xs text-brand-textMuted leading-relaxed">
              Sua senha foi redefinida com sucesso. Agora você já pode acessar o seu diário com as novas credenciais.
            </p>
            <button
              onClick={() => { setView('login'); setError(''); }}
              className="w-full py-3.5 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-bg font-bold transition-all duration-300 text-xs uppercase tracking-wider mt-4 block"
            >
              Fazer Login
            </button>
          </div>
        )}

        {/* VERIFY LOGIN VIEW */}
        {view === 'verify-login' && (
          <form onSubmit={handleVerifyLogin} className="space-y-4 font-sans text-left">
            <p className="text-xs text-brand-textMuted leading-relaxed mb-2">
              Esta conta possui verificação de segurança ativa. Responda à pergunta abaixo para validar sua identidade e concluir o login.
            </p>

            <div className="space-y-1.5 p-3 rounded-2xl border border-brand-border bg-brand-card/30">
              <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block">
                Pergunta de Verificação:
              </span>
              <p className="text-xs text-brand-text font-serif italic mb-2">{loginQuestion}</p>
              <input
                type="text"
                required
                value={loginAnswer}
                onChange={(e) => setLoginAnswer(e.target.value)}
                placeholder="Sua resposta de segurança"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg focus:border-brand-gold/60 outline-none text-brand-text text-xs placeholder:text-neutral-500 font-sans"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setLoginAnswer(''); }}
                className="flex-1 py-3 border border-brand-border text-brand-text hover:bg-brand-bg transition-colors rounded-xl text-xs uppercase tracking-wider font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-gold hover:bg-brand-goldHover text-brand-bg rounded-xl text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={13} className="animate-spin text-brand-bg" /> : 'Verificar e Entrar'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-brand-border text-center font-sans">
          <p className="text-xs text-brand-textMuted">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-brand-gold font-bold hover:underline">
              Criar perfil
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-brand-textMuted/60 mt-4 uppercase tracking-wider font-semibold">
            <Shield size={10} className="text-brand-gold/50" />
            <span>Reflexões e Dados Criptografados (LGPD)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
