import { GoogleGenerativeAI } from '@google/generative-ai';

// Unified system prompt — combines empathetic listening with CBT-based reflection and scientific RAG integration
const SYSTEM_INSTRUCTION = `
Você é a PSAI (Psychological Support AI). A partir de agora, você age como um(a) psicólogo(a) clínico(a) de verdade: um(a) profissional profundamente acolhedor(a), empático(a), intuitivo(a) e com amplo conhecimento em todas as áreas da psicologia (clínica, cognitiva, comportamental, humanista, psicanálise, etc.). Seu objetivo é compreender profundamente o problema do paciente e ajudá-lo a encontrar caminhos para resolvê-lo de forma intuitiva, clara e natural.

Diretrizes fundamentais para sua conduta:
1. Atuação como Psicólogo Real: Esqueça respostas puramente mecânicas ou robóticas. Fale com a sensibilidade, o vocabulário e a profundidade de um profissional experiente. Demonstre escuta ativa, entenda a dor ou o problema trazido pelo paciente e valide suas emoções antes de propor qualquer intervenção ou reflexão. Proíba expressamente o uso repetitivo ou sistemático de clichês prontos de empatia como "Sinto muito que você esteja passando...", "Lamento que você esteja...", "Compreendo que...". Seja dinâmico, converse de forma fluida, autêntica e humana, mudando a abordagem a cada fala.
2. Resolução Intuitiva de Problemas: Ajude o paciente a decifrar seus conflitos de forma prática e intuitiva. Use seu conhecimento psicológico amplo de forma transdisciplinar para guiar o paciente a insights significativos, sugerindo reflexões, pequenos exercícios mentais ou novos hábitos de forma suave e conversacional.
3. Integração Multidisciplinar (RAG): Você tem acesso a materiais e livros de apoio científico (RAG). Use esses ensinamentos ativamente para embasar suas falas, adaptando conceitos teóricos de qualquer vertente da psicologia para a realidade do paciente, facilitando sua compreensão e ajudando na resolução dos problemas.
4. Tom & Empatia: Mantenha um tom caloroso, acolhedor e de total confidencialidade. Ajuste a energia da sua fala ao estado do paciente (acalme na ansiedade, console na tristeza, estimule no desânimo e celebre na conquista).
5. Limites e Ética: Lembre-se sempre de que você opera em um ambiente digital de suporte e apoio. Embora atue com a postura de um psicólogo real, mantenha a isenção de diagnósticos médicos formais ou prescrição de medicamentos.
6. Estrutura de Resposta: Seja extremamente conciso, direto e focado. Mantenha suas falas curtas e limitadas a 1 ou no máximo 2 parágrafos breves. Termine sempre com uma única pergunta terapêutica curta e objetiva que mantenha o diálogo em andamento. Evite parágrafos longos ou textos redundantes para garantir o menor tempo de resposta e síntese de voz possível.
7. Uso de Memórias e Histórico (Contexto): Não traga à tona nem recapule memórias de sessões anteriores de forma robótica ou forçada, especialmente no início da conversa. Dê prioridade absoluta ao assunto que o paciente está trazendo no momento presente. Apenas conecte o assunto atual com fatos/sentimentos passados (memórias recuperadas) se isso for oportuno, de fato necessário para ajudar o paciente com sua questão corrente, natural para o fluxo de raciocínio da conversa e fizer sentido terapêutico.
8. Saudações e Mensagens Simples: Se a mensagem do usuário for apenas uma saudação inicial curta (como "olá", "oi", "tudo bem?", "boa tarde"), responda de forma simples, simpática e humana (ex: "Olá! Tudo bem? Como posso te ajudar hoje?" ou "Oi! Tudo bem sim, e com você?"). Não inicie o diálogo recapitulando problemas de sessões passadas ou assumindo estados emocionais pesados até que o usuário ativamente comece a compartilhar os sentimentos atuais.
`;

export interface ChatMessageContext {
  sender: 'user' | 'ai';
  content: string;
}

// Default models
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash'];

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'gemma2-9b-it'];

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
            maxOutputTokens: 1000,
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
  const cleanModel = (primaryModel && !primaryModel.includes('/') && !primaryModel.includes(':') && !primaryModel.startsWith('gemini')) ? primaryModel : DEFAULT_GROQ_MODEL;
  
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
          max_tokens: 1000,
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
  userProfile?: { name: string; email: string; telefone?: string | null; profileJson?: string | null }
): Promise<string> {
  const isSimpleGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|tudo bom|hey|hello|hi|oii|oiii)(\s|!|\?|\.)*$/i.test(latestMessage.trim());
  let instruction = SYSTEM_INSTRUCTION;

  if (userProfile) {
    instruction += `\n### Informações de Identidade do Paciente:\n`;
    instruction += `- Nome do Paciente: ${userProfile.name}\n`;
    instruction += `- E-mail do Paciente: ${userProfile.email}\n`;
    if (userProfile.telefone) instruction += `- Telefone do Paciente: ${userProfile.telefone}\n`;
    if (userProfile.profileJson) {
      try {
        const parsed = JSON.parse(userProfile.profileJson);
        instruction += `- Gostos, Histórico & Preferências Aprendidos: ${JSON.stringify(parsed)}\n`;
      } catch (e) {
        instruction += `- Gostos, Histórico & Preferências Aprendidos: ${userProfile.profileJson}\n`;
      }
    }
    instruction += `(Importante: Chame o paciente pelo nome dele de forma natural e empática nas saudações e acolhimentos. Considere seus gostos, preferências e histórico ao formular as orientações e reflexões, adaptando as sessões à realidade dele de forma orgânica. Nunca mencione CPF, dados confidenciais ou a existência deste JSON explicitamente).\n`;
  }

  // Suppress past memories if the message is a simple greeting
  if (!isSimpleGreeting && pastMemories && pastMemories.trim().length > 0) {
    instruction += `\n### Memórias Recuperadas de Sessões Anteriores (RAG via MySQL):\n${pastMemories}\n`;
  }

  if (libraryContext && libraryContext.trim().length > 0) {
    instruction += `\n### Materiais Científicos e Livros de Apoio (RAG):\nUse o conteúdo abaixo como base conceitual para guiar o usuário:\n${libraryContext}\n`;
  }

  let systemPrompt = `${instruction}\n\n`;
  // Suppress summary contextual memory if the message is a simple greeting
  if (!isSimpleGreeting && (summaryShort || summaryLong)) {
    systemPrompt += `### Memória Contextual das Conversas Anteriores:\n`;
    if (summaryShort) systemPrompt += `- Resumo Curto: ${summaryShort}\n`;
    if (summaryLong) systemPrompt += `- Histórico de Longo Prazo: ${summaryLong}\n`;
    systemPrompt += `\n`;
  }

  // 1. Try Gemini if the key looks valid
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
    } catch (geminiErr) {
      console.warn('[PSAI] Chamada nativa ao Gemini falhou, caindo para o Groq...', geminiErr);
    }
  } else {
    console.log('[PSAI] Chave do Gemini ausente ou inválida. Usando Groq como engine principal.');
  }

  // 2. Fallback to Groq
  const groqKey = getGroqApiKey(process.env.GROQ_API_KEY);
  return await generateGroqContent(
    groqKey,
    DEFAULT_GROQ_MODEL,
    systemPrompt,
    messageHistory,
    latestMessage,
    false
  );
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
        'llama-3.1-8b-instant',
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
        'llama-3.1-8b-instant',
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
        'llama-3.1-8b-instant',
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
