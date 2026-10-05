import React, { useRef, useEffect } from 'react';
import { Loader2, Mic, Send, Square } from 'lucide-react';

interface ChatInputProps {
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  isVoiceMessage?: boolean;
  onUserType?: (msg: string) => void;
  sending: boolean;
  isAiResponding?: boolean;
  onStopAiResponse?: () => void;
  voiceModeActive: boolean;
  isSpeaking: boolean;
  isTranscribing: boolean;
  onSendMessage: () => void;
  onToggleVoiceMode: () => void;
  onToggleTranscription: () => void;
  LAYOUT_BOTTOM_SPACING: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputMsg,
  setInputMsg,
  isVoiceMessage,
  onUserType,
  sending,
  isAiResponding,
  onStopAiResponse,
  voiceModeActive,
  isSpeaking,
  isTranscribing,
  onSendMessage,
  onToggleVoiceMode,
  onToggleTranscription,
  LAYOUT_BOTTOM_SPACING,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputMsg]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent submit during IME character composition (accents, Japanese/Chinese input, etc.)
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      // Guard against rapid duplicate triggers, sending while busy, or empty inputs
      if (!sending && !isAiResponding && inputMsg.trim()) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="flex-shrink-0 px-2 sm:px-4 pt-3 z-10" style={{ paddingBottom: LAYOUT_BOTTOM_SPACING }}>
      <div className="max-w-3xl mx-auto">
        {voiceModeActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-[10px] uppercase tracking-wider font-bold text-brand-gold w-fit font-sans animate-fade-in">
            {isSpeaking ? (
              <>
                <span className="flex gap-0.5 items-center">
                  <span className="w-0.5 h-2.5 bg-brand-gold rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-brand-gold rounded-full animate-pulse [animation-delay:0.15s]" />
                  <span className="w-0.5 h-2 bg-brand-gold rounded-full animate-pulse [animation-delay:0.3s]" />
                </span>
                <span>Modo Live • PSAI falando (Fale para interromper)</span>
              </>
            ) : sending ? (
              <>
                <Loader2 size={12} className="animate-spin text-brand-gold" />
                <span>Modo Live • Pensando na resposta...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75 animate-fade-in"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                </span>
                <span>Modo Live • Ouvindo em tempo real (Fale agora)</span>
              </>
            )}
          </div>
        )}

        {/* Indicador de Gravação de Áudio (Modo Áudio / Transcrição com resposta por voz) */}
        {isTranscribing && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] uppercase tracking-wider font-bold text-red-400 w-fit font-sans animate-fade-in select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>Gravando áudio... Fale agora. Pressione parar ou enviar para a IA responder por voz.</span>
          </div>
        )}

        {/* Badge de Áudio Transcrito Pronto para Envio com Resposta por Voz */}
        {isVoiceMessage && !isTranscribing && !!inputMsg.trim() && (
          <div className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-[10px] uppercase tracking-wider font-bold text-brand-gold w-fit font-sans animate-fade-in select-none">
            <Mic size={12} className="text-brand-gold animate-pulse" />
            <span>Mensagem gravada por voz • A IA responderá por voz</span>
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 bg-brand-card border border-brand-border rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 focus-within:border-brand-gold/50 shadow-sm transition-colors">
          <textarea
            ref={textareaRef}
            value={inputMsg}
            onChange={(e) => {
              if (onUserType) {
                onUserType(e.target.value);
              } else {
                setInputMsg(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? "Gravando áudio... Fale agora…" : "Mensagem ao PSAI…"}
            rows={1}
            className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-textMuted/60 resize-none focus:outline-none leading-relaxed max-h-40"
            style={{ overflowY: 'auto' }}
          />
          <div className="flex items-center gap-1 sm:gap-1.5 pb-0.5 select-none">
            {/* Botão de Modo Áudio (Gravar áudio com resposta por voz) */}
            <button
              type="button"
              onClick={onToggleTranscription}
              className={`p-1.5 transition-all rounded-lg relative border cursor-pointer ${
                isTranscribing
                  ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
                  : isVoiceMessage && !!inputMsg.trim()
                  ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/30 shadow-[0_0_12px_rgba(74,114,101,0.15)]'
                  : 'text-brand-textMuted hover:text-brand-gold hover:bg-brand-bg/50 border-transparent'
              }`}
              title={
                isTranscribing
                  ? 'Parar e enviar mensagem de áudio'
                  : isVoiceMessage && !!inputMsg.trim()
                  ? 'Gravação pronta — clique para enviar com resposta por voz'
                  : 'Gravar áudio para a IA (Modo Áudio - resposta por voz)'
              }
            >
              {isTranscribing ? (
                <Square size={14} className="sm:w-4 sm:h-4 fill-current text-red-400" />
              ) : (
                <Mic size={16} className={`sm:w-[17px] sm:h-[17px] ${isVoiceMessage && !!inputMsg.trim() ? 'text-brand-gold' : ''}`} />
              )}
            </button>

            {/* Botão de Conversa por Voz Interativa */}
            <button
              type="button"
              onClick={onToggleVoiceMode}
              className={`p-1.5 transition-all rounded-lg relative border cursor-pointer ${
                voiceModeActive
                  ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/30 shadow-[0_0_12px_rgba(74, 114, 101, 0.15)] animate-pulse'
                  : 'text-brand-textMuted hover:text-brand-gold hover:bg-brand-bg/50 border-transparent'
              }`}
              title={voiceModeActive ? 'Desativar modo de conversa' : 'Iniciar conversa por voz'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" className="lucide sm:w-[17px] sm:h-[17px]">
                <path d="M18 2q0 2 2 2q-2 0-2 2q0-2-2-2q2 0 2-2" fill="currentColor" stroke="none" />
                <line x1="6" y1="10" x2="6" y2="16" />
                <line x1="10" y1="7" x2="10" y2="19" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {voiceModeActive && isSpeaking && (
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-gold"></span>
                </span>
              )}
            </button>

            {/* Botão de Enviar ou Parar */}
            {isAiResponding ? (
              <button
                type="button"
                onClick={onStopAiResponse}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] active:scale-95 cursor-pointer animate-pulse"
                title="Parar resposta da IA"
              >
                <Square size={11} className="sm:w-3 sm:h-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSendMessage()}
                disabled={!inputMsg.trim() || sending}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  inputMsg.trim() && !sending
                    ? 'bg-brand-gold text-brand-bg hover:bg-brand-goldHover shadow shadow-brand-gold/15 active:scale-95 cursor-pointer'
                    : 'bg-transparent text-brand-textMuted/40 cursor-not-allowed'
                }`}
                title={isVoiceMessage || isTranscribing ? 'Enviar áudio transcrito (IA responderá por voz)' : 'Enviar mensagem'}
              >
                <Send size={12} fill="currentColor" className="sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-brand-textMuted mt-1 font-light">
          O PSAI pode cometer erros. Não substitui acompanhamento clínico profissional.
        </p>
      </div>
    </div>
  );
};
