import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Heart, Calendar, MessageSquare, ChevronRight, Play, Loader2, 
  Trash2, Shield, Sparkles, Settings, X, User, Key, Bot
} from 'lucide-react';
import { UserProfile } from '../App';
import { Logo } from './Logo';

export interface Session {
  id: string;
  title: string;
  mode: string;
  summaryShort: string;
  summaryLong: string;
  updatedAt: string;
}

export interface LocalMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'ai';
  content: string;
  sentiment?: string;
  sentimentScore?: number;
  timestamp: string;
}

interface DashboardProps {
  profile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onUpdateProfile }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMode, setSelectedMode] = useState<'reflective' | 'natural'>('reflective');
  const [creatingSession, setCreatingSession] = useState(false);
  const [avgScore, setAvgScore] = useState(50);
  const [dominantMood, setDominantMood] = useState('Neutro');
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [chartData, setChartData] = useState<{ date: string; score: number }[]>([]);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age || '');
  const [editOccupation, setEditOccupation] = useState(profile.occupation || '');
  const [editLifeContext, setEditLifeContext] = useState(profile.lifeContext || '');
  const [editChallenges, setEditChallenges] = useState(profile.challenges || '');
  const [editKey, setEditKey] = useState(profile.openRouterApiKey);
  const [editModel, setEditModel] = useState(profile.aiModel);

  const navigate = useNavigate();

  const moodTranslations: Record<string, string> = {
    Neutral: 'Neutro', Anxiolytic: 'Ansioso', Depressive: 'Triste', Happy: 'Feliz', Stressed: 'Estressado'
  };

  useEffect(() => {
    const storedSessions = localStorage.getItem('psai_sessions');
    if (storedSessions) {
      try {
        const list: Session[] = JSON.parse(storedSessions);
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSessions(list);
      } catch {}
    }

    const storedMessages = localStorage.getItem('psai_messages');
    let msgs: LocalMessage[] = [];
    if (storedMessages) { try { msgs = JSON.parse(storedMessages); } catch {} }
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
    }
  }, [profile]);

  useEffect(() => {
    setEditName(profile.name); setEditAge(profile.age || ''); setEditOccupation(profile.occupation || '');
    setEditLifeContext(profile.lifeContext || ''); setEditChallenges(profile.challenges || '');
    setEditKey(profile.openRouterApiKey); setEditModel(profile.aiModel);
  }, [profile]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ 
      name: editName.trim() || 'Paciente', 
      age: editAge.trim(), 
      occupation: editOccupation.trim(), 
      lifeContext: editLifeContext.trim(), 
      challenges: editChallenges.trim(), 
      openRouterApiKey: editKey.trim(), 
      aiModel: editModel.trim() || 'nousresearch/hermes-3-llama-3-8b',
      memories: profile.memories || []
    });
    setIsSettingsOpen(false);
  };

  const handleStartSession = () => {
    setCreatingSession(true);
    setTimeout(() => {
      const id = 'session_' + Date.now();
      const sess: Session = { id, title: selectedMode === 'natural' ? 'Conversa Natural' : 'Reflexão TCC', mode: selectedMode, summaryShort: 'Novo registro', summaryLong: '', updatedAt: new Date().toISOString() };
      const stored = localStorage.getItem('psai_sessions');
      let list: Session[] = []; if (stored) { try { list = JSON.parse(stored); } catch {} }
      list.unshift(sess); localStorage.setItem('psai_sessions', JSON.stringify(list));
      navigate(`/chat/${id}`);
    }, 600);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Excluir esta reflexão do histórico?')) {
      const updated = sessions.filter((s) => s.id !== id); setSessions(updated);
      localStorage.setItem('psai_sessions', JSON.stringify(updated));
      const stored = localStorage.getItem('psai_messages');
      if (stored) { try { const msgs: LocalMessage[] = JSON.parse(stored); localStorage.setItem('psai_messages', JSON.stringify(msgs.filter((m) => m.sessionId !== id))); } catch {} }
    }
  };

  const PIE_COLORS: Record<string, string> = { Neutro: '#A0A5BD', Ansioso: '#FBBF24', Triste: '#6C63FF', Feliz: '#34D399', Estressado: '#F87171' };

  return (
    <div className="min-h-screen p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 p-5 card mb-6">
        <div className="flex items-center gap-3">
          <Logo size={42} />
          <div>
            <h1 className="text-xl font-display font-bold text-zen-text flex items-center gap-2">
              PSAI
              <span className="badge-accent text-[8px]">Web</span>
            </h1>
            <p className="text-[10px] text-zen-textMuted">Assistente Terapêutico Inteligente</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zen-textMuted">Olá, bem-vindo(a)</p>
            <p className="text-sm font-semibold text-zen-accent">{profile.name}</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-2xl border border-zen-border text-zen-textSecondary hover:bg-zen-surface hover:text-zen-text transition-all" title="Configurações">
            <Settings size={18} />
          </button>
          <button onClick={handleStartSession} disabled={creatingSession}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] shadow-md ${
              selectedMode === 'natural' ? 'bg-zen-warm shadow-warm' : 'bg-zen-accent shadow-accent'
            }`}>
            {creatingSession ? <Loader2 size={16} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            Novo Registro
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Session launcher + History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-display font-bold text-zen-text mb-3 flex items-center gap-2">
              <Sparkles className="text-zen-accent" size={16} /> Iniciar Registro
            </h2>
            <p className="text-[11px] text-zen-textSecondary mb-4 leading-relaxed">
              Escolha a abordagem para o seu estado emocional atual:
            </p>

            <div className="grid grid-cols-2 gap-2 p-1 bg-zen-surface rounded-2xl mb-4">
              <button type="button" onClick={() => setSelectedMode('reflective')}
                className={`py-2 px-3 text-xs rounded-xl font-semibold transition-all ${
                  selectedMode === 'reflective' ? 'bg-white text-zen-accent shadow-soft border border-zen-accentSoft' : 'text-zen-textMuted hover:text-zen-textSecondary'
                }`}>
                🍃 Reflexivo (TCC)
              </button>
              <button type="button" onClick={() => setSelectedMode('natural')}
                className={`py-2 px-3 text-xs rounded-xl font-semibold transition-all ${
                  selectedMode === 'natural' ? 'bg-white text-zen-warm shadow-soft border border-zen-warmSoft' : 'text-zen-textMuted hover:text-zen-textSecondary'
                }`}>
                💜 Conversa Natural
              </button>
            </div>

            {selectedMode === 'reflective' ? (
              <div className="bg-zen-accentSoft bg-opacity-40 border border-zen-accent border-opacity-10 p-3.5 rounded-2xl text-[11px] text-zen-accent leading-relaxed">
                <strong>Modo Reflexão Guiada:</strong> Reestruturação de pensamentos usando perguntas socráticas da TCC.
              </div>
            ) : (
              <div className="bg-zen-warmSoft border border-zen-warm border-opacity-10 p-3.5 rounded-2xl text-[11px] text-zen-warm leading-relaxed">
                <strong>Modo Acolhimento:</strong> Conversa fluida e afetiva, focada em validação e escuta empática.
              </div>
            )}
          </div>

          {/* History */}
          <div className="card p-6 flex flex-col max-h-[420px]">
            <h2 className="text-sm font-display font-bold text-zen-text mb-3 flex items-center gap-2">
              <Calendar className="text-zen-textMuted" size={16} /> Reflexões Recentes
            </h2>
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {sessions.length > 0 ? sessions.map((s) => (
                <div key={s.id} onClick={() => navigate(`/chat/${s.id}`)}
                  className="group flex items-center justify-between p-3.5 rounded-2xl border border-zen-borderLight bg-white hover:border-zen-accentSoft hover:shadow-soft transition-all cursor-pointer">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-zen-text truncate max-w-[120px]">{s.title}</span>
                      <span className={s.mode === 'natural' ? 'badge-warm' : 'badge-accent'}>{s.mode === 'natural' ? 'Acolhimento' : 'TCC'}</span>
                    </div>
                    <p className="text-[10px] text-zen-textMuted truncate">{s.summaryShort}</p>
                    <span className="text-[9px] text-zen-textMuted mt-0.5 block">
                      {new Date(s.updatedAt).toLocaleDateString('pt-BR')} · {new Date(s.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-zen-accent" />
                    <button onClick={(e) => handleDeleteSession(e, s.id)} className="p-1.5 rounded-lg text-zen-textMuted hover:text-zen-danger hover:bg-zen-dangerSoft transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-14 text-zen-textMuted border border-dashed border-zen-border rounded-2xl flex flex-col items-center gap-2">
                  <MessageSquare size={28} className="opacity-30" />
                  <p className="text-[11px] max-w-[160px]">Nenhuma reflexão ainda. Comece um novo registro!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-zen-mintSoft text-zen-mint flex items-center justify-center"><Heart size={20} /></div>
              <div>
                <p className="text-[10px] text-zen-textMuted font-medium">Bem-Estar</p>
                <p className="text-lg font-display font-bold text-zen-text">{avgScore}<span className="text-xs text-zen-textMuted font-normal">/100</span></p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-zen-accentSoft text-zen-accent flex items-center justify-center"><Sparkles size={20} /></div>
              <div>
                <p className="text-[10px] text-zen-textMuted font-medium">Humor Dominante</p>
                <p className="text-base font-display font-bold text-zen-text">{dominantMood}</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-zen-warmSoft text-zen-warm flex items-center justify-center"><Shield size={20} /></div>
              <div>
                <p className="text-[10px] text-zen-textMuted font-medium">Registros</p>
                <p className="text-lg font-display font-bold text-zen-text">{totalMsgs}</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 flex flex-col h-[310px]">
              <h3 className="text-sm font-display font-semibold text-zen-text mb-3">Progresso Emocional</h3>
              <div className="flex-1 w-full text-xs">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E8F0" />
                      <XAxis dataKey="date" stroke="#A0A5BD" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#A0A5BD" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E8F0', borderRadius: 12, color: '#1A1D2E', fontSize: 11 }} />
                      <Area type="monotone" dataKey="score" stroke="#6C63FF" strokeWidth={2} fillOpacity={1} fill="url(#scoreGrad)" name="Bem-Estar" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zen-textMuted text-[11px]">Converse com a IA para gerar seu gráfico.</div>
                )}
              </div>
            </div>

            <div className="card p-6 flex flex-col h-[310px]">
              <h3 className="text-sm font-display font-semibold text-zen-text mb-3">Divisão de Humores</h3>
              <div className="flex-1 w-full text-xs">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                        {pieData.map((e, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[e.name] || '#A0A5BD'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E8F0', borderRadius: 12, color: '#1A1D2E', fontSize: 11 }} />
                      <Legend verticalAlign="bottom" height={32} formatter={(v: string) => <span className="text-[10px] text-zen-textSecondary">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zen-textMuted text-[11px]">Sem dados de sentimentos ainda.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card p-7 animate-slide-up">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-xl text-zen-textMuted hover:bg-zen-surface hover:text-zen-text transition-all">
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-zen-border">
              <div className="w-9 h-9 rounded-xl bg-zen-accentSoft flex items-center justify-center"><Settings className="text-zen-accent" size={18} /></div>
              <h2 className="text-lg font-display font-bold text-zen-text">Configurações</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="label-zen flex items-center gap-1.5"><User size={11} /> Perfil Pessoal</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-zen mb-1 block">Nome</label><input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="input-zen" /></div>
                <div><label className="label-zen mb-1 block">Idade</label><input type="text" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Ex: 28" className="input-zen" /></div>
              </div>
              <div><label className="label-zen mb-1 block">Profissão</label><input type="text" value={editOccupation} onChange={(e) => setEditOccupation(e.target.value)} className="input-zen" /></div>
              <div><label className="label-zen mb-1 block">Contexto de Vida</label><textarea value={editLifeContext} onChange={(e) => setEditLifeContext(e.target.value)} rows={2} className="textarea-zen" /></div>
              <div><label className="label-zen mb-1 block">Desafios</label><textarea value={editChallenges} onChange={(e) => setEditChallenges(e.target.value)} rows={2} className="textarea-zen" /></div>

              <h3 className="label-zen flex items-center gap-1.5 pt-3 border-t border-zen-border"><Bot size={11} /> Conexão de IA</h3>
              <div><label className="label-zen mb-1 flex items-center justify-between"><span className="flex items-center gap-1"><Key size={10} /> Chave OpenRouter</span><span className="badge-warm text-[8px]">Online</span></label><input type="password" placeholder="sk-or-v1-..." value={editKey} onChange={(e) => setEditKey(e.target.value)} className="input-zen" /></div>
              <div><label className="label-zen mb-1 block">Modelo de IA</label><input type="text" placeholder="nousresearch/hermes-3-llama-3-8b" value={editModel} onChange={(e) => setEditModel(e.target.value)} className="input-zen font-mono text-xs" /></div>

              <div className="flex gap-3 pt-4 border-t border-zen-border">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn-outline flex-1 text-sm">Cancelar</button>
                <button type="submit" className="btn-accent flex-1 text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
