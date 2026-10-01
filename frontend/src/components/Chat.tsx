import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HelpCircle, Menu, Brain, ChevronLeft, PenSquare, ArrowDown } from 'lucide-react';
import { CrisisModal } from './CrisisBanner';
import { Sidebar } from './Sidebar';
import type { SidebarSession } from './Sidebar';
import { ChatHistory } from './ChatHistory';
import type { Message } from './ChatHistory';
import { ChatInput } from './ChatInput';

interface SessionDetails {
  id: string;
  title: string;
  mode?: string;
  summaryShort?: string;
  summaryLong?: string;
  messages: Message[];
}

interface ChatProps {
  token: string;
}

const MOOD_COLORS: Record<string, string> = {
  Happy: '#4A7265',       // Sage Green
  Neutral: '#7A7060',     // Muted Warm Brown
  Anxiolytic: '#8F7AD2',  // Soft Purple
  Stressed: '#C0392B',    // Red Accent
  Depressive: '#3A7CA5',  // Blue Accent
  alegria: '#dfb94d',     // Dourado
  tristeza: '#3b82f6',    // Azul
  surpresa: '#a78bfa',    // Lilás
  medo: '#8b8b93',        // Cinza
  desgosto: '#854d0e',    // Castanho/Oliva
  raiva: '#f43f5e',       // Rosé Vibrante
  Neutro: '#7A7060'
};

// AJUSTE DE ESPAÇAMENTO INFERIOR (Altere este valor para subir ou descer tudo de uma vez!)
// Exemplos de valores: "0px", "4px", "8px" (padrão), "12px", "16px"
const LAYOUT_BOTTOM_SPACING = "18px";

export const Chat: React.FC<ChatProps> = ({ token }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [sidebarSessions, setSidebarSessions] = useState<SidebarSession[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [creatingSession, setCreatingSession] = useState(false);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);

  const [userName, setUserName] = useState('Visitante');
  const [subscriptionPlan, setSubscriptionPlan] = useState('trial');

  // Crisis states
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState('');
  const [crisisResources, setCrisisResources] = useState<any[]>([]);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const touchStartYRef = useRef(0);

  // Voice states and refs
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    const saved = localStorage.getItem('psai_selected_voice');
    if (saved === 'pt-BR-AntonioNeural' || saved === 'male') return 'male';
    return 'female';
  });
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVoiceMessage, setIsVoiceMessage] = useState(false);
  const transcriptionRecognitionRef = useRef<any>(null);
  const isVoiceMessageRef = useRef<boolean>(false);
  const latestAudioTranscriptRef = useRef<string>('');

  const voiceModeActiveRef = useRef(false);
  const sendingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const selectedVoiceRef = useRef(selectedVoice);

  useEffect(() => {
    voiceModeActiveRef.current = voiceModeActive;
  }, [voiceModeActive]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Lock viewport scroll when Chat is active, unlock on unmount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.classList.add('chat-page-active');
    document.body.classList.add('chat-page-active');

    return () => {
      document.documentElement.classList.remove('chat-page-active');
      document.body.classList.remove('chat-page-active');
      
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (transcriptionRecognitionRef.current) {
        try { transcriptionRecognitionRef.current.stop(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Initialize Speech Recognition
  const initSpeechRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'pt-BR';

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text && text.trim()) {
        setInputMsg(text);
        handleSendMessage(text);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão do microfone negada. Ative a permissão do microfone nas configurações do seu navegador para usar o Modo de Conversa.');
      } else if (event.error === 'no-speech') {
        console.log('Nenhuma fala detectada no Modo de Conversa.');
      } else {
        setError(`Erro no reconhecimento de voz: ${event.error}`);
      }
      setVoiceModeActive(false);
    };

    rec.onend = () => {
      console.log('Speech recognition ended');
      setTimeout(() => {
        if (voiceModeActiveRef.current && !isSpeakingRef.current && !sendingRef.current) {
          try {
            rec.start();
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }
      }, 300);
    };

    recognitionRef.current = rec;
    return rec;
  };

  // Start Audio Recording (Modo Áudio / Speech to Text with Voice Response)
  const startTranscription = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz.');
      return;
    }
    
    if (voiceModeActive) {
      setVoiceModeActive(false);
      try { recognitionRef.current?.stop(); } catch(e){}
      try { audioRef.current?.pause(); setIsSpeaking(false); } catch(e){}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';

    rec.onstart = () => {
      setIsTranscribing(true);
      isVoiceMessageRef.current = true;
      setIsVoiceMessage(true);
    };

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const fullText = (finalTranscript + interimTranscript).trim();
      if (fullText) {
        setInputMsg(fullText);
        latestAudioTranscriptRef.current = fullText;
        isVoiceMessageRef.current = true;
        setIsVoiceMessage(true);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Audio recording error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão do microfone negada para gravar áudio.');
      } else if (event.error === 'no-speech') {
        // Silent timeout
      } else {
        setError(`Erro na gravação de áudio: ${event.error}`);
      }
      setIsTranscribing(false);
    };

    rec.onend = () => {
      setIsTranscribing(false);
      // Mantém isVoiceMessageRef ativo porque o texto gerado veio do microfone!
    };

    transcriptionRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error(e);
    }
  };

  const stopTranscription = (autoSend: boolean = false) => {
    if (transcriptionRecognitionRef.current) {
      try {
        transcriptionRecognitionRef.current.stop();
      } catch (e) {}
    }
    setIsTranscribing(false);

    if (autoSend) {
      const text = (latestAudioTranscriptRef.current || inputMsg).trim();
      if (text) {
        handleSendMessage(text, true);
      }
    }
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      // Usuário clicou no botão Parar do microfone enquanto gravava: para e envia com resposta por voz
      stopTranscription(true);
    } else if (isVoiceMessage && inputMsg.trim()) {
      // Usuário já gravou áudio e clica no microfone novamente: envia com resposta por voz
      handleSendMessage(inputMsg, true);
    } else {
      startTranscription();
    }
  };

  // Play TTS
  const playTTS = async (text: string, emotion?: string | null) => {
    setIsSpeaking(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/api/chat/tts`,
        { text, emotion, voice: selectedVoiceRef.current },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        if (voiceModeActiveRef.current && !sendingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error('Error restarting recognition after speaking:', e);
          }
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        if (voiceModeActiveRef.current && !sendingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error('Error restarting recognition after audio error:', e);
          }
        }
      };

      await audio.play();
    } catch (err: any) {
      console.error('Error in playTTS:', err);
      setError('Falha ao gerar ou reproduzir voz (ElevenLabs): ' + (err.response?.data?.message || err.message));
      setIsSpeaking(false);
      if (voiceModeActiveRef.current && !sendingRef.current) {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error('Error restarting recognition after TTS error:', e);
        }
      }
    }
  };

  // Toggle Voice Mode
  const toggleVoiceMode = () => {
    if (isTranscribing) {
      stopTranscription();
    }
    if (voiceModeActive) {
      setVoiceModeActive(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSpeaking(false);
      }
    } else {
      const rec = initSpeechRecognition();
      if (rec) {
        setVoiceModeActive(true);
        setError('');
        if (audioRef.current) {
          audioRef.current.pause();
          setIsSpeaking(false);
        }
        try {
          rec.start();
        } catch (e) {
          console.error('Error starting recognition:', e);
        }
      } else {
        setError('Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome ou Microsoft Edge.');
      }
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('psai_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.name) setUserName(u.name);
        if (u.subscriptionPlan) setSubscriptionPlan(u.subscriptionPlan);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/chat/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(response.data);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar o histórico de conversas deste diário.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSidebarSessions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/chat', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setSidebarSessions(response.data);
      }
    } catch (err) {
      console.error('Failed to load history for sidebar:', err);
    }
  };

  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    setAnimatingMessageId(null);
    if (sessionId) {
      isInitialLoadRef.current = true;
      fetchSessionDetails();
      fetchSidebarSessions();
    }
  }, [sessionId, token]);

  const handleContainerScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Se a distância do fundo for maior que 80px, o usuário rolou para cima
    const isUp = distanceFromBottom > 80;
    if (userScrolledUpRef.current !== isUp) {
      userScrolledUpRef.current = isUp;
      setIsUserScrolledUp(isUp);
    }
  };

  const handleContainerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) {
      // Movimento intencional para cima com o mouse ou trackpad
      userScrolledUpRef.current = true;
      setIsUserScrolledUp(true);
    }
  };

  const handleContainerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const currentY = e.touches[0].clientY;
      // Arrastar para baixo move a lista para mensagens anteriores
      if (currentY - touchStartYRef.current > 8) {
        userScrolledUpRef.current = true;
        setIsUserScrolledUp(true);
      }
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
    // Não força a rolagem para baixo se o usuário tiver rolado para ler mensagens anteriores
    if (!force && userScrolledUpRef.current) {
      return;
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  const handleAutoScrollFromTypewriter = () => {
    // Se o usuário rolou para cima, não sequestra o scroll dele!
    if (userScrolledUpRef.current) return;
    if (messagesContainerRef.current) {
      // Uso direto de scrollTop que é instantâneo e não trava o scroll suave do navegador
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleJumpToRecent = () => {
    userScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    scrollToBottom('smooth', true);
  };

  useEffect(() => {
    if (session?.messages) {
      if (isInitialLoadRef.current && !loading) {
        scrollToBottom('auto', true);
        isInitialLoadRef.current = false;
      } else if (!userScrolledUpRef.current) {
        scrollToBottom('smooth');
      }
    }
  }, [session?.messages, sending, loading]);

  const handleSendMessage = async (textToSend?: string, forceVoiceResponse?: boolean) => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (transcriptionRecognitionRef.current) {
      try { transcriptionRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsTranscribing(false);

    const messageText = (typeof textToSend === 'string' ? textToSend : inputMsg).trim();
    if (!messageText || sending) return;

    // Responde por voz se veio do microfone (Modo Áudio), do modo de conversa contínuo ou forceVoiceResponse
    const shouldRespondWithVoice = voiceModeActiveRef.current || isVoiceMessageRef.current || isVoiceMessage || forceVoiceResponse === true;

    // Reseta flags de áudio para futuras mensagens
    isVoiceMessageRef.current = false;
    setIsVoiceMessage(false);
    latestAudioTranscriptRef.current = '';

    setInputMsg('');
    setSending(true);
    setError('');

    // Reseta estado de scroll para garantir que a nova mensagem do próprio usuário apareça
    userScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    scrollToBottom('smooth', true);

    const temporaryUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: messageText,
      createdAt: new Date().toISOString()
    };

    if (session) {
      setSession({
        ...session,
        messages: [...session.messages, temporaryUserMsg]
      });
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/chat/${sessionId}/message`,
        { 
          content: messageText,
          generateAudio: shouldRespondWithVoice,
          voice: selectedVoiceRef.current
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { userMessage, aiMessage } = response.data;

      if (session) {
        setSession((prev) => {
          if (!prev) return null;
          const filtered = prev.messages.filter((m) => m.id !== temporaryUserMsg.id);
          return {
            ...prev,
            messages: [...filtered, userMessage, aiMessage]
          };
        });
      }
      setAnimatingMessageId(aiMessage.id);
      fetchSidebarSessions();

      if (shouldRespondWithVoice) {
        if (aiMessage.audioBase64) {
          try {
            console.log('[Audio Mode] Reproduzindo resposta em voz da IA...');
            const binaryString = window.atob(aiMessage.audioBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const isWav = bytes.length >= 4 &&
              String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF';
            const mimeType = isWav ? 'audio/wav' : 'audio/mpeg';

            const blob = new Blob([bytes.buffer], { type: mimeType });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            setIsSpeaking(true);
            if (audioRef.current) {
              audioRef.current.pause();
            }
            audioRef.current = audio;

            audio.onended = () => {
              setIsSpeaking(false);
              // Only auto-restart recognition if continuous interactive Voice Mode is active
              if (voiceModeActiveRef.current && !sendingRef.current) {
                try { recognitionRef.current?.start(); } catch (e) {
                  console.error('Error restarting recognition:', e);
                }
              }
            };

            audio.onerror = () => {
              setIsSpeaking(false);
              if (voiceModeActiveRef.current && !sendingRef.current) {
                try { recognitionRef.current?.start(); } catch (e) {
                  console.error('Error restarting recognition:', e);
                }
              }
            };

            await audio.play();
          } catch (audioPlayErr) {
            console.error('Error playing embedded base64 audio, falling back to HTTP request:', audioPlayErr);
            playTTS(aiMessage.content, aiMessage.sentiment);
          }
        } else {
          playTTS(aiMessage.content, aiMessage.sentiment);
        }
      }
    } catch (err: any) {
      console.error(err);
      
      setVoiceModeActive(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSpeaking(false);
      }

      if (err.response && (err.response.status === 451 || err.response.data?.crisis)) {
        const crisisData = err.response.data;
        setCrisisMessage(crisisData.message);
        setCrisisResources(crisisData.resources || []);
        setCrisisOpen(true);
        
        if (session) {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== temporaryUserMsg.id)
            };
          });
        }
      } else {
        setError(err.response?.data?.message || 'Falha ao enviar mensagem para a IA.');
        if (session) {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== temporaryUserMsg.id)
            };
          });
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      setCreatingSession(true);
      const defaultMode = localStorage.getItem('psai_default_mode') || 'natural';
      const response = await axios.post(
        'http://localhost:5000/api/chat',
        { mode: defaultMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.id) {
        navigate(`/chat/${response.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar uma nova sessão de reflexão.');
    } finally {
      setCreatingSession(false);
    }
  };

  const getUserSentimentLabel = (category: string) => {
    const labels: Record<string, string> = {
      Neutral: 'Neutro',
      Anxiolytic: 'Ansioso',
      Depressive: 'Triste',
      Happy: 'Feliz',
      Stressed: 'Estressado',
      alegria: 'Feliz',
      tristeza: 'Triste',
      surpresa: 'Surpreso',
      medo: 'Apreensivo',
      desgosto: 'Decepcionado',
      raiva: 'Irritado',
      Neutro: 'Neutro'
    };
    return labels[category] || category;
  };

  const getAiTherapeuticLabel = (category: string) => {
    const labels: Record<string, string> = {
      Neutral: 'Foco & Atenção Plena',
      Anxiolytic: 'Segurança & Presença',
      Depressive: 'Empatia & Escuta Ativa',
      Happy: 'Acolhimento & Leveza',
      Stressed: 'Cuidado & Descompressão',
      alegria: 'Acolhimento & Leveza',
      tristeza: 'Empatia & Escuta Ativa',
      surpresa: 'Segurança & Presença',
      medo: 'Segurança & Presença',
      desgosto: 'Cuidado & Descompressão',
      raiva: 'Cuidado & Descompressão',
      Neutro: 'Foco & Atenção Plena'
    };
    return labels[category] || category;
  };

  const getMoodColor = (moodName: string) => {
    const rawMood = Object.keys(MOOD_COLORS).find(
      (key) => moodName.toLowerCase().includes(key.toLowerCase())
    );
    return rawMood ? MOOD_COLORS[rawMood] : '#7A7060';
  };

  const lastMessage = session?.messages && session.messages.length > 0 
    ? session.messages[session.messages.length - 1] 
    : null;
  const activeEmotion = lastMessage?.sentiment || 'Neutral';
  const activeEmotionColor = getMoodColor(activeEmotion);

  return (
    <div className="relative flex h-screen bg-brand-bg overflow-hidden text-brand-text" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Background Emotional Aura Glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.035] blur-[130px] pointer-events-none transition-all duration-1000 ease-in-out z-0"
        style={{ backgroundColor: activeEmotionColor }}
      />
      
      {/* Crisis Emergency Modal Overlay */}
      <CrisisModal
        isOpen={crisisOpen}
        onClose={() => setCrisisOpen(false)}
        message={crisisMessage}
        resources={crisisResources}
      />

      {/* SIDEBAR HISTORY */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarSessions={sidebarSessions}
        sessionId={sessionId}
        creatingSession={creatingSession}
        onCreateSession={handleCreateSession}
        userName={userName}
        subscriptionPlan={subscriptionPlan}
        LAYOUT_BOTTOM_SPACING={LAYOUT_BOTTOM_SPACING}
      />

      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-10 md:hidden animate-fade-in"
        />
      )}

      {/* MAIN CONVERSATION AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        
        {/* Top Header Bar */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-brand-border flex-shrink-0 bg-brand-bg/90 backdrop-blur-md z-10 select-none">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-brand-textMuted hover:text-brand-text transition-colors rounded-lg hover:bg-brand-card cursor-pointer"
            >
              <Menu size={18} />
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-brand-textMuted hover:text-brand-text transition-colors rounded-lg hover:bg-brand-card cursor-pointer"
            title="Voltar ao Painel"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-brand-gold flex items-center justify-center">
                <Brain size={10} className="text-brand-bg" />
              </div>
              <span className="text-sm font-medium text-brand-text">PSAI</span>
              <span className="text-xs text-brand-textMuted font-light hidden sm:inline">— Agente Psicológico</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-1 select-none">
            <span className="text-[10px] uppercase tracking-wider text-brand-textMuted font-sans hidden md:inline">Voz:</span>
            <select
              value={selectedVoice}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedVoice(val);
                localStorage.setItem('psai_selected_voice', val);
              }}
              className="bg-brand-card border border-brand-border text-brand-text text-[10px] uppercase tracking-wider font-semibold rounded-xl px-2.5 py-1 focus:outline-none focus:border-brand-gold/50 cursor-pointer font-sans transition-all duration-200"
            >
              <option value="female">Alice (Feminina)</option>
              <option value="male">Antônio (Masculina)</option>
            </select>
          </div>

          <button
            onClick={handleCreateSession}
            className="p-1.5 text-brand-textMuted hover:text-brand-text transition-colors rounded-lg hover:bg-brand-card cursor-pointer"
            title="Nova conversa"
          >
            <PenSquare size={18} />
          </button>
        </header>

        {/* Warning Banner */}
        <div className="border-b border-brand-border/30 px-4 py-2 text-[9px] text-brand-textMuted/80 uppercase tracking-wider flex items-center justify-center gap-2 font-sans select-none flex-shrink-0 bg-brand-card/10">
          <HelpCircle size={12} className="text-brand-gold flex-shrink-0" />
          <span>
            <strong>Aviso de Segurança:</strong> O PSAI não substitui suporte profissional. Em caso de crise, ligue <strong>CVV 188</strong>, <strong>SAMU 192</strong> ou acesse <a href="https://www.cvv.org.br" target="_blank" rel="noreferrer" className="underline hover:text-brand-gold font-bold">cvv.org.br</a>.
          </span>
        </div>

        {/* Chat Messages area */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs mt-4 mb-0 font-sans text-left w-[calc(100%-2rem)]">
            {error}
          </div>
        )}

        <ChatHistory
          ref={messagesContainerRef}
          messages={session ? session.messages : []}
          loading={loading}
          sending={sending}
          userName={userName}
          getMoodColor={getMoodColor}
          getUserSentimentLabel={getUserSentimentLabel}
          getAiTherapeuticLabel={getAiTherapeuticLabel}
          onSendQuickPrompt={handleSendMessage}
          messageEndRef={messageEndRef}
          animatingMessageId={animatingMessageId}
          onAnimationComplete={() => setAnimatingMessageId(null)}
          onAutoScroll={handleAutoScrollFromTypewriter}
          onScroll={handleContainerScroll}
          onWheel={handleContainerWheel}
          onTouchStart={handleContainerTouchStart}
          onTouchMove={handleContainerTouchMove}
        />

        {/* Botão flutuante: Rolar para mensagens recentes */}
        {isUserScrolledUp && (
          <div className="flex justify-center -mb-2 z-20 select-none animate-fade-in">
            <button
              onClick={handleJumpToRecent}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-card/95 border border-brand-gold/40 text-brand-gold hover:text-brand-text hover:border-brand-gold hover:bg-brand-card shadow-lg text-xs font-sans backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ArrowDown size={13} className="animate-bounce" />
              <span>Ir para mensagens recentes</span>
            </button>
          </div>
        )}

        <ChatInput
          inputMsg={inputMsg}
          setInputMsg={setInputMsg}
          isVoiceMessage={isVoiceMessage}
          onUserType={(val) => {
            setInputMsg(val);
            isVoiceMessageRef.current = false;
            setIsVoiceMessage(false);
            latestAudioTranscriptRef.current = '';
          }}
          sending={sending}
          voiceModeActive={voiceModeActive}
          isSpeaking={isSpeaking}
          isTranscribing={isTranscribing}
          onSendMessage={() => handleSendMessage(inputMsg, isVoiceMessage || isVoiceMessageRef.current || isTranscribing)}
          onToggleVoiceMode={toggleVoiceMode}
          onToggleTranscription={toggleTranscription}
          LAYOUT_BOTTOM_SPACING={LAYOUT_BOTTOM_SPACING}
        />
      </div>
    </div>
  );
};
