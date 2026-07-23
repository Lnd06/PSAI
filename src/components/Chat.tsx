import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Send, Sparkles, Loader2, Trash2, Settings, 
  X, User, Key, Bot, Heart, MessageSquare, ChevronRight, 
  BookOpen, Shield, ClipboardList
} from 'lucide-react';
import { UserProfile } from '../App';
import { Session, LocalMessage } from './Dashboard';
import { CrisisModal, EmergencyResource } from './CrisisBanner';
import { Logo } from './Logo';
import { 
  generateTherapeuticResponse, 
  analyzeSentiment, 
  generateSessionSummaries, 
  extractPersonalFacts, 
  ChatMessageContext 
} from '../services/aiService';

const CRISIS_PATTERNS = [
  /\bquero\s+(me\s+)?(matar|suicidar|cortar|machucar)\b/i,
  /\bpensando\s+em\s+(me\s+)?(matar|suicidar|cortar|machucar)\b/i,
  /\bquero\s+morrer\b/i,
  /\bpensando\s+em\s+morrer\b/i,
  /\btirar\s+(a\s+)?minha\s+vida\b/i,
  /\b(não|nao)\s+quero\s+mais\s+(viver|existir)\b/i,
  /\b(dar\s+fim\s+a\s+tudo|desistir\s+de\s+viver)\b/i,
  /\bsuic[íi]dio\b/i,
  /\bauto(-)?mutila[çc][ãa]o\b/i,
  /\bme\s+auto\s*mutilar\b/i,
  /\bi\s+want\s+to\s+(die|kill\s+myself|hurt\s+myself|suicide)\b/i
];

const EMERGENCY_RESOURCES: EmergencyResource[] = [
  {
    name: 'Centro de Valorização da Vida (CVV)',
    contact: 'Ligue 188',
    description: 'Atendimento gratuito, confidencial e disponível 24 horas por telefone e chat para apoio emocional e prevenção do suicídio.',
    link: 'https://www.cvv.org.br'
  },
  {
    name: 'SAMU (Serviço de Atendimento Móvel de Urgência)',
    contact: 'Ligue 192',
    description: 'Canal público do SUS para emergências médicas imediatas e resgates críticos.'
  },
  {
    name: 'CAPS (Centro de Atenção Psicossocial)',
    contact: 'Canais do SUS',
    description: 'Unidades de saúde mental públicas em todo o Brasil para consultas, terapias e acompanhamentos especializados.'
  }
];

interface ChatProps {
  profile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
}

export const Chat: React.FC<ChatProps> = ({ profile, onUpdateProfile }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Sessions and messages list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // Modals status
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');

  // Stats fields calculated for Summary panel
  const [avgScore, setAvgScore] = useState(50);
  const [dominantMood, setDominantMood] = useState('Neutro');
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [chartData, setChartData] = useState<{ date: string; score: number }[]>([]);

  // Settings edit form states
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age || '');
  const [editOccupation, setEditOccupation] = useState(profile.occupation || '');
  const [editLifeContext, setEditLifeContext] = useState(profile.lifeContext || '');
  const [editChallenges, setEditChallenges] = useState(profile.challenges || '');
  const [editKey, setEditKey] = useState(profile.openRouterApiKey);
  const [editModel, setEditModel] = useState(profile.aiModel);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const moodTranslations: Record<string, string> = {
    Neutral: 'Neutro', Anxiolytic: 'Ansioso', Depressive: 'Triste', Happy: 'Feliz', Stressed: 'Estressado'
  };

  // Load profile values into editor on profile change
  useEffect(() => {
    setEditName(profile.name);
    setEditAge(profile.age || '');
    setEditOccupation(profile.occupation || '');
    setEditLifeContext(profile.lifeContext || '');
    setEditChallenges(profile.challenges || '');
    setEditKey(profile.openRouterApiKey);
    setEditModel(profile.aiModel);
  }, [profile]);

  // Load Sessions and calculations
  const loadSessionsData = () => {
    const storedSessions = localStorage.getItem('psai_sessions');
    let sessionList: Session[] = [];
    if (storedSessions) {
      try {
        sessionList = JSON.parse(storedSessions);
        sessionList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSessions(sessionList);
      } catch {}
    }

    // Load statistics
    const storedMessages = localStorage.getItem('psai_messages');
    let msgs: LocalMessage[] = [];
    if (storedMessages) { try { msgs = JSON.parse(storedMessages); } catch {} }
    
    // Filter active messages
    const activeSessionMsgs = sessionId 
      ? msgs.filter((m) => m.sessionId === sessionId) 
      : [];
    setMessages(activeSessionMsgs);

    const userMsgs = msgs.filter((m) => m.sender === 'user' && m.sentiment);
    setTotalMsgs(userMsgs.length);

    if (userMsgs.length > 0) {
      const total = userMsgs.reduce((s, m) => s + (m.sentimentScore || 50), 0);
      setAvgScore(Math.round(total / userMsgs.length));

      const counts: Record<string, number> = { Neutral: 0, Anxiolytic: 0, Depressive: 0, Happy: 0, Stressed: 0 };
      userMsgs.forEach((m) => { if (m.sentiment && m.sentiment in counts) counts[m.sentiment]++; });
      let dom = 'Neutral'; let max = 0;
      Object.keys(counts).forEach((k) => { if (counts[k] > max) { max = counts[k]; dom = k; } });
      setDominantMood(moodTranslations[dom] || 'Neutro');

      setPieData(Object.keys(counts).map((k) => ({ name: moodTranslations[k] || k, value: counts[k] })).filter((i) => i.value > 0));

      const dateMap: Record<string, { sum: number; count: number }> = {};
      userMsgs.forEach((m) => {
        const d = new Date(m.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!dateMap[d]) dateMap[d] = { sum: 0, count: 0 };
        dateMap[d].sum += m.sentimentScore || 50;
        dateMap[d].count++;
      });
      setChartData(Object.keys(dateMap).slice(-7).map((d) => ({ date: d, score: Math.round(dateMap[d].sum / dateMap[d].count) })));
    } else {
      setAvgScore(50);
      setDominantMood('Neutro');
      setPieData([]);
      setChartData([]);
    }

    // Set current active session
    if (sessionId && sessionList.length > 0) {
      const current = sessionList.find((s) => s.id === sessionId);
      if (current) {
        setSession(current);
      } else {
        setSession(null);
      }
    } else if (!sessionId && sessionList.length > 0) {
      // Auto-load latest session on mount if route is root
      navigate(`/chat/${sessionList[0].id}`, { replace: true });
    } else {
      setSession(null);
    }
  };

  useEffect(() => {
    loadSessionsData();
  }, [sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStartSession = (mode: 'reflective' | 'natural') => {
    setCreatingSession(true);
    setTimeout(() => {
      const id = 'session_' + Date.now();
      const sess: Session = {
        id,
        title: mode === 'natural' ? 'Conversa Natural' : 'Reflexão TCC',
        mode,
        summaryShort: 'Novo registro',
        summaryLong: '',
        updatedAt: new Date().toISOString()
      };
      
      const stored = localStorage.getItem('psai_sessions');
      let list: Session[] = [];
      if (stored) { try { list = JSON.parse(stored); } catch {} }
      list.unshift(sess);
      localStorage.setItem('psai_sessions', JSON.stringify(list));
      
      setCreatingSession(false);
      navigate(`/chat/${id}`);
    }, 400);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Excluir esta reflexão do histórico?')) {
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      localStorage.setItem('psai_sessions', JSON.stringify(updated));

      const storedMsgs = localStorage.getItem('psai_messages');
      if (storedMsgs) {
        try {
          const list: LocalMessage[] = JSON.parse(storedMsgs);
          localStorage.setItem('psai_messages', JSON.stringify(list.filter((m) => m.sessionId !== id)));
        } catch {}
      }

      if (sessionId === id) {
        if (updated.length > 0) {
          navigate(`/chat/${updated[0].id}`);
        } else {
          navigate('/');
        }
      } else {
        loadSessionsData();
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: editName.trim() || 'Paciente',
      age: editAge.trim(),
      occupation: editOccupation.trim(),
      lifeContext: editLifeContext.trim(),
      challenges: editChallenges.trim(),
      openRouterApiKey: editKey.trim(),
      aiModel: editModel.trim() || 'nousresearch/hermes-3-llama-3-8b'
    });
    setIsSettingsOpen(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !session || !sessionId) return;

    const messageText = inputText.trim();
    setInputText('');

    // Safety crisis scan
    for (const pattern of CRISIS_PATTERNS) {
      if (pattern.test(messageText)) {
        const logEntry = { timestamp: new Date().toISOString(), sessionId, contentLength: messageText.length };
        const storedLogs = localStorage.getItem('psai_crisis_logs');
        let logs = [];
        if (storedLogs) { try { logs = JSON.parse(storedLogs); } catch {} }
        logs.push(logEntry);
        localStorage.setItem('psai_crisis_logs', JSON.stringify(logs));

        setCrisisMessage(
          `Identificamos palavras sensíveis relacionadas à ideação suicida ou automutilação. Como assistente artificial, não realizamos intervenções de emergência. Por favor, procure ajuda pelos canais a seguir.`
        );
        setIsCrisisOpen(true);
        return;
      }
    }

    const userMsgId = 'msg_' + Date.now();
    const newUserMessage: LocalMessage = {
      id: userMsgId,
      sessionId,
      sender: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      sentiment: 'Neutral',
      sentimentScore: 50
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    saveMessagesToStorage(newUserMessage);
    setIsTyping(true);

    try {
      // 1. Analyze user message sentiment
      const { sentiment, score } = await analyzeSentiment(
        messageText,
        profile.openRouterApiKey,
        profile.aiModel
      );

      setMessages((prev) => 
        prev.map((msg) => msg.id === userMsgId ? { ...msg, sentiment, sentimentScore: score } : msg)
      );
      updateMessageSentimentInStorage(userMsgId, sentiment, score);

      // 2. Build history payload
      const historyContext: ChatMessageContext[] = updatedMessages.map((m) => ({
        sender: m.sender,
        content: m.content
      }));

      // 3. Request therapeutic reply
      const aiResponse = await generateTherapeuticResponse(
        historyContext,
        messageText,
        session.mode,
        profile.openRouterApiKey,
        profile.aiModel,
        session.summaryShort,
        session.summaryLong,
        profile
      );

      const newAiMessage: LocalMessage = {
        id: 'msg_ai_' + Date.now(),
        sessionId,
        sender: 'ai',
        content: aiResponse.trim(),
        timestamp: new Date().toISOString()
      };

      const finalMessages = [
        ...updatedMessages.map((m) => m.id === userMsgId ? { ...m, sentiment, sentimentScore: score } : m),
        newAiMessage
      ];
      setMessages(finalMessages);
      saveMessagesToStorage(newAiMessage);

      // 4. Update session summaries in background
      triggerSummaryUpdate(finalMessages);

      // 5. Extract personal facts & update user profile memory array
      if (profile.openRouterApiKey) {
        extractAndSaveNewMemories(finalMessages);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const extractAndSaveNewMemories = async (chatMsgs: LocalMessage[]) => {
    const historyContext: ChatMessageContext[] = chatMsgs.map((m) => ({
      sender: m.sender,
      content: m.content
    }));

    try {
      const extracted = await extractPersonalFacts(
        historyContext,
        profile.memories || [],
        profile.openRouterApiKey,
        profile.aiModel
      );

      if (extracted && extracted.length > 0) {
        const mergedMemories = [...(profile.memories || []), ...extracted];
        onUpdateProfile({
          ...profile,
          memories: mergedMemories
        });
      }
    } catch (e) {
      console.error('Failed to extract facts in background:', e);
    }
  };

  const saveMessagesToStorage = (newMsg: LocalMessage) => {
    const stored = localStorage.getItem('psai_messages');
    let list: LocalMessage[] = [];
    if (stored) { try { list = JSON.parse(stored); } catch {} }
    list.push(newMsg);
    localStorage.setItem('psai_messages', JSON.stringify(list));
  };

  const updateMessageSentimentInStorage = (msgId: string, sentiment: string, score: number) => {
    const stored = localStorage.getItem('psai_messages');
    if (stored) {
      try {
        const list: LocalMessage[] = JSON.parse(stored);
        const updated = list.map((m) => m.id === msgId ? { ...m, sentiment, sentimentScore: score } : m);
        localStorage.setItem('psai_messages', JSON.stringify(updated));
      } catch {}
    }
  };

  const triggerSummaryUpdate = async (msgList: LocalMessage[]) => {
    if (!session || !sessionId) return;
    const historyContext: ChatMessageContext[] = msgList.map((m) => ({
      sender: m.sender,
      content: m.content
    }));

    try {
      const { summaryShort, summaryLong } = await generateSessionSummaries(
        historyContext,
        profile.openRouterApiKey,
        profile.aiModel
      );

      const storedSessions = localStorage.getItem('psai_sessions');
      if (storedSessions) {
        const sessionList: Session[] = JSON.parse(storedSessions);
        const updatedList = sessionList.map((s) => 
          s.id === sessionId 
            ? { ...s, summaryShort, summaryLong, updatedAt: new Date().toISOString() } 
            : s
        );
        localStorage.setItem('psai_sessions', JSON.stringify(updatedList));
        setSession((prev) => prev ? { ...prev, summaryShort, summaryLong } : null);
        setSessions(updatedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      }
    } catch {}
  };

  const isNatural = session?.mode === 'natural';

  const getSentimentBadge = (code?: string) => {
    if (!code) return null;
    const mapping: Record<string, { label: string; className: string }> = {
      Neutral: { label: 'Neutro', className: 'bg-zen-surface text-zen-textMuted border-zen-border' },
      Anxiolytic: { label: 'Ansioso 💛', className: 'bg-zen-warningSoft text-yellow-600 border-yellow-200' },
      Depressive: { label: 'Triste 💙', className: 'bg-zen-accentSoft text-zen-accent border-zen-accent border-opacity-20' },
      Happy: { label: 'Feliz 💚', className: 'bg-zen-mintSoft text-emerald-600 border-emerald-200' },
      Stressed: { label: 'Estressado ❤️', className: 'bg-zen-dangerSoft text-red-500 border-red-200' }
    };
    const item = mapping[code] || mapping.Neutral;
    return <span className={`text-[8px] px-2 py-0.5 rounded-full border font-semibold ${item.className}`}>{item.label}</span>;
  };

  const PIE_COLORS: Record<string, string> = { 
    Neutro: '#A0A5BD', Ansioso: '#FBBF24', Triste: '#6C63FF', Feliz: '#34D399', Estressado: '#F87171' 
  };

  return (
    <div className="min-h-screen flex bg-zen-bg select-none">
      
      {/* LEFT SIDEBAR MENU */}
      <aside className="w-80 border-r border-zen-border bg-white flex flex-col justify-between h-screen shrink-0">
        
        {/* Top Branding Section */}
        <div className="p-5 border-b border-zen-border">
          <div className="flex items-center gap-3 mb-5">
            <Logo size={42} className="animate-float" />
            <div>
              <h1 className="text-base font-display font-bold text-zen-text flex items-center gap-1.5">
                PSAI
                <span className="badge-accent text-[8px] px-1.5 py-0.5">Web</span>
              </h1>
              <p className="text-[10px] text-zen-textMuted font-medium">Assistente de Equilíbrio Emocional</p>
            </div>
          </div>

          {/* New Session Options */}
          <div className="space-y-2">
            <button 
              onClick={() => handleStartSession('reflective')}
              disabled={creatingSession}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left bg-zen-accentSoft text-zen-accent hover:bg-zen-accent hover:text-white transition-all duration-200 font-semibold text-xs active:scale-[0.98] shadow-sm"
            >
              <span className="flex items-center gap-2">🍃 Iniciar Reflexão TCC</span>
              <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => handleStartSession('natural')}
              disabled={creatingSession}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left bg-zen-warmSoft text-zen-warm hover:bg-zen-warm hover:text-white transition-all duration-200 font-semibold text-xs active:scale-[0.98] shadow-sm"
            >
              <span className="flex items-center gap-2">💜 Novo Acolhimento</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* History Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-[10px] font-semibold text-zen-textMuted px-2 uppercase tracking-wider mb-2">Reflexões Recentes</p>
          
          {sessions.length > 0 ? (
            sessions.map((s) => {
              const isActive = s.id === sessionId;
              return (
                <div 
                  key={s.id} 
                  onClick={() => navigate(`/chat/${s.id}`)}
                  className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'border-zen-accent bg-zen-accentSoft bg-opacity-20 text-zen-accent font-medium shadow-soft' 
                      : 'border-transparent hover:bg-zen-surface text-zen-textSecondary'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold truncate max-w-[120px]">{s.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        s.mode === 'natural' ? 'bg-zen-warmSoft text-zen-warm' : 'bg-zen-accentSoft text-zen-accent'
                      }`}>
                        {s.mode === 'natural' ? 'Acolher' : 'TCC'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zen-textMuted truncate leading-tight">{s.summaryShort}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-zen-dangerSoft hover:text-zen-danger text-zen-textMuted transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-zen-textMuted flex flex-col items-center gap-2 border border-dashed border-zen-border rounded-2xl mx-1">
              <MessageSquare size={20} className="opacity-40" />
              <p className="text-[10px] max-w-[140px] leading-relaxed">Nenhuma conversa recente encontrada.</p>
            </div>
          )}
        </div>

        {/* Bottom Profile and Controls Section */}
        <div className="p-4 border-t border-zen-border bg-zen-surface bg-opacity-40 space-y-2.5">
          {/* Resumo sobre você button */}
          <button
            onClick={() => {
              setActiveTab('profile');
              setIsSummaryOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-zen-border text-zen-textSecondary hover:text-zen-accent hover:border-zen-accentSoft hover:shadow-soft transition-all text-xs font-semibold"
          >
            <ClipboardList size={14} className="text-zen-accent" />
            <span>Resumo sobre você</span>
          </button>

          {/* User profile detail block */}
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zen-accentSoft to-zen-warmSoft text-zen-accent font-bold text-xs flex items-center justify-center border border-white shadow-sm">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zen-text truncate">{profile.name}</p>
                <p className="text-[9px] text-zen-textMuted truncate">{profile.occupation || 'Diário de Bem-Estar'}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-zen-textSecondary hover:bg-white hover:text-zen-text hover:shadow-soft transition-all"
              title="Configurar Perfil e IA"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {session ? (
          // Active Chat Screen
          <div className="flex-1 flex flex-col h-full justify-between">
            {/* Active Session Header */}
            <header className="p-4 bg-white border-b border-zen-border flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2.5">
                <Logo size={24} />
                <div>
                  <h2 className="text-xs font-display font-bold text-zen-text flex items-center gap-2">
                    {session.title}
                    <span className="text-[9px] font-normal text-zen-textMuted">· atualizado há pouco</span>
                  </h2>
                  <p className="text-[9px] text-zen-textMuted leading-tight">
                    {isNatural ? 'Modo de Conversação Natural Ativo' : 'Modo de Questionamento Clínico TCC'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {session.summaryShort && session.summaryShort !== 'Novo registro' && (
                  <span className="text-[9px] text-zen-textSecondary bg-zen-surface border border-zen-border px-2.5 py-1 rounded-full font-medium">
                    Foco: {session.summaryShort}
                  </span>
                )}
                <span className={isNatural ? 'badge-warm' : 'badge-accent'}>
                  {isNatural ? '💜 Acolhimento' : '🍃 Reflexão TCC'}
                </span>
              </div>
            </header>

            {/* Message History Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text bg-[#F8F9FC]">
              {messages.length === 0 && (
                <div className="flex justify-center py-10">
                  <div className={`max-w-md text-center p-6 rounded-3xl border bg-white shadow-soft`}>
                    <Sparkles className={isNatural ? 'text-zen-warm mx-auto animate-float' : 'text-zen-accent mx-auto animate-float'} size={24} />
                    <h3 className="text-xs font-display font-bold text-zen-text mt-3 mb-1">
                      Início da sessão de {isNatural ? 'Acolhimento' : 'Reflexão TCC'}
                    </h3>
                    <p className="text-[10px] text-zen-textSecondary leading-relaxed">
                      {isNatural
                        ? 'Escreva livremente sobre suas dores, frustrações ou o que está no seu peito agora. O PSAI irá acolher você e validar suas emoções sem julgamento.'
                        : 'Como a TCC analisa pensamentos disfuncionais, descreva uma situação recente que te afligiu e o primeiro pensamento automático que passou pela sua cabeça.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Message bubbles list */}
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-[75%] rounded-3xl p-4 shadow-soft border ${
                      isUser
                        ? 'bg-white border-zen-border text-zen-text'
                        : isNatural
                          ? 'bg-zen-warmSoft border-zen-warm border-opacity-10 text-zen-text'
                          : 'bg-zen-accentSoft bg-opacity-35 border-zen-accent border-opacity-10 text-zen-text'
                    }`}>
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
                      
                      <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-zen-border border-opacity-40">
                        <span className="text-[8px] text-zen-textMuted font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isUser && msg.sentiment && getSentimentBadge(msg.sentiment)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing simulation indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className={`rounded-3xl px-4 py-3 flex items-center gap-1.5 border ${
                    isNatural ? 'bg-zen-warmSoft border-zen-warm/10' : 'bg-zen-accentSoft bg-opacity-35 border-zen-accent/10'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full dot-typing ${isNatural ? 'bg-zen-warm' : 'bg-zen-accent'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full dot-typing ${isNatural ? 'bg-zen-warm' : 'bg-zen-accent'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full dot-typing ${isNatural ? 'bg-zen-warm' : 'bg-zen-accent'}`} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar Form */}
            <footer className="p-4 bg-white border-t border-zen-border shrink-0">
              <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
                <input
                  type="text"
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isNatural ? 'Como está seu coração agora? Desabafe...' : 'Descreva a situação ou pensamento automático...'}
                  className="w-full pl-5 pr-14 py-4 rounded-2xl border border-zen-border bg-zen-surface bg-opacity-50 focus:border-zen-accent focus:ring-2 focus:ring-zen-accentSoft outline-none text-xs md:text-sm text-zen-text placeholder:text-zen-textMuted transition-all duration-200"
                />
                <button 
                  type="submit" 
                  disabled={isTyping}
                  className={`absolute right-2 top-2 p-2.5 rounded-xl text-white transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                    isNatural ? 'bg-zen-warm shadow-warm' : 'bg-zen-accent shadow-accent'
                  }`}
                >
                  {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </footer>
          </div>
        ) : (
          // Empty State Welcome Screen
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-text bg-[#F8F9FC]">
            <div className="max-w-md p-10 card flex flex-col items-center gap-4 bg-white">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-zen-accentSoft to-zen-warmSoft flex items-center justify-center shadow-soft">
                <Logo size={36} className="animate-float" />
              </div>
              
              <h2 className="text-xl font-display font-bold text-zen-text">
                Olá, {profile.name}!
              </h2>
              
              <p className="text-xs text-zen-textSecondary leading-relaxed">
                Eu sou o seu diário terapêutico inteligente local. Todas as conversas são processadas 
                online por API, mas salvas unicamente em seu computador em formato JSON de forma segura.
              </p>

              <div className="w-full border-t border-zen-border my-2" />

              <h4 className="text-xs font-bold text-zen-textSecondary uppercase tracking-wider block">Selecione para começar:</h4>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                <button
                  onClick={() => handleStartSession('reflective')}
                  className="p-4 rounded-2xl border border-zen-border text-center hover:border-zen-accent hover:bg-zen-accentSoft hover:bg-opacity-25 transition-all group"
                >
                  <span className="text-base block mb-1">🍃</span>
                  <span className="text-[11px] font-bold block text-zen-text group-hover:text-zen-accent">Reflexão TCC</span>
                  <span className="text-[9px] text-zen-textMuted block leading-tight mt-1">Modificar pensamentos ruins</span>
                </button>

                <button
                  onClick={() => handleStartSession('natural')}
                  className="p-4 rounded-2xl border border-zen-border text-center hover:border-zen-warm hover:bg-zen-warmSoft transition-all group"
                >
                  <span className="text-base block mb-1">💜</span>
                  <span className="text-[11px] font-bold block text-zen-text group-hover:text-zen-warm">Acolhimento</span>
                  <span className="text-[9px] text-zen-textMuted block leading-tight mt-1">Desabafo empático e leve</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* "RESUMO SOBRE VOCÊ" DIALOG MODAL */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-35 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto card p-6 bg-white animate-slide-up flex flex-col">
            {/* Close */}
            <button 
              onClick={() => setIsSummaryOpen(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zen-textMuted hover:bg-zen-surface hover:text-zen-text transition-all"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-zen-border shrink-0">
              <div className="w-9 h-9 rounded-xl bg-zen-accentSoft flex items-center justify-center">
                <ClipboardList className="text-zen-accent" size={18} />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-zen-text">Resumo Sobre Você</h2>
                <p className="text-[10px] text-zen-textMuted">Fatos aprendidos e insights da inteligência artificial</p>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex gap-2 p-1 bg-zen-surface rounded-2xl mb-6 w-fit shrink-0">
              <button 
                type="button" 
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-4 text-xs rounded-xl font-semibold transition-all ${
                  activeTab === 'profile' ? 'bg-white text-zen-accent shadow-soft' : 'text-zen-textMuted hover:text-zen-textSecondary'
                }`}
              >
                📝 Perfil & Memórias
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-4 text-xs rounded-xl font-semibold transition-all ${
                  activeTab === 'stats' ? 'bg-white text-zen-accent shadow-soft' : 'text-zen-textMuted hover:text-zen-textSecondary'
                }`}
              >
                📊 Estatísticas de Humor
              </button>
            </div>

            {/* Content area based on selected tab */}
            <div className="flex-1 min-h-[380px] overflow-y-auto pr-1">
              
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left sub-column: Basic User Profile Info */}
                  <div className="md:col-span-1 space-y-4">
                    <div className="p-4 rounded-2xl bg-zen-surface bg-opacity-35 border border-zen-border">
                      <h4 className="label-zen text-zen-accent mb-3 flex items-center gap-1.5">
                        <User size={12} /> Informações Básicas
                      </h4>
                      
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-zen-textMuted block font-medium">Nome</span>
                          <span className="text-zen-text font-semibold">{profile.name}</span>
                        </div>
                        <div>
                          <span className="text-zen-textMuted block font-medium">Idade</span>
                          <span className="text-zen-text font-semibold">{profile.age ? `${profile.age} anos` : 'Não informada'}</span>
                        </div>
                        <div>
                          <span className="text-zen-textMuted block font-medium">Profissão</span>
                          <span className="text-zen-text font-semibold">{profile.occupation || 'Não informada'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-zen-surface bg-opacity-35 border border-zen-border">
                      <h4 className="label-zen text-zen-accent mb-2">Desafios de Foco</h4>
                      <p className="text-xs text-zen-textSecondary leading-relaxed italic">
                        {profile.challenges || 'Nenhum desafio principal cadastrado no perfil.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zen-surface bg-opacity-35 border border-zen-border">
                      <h4 className="label-zen text-zen-accent mb-2">Contexto Pessoal</h4>
                      <p className="text-xs text-zen-textSecondary leading-relaxed italic">
                        {profile.lifeContext || 'Sem informações de contexto pessoal gravadas.'}
                      </p>
                    </div>
                  </div>

                  {/* Right sub-column: Learned facts/Memories */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="p-5 rounded-2xl border border-zen-border bg-white shadow-soft h-full">
                      <h4 className="label-zen text-zen-accent mb-4 flex items-center gap-1.5">
                        <Logo size={14} className="animate-pulse" /> Memórias do Diário (JSON)
                      </h4>

                      {profile.memories && profile.memories.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {profile.memories.map((m, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-zen-surface bg-opacity-30 border border-zen-borderLight text-xs text-zen-textSecondary leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-zen-accent mt-1.5 shrink-0" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 text-zen-textMuted flex flex-col items-center gap-2 border border-dashed border-zen-border rounded-xl">
                          <BookOpen size={24} className="opacity-40" />
                          <p className="text-xs max-w-[280px]">
                            A IA aprenderá sobre você durante suas conversas e salvará as informações aqui automaticamente!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-6">
                  {/* Top Stats numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                    <div className="p-4 rounded-2xl border border-zen-border bg-zen-surface bg-opacity-25 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zen-mintSoft text-zen-mint flex items-center justify-center">
                        <Heart size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-zen-textMuted font-medium leading-none mb-1">Média de Bem-Estar</p>
                        <p className="text-base font-display font-bold text-zen-text">{avgScore}/100</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-zen-border bg-zen-surface bg-opacity-25 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zen-accentSoft text-zen-accent flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-zen-textMuted font-medium leading-none mb-1">Humor Dominante</p>
                        <p className="text-base font-display font-bold text-zen-text">{dominantMood}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-zen-border bg-zen-surface bg-opacity-25 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zen-warmSoft text-zen-warm flex items-center justify-center">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-zen-textMuted font-medium leading-none mb-1">Mensagens Analisadas</p>
                        <p className="text-base font-display font-bold text-zen-text">{totalMsgs}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recharts graphs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl border border-zen-border bg-white h-[260px] flex flex-col">
                      <h3 className="text-xs font-semibold text-zen-text mb-3">Linha do Tempo Emocional</h3>
                      <div className="flex-1 w-full text-[10px]">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                              <defs>
                                <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E8F0" />
                              <XAxis dataKey="date" stroke="#A0A5BD" fontSize={9} />
                              <YAxis domain={[0, 100]} stroke="#A0A5BD" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E8F0', borderRadius: 12, color: '#1A1D2E', fontSize: 10 }} />
                              <Area type="monotone" dataKey="score" stroke="#6C63FF" strokeWidth={2} fillOpacity={1} fill="url(#popGrad)" name="Bem-Estar" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zen-textMuted text-[10px]">Sem dados para gráficos ainda.</div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-zen-border bg-white h-[260px] flex flex-col">
                      <h3 className="text-xs font-semibold text-zen-text mb-3">Humores Identificados</h3>
                      <div className="flex-1 w-full text-[10px]">
                        {pieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="45%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                                {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={PIE_COLORS[entry.name] || '#A0A5BD'} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E8F0', borderRadius: 12, color: '#1A1D2E', fontSize: 10 }} />
                              <Legend verticalAlign="bottom" height={32} formatter={(val: string) => <span className="text-[9px] text-zen-textSecondary">{val}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zen-textMuted text-[10px]">Sem dados históricos de sentimentos.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS EDIT DIALOG MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-35 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto card p-6 bg-white animate-slide-up">
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-xl text-zen-textMuted hover:bg-zen-surface hover:text-zen-text transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-zen-border">
              <div className="w-8 h-8 rounded-xl bg-zen-accentSoft flex items-center justify-center">
                <Settings className="text-zen-accent" size={16} />
              </div>
              <h2 className="text-base font-display font-bold text-zen-text">Configurações do PSAI</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="label-zen text-zen-accent flex items-center gap-1.5"><User size={11} /> Perfil Pessoal</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-zen mb-1 block">Nome</label>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="input-zen" />
                </div>
                <div>
                  <label className="label-zen mb-1 block">Idade</label>
                  <input type="text" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Ex: 28" className="input-zen" />
                </div>
              </div>

              <div>
                <label className="label-zen mb-1 block">Profissão</label>
                <input type="text" value={editOccupation} onChange={(e) => setEditOccupation(e.target.value)} className="input-zen" />
              </div>

              <div>
                <label className="label-zen mb-1 block">Contexto de Vida</label>
                <textarea value={editLifeContext} onChange={(e) => setEditLifeContext(e.target.value)} rows={2} className="textarea-zen" />
              </div>

              <div>
                <label className="label-zen mb-1 block">Desafios Principais</label>
                <textarea value={editChallenges} onChange={(e) => setEditChallenges(e.target.value)} rows={2} className="textarea-zen" />
              </div>

              <h3 className="label-zen text-zen-accent flex items-center gap-1.5 pt-3 border-t border-zen-border"><Bot size={11} /> Conexão de IA</h3>
              
              <div>
                <label className="label-zen mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Key size={10} /> Chave OpenRouter</span>
                  <span className="badge-warm text-[8px] px-1.5 py-0.5">Online</span>
                </label>
                <input type="password" placeholder="sk-or-v1-..." value={editKey} onChange={(e) => setEditKey(e.target.value)} className="input-zen font-mono" />
              </div>

              <div>
                <label className="label-zen mb-1 block">Modelo de IA</label>
                <input type="text" placeholder="nousresearch/hermes-3-llama-3-8b" value={editModel} onChange={(e) => setEditModel(e.target.value)} className="input-zen font-mono text-xs" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-zen-border">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn-outline flex-1 py-2.5 text-xs">Cancelar</button>
                <button type="submit" className="btn-accent flex-1 py-2.5 text-xs">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Intercept Warnings */}
      <CrisisModal 
        isOpen={isCrisisOpen} 
        onClose={() => setIsCrisisOpen(false)}
        resources={EMERGENCY_RESOURCES} 
        message={crisisMessage}
      />

    </div>
  );
};
