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

  // 1. Analyze sentiment in real-time (non-blocking: default to Neutral if it fails)
  let sentiment = 'Neutral';
  let score = 50;
  try {
    const sentimentResult = await analyzeSentiment(
      content,
      session.user.geminiApiKey || session.user.openRouterApiKey,
      session.user.aiModel && session.user.aiModel.includes('gemini') ? session.user.aiModel : null
    );
    sentiment = sentimentResult.sentiment;
    score = sentimentResult.score;
  } catch (sentErr) {
    console.error('[PSAI] Sentiment analysis failed, using defaults:', sentErr);
  }

  // 2. Save user message to database
  const userMessage = await prisma.message.create({
    data: {
      sessionId,
      sender: 'user',
      content: content.trim(),
      sentiment,
      sentimentScore: score
    }
  });

  // 3. Retrieve past messages for local context
  const pastMessages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 12 // limit history context to last 12 messages for performance
  });

  // Prepare context for Gemini model
  const formattedHistory: ChatMessageContext[] = pastMessages
    .filter((m) => m.id !== userMessage.id) // exclude current message
    .map((m) => ({
      sender: m.sender as 'user' | 'ai',
      content: m.content
    }));

  // 3.5 Retrieve past memories using RAG on MySQL
  const pastMemories = await retrievePastMemories(userId, sessionId, content.trim());

  // Query RAG Library from Pinecone (uses Pinecone's built-in embedding model)
  console.log(`[RAG Service] Acessando biblioteca: Buscando trechos científicos para a consulta: "${content.trim()}"`);
  let libraryContext = '';
  try {
    // AI query expansion: generates scientific terms to match the Pinecone index accurately
    const expandedQuery = await generateSearchQuery(
      content.trim(),
      session.user.geminiApiKey || session.user.openRouterApiKey,
      session.user.aiModel && session.user.aiModel.includes('gemini') ? session.user.aiModel : null
    );
    libraryContext = await queryLibrary(expandedQuery);
    if (libraryContext && libraryContext.trim().length > 0) {
      console.log(`[RAG Service] Sucesso! Trechos relevantes de livros científicos recuperados para inclusão no prompt da IA.`);
    } else {
      console.log(`[RAG Service] Busca concluída: Nenhum trecho com pontuação relevante (>0.45) encontrado na biblioteca.`);
    }
  } catch (ragErr) {
    console.error('[PSAI] Falha ao acessar a biblioteca RAG no Pinecone:', ragErr);
  }

  // 4. Generate AI response (passing summaries, OpenRouter settings, RAG context, library context, and user identity profile)
  const aiContent = await generateTherapeuticResponse(
    formattedHistory,
    content.trim(),
    session.summaryShort || undefined,
    session.summaryLong || undefined,
    session.user.geminiApiKey || session.user.openRouterApiKey,
    session.user.aiModel && session.user.aiModel.includes('gemini') ? session.user.aiModel : null,
    pastMemories,
    libraryContext,
    {
      name: session.user.name,
      email: session.user.email,
      telefone: session.user.telefone,
      profileJson: session.user.profileJson
    }
  );

  // Background update: Extract and save learned profile information (tastes, preferences, name)
  updateUserProfile(userId, content.trim(), aiContent)
    .catch((err) => console.error('[Profile Service] Erro ao atualizar perfil do usuário:', err));

  // Classify emotion of the AI response using the custom Naive Bayes classifier
  let aiEmotion = 'Neutro';
  try {
    aiEmotion = await classifyEmotion(aiContent);
  } catch (emErr) {
    console.error('[PSAI] AI emotion classification failed:', emErr);
  }

  // 5. Save AI response to DB
  const aiMessage = await prisma.message.create({
    data: {
      sessionId,
      sender: 'ai',
      content: aiContent,
      sentiment: aiEmotion
    }
  });

  // 6. Asynchronously update summaries to maintain memory
  // Gather all messages for summarization
  const allSessionMessages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' }
  });

  const messageCtxList: ChatMessageContext[] = allSessionMessages.map((m) => ({
    sender: m.sender as 'user' | 'ai',
    content: m.content
  }));

  // Run summary updating in the background to avoid delaying client response
  generateSessionSummaries(
    messageCtxList,
    session.user.geminiApiKey || session.user.openRouterApiKey,
    session.user.aiModel && session.user.aiModel.includes('gemini') ? session.user.aiModel : null
  )
    .then(async (summaries) => {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          summaryShort: summaries.summaryShort,
          summaryLong: summaries.summaryLong,
          updatedAt: new Date() // force refresh updatedAt timestamp
        }
      });
    })
    .catch((err) => {
      console.error('Error running background summaries update:', err);
    });

  // 7. Otimização de Latência: Gerar áudio ElevenLabs diretamente na rota de mensagem se solicitado
  let audioBase64: string | undefined = undefined;
  if (generateAudio) {
    try {
      console.log(`[TTS Service] Otimização: pré-gerando áudio ElevenLabs em paralelo para responder mais rápido...`);
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
