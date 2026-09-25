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
export async function processUserMessage(
  userId: string,
  sessionId: string,
  content: string,
  generateAudio: boolean,
  voice?: string
) {
  // Check session ownership and load user custom AI settings
  const session = await prisma.session.findUnique({
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
          geminiApiKey: true
        }
      }
    }
  });

  if (!session || session.userId !== userId) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const trimmedContent = content.trim();
  const isSimpleGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|tudo bom|hey|hello|hi|e aí|e ai)(\s|!|\?|\.)*$/i.test(trimmedContent);

  // 1. Parallel Context Gathering: Local history, MySQL RAG memories, and Pinecone scientific library
  const pastMessagesPromise = prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 12
  });

  // Skip deep scientific RAG retrieval on simple greetings to respond in milliseconds
  const pastMemoriesPromise = isSimpleGreeting
    ? Promise.resolve('')
    : retrievePastMemories(userId, sessionId, trimmedContent);

  const libraryContextPromise = isSimpleGreeting
    ? Promise.resolve('')
    : (async () => {
        try {
          return await queryLibrary(trimmedContent);
        } catch (ragErr) {
          console.warn('[PSAI] RAG Library retrieval skipped:', ragErr);
          return '';
        }
      })();

  const [pastMessages, pastMemories, libraryContext] = await Promise.all([
    pastMessagesPromise,
    pastMemoriesPromise,
    libraryContextPromise
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

  // 2. Concurrently run AI Therapeutic Response Generation and Sentiment Analysis
  const aiContentPromise = generateTherapeuticResponse(
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

  const sentimentPromise = isSimpleGreeting
    ? Promise.resolve({ sentiment: 'Happy', score: 80 })
    : analyzeSentiment(trimmedContent, userApiKey, userModelSetting).catch(() => ({ sentiment: 'Neutral', score: 50 }));

  const [aiContent, sentimentResult] = await Promise.all([
    aiContentPromise,
    sentimentPromise
  ]);

  const sentiment = sentimentResult.sentiment || 'Neutral';
  const score = typeof sentimentResult.score === 'number' ? sentimentResult.score : 50;

  // 3. Fast emotion classification (fallback to 'Neutro' if python takes > 150ms so response is never held back)
  const emotionPromise = Promise.race([
    classifyEmotion(aiContent).catch(() => 'Neutro'),
    new Promise<string>((resolve) => setTimeout(() => resolve('Neutro'), 150))
  ]);

  // 4. Save user message and AI message to database
  const [userMessage, aiEmotion] = await Promise.all([
    prisma.message.create({
      data: {
        sessionId,
        sender: 'user',
        content: trimmedContent,
        sentiment,
        sentimentScore: score
      }
    }),
    emotionPromise
  ]);

  const aiMessage = await prisma.message.create({
    data: {
      sessionId,
      sender: 'ai',
      content: aiContent,
      sentiment: aiEmotion
    }
  });

  // 5. Fire background tasks without blocking client HTTP response:
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

  // 6. Optional audio pre-generation
  let audioBase64: string | undefined = undefined;
  if (generateAudio) {
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
      category: sentiment,
      score
    }
  };
}
