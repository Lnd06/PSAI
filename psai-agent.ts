import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ANSI terminal colors definition
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m', // Soothing Lavender equivalent
  cyan: '\x1b[36m',    // Emerald pastel equivalent
  gray: '\x1b[90m'
};

// Types definitions
interface Config {
  name: string;
  provider: 'online' | 'offline';
  openRouterApiKey: string;
  aiModel: string;
  mode: 'reflective' | 'natural';
}

interface Message {
  sender: 'user' | 'ai';
  content: string;
  sentiment?: string;
  sentimentScore?: number;
  timestamp: string;
}

// Config and file paths
const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const HISTORY_PATH = path.join(process.cwd(), 'chat_history.json');
const CRISIS_LOG_PATH = path.join(process.cwd(), 'crisis_logs.json');

// System AI prompts
const SYSTEM_REFLECTIVE = `
Você é a PSAI (Psychological Support AI), uma Assistente Local de Reflexão Guiada baseada na Terapia Cognitivo-Comportamental (TCC).
Diretrizes:
- Tom: Calmo, acolhedor, analítico e socrático.
- Abordagem: Identifique pensamentos automáticos disfuncionais (como catastrofização) e ajude o usuário a refletir e buscar alternativas mais realistas.
- Limites: Você NÃO substitui psicólogos reais. Se aplicável, lembre o usuário disso.
- Respostas: De 1 a 3 parágrafos curtos.
`;

const SYSTEM_NATURAL = `
Você é a PSAI (Psychological Support AI), no Modo Acolhimento e Conversação Natural.
Diretrizes:
- Tom: Caloroso, amigável, informal, muito empático e acolhedor. Fale como um amigo querido.
- Abordagem: Valide os sentimentos do usuário antes de tudo. Não use termos técnicos de terapia. Dê apoio incondicional e ofereça palavras reconfortantes.
- Respostas: Curtas e dinâmicas para manter a fluidez natural da conversa.
`;

// Crisis patterns
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

// Load env variables
require('dotenv').config();
const geminiKey = process.env.GEMINI_API_KEY || '';
const hasGeminiKey = geminiKey.trim().length > 0;
const genAI = hasGeminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Global settings state
let currentConfig: Config = {
  name: 'Paciente',
  provider: 'offline',
  openRouterApiKey: '',
  aiModel: 'nousresearch/hermes-3-llama-3-8b',
  mode: 'reflective'
};

let currentHistory: Message[] = [];

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questionPrompt = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

/**
 * Loads config.json if present, otherwise boots interactive setup
 */
async function loadOrSetupConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const fileData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      currentConfig = JSON.parse(fileData);
    } catch (e) {
      console.log(`${colors.red}Erro ao ler arquivo config.json. Iniciando reconfiguração...${colors.reset}`);
      await interactiveSetup();
    }
  } else {
    await interactiveSetup();
  }
}

/**
 * Guided setup for local agent settings
 */
async function interactiveSetup() {
  console.clear();
  console.log(`${colors.bold}${colors.cyan}====================================================`);
  console.log(`               PSAI - AGENTE TERAPÊUTICO LOCAL      `);
  console.log(`====================================================${colors.reset}\n`);
  console.log(`Bem-vindo! Vamos configurar seu agente em poucos passos.\n`);

  const nameInput = await questionPrompt(`${colors.bold}Como gostaria de ser chamado(a)? ${colors.reset}`);
  currentConfig.name = nameInput.trim() || 'Paciente';

  console.log(`\n${colors.bold}Escolha o tipo de agente de IA:${colors.reset}`);
  console.log(`1. Agente Online (Conecta ao OpenRouter/Gemini para respostas de LLMs avançados)`);
  console.log(`2. Agente Offline (100% local, simulação psicóloga direta, sem chaves de API)`);
  const providerChoice = await questionPrompt(`${colors.bold}Opção [1 ou 2, padrão: 2]: ${colors.reset}`);
  
  if (providerChoice.trim() === '1') {
    currentConfig.provider = 'online';
    console.log(`\n${colors.bold}Configuração Online (OpenRouter):${colors.reset}`);
    const apiKeyInput = await questionPrompt(`${colors.bold}Chave OpenRouter: ${colors.reset}`);
    currentConfig.openRouterApiKey = apiKeyInput.trim();

    const modelInput = await questionPrompt(`${colors.bold}Modelo OpenRouter [padrão: nousresearch/hermes-3-llama-3-8b]: ${colors.reset}`);
    currentConfig.aiModel = modelInput.trim() || 'nousresearch/hermes-3-llama-3-8b';
  } else {
    currentConfig.provider = 'offline';
    currentConfig.openRouterApiKey = '';
    currentConfig.aiModel = '';
    console.log(`\n${colors.yellow}✓ Selecionado Agente Psicólogo 100% Offline (Sem chaves de API).${colors.reset}`);
  }

  console.log(`\n${colors.bold}Escolha a abordagem terapêutica padrão:${colors.reset}`);
  console.log(`1. Reflexiva (Baseada em Terapia Cognitivo-Comportamental - TCC)`);
  console.log(`2. Natural (Conversa acolhedora, focada em escuta ativa amigável)`);
  const modeChoice = await questionPrompt(`${colors.bold}Opção [1 ou 2, padrão: 1]: ${colors.reset}`);
  currentConfig.mode = modeChoice.trim() === '2' ? 'natural' : 'reflective';

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
  console.log(`\n${colors.green}✓ Configurações salvas em config.json com sucesso!${colors.reset}\n`);
  await new Promise((r) => setTimeout(r, 1200));
}

/**
 * Load conversation logs from local file
 */
function loadHistory() {
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      const data = fs.readFileSync(HISTORY_PATH, 'utf-8');
      currentHistory = JSON.parse(data);
    } catch {
      currentHistory = [];
    }
  } else {
    currentHistory = [];
  }
}

/**
 * Save current conversation logs
 */
function saveHistory() {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(currentHistory, null, 2), 'utf-8');
}

/**
 * Check if the text matches self-harm/suicide terms
 */
function handleCrisisCheck(text: string): boolean {
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      const matchedTerm = match ? match[0] : 'crisis_pattern';

      // Log crisis locally
      const logEntry = {
        timestamp: new Date().toISOString(),
        contentLength: text.length,
        detectedTerms: matchedTerm
      };
      
      let logs = [];
      if (fs.existsSync(CRISIS_LOG_PATH)) {
        try {
          logs = JSON.parse(fs.readFileSync(CRISIS_LOG_PATH, 'utf-8'));
        } catch {
          logs = [];
        }
      }
      logs.push(logEntry);
      fs.writeFileSync(CRISIS_LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');

      // Print emergency alert screen
      console.log(`\n\n${colors.bold}${colors.red}┌──────────────────────────────────────────────────────────┐`);
      console.log(`│             CENTRO DE VALORIZAÇÃO DA VIDA                │`);
      console.log(`│                 TELEFONE DE APOIO: 188                   │`);
      console.log(`├──────────────────────────────────────────────────────────┤`);
      console.log(`│ Detectamos termos sensíveis relacionados à automutilação │`);
      console.log(`│ ou ideação suicida.                                      │`);
      console.log(`│                                                          │`);
      console.log(`│ Como IA local, não posso dar atendimento de emergência   │`);
      console.log(`│ médica ou intervenções críticas de crise.                │`);
      console.log(`│                                                          │`);
      console.log(`│ Por favor, ligue para o CVV (188) ou SAMU (192) agora.   │`);
      console.log(`│ Seu bem-estar é importante e ajuda de verdade existe!    │`);
      console.log(`│ Acesse também: https://www.cvv.org.br/                   │`);
      console.log(`└──────────────────────────────────────────────────────────┘${colors.reset}\n`);
      return true;
    }
  }
  return false;
}

/**
 * Calls OpenRouter completion API
 */
async function callOpenRouter(prompt: string): Promise<string> {
  const messages = [
    { role: 'system', content: currentConfig.mode === 'natural' ? SYSTEM_NATURAL : SYSTEM_REFLECTIVE },
    ...currentHistory.map((h) => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: 'user', content: prompt }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentConfig.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'PSAI Local Agent'
    },
    body: JSON.stringify({
      model: currentConfig.aiModel || 'nousresearch/hermes-3-llama-3-8b',
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Sentiment analysis using OpenRouter if key is available
 */
async function analyzeSentimentOpenRouter(text: string): Promise<{ sentiment: string; score: number }> {
  const prompt = `
Analise o sentimento da mensagem abaixo de um usuário em um diário terapêutico.
Categorize-o estritamente em um destes 5 estados: "Neutral", "Anxiolytic", "Depressive", "Happy", ou "Stressed".
Também atribua uma nota de score de bem-estar emocional de 0 a 100.
Retorne APENAS um JSON válido no formato: {"sentiment": "Neutral", "score": 50}. Não use markdown nem comentários.
Mensagem: "${text}"
`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentConfig.openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: currentConfig.aiModel || 'nousresearch/hermes-3-llama-3-8b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });

  if (!response.ok) throw new Error();
  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim() || '';
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Gemini SDK calling
 */
async function callGemini(prompt: string): Promise<string> {
  if (!genAI) throw new Error('Sem chave Gemini');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemInstructions = currentConfig.mode === 'natural' ? SYSTEM_NATURAL : SYSTEM_REFLECTIVE;
  let fullPrompt = `${systemInstructions}\n\n`;

  fullPrompt += `### Histórico:\n`;
  currentHistory.forEach((msg) => {
    fullPrompt += `${msg.sender === 'user' ? 'Usuário' : 'PSAI'}: ${msg.content}\n`;
  });
  fullPrompt += `Usuário: ${prompt}\nPSAI: `;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
  });

  return result.response.text();
}

/**
 * Sentiment analysis using Gemini
 */
async function analyzeSentimentGemini(text: string): Promise<{ sentiment: string; score: number }> {
  if (!genAI) throw new Error();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `
Analise o sentimento da mensagem abaixo. Categorize em "Neutral", "Anxiolytic", "Depressive", "Happy" ou "Stressed", e um score de 0 a 100 de bem-estar emocional.
Retorne APENAS um JSON no formato: {"sentiment": "Neutral", "score": 50}
Mensagem: "${text}"
`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text().trim();
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Sentiment Local fallback logic
 */
function localSentimentAnalysis(content: string): { sentiment: string; score: number } {
  const normalized = content.toLowerCase();
  if (normalized.includes('triste') || normalized.includes('solidão') || normalized.includes('desanim') || normalized.includes('vazio')) {
    return { sentiment: 'Depressive', score: Math.floor(Math.random() * 20) + 15 };
  }
  if (normalized.includes('ansi') || normalized.includes('medo') || normalized.includes('panico') || normalized.includes('preocupad')) {
    return { sentiment: 'Anxiolytic', score: Math.floor(Math.random() * 20) + 35 };
  }
  if (normalized.includes('estress') || normalized.includes('raiva') || normalized.includes('odio') || normalized.includes('cansad')) {
    return { sentiment: 'Stressed', score: Math.floor(Math.random() * 20) + 30 };
  }
  if (normalized.includes('feliz') || normalized.includes('paz') || normalized.includes('otim') || normalized.includes('gratid')) {
    return { sentiment: 'Happy', score: Math.floor(Math.random() * 20) + 80 };
  }
  return { sentiment: 'Neutral', score: 50 };
}

/**
 * Response Local Mock logic
 */
function generateLocalMockResponse(content: string): string {
  const normalized = content.toLowerCase();
  
  if (currentConfig.mode === 'natural') {
    const naturalResponses = [
      "Poxa, sinto muito que você esteja se sentindo assim. Lidar com essas coisas não é fácil, mas quero que saiba que eu te ouço. O que acha de colocar mais para fora o que está te afligindo?",
      "Te entendo perfeitamente. Às vezes o melhor a fazer é respirar fundo e dar um tempo para a mente. Como você está se cuidando hoje?",
      "Obrigado por compartilhar isso comigo! Esse espaço é todinho seu para você desabafar, sem julgamentos. O que mais passa na sua mente?",
      "É super compreensível você se sentir assim. Tire um peso das suas costas. O que você acha que te faria se sentir um pouquinho mais leve agora?"
    ];
    if (normalized.includes('triste') || normalized.includes('desanim')) {
      return "Sinto muito pela sua tristeza. É uma sensação pesada, eu sei. Saiba que suas emoções são totalmente válidas e estou aqui do seu lado se quiser desabafar.";
    }
    if (normalized.includes('ansi') || normalized.includes('medo') || normalized.includes('preocup')) {
      return "Consigo sentir como essa preocupação está te apertando. Quando a ansiedade vem forte, tente respirar bem devagar... estou aqui te ouvindo. Quer falar mais sobre isso?";
    }
    const idx = Math.floor(Math.random() * naturalResponses.length);
    return naturalResponses[idx];
  } else {
    // Reflective CBT
    const reflections = [
      "Entendo seu ponto. Sob a ótica da TCC, nossos sentimentos são moldados pela forma como interpretamos as situações. Há alguma evidência concreta para esse pensamento que te incomoda?",
      "Identificar esses sentimentos já é um excelente passo. Há alguma distorção cognitiva (como pensamento 'tudo-ou-nada') que possa estar ampliando esse incômodo?",
      "Obrigado por trazer isso. Como seria se você demonstrasse a si mesmo(a) a mesma compaixão e paciência que demonstraria com um amigo passando pela mesma situação?"
    ];
    if (normalized.includes('triste') || normalized.includes('desanim')) {
      return "Lamento que se sinta triste. Na TCC, sabemos que a tristeza pode diminuir nossa energia. O que acha de tentar fazer uma pequena atividade agradável hoje, mesmo que seja simples, para testar se há alguma mudança no seu humor?";
    }
    const idx = Math.floor(Math.random() * reflections.length);
    return reflections[idx];
  }
}

/**
 * Compiles dashboard metrics directly in terminal
 */
function displayStats() {
  console.log(`\n${colors.bold}${colors.cyan}=== PAINEL EMOCIONAL DE BEM-ESTAR (ASCII) ===${colors.reset}`);
  
  const userMsgs = currentHistory.filter((h) => h.sender === 'user' && h.sentiment);
  if (userMsgs.length === 0) {
    console.log(`\nNenhum registro de sentimentos disponível. Converse um pouco primeiro!`);
    return;
  }

  // Wellness score average
  const totalScore = userMsgs.reduce((sum, m) => sum + (m.sentimentScore || 50), 0);
  const avgScore = Math.round(totalScore / userMsgs.length);
  
  // Mood distributions
  const counts: Record<string, number> = { Neutral: 0, Anxiolytic: 0, Depressive: 0, Happy: 0, Stressed: 0 };
  userMsgs.forEach((msg) => {
    if (msg.sentiment && msg.sentiment in counts) counts[msg.sentiment]++;
  });

  // Dominant mood
  let dominant = 'Neutral';
  let max = 0;
  Object.keys(counts).forEach((k) => {
    if (counts[k] > max) {
      max = counts[k];
      dominant = k;
    }
  });

  const translations: Record<string, string> = {
    Neutral: 'Neutro',
    Anxiolytic: 'Ansioso',
    Depressive: 'Triste',
    Happy: 'Feliz',
    Stressed: 'Estressado'
  };

  console.log(`\nPontuação Média de Bem-Estar: ${colors.bold}${colors.green}${avgScore}/100${colors.reset}`);
  
  // Circular gauge emulation
  const barLength = Math.round(avgScore / 5);
  const gauge = '■'.repeat(barLength) + ' '.repeat(20 - barLength);
  console.log(`Progresso: [${colors.cyan}${gauge}${colors.reset}]`);
  
  console.log(`Humor Dominante Atual: ${colors.bold}${colors.magenta}${translations[dominant] || dominant}${colors.reset}`);
  console.log(`Mensagens analisadas: ${userMsgs.length}`);
  
  console.log(`\n${colors.bold}Distribuição de Humores:${colors.reset}`);
  Object.keys(counts).forEach((k) => {
    const bar = '█'.repeat(counts[k]);
    console.log(`- ${translations[k] || k}: ${bar} (${counts[k]})`);
  });

  console.log(`\n${colors.bold}Progressão de Humor Recente (Últimos 8 registros):${colors.reset}`);
  const recent = userMsgs.slice(-8);
  recent.forEach((m, idx) => {
    const scoreBar = '■'.repeat(Math.round((m.sentimentScore || 50) / 10));
    console.log(`  Registro #${idx + 1}: [${colors.green}${scoreBar.padEnd(10, ' ')}${colors.reset}] - ${translations[m.sentiment || '']}`);
  });
  console.log(`${colors.cyan}=============================================${colors.reset}\n`);
}

/**
 * Boot logic
 */
async function main() {
  await loadOrSetupConfig();
  loadHistory();

  console.clear();
  console.log(`${colors.bold}${colors.cyan}`);
  console.log(`  ██████╗  ██████╗  █████╗ ██╗`);
  console.log(`  ██╔══██╗██╔════╝ ██╔══██╗██║`);
  console.log(`  ██████╔╝╚█████╗  ███████║██║`);
  console.log(`  ██╔═══╝  ╚═══██╗ ██╔══██║██║`);
  console.log(`  ██║     ██████╔╝ ██║  ██║██║`);
  console.log(`  ╚═╝     ╚═════╝  ╚═╝  ╚═╝╚═╝`);
  console.log(`   Psychological Support AI Agent v1.1`);
  console.log(`=========================================${colors.reset}`);
  console.log(`Olá, ${colors.bold}${currentConfig.name}${colors.reset}! Como você está se sentindo hoje?`);
  console.log(`Agente Ativo: ${colors.bold}${currentConfig.provider === 'online' ? colors.green + 'ONLINE (API)' : colors.yellow + 'OFFLINE (Local)'}${colors.reset} | Abordagem: ${colors.bold}${currentConfig.mode === 'natural' ? colors.magenta + 'Modo Acolhimento' : colors.cyan + 'Modo Reflexivo (TCC)'}${colors.reset}.`);
  console.log(`${colors.gray}Comandos úteis: /mode (muda modo), /stats (painel), /config (editar setup), /clear (limpar), /exit (sair)${colors.reset}\n`);

  promptLoop();
}

/**
 * Continuous console dialogue loops
 */
function promptLoop() {
  const prefix = currentConfig.mode === 'natural' 
    ? `${colors.bold}${colors.magenta}PSAI (Acolhimento) 💜 > ${colors.reset}`
    : `${colors.bold}${colors.cyan}PSAI (TCC) 🍃 > ${colors.reset}`;

  rl.question(`${colors.bold}${currentConfig.name}: ${colors.reset}`, async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      promptLoop();
      return;
    }

    // Command parser
    if (trimmed.startsWith('/')) {
      const command = trimmed.toLowerCase().split(' ')[0];
      
      switch (command) {
        case '/exit':
          console.log(`\nAté logo, ${currentConfig.name}. Cuide-se bem! ✨\n`);
          rl.close();
          process.exit(0);
          return;

        case '/clear':
          currentHistory = [];
          saveHistory();
          console.log(`\n${colors.yellow}✓ Histórico de diários limpo com sucesso.${colors.reset}\n`);
          break;

        case '/mode':
          currentConfig.mode = currentConfig.mode === 'natural' ? 'reflective' : 'natural';
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
          console.log(`\nAbordagem alternada para: ${colors.bold}${currentConfig.mode === 'natural' ? colors.magenta + 'Conversa Natural' : colors.cyan + 'Reflexivo (TCC)'}${colors.reset}\n`);
          break;

        case '/config':
          await interactiveSetup();
          console.clear();
          console.log(`\nConfigurações de perfil atualizadas! Bem-vindo de volta, ${colors.bold}${currentConfig.name}${colors.reset}.\n`);
          break;

        case '/stats':
          displayStats();
          break;

        default:
          console.log(`\n${colors.red}Comando não reconhecido. Use: /mode, /stats, /config, /clear ou /exit.${colors.reset}\n`);
          break;
      }
      
      promptLoop();
      return;
    }

    // 1. Run Crisis Interception
    if (handleCrisisCheck(trimmed)) {
      promptLoop();
      return;
    }

    // 2. Perform Sentiment Analysis
    let sentiment = 'Neutral';
    let score = 50;
    
    if (currentConfig.provider === 'offline') {
      // Direct local offline evaluation (instant)
      const parsed = localSentimentAnalysis(trimmed);
      sentiment = parsed.sentiment;
      score = parsed.score;
    } else {
      try {
        if (currentConfig.openRouterApiKey) {
          const parsed = await analyzeSentimentOpenRouter(trimmed);
          sentiment = parsed.sentiment;
          score = parsed.score;
        } else if (hasGeminiKey) {
          const parsed = await analyzeSentimentGemini(trimmed);
          sentiment = parsed.sentiment;
          score = parsed.score;
        } else {
          const parsed = localSentimentAnalysis(trimmed);
          sentiment = parsed.sentiment;
          score = parsed.score;
        }
      } catch {
        // Fallback
        const parsed = localSentimentAnalysis(trimmed);
        sentiment = parsed.sentiment;
        score = parsed.score;
      }
    }

    // Append user message to history
    const userMsg: Message = {
      sender: 'user',
      content: trimmed,
      sentiment,
      sentimentScore: score,
      timestamp: new Date().toISOString()
    };
    currentHistory.push(userMsg);

    // 3. Query AI Response
    let aiResponse = '';
    
    if (currentConfig.provider === 'offline') {
      // Direct offline response (instant)
      aiResponse = generateLocalMockResponse(trimmed);
    } else {
      console.log(`${colors.gray}* pensando... *${colors.reset}`);
      try {
        if (currentConfig.openRouterApiKey) {
          aiResponse = await callOpenRouter(trimmed);
        } else if (hasGeminiKey) {
          aiResponse = await callGemini(trimmed);
        } else {
          aiResponse = generateLocalMockResponse(trimmed);
        }
      } catch (err: any) {
        console.error(`${colors.gray}Erro na chamada da API, gerando resposta local...${colors.reset}`);
        aiResponse = generateLocalMockResponse(trimmed);
      }
    }

    // Append AI message to history
    const aiMsg: Message = {
      sender: 'ai',
      content: aiResponse.trim(),
      timestamp: new Date().toISOString()
    };
    currentHistory.push(aiMsg);
    
    // Save to local file
    saveHistory();

    // Print AI response
    console.log(`\r${prefix}${aiMsg.content}\n`);
    
    promptLoop();
  });
}

// Start CLI Agent
main().catch(console.error);
