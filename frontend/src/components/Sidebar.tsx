import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, History, BookOpen, Sparkles, LogOut } from 'lucide-react';
import { PSAILogo } from './PSAILogo';

export interface SidebarSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarSessions: SidebarSession[];
  sessionId?: string;
  creatingSession: boolean;
  onCreateSession: () => void;
  userName: string;
  subscriptionPlan: string;
  LAYOUT_BOTTOM_SPACING: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarSessions,
  sessionId,
  creatingSession,
  onCreateSession,
  userName,
  subscriptionPlan,
  LAYOUT_BOTTOM_SPACING,
}) => {
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('psai_token');
    localStorage.removeItem('psai_user');
    window.location.href = '/';
  };

  return (
    <motion.aside
      initial={{ width: sidebarOpen ? 256 : 0 }}
      animate={{ width: sidebarOpen ? 256 : 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className="fixed md:relative inset-y-0 left-0 flex-shrink-0 flex flex-col border-r border-brand-border bg-brand-card overflow-hidden h-full z-20"
    >
      <div className="w-64 h-full flex flex-col flex-shrink-0">
        {/* Sidebar Brand Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-brand-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <PSAILogo size={22} />
            <span className="text-base font-serif font-semibold text-brand-gold tracking-wide">psai</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-brand-textMuted hover:text-brand-text transition-colors rounded-lg hover:bg-brand-bg/50"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Session Button */}
        <div className="px-3 py-3 flex-shrink-0">
          <button
            onClick={onCreateSession}
            disabled={creatingSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-brand-border hover:border-brand-gold/30 hover:bg-brand-bg transition-colors text-sm font-medium text-brand-text"
          >
            <Plus size={15} className="text-brand-gold" />
            Nova conversa
          </button>
        </div>

        <div className="px-3 flex-shrink-0">
          <p className="text-[11px] text-brand-textMuted uppercase tracking-[0.1em] font-semibold px-1 mb-2 flex items-center gap-1.5">
            <History size={11} /> Recentes
          </p>
        </div>

        {/* Sidebar Session List */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2 relative select-none">
          <AnimatePresence>
            {sidebarSessions.map((s) => {
              const isCurrent = s.id === sessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/chat/${s.id}`)}
                  className={`w-full text-left px-3.5 py-4 rounded-xl text-sm transition-colors group relative overflow-hidden ${
                    isCurrent
                      ? 'text-brand-text font-semibold bg-brand-gold/10'
                      : 'text-brand-textMuted hover:bg-brand-bg hover:text-brand-text'
                  }`}
                >
                  {isCurrent && (
                    <motion.div
                      layoutId="activeSession"
                      className="absolute inset-y-0 left-0 w-1 bg-brand-gold rounded-r-xl pointer-events-none"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <p className="truncate font-medium leading-snug">{s.title || 'Diário de Reflexão'}</p>
                    <p className="text-[11px] text-brand-textMuted/70 font-light">
                      {new Date(s.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              );
            })}
          </AnimatePresence>
        </nav>

        {/* RAG Library Quick Link */}
        <div className="px-3 py-1 flex-shrink-0">
          <button
            onClick={() => navigate('/library')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-gold/[0.03] transition-all cursor-pointer border border-brand-border bg-brand-card/30 text-brand-textMuted hover:text-brand-gold text-left"
          >
            <div className="w-5 h-5 rounded-lg bg-brand-gold/[0.08] flex items-center justify-center flex-shrink-0 text-brand-gold">
              <BookOpen size={11} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Biblioteca RAG</span>
          </button>
        </div>

        {/* Plans Upgrade Quick Link */}
        <div className="px-3 py-1 flex-shrink-0">
          <button
            onClick={() => navigate('/plans')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-gold/10 transition-all cursor-pointer border border-brand-gold/25 bg-brand-gold/5 text-brand-gold text-left"
          >
            <div className="w-5 h-5 rounded-lg bg-brand-gold/20 flex items-center justify-center flex-shrink-0 text-brand-gold">
              <Sparkles size={11} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Planos & Assinatura</span>
          </button>
        </div>

        {/* Sidebar Footer Profile */}
        <div className="px-3 pt-2 border-t border-brand-border flex-shrink-0" style={{ paddingBottom: LAYOUT_BOTTOM_SPACING }}>
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-brand-gold uppercase">{userName ? userName[0] : 'U'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{userName}</p>
                <p className="text-[10px] text-brand-gold font-bold uppercase tracking-wider">
                  Plano {subscriptionPlan === 'trial' ? 'Gratuito' : subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-brand-textMuted hover:text-rose-600 transition-colors rounded-lg hover:bg-brand-bg"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
