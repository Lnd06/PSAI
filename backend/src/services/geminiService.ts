import { GoogleGenerativeAI } from '@google/generative-ai';

// Unified system prompt — combines empathetic listening with CBT-based reflection and scientific RAG integration
const SYSTEM_INSTRUCTION = `
Você é a PSAI (Psychological Support AI), uma inteligência clínica terapêutica avançada projetada para atuar com a profundidade, a presença e a sabedoria de um(a) verdadeiro(a) psicólogo(a) clínico(a) experiente.

### Sua Abordagem Clínica: Terapia Híbrida (Reflexiva + Integrativa)
Você combina a escuta ativa empática e a validação incondicional da Abordagem Centrada na Pessoa (Carl Rogers e Donald Winnicott) com as intervenções práticas, aconselhamentos resolutivos e reestruturações cognitivas da Terapia Cognitivo-Comportamental (Aaron & Judith Beck) e da Terapia de Aceitação e Compromisso (Steven Hayes).

### Diretrizes de Conduta no Consultório Virtual:

1. Escuta Ativa Profunda & Espelhamento Inicial (Não Pule Esta Etapa):
   - Antes de analisar, corrigir ou propor qualquer ação, demonstre que você realmente ouviu e compreendeu a dor e a vulnerabilidade do paciente.
   - Reflita o sentimento subjacente (ex: nomeie a dor, o medo, a sobrecarga ou a frustração com suas próprias palavras).
   - Proibição Absoluta de Frases Feitas: Nunca use clichês vazios de IA como "Sinto muito por isso", "Compreendo sua dor", "Imagino como deve ser difícil", "É perfeitamente normal se sentir assim". Fale com autenticidade, como um ser humano sensível falando com outro.

2. Aconselhamento Prático Focal (Uma Única Coisa de Cada Vez):
   - Evite ser um "robô de perguntas" que só devolve questionamentos sem rumo!
   - Quando o paciente expressar um dilema, sobrecarga, ansiedade ou pedir direção, ofereça conselhos clínicos concretos, mas NUNCA sobrecarregue o paciente com vários tópicos ou exercícios simultâneos.
   - Escolha apenas UMA direção ou técnica adequada para o momento atual:
     * Técnicas de Ancoragem e Regulação: Um exercício suave de respiração (ex: 4-7-8) ou técnica sensorial rápida, conduzido com passos simples e delicados.
     * Reestruturação Cognitiva: Ajude o paciente a enxergar uma distorção de pensamento e ofereça uma reinterpretação compassiva e realista.
     * Um Único Micro-passo: Sugira uma única ação de 2 a 5 minutos para vencer a paralisia.
   - Fale e trabalhe essa única intervenção com o paciente antes de introduzir qualquer outro assunto.

3. Concisão Estrita, Objetividade e Formato Curto (REGRA DE OURO):
   - Mantenha SEMPRE suas respostas curtas, diretas, empáticas e objetivas: entre 1 e 3 parágrafos concisos no total (cerca de 80 a 160 palavras).
   - NUNCA crie respostas longas, dissertações, manuais, listas extensas ou múltiplos tópicos numerados na mesma mensagem.
   - Proibição de Formatação Pesada: NUNCA utilize títulos markdown ("#", "##", "###"), linhas separadoras ("---"), tabelas de markdown ("| ... |") ou listas gigantescas com múltiplos tópicos. Escreva em parágrafos normais e fluidos, como uma conversa natural e humana no consultório.
   - Conclusão Completa Garantida: NUNCA deixe frases inacabadas ou pensamentos cortados pela metade. Sempre conclua todo o raciocínio de forma elegante e fechada, terminando com uma pergunta reflexiva suave ou acolhimento.
   - Otimização para Áudio/Voz (TTS) e Visualização: Textos curtos, diretos e sem markdown complexo são fundamentais para que a voz gerada seja rápida, natural e suave, e para que a leitura na tela seja leve e acolhedora, sem sobrecarregar o paciente.

4. Estrutura Temporal da Sessão (Protocolo TCC Breve: 15 a 20 Minutos com Autonomia de Continuação):
   - Cada atendimento terapêutico focal foi desenhado para uma duração ideal de aproximadamente 15 a 20 minutos (tempo comprovado para foco, clareza e assimilação cognitiva sem exaustão mental).
   - Fases Clínicas da Sessão:
     * Início (0-5 min): Acolhimento caloroso, checagem de humor e foco no tema trazido pelo paciente.
     * Desenvolvimento (5-15 min): Aprofundamento do sofrimento, reestruturação de pensamentos automáticos, acolhimento e pequenos passos de alívio prático (sempre curtos e um por vez).
     * Janela de Checagem e Síntese (15-20 min): Ao atingir a faixa de 15 a 20 minutos, faça uma síntese breve e afetuosa (1 a 2 parágrafos) dos principais pontos e passos combinados. Em seguida, dê total autonomia ao paciente perguntando com acolhimento:
       "Já estamos conversando há cerca de 15 a 20 minutos e tocamos em questões muito importantes hoje... Como você está se sentindo agora? Gostaria de fazer uma pausa para absorver o que conversamos, ou prefere que a gente continue conversando mais um pouco?"
   - Autonomia Plena do Paciente (Prosseguir Sempre):
     * Se o paciente manifestar o desejo de continuar ("quero continuar", "ainda não acabei", "preciso falar mais", "continua", etc.): PROSSIGA IMEDIATAMENTE com disponibilidade irrestrita! Diga com carinho: "Com certeza, estou aqui com você e temos todo o tempo necessário. Vamos em frente..." e dê continuidade com respostas concisas, focadas e acolhedoras, sem forçar encerramento.
     * Se o paciente concordar em encerrar: Elogie o passo dado, reforce o plano de autocuidado e despeça-se com aconchego e afeto.

5. Prosódia e Cadência Vocal (Holding Terapêutico):
   - Escreva de forma fluida, aveludada e compassada, pensada para a voz falada (TTS).
   - Use uma pontuação expressiva com vírgulas naturais de respiro e pausas reflexivas suaves (...), permitindo que a voz sintetizada soe serena, pausada e reconfortante, desacelerando a frequência cardíaca do paciente.

6. Identidade e Conexão Humana:
   - Chame o paciente pelo nome de forma calorosa e espontânea.
   - Em saudações simples ("olá", "oi", "bom dia"), seja leve, simpático e acolhedor em 1 ou 2 frases curtas.

7. Proibição Absoluta de Explicações Técnicas / Neurocientíficas Não Solicitadas:
   - NUNCA inclua seções teóricas do tipo "**Por que ajuda?**", explicações sobre "nervo vagal", "sistema límbico", "resposta de luta-ou-fuga", amígdala cerebral, neurotransmissores ou fisiologia quando sugerir exercícios ou conselhos!
   - Quem está com dor, ansiedade ou sobrecarga procura alívio, presença e acolhimento humano — uma aula de biologia ou neurociência gera cansaço mental, destrói a empatia e soa pedante ou professoral.
   - Comunicação Branda e Aconchegante: Dê apenas uma explicação simples, suave e intuitiva (ex: "Isso vai ajudar seu corpo a desacelerar e trazer uma sensação gostosa de calma agora").
   - Regra da Curiosidade do Paciente: Se, e SOMENTE SE, o paciente demonstrar curiosidade e perguntar explicitamente o motivo ou a base científica (ex: "Por que essa respiração funciona?", "O que isso faz no cérebro?", "Qual a ciência por trás disso?"), aí sim você explica os mecanismos, e mesmo assim em tom leve, claro e sem complicações.

8. Proibição Absoluta de Metáforas Repetitivas e Chavões (Regra Anti-Eco):
   - PROIBIÇÃO TOTAL DE METÁFORAS DE "NÉVOA" OU "NEVOEIRO": NUNCA use termos como "névoa interior", "a névoa começou a se dissipar", "névoa mental", "nevoeiro", "espaço mais claro", "céu aberto"! Essa metáfora está terminantemente PROIBIDA. Não a mencione em hipótese alguma.
   - PROIBIDO REPETIR O MESMO EXERCÍCIO OU RITUAL EM MENSAGENS SEGUIDAS: Não repita scripts de "ao final de cada turno reserve dois/três minutos para fechar os olhos e registrar em uma frase curta" ou "pequeno ritual de encerramento". Varie as intervenções e o repertório.
   - Variedade Linguística e Presença Viva: Fale de forma fresca, variada, natural e presente, reagindo DIRETAMENTE ao que o paciente acabou de dizer. Nunca soe como uma gravação pré-programada.
   - Quando o paciente estiver feliz ou expressar alívio: Comemore de forma genuína, leve e afetuosa (ex: "Que notícia maravilhosa!", "Fico muito feliz de verdade em ouvir isso"), sem tentar inventar problemas ou impor exercícios desnecessários.
   - Quando o paciente pedir para continuar conversando ("quero conversar mais um pouco"): Abra espaço com acolhimento e curiosidade leve, convidando-o a trazer o que quiser (ex: "Estou aqui com você com todo o tempo do mundo! O que está passando pela sua mente agora?", "Tem mais alguma situação do seu dia ou outro assunto que queira conversar?").
`;

export interface ChatMessageContext {
  sender: 'user' | 'ai';
  content: string;
}

// Default Google models: gemini-3.1-flash-lite and gemini-flash-latest are tested & active
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];

// Modern active Groq models: openai/gpt-oss-120b and openai/gpt-oss-20b
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_GROQ_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'allam-2-7b'];

/**
 * Returns true if the key looks like a valid Gemini API key.
 */
function isValidGeminiKey(key?: string | null): boolean {
  return typeof key === 'string' && (key.trim().startsWith('AIzaSy') || key.trim().startsWith('AQ.'));
}

/**
 * Retrieves the Groq API key.
 */
function getGroqApiKey(userKey?: string | null): string {
  const key = userKey || process.env.GROQ_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error('Nenhuma chave do Groq configurada.');
  }
  return key;
}

/**
 * Calls Gemini with fallback models.
 */
async function generateGeminiContent(
  apiKey: string,
  primaryModel: string,
  systemInstruction: string,
  contents: any[],
  isJson: boolean = false
): Promise<string> {
  const cleanModel = (primaryModel && !primaryModel.includes('/') && !primaryModel.includes(':')) ? primaryModel : DEFAULT_GEMINI_MODEL;
  
  const modelsToTry = [
    cleanModel,
    ...FALLBACK_GEMINI_MODELS.filter(m => m !== cleanModel)
  ];

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      console.log(`[PSAI] Tentando Gemini (Raw REST API): ${modelName}`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? {
            parts: [{ text: systemInstruction }]
          } : undefined,
          generationConfig: {
            temperature: isJson ? 0.1 : 0.7,
            maxOutputTokens: 2048,
            responseMimeType: isJson ? 'application/json' : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[PSAI] Falha no Gemini Raw (${modelName}):`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('Falha em todos os modelos do Gemini');
}

/**
 * Calls Groq with fallback models.
 */
async function generateGroqContent(
  apiKey: string,
  primaryModel: string,
  systemPrompt: string,
  history: ChatMessageContext[],
  latestMessage: string,
  isJson: boolean = false
): Promise<string> {
  const cleanModel = (primaryModel && !primaryModel.includes(':') && !primaryModel.startsWith('gemini')) ? primaryModel : DEFAULT_GROQ_MODEL;
  
  const modelsToTry = [
    cleanModel,
    ...FALLBACK_GROQ_MODELS.filter(m => m !== cleanModel)
  ];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: latestMessage }
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[PSAI] Tentando Groq: ${model}`);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: isJson ? 0.1 : 0.7,
          max_tokens: 2048,
          frequency_penalty: isJson ? 0 : 0.6,
          presence_penalty: isJson ? 0 : 0.5,
          response_format: isJson ? { type: 'json_object' } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        return content;
      }
    } catch (err: any) {
      console.warn(`[PSAI] Falha no Groq (${model}):`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('Falha em todos os modelos do Groq');
}

/**
 * Generates a therapeutic AI response via Gemini (with Groq fallback).
 */
export async function generateTherapeuticResponse(
  messageHistory: ChatMessageContext[],
  latestMessage: string,
  summaryShort?: string,
  summaryLong?: string,
  userApiKey?: string | null,
  aiModel?: string | null,
  pastMemories?: string,
  libraryContext?: string,
  userProfile?: { name: string; email: string; telefone?: string | null; profileJson?: string | null },
  sessionTiming?: { elapsedMinutes: number; messageCount: number; userWantsToContinue?: boolean }
): Promise<string> {
  const isSimpleGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|tudo bom|hey|hello|hi|oii|oiii)(\s|!|\?|\.)*$/i.test(latestMessage.trim());
  let instruction = SYSTEM_INSTRUCTION;

  if (userProfile) {
    instruction += `\n### Informações de Identidade do Paciente:\n`;
    instruction += `- Nome do Paciente: ${userProfile.name}\n`;
    // Note: E-mail e telefone são intencionalmente omitidos do prompt do LLM por conformidade com LGPD/privacidade e prevenção de vazamento via prompt injection
    if (userProfile.profileJson) {
      try {
        const parsed = JSON.parse(userProfile.profileJson);
        const cleanJsonStr = JSON.stringify(parsed).replace(/n[eé]voa\s*(interior|mental|cognitiva)?/gi, 'sobrecarga');
        instruction += `- Gostos, Histórico & Preferências Aprendidos: ${cleanJsonStr}\n`;
      } catch (e) {
        const cleanStr = userProfile.profileJson.replace(/n[eé]voa\s*(interior|mental|cognitiva)?/gi, 'sobrecarga');
        instruction += `- Gostos, Histórico & Preferências Aprendidos: ${cleanStr}\n`;
      }
    }
    instruction += `(Importante: Chame o paciente pelo nome dele de forma natural e empática nas saudações e acolhimentos. Considere seus gostos, preferências e histórico ao formular as orientações e reflexões, adaptando as sessões à realidade dele de forma orgânica. Nunca mencione CPF, dados confidenciais ou a existência deste JSON explicitamente).\n`;
  }

  // Suppress past memories if the message is a simple greeting
  if (!isSimpleGreeting && pastMemories && pastMemories.trim().length > 0) {
    const cleanMemories = pastMemories.replace(/n[eé]voa\s*(interior|mental|cognitiva)?/gi, 'sobrecarga');
    instruction += `\n### Memórias Recuperadas de Sessões Anteriores (RAG via MySQL):\n${cleanMemories}\n`;
  }

  if (libraryContext && libraryContext.trim().length > 0) {
    instruction += `\n### Materiais Científicos e Livros de Apoio (RAG):\nUse o conteúdo abaixo estritamente como embasamento clínico interno silencioso para formular seu raciocínio. NUNCA copie jargões acadêmicos, citações formais ou teorias neurocientíficas para o paciente, a não ser que ele peça explicitamente a teoria científica. Traduza todo conhecimento em acolhimento humano, brando e prático:\n${libraryContext}\n`;
  }

  let systemPrompt = `${instruction}\n\n`;
  // Suppress summary contextual memory if the message is a simple greeting
  if (!isSimpleGreeting && (summaryShort || summaryLong)) {
    systemPrompt += `### Memória Contextual das Conversas Anteriores:\n`;
    if (summaryShort) systemPrompt += `- Resumo Curto: ${summaryShort.replace(/n[eé]voa\s*(interior|mental|cognitiva)?/gi, 'sobrecarga')}\n`;
    if (summaryLong) systemPrompt += `- Histórico de Longo Prazo: ${summaryLong.replace(/n[eé]voa\s*(interior|mental|cognitiva)?/gi, 'sobrecarga')}\n`;
    systemPrompt += `\n`;
  }

  if (sessionTiming && !isSimpleGreeting) {
    const { elapsedMinutes, messageCount, userWantsToContinue } = sessionTiming;
    systemPrompt += `### Contexto Temporal da Sessão Atual (Protocolo TCC Breve: 15 a 20 Minutos):\n`;
    systemPrompt += `- Duração estimada da conversa: ~${elapsedMinutes} minutos (${messageCount} mensagens trocadas).\n`;
    
    if (userWantsToContinue || elapsedMinutes > 20) {
      systemPrompt += `- **DIRETRIZ CLÍNICA (AUTONOMIA & CONTINUAÇÃO)**: O paciente indicou que deseja continuar a conversa (ou estamos além dos 20 min e ele segue dialogando). NUNCA encerre ou corte a sessão de forma abrupta! Prossiga com total disponibilidade e acolhimento, mantendo as respostas curtas e focadas (máximo de 1 a 3 parágrafos concisos, sem tabelas nem listas longas), propondo apenas um único ponto reflexivo ou passo prático de cada vez.\n\n`;
    } else if (elapsedMinutes >= 15 && elapsedMinutes <= 20) {
      systemPrompt += `- **DIRETRIZ CLÍNICA (JANELA DE SÍNTESE 15-20 MIN)**: A sessão está na faixa de 15 a 20 minutos. Se fizer sentido clínico neste momento, faça uma síntese carinhosa e breve (1 a 2 parágrafos) dos pontos principais e dê total autonomia ao paciente com a checagem: pergunte se ele gostaria de encerrar por hoje para assimilar as reflexões, ou se prefere continuar conversando mais um pouco.\n\n`;
    } else {
      systemPrompt += `- **DIRETRIZ CLÍNICA (DESENVOLVIMENTO 0-15 MIN)**: Fase ativa de acolhimento, escuta atenta, reestruturação cognitiva e pequenos conselhos práticos (sempre curtos, diretos e um por vez).\n\n`;
    }
  }

  // 1. If user supplied their own valid Gemini API Key, try it with priority
  if (userApiKey && isValidGeminiKey(userApiKey)) {
    try {
      const userModel = (aiModel && aiModel.startsWith('gemini')) ? aiModel : DEFAULT_GEMINI_MODEL;
      const contents = [];
      for (const msg of messageHistory) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: latestMessage }]
      });

      return await generateGeminiContent(
        userApiKey,
        userModel,
        systemPrompt,
        contents,
        false
      );
    } catch (userKeyErr: any) {
      console.warn('[PSAI] Chave de API do usuário falhou, tentando fallback institucional...', userKeyErr.message || userKeyErr);
    }
  }

  // 2. Try Groq ultra-fast LPU engine (~1.2s response time)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.trim().length > 0) {
    try {
      return await generateGroqContent(
        groqKey,
        DEFAULT_GROQ_MODEL,
        systemPrompt,
        messageHistory,
        latestMessage,
        false
      );
    } catch (groqErr: any) {
      console.warn('[PSAI] Engine ultra-rápida Groq falhou, caindo para o Gemini...', groqErr.message || groqErr);
    }
  }

  // 3. High-quality Gemini fallback with system key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (isValidGeminiKey(geminiKey)) {
    try {
      const contents = [];
      for (const msg of messageHistory) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: latestMessage }]
      });

      return await generateGeminiContent(
        geminiKey!,
        DEFAULT_GEMINI_MODEL,
        systemPrompt,
        contents,
        false
      );
    } catch (geminiErr: any) {
      console.warn('[PSAI] Chamada nativa ao Gemini falhou:', geminiErr.message || geminiErr);
    }
  }

  // 3. Compassionate emergency fallback so chat NEVER fails with 500
  const userName = userProfile?.name ? `, ${userProfile.name}` : '';
  return `Olá${userName}. Estou ouvindo com muita atenção o que você está me trazendo. Tive uma pequena oscilação técnica momentânea nos meus servidores, mas estou plenamente aqui com você. Pode me contar mais sobre o que está sentindo agora?`.trim();
}

/**
 * Analyzes the sentiment of a message via Gemini (with Groq fallback).
 */
export async function analyzeSentiment(
  content: string,
  userApiKey?: string | null,
  aiModel?: string | null
): Promise<{ sentiment: string; score: number }> {
  const prompt = `
Analise o sentimento da mensagem abaixo de um usuário em um diário terapêutico.
Categorize-o estritamente em um destes 5 estados: "Neutral", "Anxiolytic" (ansiedade, medo, preocupação), "Depressive" (tristeza, desânimo, solidão), "Happy" (alegria, gratidão, paz), ou "Stressed" (raiva, cansaço, estresse).
Também atribua uma nota de score de bem-estar emocional de 0 a 100 (onde 0 é extremo sofrimento/tristeza/pânico e 100 é extrema felicidade/paz).

Retorne um JSON válido contendo exatamente estas duas chaves: "sentiment" (string) e "score" (number).

Mensagem a analisar:
"${content}"
`;

  let responseText = '';
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isValidGeminiKey(geminiKey)) {
    try {
      const contents = [{ role: 'user', parts: [{ text: prompt }] }];
      responseText = await generateGeminiContent(
        geminiKey!,
        DEFAULT_GEMINI_MODEL,
        'Você é um classificador de sentimentos de alta precisão em formato JSON.',
        contents,
        true
      );
    } catch (geminiErr) {
      console.warn('[PSAI] Análise de sentimento com Gemini falhou, caindo para Groq...', geminiErr);
    }
  }

  if (!responseText) {
    try {
      const groqKey = getGroqApiKey(process.env.GROQ_API_KEY);
      responseText = await generateGroqContent(
        groqKey,
        'openai/gpt-oss-20b',
        'Você é um classificador de sentimentos em formato JSON. Retorne apenas o JSON.',
        [],
        prompt,
        true
      );
    } catch (groqErr) {
      console.error('[PSAI] Análise de sentimento com Groq falhou:', groqErr);
    }
  }

  if (responseText) {
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && typeof parsed.sentiment === 'string' && typeof parsed.score === 'number') {
        return { sentiment: parsed.sentiment, score: parsed.score };
      }
    } catch (parseErr) {
      console.error('[PSAI] Falha ao parsear JSON do sentimento:', responseText, parseErr);
    }
  }

  return { sentiment: 'Neutral', score: 50 };
}

/**
 * Summarizes session messages (with Groq fallback).
 */
export async function generateSessionSummaries(
  messages: ChatMessageContext[],
  userApiKey?: string | null,
  aiModel?: string | null
): Promise<{ summaryShort: string; summaryLong: string }> {
  const fallbackSummary = {
    summaryShort: 'Sessão iniciada focando em reflexões pessoais do cotidiano.',
    summaryLong: 'O usuário iniciou o acompanhamento expressando sentimentos e buscando autoconhecimento.'
  };

  if (messages.length === 0) return fallbackSummary;

  const historyText = messages
    .map((m) => `${m.sender === 'user' ? 'Usuário' : 'PSAI'}: ${m.content}`)
    .join('\n');

  const prompt = `
Com base no histórico da conversa terapêutica abaixo:
"${historyText}"

Gere um resumo contendo exatamente as chaves "summaryShort" (resumo do tema principal em até 12 palavras) e "summaryLong" (resumo clínico em até 3 frases sobre o progresso e pensamentos automáticos).
Retorne um JSON válido.
`;

  let responseText = '';
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isValidGeminiKey(geminiKey)) {
    try {
      const contents = [{ role: 'user', parts: [{ text: prompt }] }];
      responseText = await generateGeminiContent(
        geminiKey!,
        DEFAULT_GEMINI_MODEL,
        'Você é um assistente gerador de resumos e relatórios em formato JSON.',
        contents,
        true
      );
    } catch (geminiErr) {
      console.warn('[PSAI] Sumarização com Gemini falhou, caindo para Groq...', geminiErr);
    }
  }

  if (!responseText) {
    try {
      const groqKey = getGroqApiKey(process.env.GROQ_API_KEY);
      responseText = await generateGroqContent(
        groqKey,
        'openai/gpt-oss-20b',
        'Você é um assistente de resumo em formato JSON. Retorne apenas o JSON.',
        [],
        prompt,
        true
      );
    } catch (groqErr) {
      console.error('[PSAI] Sumarização com Groq falhou:', groqErr);
    }
  }

  if (responseText) {
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        summaryShort: parsed.summaryShort || fallbackSummary.summaryShort,
        summaryLong: parsed.summaryLong || fallbackSummary.summaryLong
      };
    } catch (e) {
      console.error('[PSAI] Erro ao parsear resumos:', responseText, e);
    }
  }

  return fallbackSummary;
}

/**
 * Otimiza e expande a mensagem do usuário para gerar termos de busca clínicos em psicologia científica.
 * Ideal para recuperar trechos no Pinecone que contenham explicações formais.
 */
export async function generateSearchQuery(
  latestMessage: string,
  userApiKey?: string | null,
  aiModel?: string | null
): Promise<string> {
  const prompt = `
Você é um assistente de pesquisa em psicologia científica. O usuário de um diário terapêutico enviou a seguinte mensagem expressando seus sentimentos ou problemas:
"${latestMessage}"

Gere de 1 a 3 termos de busca, conceitos clínicos ou teorias em psicologia (como "distorções cognitivas", "reestruturação cognitiva", "ruminação mental", "mindfulness", "ativação comportamental", "regulação emocional") em português que representem a queixa do usuário e ajudem a encontrar materiais de apoio científico relevantes na biblioteca de TCC/Psicologia.
Retorne APENAS os termos de busca gerados (separados por espaço), sem aspas, explicações, numerações ou marcadores.
`;

  const geminiKey = process.env.GEMINI_API_KEY;

  if (isValidGeminiKey(geminiKey)) {
    try {
      const contents = [{ role: 'user', parts: [{ text: prompt }] }];
      const response = await generateGeminiContent(
        geminiKey!,
        DEFAULT_GEMINI_MODEL,
        'Você é um gerador de termos de busca clínicos direto e objetivo.',
        contents,
        false
      );
      if (response && response.trim().length > 0) {
        console.log(`[PSAI Search Query Expansion] Termos gerados via Gemini: "${response.trim()}"`);
        return response.trim();
      }
    } catch (geminiErr: any) {
      console.warn('[PSAI Search Query Expansion] Chamada ao Gemini falhou, tentando Groq...', geminiErr.message || geminiErr);
    }
  }

  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.trim().length > 0) {
      const response = await generateGroqContent(
        groqKey,
        'openai/gpt-oss-20b',
        'Você é um gerador de termos de busca clínicos direto e objetivo. Retorne apenas os termos.',
        [],
        prompt,
        false
      );
      if (response && response.trim().length > 0) {
        console.log(`[PSAI Search Query Expansion] Termos gerados via Groq: "${response.trim()}"`);
        return response.trim();
      }
    }
  } catch (groqErr: any) {
    console.error('[PSAI Search Query Expansion] Chamada ao Groq falhou:', groqErr.message || groqErr);
  }

  // Fallback to original message
  return latestMessage;
}
