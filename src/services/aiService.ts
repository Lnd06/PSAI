export interface ChatMessageContext {
  sender: 'user' | 'ai';
  content: string;
}

// System prompts
const SYSTEM_INSTRUCTION_REFLECTIVE = `
Você é a PSAI (Psychological Support AI), uma Assistente de Reflexão Guiada e Escuta Ativa baseada nos princípios da Terapia Cognitivo-Comportamental (TCC).
Diretrizes fundamentais para suas respostas:
1. Tom: Acolhedor, empático, calmo, reflexivo e não-julgador.
2. Limites: Você NÃO substitui um terapeuta, psicólogo humano ou tratamento médico. Sempre que adequado, lembre sutilmente o usuário disso.
3. Abordagem: Use questionamentos socráticos. Ajude o usuário a examinar seus pensamentos disfuncionais e a encontrar explicações alternativas saudáveis.
4. Respostas: Seja conciso (de 1 a 3 parágrafos curtos). Foque em escuta ativa.
5. Sem Jargões ou Explicações Técnicas Não Solicitadas: NUNCA crie tópicos do tipo 'Por que ajuda?' nem use termos como nervo vagal, sistema límbico ou luta-ou-fuga. Mantenha as orientações brandas e humanas, a menos que o usuário pergunte explicitamente o motivo científico.
`;

const SYSTEM_INSTRUCTION_NATURAL = `
Você é a PSAI (Psychological Support AI), agindo no Modo Acolhimento e Conversação Natural.
Diretrizes fundamentais para suas respostas:
1. Tom: Extremamente caloroso, acolhedor, empático, afetuoso e natural. Fale como um amigo compreensivo.
2. Limites: Você NÃO substitui um terapeuta ou tratamento de saúde mental.
3. Abordagem: Priorize a validação emocional imediata. Faça o usuário se sentir ouvido. Use linguagem informal e amigável. Evite jargões ou explicações biológicas/técnicas não solicitadas.
4. Respostas: Mantenha a conversa fluindo de forma leve, curta, espontânea e branda.
`;

const FREE_FALLBACK_MODELS = [
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free'
];

async function postOpenRouterWithFallback(
  apiKey: string,
  primaryModel: string,
  bodyData: any
): Promise<any> {
  const modelsToTry = [
    primaryModel || 'tencent/hy3:free',
    ...FREE_FALLBACK_MODELS.filter(m => m !== primaryModel)
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`Tentando chamar OpenRouter com o modelo: ${model}`);
      const requestBody = {
        ...bodyData,
        model: model
      };
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'PSAI Web App'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data && data.choices && data.choices.length > 0) {
        return data;
      } else if (data && data.error) {
        throw new Error(`OpenRouter API error payload: ${JSON.stringify(data.error)}`);
      } else {
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.warn(`Falha ao chamar modelo ${model}:`, error);
      lastError = error;
    }
  }
  
  throw lastError || new Error("Failed to call OpenRouter on all attempted models");
}

/**
 * Queries OpenRouter API for reflection completions
 */
async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessageContext[],
  latestMessage: string
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: latestMessage }
  ];

  const data = await postOpenRouterWithFallback(apiKey, model, {
    messages,
    temperature: 0.7,
    max_tokens: 500
  });

  return data.choices?.[0]?.message?.content || '';
}

/**
 * Queries OpenRouter API for sentiment analysis
 */
async function analyzeSentimentOpenRouter(
  apiKey: string,
  model: string,
  content: string
): Promise<{ sentiment: string; score: number }> {
  const prompt = `
Analise o sentimento da mensagem abaixo de um usuário em um diário terapêutico.
Categorize-o estritamente em um destes 5 estados: "Neutral", "Anxiolytic" (ansiedade, medo, preocupação), "Depressive" (tristeza, desânimo, solidão), "Happy" (alegria, gratidão, paz), ou "Stressed" (raiva, cansaço, estresse).
Também atribua uma nota de score de bem-estar emocional de 0 a 100.

Retorne APENAS um JSON válido contendo exatamente estas duas chaves: "sentiment" e "score". Não use blocos de código markdown nem texto extra.
Exemplo de retorno esperado:
{"sentiment": "Neutral", "score": 50}

Mensagem a analisar:
"${content}"
`;

  const data = await postOpenRouterWithFallback(apiKey, model, {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const responseText = data.choices?.[0]?.message?.content?.trim() || '';
  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  if (parsed && typeof parsed.sentiment === 'string' && typeof parsed.score === 'number') {
    return {
      sentiment: parsed.sentiment,
      score: parsed.score
    };
  }
  throw new Error("Invalid OpenRouter sentiment format");
}

/**
 * Main handler to generate response
 */
export async function generateTherapeuticResponse(
  messageHistory: ChatMessageContext[],
  latestMessage: string,
  mode: string = 'reflective',
  openRouterApiKey?: string,
  aiModel?: string,
  summaryShort?: string,
  summaryLong?: string,
  userProfile?: { name: string; age?: string; occupation?: string; lifeContext?: string; challenges?: string; memories?: string[] }
): Promise<string> {
  let instruction = mode === 'natural' ? SYSTEM_INSTRUCTION_NATURAL : SYSTEM_INSTRUCTION_REFLECTIVE;

  if (userProfile) {
    instruction += `\n### Perfil e Histórico Pessoal do Usuário (JSON Local):\n`;
    instruction += `- Nome/Apelido: ${userProfile.name}\n`;
    if (userProfile.age) instruction += `- Idade: ${userProfile.age} anos\n`;
    if (userProfile.occupation) instruction += `- Ocupação/Profissão: ${userProfile.occupation}\n`;
    if (userProfile.lifeContext) instruction += `- Histórico/Contexto de Vida: ${userProfile.lifeContext}\n`;
    if (userProfile.challenges) instruction += `- Desafios Principais/Foco Terapêutico: ${userProfile.challenges}\n`;
    if (userProfile.memories && userProfile.memories.length > 0) {
      instruction += `\n### Memórias Aprendidas de Conversas Anteriores:\n`;
      userProfile.memories.forEach((m, i) => { instruction += `${i + 1}. ${m}\n`; });
    }
    instruction += `\nInstrução Clínico-Terapêutica: Adapte suas reflexões, tom de voz, jargões e questionamentos socráticos de forma sutil levando em consideração o Histórico Pessoal do Usuário listado acima. Use essa bagagem pessoal para direcionar as intervenções terapêuticas e acolhimentos de forma natural, sem repetir mecanicamente os dados listados.\n`;
  }

  if (openRouterApiKey && openRouterApiKey.trim().length > 0) {
    try {
      let systemPrompt = `${instruction}\n\n`;
      if (summaryShort || summaryLong) {
        systemPrompt += `### Memória Contextual das Conversas Anteriores:\n`;
        if (summaryShort) systemPrompt += `- Resumo: ${summaryShort}\n`;
        if (summaryLong) systemPrompt += `- Histórico de Longo Prazo: ${summaryLong}\n`;
        systemPrompt += `\n`;
      }
      return await callOpenRouter(
        openRouterApiKey,
        aiModel || 'nousresearch/hermes-3-llama-3-8b',
        systemPrompt,
        messageHistory,
        latestMessage
      );
    } catch (error) {
      console.error('Error calling OpenRouter in generateTherapeuticResponse, falling back to local simulation:', error);
      return generateMockTherapeuticResponse(latestMessage, mode);
    }
  } else {
    return generateMockTherapeuticResponse(latestMessage, mode);
  }
}

/**
 * Main handler to analyze sentiment
 */
export async function analyzeSentiment(
  content: string,
  openRouterApiKey?: string,
  aiModel?: string
): Promise<{ sentiment: string; score: number }> {
  if (openRouterApiKey && openRouterApiKey.trim().length > 0) {
    try {
      return await analyzeSentimentOpenRouter(
        openRouterApiKey,
        aiModel || 'nousresearch/hermes-3-llama-3-8b',
        content
      );
    } catch (error) {
      console.error('Error calling OpenRouter in analyzeSentiment, falling back to local simulation:', error);
      return localSentimentAnalysis(content);
    }
  } else {
    return localSentimentAnalysis(content);
  }
}

/**
 * Summarize sessions locally or via OpenRouter
 */
export async function generateSessionSummaries(
  messages: ChatMessageContext[],
  openRouterApiKey?: string,
  aiModel?: string
): Promise<{ summaryShort: string; summaryLong: string }> {
  const fallback = {
    summaryShort: 'Sessão iniciada focando em desabafos e reflexões.',
    summaryLong: 'O usuário compartilhou sentimentos recentes em busca de acolhimento e autoconhecimento.'
  };

  if (openRouterApiKey && openRouterApiKey.trim().length > 0 && messages.length > 0) {
    try {
      const historyText = messages
        .map((m) => `${m.sender === 'user' ? 'Usuário' : 'PSAI'}: ${m.content}`)
        .join('\n');

      const prompt = `
Com base no histórico da conversa terapêutica abaixo:
"${historyText}"

Gere um resumo em formato JSON válido contendo exatamente as chaves "summaryShort" (resumo do tema principal em até 12 palavras) e "summaryLong" (resumo clínico em até 3 frases sobre o progresso e pensamentos automáticos).
Não adicione markdown nem explicações.
`;

      const data = await postOpenRouterWithFallback(openRouterApiKey, aiModel || 'tencent/hy3:free', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });
      const rawText = data.choices?.[0]?.message?.content?.trim() || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      return {
        summaryShort: parsed.summaryShort || fallback.summaryShort,
        summaryLong: parsed.summaryLong || fallback.summaryLong
      };
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Local rule-based fallback for sentiment analysis
 */
function localSentimentAnalysis(content: string): { sentiment: string; score: number } {
  const normalized = content.toLowerCase();

  if (
    normalized.includes('triste') ||
    normalized.includes('chorar') ||
    normalized.includes('solidão') ||
    normalized.includes('solitário') ||
    normalized.includes('vazio') ||
    normalized.includes('desanim') ||
    normalized.includes('deprim')
  ) {
    return { sentiment: 'Depressive', score: Math.floor(Math.random() * 20) + 15 };
  }

  if (
    normalized.includes('ansi') ||
    normalized.includes('medo') ||
    normalized.includes('panico') ||
    normalized.includes('nervos') ||
    normalized.includes('desespero') ||
    normalized.includes('preocupad')
  ) {
    return { sentiment: 'Anxiolytic', score: Math.floor(Math.random() * 20) + 35 };
  }

  if (
    normalized.includes('estress') ||
    normalized.includes('raiva') ||
    normalized.includes('odio') ||
    normalized.includes('cansad') ||
    normalized.includes('esgotad') ||
    normalized.includes('irritad')
  ) {
    return { sentiment: 'Stressed', score: Math.floor(Math.random() * 20) + 30 };
  }

  if (
    normalized.includes('feliz') ||
    normalized.includes('alegre') ||
    normalized.includes('otim') ||
    normalized.includes('paz') ||
    normalized.includes('tranquil') ||
    normalized.includes('gratid')
  ) {
    return { sentiment: 'Happy', score: Math.floor(Math.random() * 20) + 80 };
  }

  return { sentiment: 'Neutral', score: 50 };
}

/**
 * Local mock responders
 */
function generateMockTherapeuticResponse(message: string, mode: string): string {
  const normalized = message.toLowerCase();

  if (mode === 'natural') {
    const naturalResponses = [
      "Poxa, eu te entendo perfeitamente. Lidar com essas coisas não é fácil, mas quero que saiba que eu te escuto e estou aqui com você. Quer desabafar um pouco mais sobre o que está acontecendo?",
      "Com certeza te compreendo. Às vezes o melhor a fazer é respirar fundo e dar um passo atrás para cuidar da gente. Como você está lidando com isso hoje?",
      "Obrigado por compartilhar isso comigo! Esse espaço é todo seu para você falar de forma livre, sem julgamentos. Como posso te apoiar melhor agora?",
      "É muito compreensível você se sentir assim. Tire um peso das suas costas, você não precisa carregar o mundo todo sozinho(a). O que acha de fazermos uma pequena pausa?",
      "Estou te escutando de verdade. Cada dia traz seus próprios desafios e é super normal ter momentos mais nublados. O que está passando pela sua mente agora?"
    ];

    if (normalized.includes('triste') || normalized.includes('desanim') || normalized.includes('solid')) {
      return "Sinto muito pela sua tristeza. É um sentimento que pesa bastante, eu sei. Saiba que suas emoções são super válidas e estou aqui para te acompanhar. O que você acha que contribuiu para essa tristeza hoje?";
    }

    if (normalized.includes('ansi') || normalized.includes('medo') || normalized.includes('preocup')) {
      return "Consigo perceber como essa ansiedade está apertando você agora. Quando o peito apertar, tenta focar na sua respiração bem pausadamente... eu estou aqui contigo. Quer detalhar um pouco o que está te preocupando?";
    }

    if (normalized.includes('estress') || normalized.includes('raiva') || normalized.includes('cansad')) {
      return "Que exaustão, hein? Às vezes a gente chega no nosso limite e o corpo e a mente gritam por um descanso. Tente tirar 10 minutinhos só seus hoje para respirar fundo e se desligar de tudo.";
    }

    if (normalized.includes('feliz') || normalized.includes('paz') || normalized.includes('agradec')) {
      return "Nossa, que notícia fantástica! Fico muito contente em saber que você está se sentindo assim. É muito bom celebrar e registrar momentos de paz e alegria. O que tornou seu dia tão iluminado assim? Me conta!";
    }

    const index = Math.floor(Math.random() * naturalResponses.length);
    return naturalResponses[index];
  } else {
    // Reflective CBT
    const reflections = [
      "Lamento que você esteja passando por essa situação. Quando você percebe esse desconforto emocional surgindo, quais são os pensamentos automáticos que surgem na sua mente? Há alguma cobrança exagerada neles?",
      "Compreendo o seu ponto. Na perspectiva da TCC, nossos sentimentos são em grande parte formados pela nossa interpretação dos fatos. Se tentássemos ver esse cenário por um ângulo alternativo, qual seria uma explicação viável?",
      "Agradeço por compartilhar esse momento comigo. Identificar e rotular suas emoções (como você fez agora) é o primeiro passo. Há alguma evidência concreta que apoia esse pensamento limitante, ou seria uma catastrofização?",
      "Parece haver uma autoexigência muito pesada sobre você nesse momento. Como seria se você demonstrasse a si mesmo(a) a mesma empatia e paciência que demonstraria com um amigo querido passando pela mesma coisa?"
    ];

    if (normalized.includes('triste') || normalized.includes('desanim')) {
      return "Sinto muito que você esteja se sentindo triste. Na TCC, sabemos que a tristeza diminui nossas ações de engajamento, gerando um ciclo de desânimo. O que você acha de tentar fazer uma tarefa simples e agradável hoje, mesmo sem muita vontade inicial, para testar se há variação no seu humor?";
    }

    if (normalized.includes('ansi') || normalized.includes('preocup') || normalized.includes('medo')) {
      return "A ansiedade costuma nos fazer superestimar as ameaças e subestimar nosso potencial de enfrentamento. Diante dessa preocupação que você relatou: qual seria o pior cenário possível? E o que você faria se ele ocorresse? Qual seria o cenário mais provável e equilibrado?";
    }

    const index = Math.floor(Math.random() * reflections.length);
    return reflections[index];
  }
}

/**
 * Extract personal facts from conversation messages.
 * Uses AI to identify new personal details the user shared (name, age, job, family, hobbies, fears, etc.)
 * Returns an array of new fact strings to be appended to the profile memories.
 */
export async function extractPersonalFacts(
  recentMessages: ChatMessageContext[],
  existingMemories: string[],
  openRouterApiKey?: string,
  aiModel?: string
): Promise<string[]> {
  if (!openRouterApiKey || openRouterApiKey.trim().length === 0) return [];
  if (recentMessages.length === 0) return [];

  // Only analyze the last 6 messages (3 user + 3 ai typically) for efficiency
  const window = recentMessages.slice(-6);
  const historyText = window
    .map((m) => `${m.sender === 'user' ? 'Usuário' : 'PSAI'}: ${m.content}`)
    .join('\n');

  const existingText = existingMemories.length > 0
    ? `Fatos já conhecidos (NÃO repita estes):\n${existingMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n`
    : '';

  const prompt = `
Você é um extrator de informações pessoais para um diário terapêutico.

Analise a conversa recente abaixo e identifique NOVOS fatos pessoais que o USUÁRIO revelou sobre si mesmo.
Extraia APENAS informações concretas como:
- Nome, apelido, idade, gênero
- Profissão, local de trabalho, rotina
- Família (cônjuge, filhos, pais, irmãos)
- Hobbies, interesses, coisas que gosta ou não gosta
- Medos, gatilhos, traumas mencionados
- Conquistas, metas, sonhos
- Problemas de saúde, medicações
- Relacionamentos, amizades
- Qualquer outro dado pessoal relevante

${existingText}Conversa recente:
"${historyText}"

Regras:
- Extraia APENAS fatos NOVOS que o USUÁRIO revelou (não da IA).
- NÃO repita fatos já conhecidos listados acima.
- Se não houver nenhum fato pessoal novo, retorne um array JSON vazio: []
- Cada fato deve ser uma frase curta e objetiva em terceira pessoa.
- Retorne APENAS um array JSON de strings. Sem markdown, sem explicações.

Exemplo de retorno:
["Tem 28 anos", "Trabalha como designer", "Tem um cachorro chamado Thor", "Sofre de insônia"]
`;

  try {
    const data = await postOpenRouterWithFallback(openRouterApiKey, aiModel || 'tencent/hy3:free', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });
    const rawText = data.choices?.[0]?.message?.content?.trim() || '[]';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed)) {
      // Filter out empty strings and duplicates against existing memories
      const normalizedExisting = new Set(existingMemories.map((m) => m.toLowerCase().trim()));
      return parsed
        .filter((fact: unknown): fact is string => typeof fact === 'string' && fact.trim().length > 0)
        .filter((fact: string) => !normalizedExisting.has(fact.toLowerCase().trim()));
    }
    return [];
  } catch (e) {
    console.error('Error extracting personal facts:', e);
    return [];
  }
}
