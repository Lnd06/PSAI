import React, { forwardRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Loader2 } from 'lucide-react';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  sentiment?: string | null;
  sentimentScore?: number | null;
  createdAt: string;
  audioBase64?: string;
}

interface TypewriterTextProps {
  content: string;
  isAnimating: boolean;
  onComplete?: () => void;
  onScroll?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  content,
  isAnimating,
  onComplete,
  onScroll,
}) => {
  const [displayedLength, setDisplayedLength] = useState(() => (isAnimating ? 0 : content.length));

  useEffect(() => {
    if (!isAnimating) {
      setDisplayedLength(content.length);
      return;
    }

    setDisplayedLength(0);
    let current = 0;
    const total = content.length;

    // Velocidade de digitação fluida, dinâmica e natural
    const step = total > 800 ? 4 : total > 400 ? 3 : total > 150 ? 2 : 1;
    const intervalMs = 14;

    const timer = setInterval(() => {
      current = Math.min(current + step, total);
      setDisplayedLength(current);

      if (current % (step * 6) === 0 || current >= total) {
        onScroll?.();
      }

      if (current >= total) {
        clearInterval(timer);
        onComplete?.();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [content, isAnimating]);

  const handleSkip = () => {
    if (isAnimating && displayedLength < content.length) {
      setDisplayedLength(content.length);
      onComplete?.();
      onScroll?.();
    }
  };

  const isTyping = isAnimating && displayedLength < content.length;

  return (
    <p
      onClick={handleSkip}
      className={`text-base text-brand-text leading-[1.75] font-light font-serif whitespace-pre-wrap text-left select-text break-words ${
        isTyping ? 'cursor-pointer' : ''
      }`}
      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      title={isTyping ? 'Clique para exibir todo o texto imediatamente' : undefined}
    >
      {isAnimating ? content.slice(0, displayedLength) : content}
      {isTyping && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-brand-gold/80 rounded-sm animate-pulse align-middle" />
      )}
    </p>
  );
};

interface ChatHistoryProps {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  userName: string;
  getMoodColor: (mood: string) => string;
  getUserSentimentLabel: (mood: string) => string;
  getAiTherapeuticLabel: (mood: string) => string;
  onSendQuickPrompt: (prompt: string) => void;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  animatingMessageId?: string | null;
  onAnimationComplete?: (id?: string) => void;
  onAutoScroll?: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
}

const QUICK_PROMPTS = [
  'Estou me sentindo ansioso',
  'Preciso falar sobre trabalho',
  'Não consigo dormir',
  'Me sinto sobrecarregado',
];

export const ChatHistory = forwardRef<HTMLDivElement, ChatHistoryProps>(({
  messages,
  loading,
  sending,
  userName,
  getMoodColor,
  getUserSentimentLabel,
  getAiTherapeuticLabel,
  onSendQuickPrompt,
  messageEndRef,
  animatingMessageId,
  onAnimationComplete,
  onAutoScroll,
  onScroll,
  onWheel,
  onTouchStart,
  onTouchMove,
}, ref) => {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 z-10 overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-3">
          <Loader2 className="animate-spin text-brand-gold" size={28} />
          <p className="text-xs font-sans">Carregando diário de reflexão...</p>
        </div>
      ) : messages.length > 0 ? (
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`flex gap-4 text-left ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {isUser ? (
                  <div className="w-7 h-7 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5 animate-fade-in">
                    <span className="text-xs font-semibold text-brand-gold uppercase">{userName ? userName[0] : 'U'}</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 mt-0.5 animate-fade-in">
                    <Brain size={12} className="text-brand-bg" />
                  </div>
                )}

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
                  <div className={`flex items-baseline gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-medium text-brand-text">
                      {isUser ? 'Você' : 'PSAI'}
                    </span>
                    <span className="text-[11px] text-brand-textMuted ml-2">
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sentiment && (
                      <span
                        className="text-[8px] tracking-wider font-sans uppercase border border-brand-border/40 bg-brand-card/30 px-2 py-0.5 rounded-full animate-fade-in ml-2"
                        style={{ color: getMoodColor(msg.sentiment) }}
                      >
                        {isUser ? getUserSentimentLabel(msg.sentiment) : `Tom: ${getAiTherapeuticLabel(msg.sentiment)}`}
                      </span>
                    )}
                  </div>

                  {isUser ? (
                    /* User Message Bubble */
                    <div className="inline-block max-w-[80%] px-4 py-2.5 rounded-2xl bg-brand-cardLight/70 text-brand-text text-sm leading-relaxed border border-brand-border/30 select-text text-left break-words">
                      {msg.content}
                    </div>
                  ) : (
                    /* PSAI message text com Efeito Máquina de Escrever / Digitação */
                    <TypewriterText
                      content={msg.content}
                      isAnimating={animatingMessageId === msg.id}
                      onComplete={() => onAnimationComplete?.(msg.id)}
                      onScroll={onAutoScroll}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex gap-4 text-left animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain size={12} className="text-brand-bg" />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-brand-textMuted"
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>
      ) : (
        /* Welcome / Empty state */
        <div className="h-full flex flex-col items-center justify-center px-6 pb-8 max-w-2xl mx-auto text-center select-none z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mb-5 text-brand-gold"
          >
            <Brain size={26} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-2xl font-medium text-brand-text mb-2 font-serif"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Como posso te ajudar hoje?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-sm text-brand-textMuted text-center max-w-sm font-light mb-10 leading-relaxed font-sans"
          >
            Estou aqui para te ouvir. Pode me contar o que está sentindo, uma situação difícil, ou só começar a conversar.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.4,
                },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl animate-fade-in"
          >
            {QUICK_PROMPTS.map((promptText) => (
              <motion.button
                key={promptText}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
                }}
                whileHover={{ scale: 1.02, y: -1, backgroundColor: 'rgba(74, 114, 101, 0.03)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSendQuickPrompt(promptText)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-brand-border bg-brand-card hover:border-brand-gold/40 hover:bg-brand-gold/5 transition-colors text-left group cursor-pointer"
              >
                <Sparkles size={14} className="text-brand-gold flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm text-brand-text font-light">{promptText}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
});

ChatHistory.displayName = 'ChatHistory';
