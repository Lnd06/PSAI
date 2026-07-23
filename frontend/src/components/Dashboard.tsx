import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Heart, Calendar, MessageSquare, ChevronRight, Play, Loader2, 
  Trash2, BrainCircuit, ShieldCheck, Sparkles, Settings, BookOpen 
} from 'lucide-react';
import { PSAILogo } from './PSAILogo';

interface Session {
  id: string;
  title: string;
  mode: string;
  summaryShort: string;
  updatedAt: string;
}

interface SentimentValue {
  name: string;
  value: number;
}

interface MoodPoint {
  date: string;
  averageScore: number;
  count: number;
}

interface SummaryStats {
  avgWeeklyScore: number;
  dominantMood: string;
  totalSessionsCount: number;
  totalMessagesCount: number;
}

interface DashboardProps {
  token: string;
  user: { name: string; email: string; openRouterApiKey?: string | null; aiModel?: string | null } | null;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pieData, setPieData] = useState<SentimentValue[]>([]);
  const [chartData, setChartData] = useState<MoodPoint[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { sessions, sentimentDistribution, moodProgression, summaryStats } = response.data;
      setSessions(sessions);
      setPieData(sentimentDistribution.filter((item: any) => item.value > 0));
      
      const formattedProgression = moodProgression.map((pt: any) => {
        const [, m, d] = pt.date.split('-');
        return {
          ...pt,
          dateLabel: `${d}/${m}`
        };
      });
      setChartData(formattedProgression);
      setStats(summaryStats);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar os dados. Certifique-se de que o backend está ativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const handleStartSession = async () => {
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

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta sessão do seu histórico?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/chat/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStats();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir sessão.');
    }
  };

  const MOOD_COLORS: Record<string, string> = {
    Happy: '#4A7265',       // Sage Green
    Neutral: '#7A7060',     // Muted Warm Brown
    Anxiolytic: '#8F7AD2',  // Soft Purple
    Stressed: '#C0392B',    // Red Accent
    Depressive: '#3A7CA5'   // Blue Accent
  };

  const getMoodColor = (moodName: string) => {
    const rawMood = Object.keys(MOOD_COLORS).find(
      (key) => moodName.toLowerCase().includes(key.toLowerCase())
    );
    return rawMood ? MOOD_COLORS[rawMood] : '#7A7060';
  };

  const getSentimentLabel = (category: string) => {
    const labels: Record<string, string> = {
      Neutral: 'Neutro',
      Anxiolytic: 'Ansioso',
      Depressive: 'Triste',
      Happy: 'Feliz',
      Stressed: 'Estressado'
    };
    return labels[category] || category;
  };

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8 max-w-7xl mx-auto fade-in bg-brand-bg text-brand-text">
      
      {/* GLOWS */}
      <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-brand-gold rounded-full opacity-[0.02] blur-[120px] pointer-events-none" />
      
      {/* TOP HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8 border-b border-brand-border mb-8 relative z-20">
        <div className="flex items-center gap-3.5 text-left">
          <PSAILogo size={36} />
          <div>
            <div className="flex items-center gap-1.5 text-brand-gold font-bold text-[10px] uppercase tracking-widest font-sans">
              <Sparkles size={11} className="text-brand-gold" />
              <span>Espaço Terapêutico Seguro</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold tracking-tight text-brand-text mt-1">
              Olá, {user?.name || 'Visitante'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate('/library')}
            className="p-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold transition-all duration-300"
            title="Biblioteca RAG / Pinecone"
          >
            <BookOpen size={17} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="p-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold transition-all duration-300"
            title="Configurações de IA / Perfil"
          >
            <Settings size={17} />
          </button>
          <button
            onClick={handleLogoutClick}
            className="px-4.5 py-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold hover:border-brand-gold/30 transition-all duration-300 text-xs font-bold"
          >
            Sair
          </button>
          <button
            onClick={handleStartSession}
            disabled={creatingSession}
            className="flex items-center gap-1.5 px-5.5 py-2.5 text-brand-bg bg-brand-gold hover:bg-brand-goldHover rounded-xl font-bold transition-all active:scale-[0.98] text-xs shadow-lg shadow-brand-gold/5"
          >
            {creatingSession ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} fill="currentColor" />
            )}
            Nova Reflexão
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-xl border border-red-900/20 bg-red-500/[0.04] text-red-700 text-xs leading-relaxed mb-6 font-sans text-left">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500 gap-3">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-sans">Carregando painel de bem-estar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left relative z-10">
          
          {/* ANALYTICS COLUMN (LEFT) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* STATS MATRIX */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Stat 1: Bem-Estar */}
              <div className="p-5 rounded-2xl border border-brand-border bg-brand-card flex flex-col justify-between hover:border-brand-gold/20 transition-all">
                <span className="text-[9px] uppercase font-bold text-brand-textMuted tracking-wider">Bem-Estar Semanal</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-serif font-bold text-brand-gold">
                    {stats?.avgWeeklyScore || 50}
                  </span>
                  <span className="text-[10px] text-brand-textMuted font-sans">/100</span>
                </div>
                <div className="w-full bg-brand-bg h-1.5 rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-brand-gold h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats?.avgWeeklyScore || 50}%` }}
                  />
                </div>
              </div>

              {/* Stat 2: Mood Dominante */}
              <div className="p-5 rounded-2xl border border-brand-border bg-brand-card flex flex-col justify-between hover:border-brand-gold/20 transition-all">
                <span className="text-[9px] uppercase font-bold text-brand-textMuted tracking-wider">Humor Dominante</span>
                <span 
                  className="text-lg font-bold mt-4 block truncate font-sans" 
                  style={{ color: getMoodColor(stats?.dominantMood || 'Neutral') }}
                >
                  {stats?.dominantMood ? getSentimentLabel(stats.dominantMood) : 'Neutro'}
                </span>
                <span className="text-[9px] text-brand-textMuted font-sans mt-2.5 flex items-center gap-1">
                  <Sparkles size={9} className="text-brand-gold" /> Mapeado via IA
                </span>
              </div>

              {/* Stat 3: Diários Salvos */}
              <div className="p-5 rounded-2xl border border-brand-border bg-brand-card flex flex-col justify-between hover:border-brand-gold/20 transition-all">
                <span className="text-[9px] uppercase font-bold text-brand-textMuted tracking-wider">Diários Gravados</span>
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-3xl font-serif font-bold text-brand-gold">
                    {stats?.totalSessionsCount || 0}
                  </span>
                  <Calendar size={12} className="text-brand-textMuted" />
                </div>
                <span className="text-[9px] text-brand-textMuted font-sans mt-2.5">Sessões históricas</span>
              </div>

              {/* Stat 4: Iterações */}
              <div className="p-5 rounded-2xl border border-brand-border bg-brand-card flex flex-col justify-between hover:border-brand-gold/20 transition-all">
                <span className="text-[9px] uppercase font-bold text-brand-textMuted tracking-wider">Total de Mensagens</span>
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-3xl font-serif font-bold text-brand-gold">
                    {stats?.totalMessagesCount || 0}
                  </span>
                  <MessageSquare size={12} className="text-brand-textMuted" />
                </div>
                <span className="text-[9px] text-brand-textMuted font-sans mt-2.5">Reflexões geradas</span>
              </div>

            </div>

            {/* MOOD EVOLUTION CHART */}
            <div className="rounded-3xl p-6 border border-brand-border bg-brand-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-brand-text">Evolução de Humor</h3>
                  <p className="text-[10px] text-brand-textMuted font-sans mt-0.5">Pontuação média emocional nos registros</p>
                </div>
                <BrainCircuit className="text-brand-gold opacity-40" size={18} />
              </div>
              
              <div className="h-60 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A7265" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#4A7265" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 28, 19, 0.04)" opacity={0.3} />
                      <XAxis dataKey="dateLabel" stroke="#7A7060" fontSize={9} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#7A7060" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#EDE8E0', 
                          border: '1px solid rgba(34, 28, 19, 0.12)', 
                          borderRadius: '12px',
                          color: '#221C13',
                          fontFamily: 'sans-serif',
                          fontSize: '11px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="#4A7265" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill="url(#colorMood)" 
                        name="Humor"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-600 text-xs border border-dashed border-brand-border rounded-2xl">
                    Inicie uma sessão no diário para exibir o gráfico de evolução.
                  </div>
                )}
              </div>
            </div>

            {/* SECONDARY GRIDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* PIE CHART */}
              <div className="rounded-3xl p-6 border border-brand-border bg-brand-card flex flex-col justify-between">
                <h3 className="text-sm font-bold text-brand-text mb-4">Mapeamento de Emoções</h3>
                <div className="h-52 flex items-center justify-center relative">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                           data={pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={50}
                           outerRadius={70}
                           paddingAngle={4}
                           dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name] || '#7A7060'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, getSentimentLabel(name as string)]}
                          contentStyle={{ 
                            backgroundColor: '#EDE8E0', 
                            border: '1px solid rgba(34, 28, 19, 0.12)', 
                            borderRadius: '12px',
                            color: '#221C13',
                            fontSize: '11px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-neutral-600 text-xs border border-dashed border-brand-border rounded-2xl">
                      Sem registros emocionais suficientes.
                    </div>
                  )}
                </div>
                
                {/* Custom Legend */}
                {pieData.length > 0 && (
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 justify-center mt-2">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-[10px] text-brand-textMuted font-sans">
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: MOOD_COLORS[entry.name] || '#7A7060' }}
                        />
                        <span>{getSentimentLabel(entry.name)} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECURITY & LGPD COMPLIANCE SUMMARY */}
              <div className="rounded-3xl p-6 border border-brand-border bg-brand-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/[0.08] border border-brand-gold/[0.2] flex items-center justify-center text-brand-gold mb-4">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-brand-text">Privacidade Absoluta</h3>
                  <p className="text-xs text-brand-textMuted leading-relaxed font-sans mt-2">
                    Suas reflexões estão protegidas. De acordo com os padrões da LGPD, nenhum dado identificável é exportado para fins de treinamento.
                  </p>
                  <p className="text-[10px] text-brand-textMuted/70 leading-relaxed font-sans mt-3">
                    Você tem soberania total: configure suas chaves do Groq ou exclua o histórico de diários a qualquer momento.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-[9px] text-brand-textMuted font-sans uppercase tracking-wider">
                  <span>Sessões confidenciais</span>
                  <span className="flex items-center gap-1"><Heart size={9} className="text-rose-600" /> Saúde Mental</span>
                </div>
              </div>

            </div>

          </div>

          {/* SIDEBAR: RECENT SESSIONS (RIGHT) */}
          <div className="space-y-6">
            <div className="rounded-3xl p-6 border border-brand-border bg-brand-card">
              <h3 className="text-sm font-bold text-brand-text mb-5 flex items-center gap-2 font-sans">
                <Heart size={16} className="text-brand-gold" />
                Registros Recentes
              </h3>
              
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1 select-none">
                {sessions.length > 0 ? (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => navigate(`/chat/${sess.id}`)}
                      className="group p-4 rounded-xl border border-brand-border bg-brand-bg/40 hover:border-brand-gold/30 hover:bg-brand-cardLight transition-all cursor-pointer relative"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5 text-left">
                        <h4 className="font-semibold text-brand-text text-xs group-hover:text-brand-gold transition-colors line-clamp-1">
                          {sess.title || "Reflexão sem título"}
                        </h4>
                        <span className="text-[9px] text-brand-textMuted/70 whitespace-nowrap">
                          {new Date(sess.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="mb-2 text-left">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-brand-gold/[0.04] border-brand-gold/[0.15] text-brand-gold font-sans uppercase">
                          CBT / TCC
                        </span>
                      </div>
                      
                      <p className="text-xs text-brand-textMuted leading-relaxed line-clamp-2 mb-3.5 text-left">
                        {sess.summaryShort || 'Ainda sem resumo. Prossiga com o registro para analisar.'}
                      </p>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] font-bold text-brand-gold flex items-center gap-1 group-hover:underline uppercase tracking-wider">
                          Acessar Diário
                          <ChevronRight size={11} />
                        </span>
                        
                        <button
                          onClick={(e) => handleDeleteSession(e, sess.id)}
                          className="p-1.5 rounded-lg text-brand-textMuted/70 hover:text-rose-600 hover:bg-brand-card transition-colors"
                          title="Excluir histórico"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-neutral-600 border border-dashed border-brand-border rounded-2xl flex flex-col items-center gap-3">
                    <MessageSquare size={28} className="opacity-40" />
                    <p className="text-xs max-w-[160px] leading-relaxed">Nenhuma reflexão iniciada. Comece um novo registro acima!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
