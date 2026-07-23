import React, { useState } from 'react';
import { Sparkles, ArrowRight, Heart, Shield, Zap, ChevronRight, User, Key, Bot } from 'lucide-react';
import { UserProfile } from '../App';
import { Logo } from './Logo';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  // Profile fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [lifeContext, setLifeContext] = useState('');
  const [challenges, setChallenges] = useState('');

  // AI config fields
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('nousresearch/hermes-3-llama-3-8b');

  const handleFinish = () => {
    onComplete({
      name: name.trim() || 'Paciente',
      age: age.trim(),
      occupation: occupation.trim(),
      lifeContext: lifeContext.trim(),
      challenges: challenges.trim(),
      openRouterApiKey: apiKey.trim(),
      aiModel: model.trim() || 'nousresearch/hermes-3-llama-3-8b',
      memories: []
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] blob-accent rounded-full pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] blob-warm rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => { if (i < step) setStep(i); }}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === step ? 'w-8 bg-zen-accent' : i < step ? 'w-2 bg-zen-accent opacity-40' : 'w-2 bg-zen-border'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="card p-10 text-center animate-slide-up">
            {/* Zen circle illustration */}
            <div className="mx-auto mb-8 relative w-28 h-28">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zen-accent to-zen-warm opacity-10 animate-pulse-soft" />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-zen-accentSoft to-zen-warmSoft flex items-center justify-center">
                <Logo size={48} className="animate-float" />
              </div>
            </div>

            <h1 className="text-3xl font-display font-bold text-zen-text mb-3 tracking-tight">
              Bem-vindo ao <span className="text-zen-accent">PSAI</span>
            </h1>
            <p className="text-zen-textSecondary text-sm leading-relaxed max-w-sm mx-auto mb-8">
              Seu espaço seguro de reflexão e acolhimento emocional. 
              Um assistente terapêutico inteligente que te ajuda a entender 
              seus sentimentos e cuidar da sua saúde mental.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              <div className="badge-accent"><Heart size={10} /> Acolhimento</div>
              <div className="badge-mint"><Shield size={10} /> Segurança</div>
              <div className="badge-warm"><Zap size={10} /> IA Adaptativa</div>
            </div>

            <button onClick={() => setStep(1)} className="btn-accent w-full text-sm">
              Começar <ArrowRight size={16} />
            </button>

            <p className="text-[10px] text-zen-textMuted mt-4 leading-relaxed">
              Este aplicativo não substitui acompanhamento psicológico profissional.
            </p>
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {step === 1 && (
          <div className="card p-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-zen-accentSoft flex items-center justify-center">
                <User className="text-zen-accent" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-zen-text">Seu Perfil</h2>
                <p className="text-[11px] text-zen-textMuted">Passo 2 de 3</p>
              </div>
            </div>

            <p className="text-xs text-zen-textSecondary mb-6 leading-relaxed">
              Quanto mais a IA souber sobre você, mais personalizadas e relevantes 
              serão as reflexões terapêuticas. Tudo é salvo localmente no seu computador.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-zen mb-1 block">Nome / Apelido *</label>
                  <input 
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Como quer ser chamado(a)?" className="input-zen"
                  />
                </div>
                <div>
                  <label className="label-zen mb-1 block">Idade</label>
                  <input 
                    type="text" value={age} onChange={(e) => setAge(e.target.value)}
                    placeholder="Ex: 28" className="input-zen"
                  />
                </div>
              </div>

              <div>
                <label className="label-zen mb-1 block">Profissão / Ocupação</label>
                <input 
                  type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ex: Designer, Estudante, Enfermeiro..." className="input-zen"
                />
              </div>

              <div>
                <label className="label-zen mb-1 block">Contexto de Vida</label>
                <textarea 
                  value={lifeContext} onChange={(e) => setLifeContext(e.target.value)}
                  placeholder="Conte um pouco sobre sua rotina, família, histórico ou o que sentir confortável em compartilhar..."
                  rows={3} className="textarea-zen"
                />
              </div>

              <div>
                <label className="label-zen mb-1 block">Principais Desafios</label>
                <textarea 
                  value={challenges} onChange={(e) => setChallenges(e.target.value)}
                  placeholder="Ex: Ansiedade no trabalho, procrastinação, luto..."
                  rows={2} className="textarea-zen"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(0)} className="btn-outline flex-1 text-sm">
                Voltar
              </button>
              <button onClick={() => setStep(2)} className="btn-accent flex-1 text-sm">
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Configuration */}
        {step === 2 && (
          <div className="card p-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-zen-warmSoft flex items-center justify-center">
                <Bot className="text-zen-warm" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-zen-text">Configuração de IA</h2>
                <p className="text-[11px] text-zen-textMuted">Passo 3 de 3</p>
              </div>
            </div>

            <p className="text-xs text-zen-textSecondary mb-6 leading-relaxed">
              Insira sua chave de API para conectar a um modelo de IA avançado. 
              Sem chave, o app funciona com respostas simuladas locais.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label-zen mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Key size={11} /> Chave OpenRouter</span>
                  <span className="badge-warm text-[8px]">Requerido para IA online</span>
                </label>
                <input 
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..." className="input-zen"
                />
              </div>

              <div>
                <label className="label-zen mb-1 flex items-center gap-1.5">
                  <Sparkles size={11} /> Modelo de IA
                </label>
                <input 
                  type="text" value={model} onChange={(e) => setModel(e.target.value)}
                  placeholder="nousresearch/hermes-3-llama-3-8b"
                  className="input-zen font-mono text-xs"
                />
                <p className="text-[10px] text-zen-textMuted mt-1.5 leading-relaxed">
                  Escolha qualquer modelo disponível na OpenRouter. O padrão é o Hermes 3.
                </p>
              </div>

              {/* Info card */}
              <div className="bg-zen-accentSoft bg-opacity-50 border border-zen-accent border-opacity-10 rounded-2xl p-4 mt-2">
                <p className="text-[11px] text-zen-accent leading-relaxed">
                  <strong>💡 Dica:</strong> Seus dados e chave de API ficam salvos exclusivamente 
                  no arquivo <code className="font-mono bg-white px-1 py-0.5 rounded text-[10px]">user_profile.json</code> do 
                  seu computador. Nenhum dado é enviado para servidores externos além das chamadas de IA.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)} className="btn-outline flex-1 text-sm">
                Voltar
              </button>
              <button onClick={handleFinish} className="btn-warm flex-1 text-sm">
                Finalizar e Entrar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
