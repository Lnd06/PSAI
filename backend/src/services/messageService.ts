import { PrismaClient } from '@prisma/client';
import {
  generateTherapeuticResponse,
  analyzeSentiment,
  generateSessionSummaries,
  ChatMessageContext,
  generateSearchQuery
} from './geminiService';
import { generateSpeech } from './ttsService';
import { classifyEmotion } from './emotionService';
import { queryLibrary } from './pineconeService';
import { updateUserProfile } from './profileService';

const prisma = new PrismaClient();

/**
 * Retrieve past relevant user messages from MySQL across other sessions using a simple RAG keyword match.
 */
export async function retrievePastMemories(userId: string, currentSessionId: string, content: string): Promise<string> {
  try {
    // 1. Extract keywords from current message
    const words = content.toLowerCase()
      .replace(/[^\w\sÀ-ÿ]/g, '') // remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 3); // only words of 4+ characters

    if (words.length === 0) return '';

    // 2. Query MySQL for up to 5 user messages containing any of these keywords in other sessions
    const matchingMessages = await prisma.message.findMany({
      where: {
        session: {
          userId,
          id: { not: currentSessionId }
        },
        sender: 'user',
        OR: words.map(word => ({
          content: { contains: word }
        }))
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: { title: true }
        }
      }
    });

    if (matchingMessages.length === 0) return '';

    // 3. Format memories into a cohesive context block
    const memoriesFormatted = matchingMessages.map(m => {
      const dateStr = new Date(m.createdAt).toLocaleDateString('pt-BR');
      return `- Em ${dateStr} (no diário "${m.session.title}"), você disse: "${m.content}"`;
    }).join('\n');

    return memoriesFormatted;
  } catch (err) {
    console.error('Error retrieving RAG memories:', err);
    return '';
  }
}

/**
 * Process a user message and orchestrate sentiment analysis, memory retrieval, RAG library matching,
 * therapeutic response generation, background summarization, and optional TTS speech pre-generation.
 */
/**
 * Quick heuristic sentiment classifier (< 0.1ms) for instantaneous HTTP response.
 * Refined asynchronously in the background via deep LLM sentiment analysis.
 */
function quickSentimentHeuristic(text: string): { sentiment: string; score: number } {
  const lower = text.toLowerCase();
  if (/ansios|pânico|panico|medo|preocupad|nervos|acelerad|angústi|angusti|inquiet|crise|sufoc|desesper/i.test(lower)) {
    return { sentiment: 'Anxiolytic', score: 35 };
  }
  if (/trist|deprim|desânim|desanim|vazio|choro|chorar|sem sentido|solitári|solitari|sozinh|desesperanç|luto|dor/i.test(lower)) {
    return { sentiment: 'Depressive', score: 25 };
  }
  if (/estress|raiva|ódio|odio|irritad|cansad|esgotad|sobrecarreg|pressão|pressao|saco cheio|explodir|impacient/i.test(lower)) {
    return { sentiment: 'Stressed', score: 40 };
  }
  if (/feliz|alegr|grat|paz|tranquil|bem|ótimo|otimo|bom|melhor|esperanç|animad|alívio|alivio|vitóri/i.test(lower)) {
    return { sentiment: 'Happy', score: 80 };
  }
  return { sentiment: 'Neutral', score: 50 };
}

/**
 * Fast AI Tone / Emotion classifier (< 0.1ms) for instantaneous UI mood response.
 */
function quickAiToneHeuristic(text: string): string {
  const lower = text.toLowerCase();
  if (/alegria|comemoro|parabéns|parabens|maravilh|feliz|ótimo|otimo|vitória|vitoria|conquista|orgulho/i.test(lower)) return 'alegria';
  if (/tristeza|luto|perda|dor profunda|lágrima|lagrima/i.test(lower)) return 'tristeza';
  if (/surpresa|inesperado|curioso|uau/i.test(lower)) return 'surpresa';
  if (/preocup|cuidado|alerta/i.test(lower)) return 'medo';
  return 'Neutro';
}

/**
 * Process a user message and orchestrate sentiment analysis, memory retrieval, RAG library matching,
 * therapeutic response generation, background summarization, and optional TTS speech pre-generation.
 */
export async function processUserMessage(
  userId: string,
  sessionId: string,
  content: string,
  generateAudio: boolean,
  voice?: string
) {
  const trimmedContent = content.trim();

  // 1. Concurrently fetch session and recent conversation history (parallel roundtrips)
  const [session, pastMessages] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            telefone: true,
            profileJson: true,
            openRouterApiKey: true,
            aiModel: true,
            geminiApiKey: true,
            subscriptionPlan: true,
            subscriptionStatus: true
          }
        }
      }
    }),
    prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 12
    })
  ]);

  if (!session || session.userId !== userId) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const wordCount = trimmedContent.split(/\s+/).length;
  const isSimpleGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|tudo bom|hey|hello|hi|e aí|e ai)(\s|!|\?|\.)*$/i.test(trimmedContent);
  const isConversational = isSimpleGreeting || wordCount < 5 || /^(sim|não|nao|ok|certo|entendi|concordo|claro|tá bom|ta bom|obrigad[oa]|valeu)(\s|!|\?|\.)*$/i.test(trimmedContent);

  // 2. Selective RAG: Skip heavy Pinecone lookups on short conversational messages for instant speed
  const [pastMemories, libraryContext] = await Promise.all([
    isConversational ? Promise.resolve('') : retrievePastMemories(userId, sessionId, trimmedContent),
    isConversational ? Promise.resolve('') : queryLibrary(trimmedContent)
  ]);

  const formattedHistory: ChatMessageContext[] = pastMessages.map((m) => ({
    sender: m.sender as 'user' | 'ai',
    content: m.content
  }));

  const userModelSetting = session.user.aiModel && session.user.aiModel.includes('gemini') ? session.user.aiModel : null;
  const userApiKey = session.user.geminiApiKey || session.user.openRouterApiKey;

  // Compute session timing and detect if user explicitly wants to continue the conversation
  const sessionStartTime = pastMessages.length > 0
    ? new Date(pastMessages[0].createdAt).getTime()
    : new Date(session.createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 60000));
  const messageCount = pastMessages.length + 1;
  const userWantsToContinue = /continua|continuar|mais um pouco|quero falar mais|ainda n[aã]o|n[aã]o para|vamos prosseguir|pode continuar|vamos em frente|tenho mais|prosseguir/i.test(trimmedContent);

  // 3. Fast Heuristic Sentiment for instant HTTP response
  const fastSentiment = isSimpleGreeting
    ? { sentiment: 'Happy', score: 80 }
    : quickSentimentHeuristic(trimmedContent);

  // 4. Generate AI Therapeutic Response
  const aiContent = await generateTherapeuticResponse(
    formattedHistory,
    trimmedContent,
    session.summaryShort || undefined,
    session.summaryLong || undefined,
    userApiKey,
    userModelSetting,
    pastMemories,
    libraryContext,
    {
      name: session.user.name,
      email: session.user.email,
      telefone: session.user.telefone,
      profileJson: session.user.profileJson
    },
    {
      elapsedMinutes,
      messageCount,
      userWantsToContinue
    }
  );

  // 5. Emotion classification: Instant heuristic with non-blocking enrichment
  const heuristicEmotion = quickAiToneHeuristic(aiContent);
  let aiEmotion = heuristicEmotion;
  try {
    aiEmotion = await Promise.race([
      classifyEmotion(aiContent).catch(() => heuristicEmotion),
      new Promise<string>((resolve) => setTimeout(() => resolve(heuristicEmotion), 50))
    ]);
  } catch {
    aiEmotion = heuristicEmotion;
  }

  // 6. Save user message and AI message to database concurrently
  const [userMessage, aiMessage] = await Promise.all([
    prisma.message.create({
      data: {
        sessionId,
        sender: 'user',
        content: trimmedContent,
        sentiment: fastSentiment.sentiment,
        sentimentScore: fastSentiment.score
      }
    }),
    prisma.message.create({
      data: {
        sessionId,
        sender: 'ai',
        content: aiContent,
        sentiment: aiEmotion
      }
    })
  ]);

  // 7. Non-blocking asynchronous tasks (runs in background without delaying user reply):
  // Asynchronous Deep Sentiment Refinement
  if (!isSimpleGreeting) {
    analyzeSentiment(trimmedContent, userApiKey, userModelSetting)
      .then(async (deep) => {
        await prisma.message.update({
          where: { id: userMessage.id },
          data: { sentiment: deep.sentiment, sentimentScore: deep.score }
        }).catch(() => {});
      })
      .catch(() => {});
  }

  // Profile update
  updateUserProfile(userId, trimmedContent, aiContent)
    .catch((err) => console.error('[Profile Service] Erro ao atualizar perfil do usuário:', err));

  // Asynchronous summaries update
  (async () => {
    try {
      const allSessionMessages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      });
      const messageCtxList: ChatMessageContext[] = allSessionMessages.map((m) => ({
        sender: m.sender as 'user' | 'ai',
        content: m.content
      }));
      const summaries = await generateSessionSummaries(messageCtxList, userApiKey, userModelSetting);
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          summaryShort: summaries.summaryShort,
          summaryLong: summaries.summaryLong,
          updatedAt: new Date()
        }
      });
    } catch (err) {
      console.error('Error running background summaries update:', err);
    }
  })();

  // 6. Optional audio pre-generation (strictly gated to authorized plans)
  let audioBase64: string | undefined = undefined;
  const userPlan = (session.user.subscriptionPlan || 'trial').toLowerCase();
  const userStatus = session.user.subscriptionStatus || 'trial';
  const voiceAllowed = (userStatus === 'trial') || (userStatus === 'active' && (userPlan === 'profundo' || userPlan === 'familia'));

  if (generateAudio && voiceAllowed) {
    try {
      console.log(`[TTS Service] Otimização: pré-gerando áudio em paralelo...`);
      const audioBuffer = await generateSpeech(aiContent, voice, aiEmotion);
      audioBase64 = audioBuffer.toString('base64');
    } catch (ttsErr) {
      console.error('[TTS Service] Falha na pré-geração de áudio (não bloqueante):', ttsErr);
    }
  }

  return {
    userMessage,
    aiMessage: {
      ...aiMessage,
      audioBase64
    },
    sentiment: {
      category: fastSentiment.sentiment,
      score: fastSentiment.score
    }
  };
}
