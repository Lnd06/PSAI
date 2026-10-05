import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './auth';
import { crisisGuardrailMiddleware } from '../middleware/crisisGuardrail';
import { processUserMessage } from '../services/messageService';
import { generateSpeech } from '../services/ttsService';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for AI chat message processing and TTS generation (prevents quota exhaustion & denial of wallet)
const chatAiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 35, // 35 AI/TTS operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de mensagens por minuto atingido. Respire fundo e tente novamente em alguns instantes.' }
});

/**
 * GET /api/chat
 * Lists all sessions belonging to the user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
        summaryShort: true,
        // Count messages in this session
        _count: {
          select: { messages: true }
        }
      }
    });

    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ message: 'Erro ao carregar sessões de diário' });
  }
});

/**
 * POST /api/chat
 * Creates a new session/journal entry
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, mode } = req.body;

    const newSession = await prisma.session.create({
      data: {
        userId,
        title: title || `Diário - ${new Date().toLocaleDateString('pt-BR')}`,
        mode: mode || 'natural',
        summaryShort: 'Sessão de diário iniciada.',
        summaryLong: 'Sessão iniciada.'
      }
    });

    return res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Erro ao criar nova sessão' });
  }
});

/**
 * GET /api/chat/:sessionId
 * Retrieves all messages for a specific session
 */
router.get('/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Diário não encontrado' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error fetching session details:', error);
    return res.status(500).json({ message: 'Erro ao carregar conversa' });
  }
});

/**
 * DELETE /api/chat/:sessionId
 * Deletes a session and its associated messages
 */
router.delete('/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ message: 'Diário não encontrado' });
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    return res.json({ message: 'Sessão de diário excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ message: 'Erro ao excluir diário' });
  }
});

/**
 * POST /api/chat/:sessionId/message
 * Sends a message, triggers crisis middleware first.
 * Evaluates sentiment, generates TCC AI response, updates short/long term memory.
 */
router.post(
  '/:sessionId/message',
  authenticateToken,
  chatAiLimiter,
  crisisGuardrailMiddleware, // Checks for self-harm/suicide terms before processing
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;
      const { content, generateAudio, voice } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: 'A mensagem não pode estar vazia' });
      }

      if (content.length > 5000) {
        return res.status(400).json({ message: 'A mensagem excede o limite máximo permitido de 5000 caracteres.' });
      }

      const result = await processUserMessage(
        userId,
        sessionId,
        content,
        generateAudio === true,
        voice || undefined
      );

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') {
        return res.status(404).json({ message: 'Diário não encontrado' });
      }
      console.error('[Chat Message Error]:', error.stack || error.message || error);
      return res.status(500).json({ 
        message: 'Erro interno ao processar mensagem terapêutica.'
      });
    }
  }
);

/**
 * POST /api/chat/tts
 * Generates speech audio for a text response
 */
router.post('/tts', authenticateToken, chatAiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, voice, emotion } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'O texto para síntese de voz não pode estar vazio' });
    }

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true, subscriptionStatus: true }
    });

    const plan = (user?.subscriptionPlan || 'trial').toLowerCase();
    const status = user?.subscriptionStatus || 'trial';

    // O Modo de Voz é exclusivo dos planos Profundo e Família (ou em período de teste gratuito)
    const isAllowed = (status === 'trial') || (status === 'active' && (plan === 'profundo' || plan === 'familia'));
    if (!isAllowed) {
      const isOverdueOrCancelled = status === 'overdue' || status === 'cancelled';
      return res.status(403).json({
        message: isOverdueOrCancelled
          ? 'Sua assinatura está suspensa ou cancelada. Regularize seu plano para utilizar o Modo de Voz.'
          : 'O Modo de Voz é um recurso exclusivo dos planos Profundo e Família. Acesse Planos para fazer upgrade.',
        upgradeRequired: true
      });
    }

    console.log(`[TTS Route] Recebida solicitação de voz para texto: "${text.substring(0, 40)}..." | Voice: ${voice} | Emotion: ${emotion}`);
    const audioBuffer = await generateSpeech(text, voice, emotion);

    const isWav = audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF';
    res.set({
      'Content-Type': isWav ? 'audio/wav' : 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });

    return res.send(audioBuffer);
  } catch (error) {
    console.error('[TTS Route] Error generating TTS:', error);
    return res.status(500).json({ message: 'Erro ao gerar síntese de voz.' });
  }
});

export default router;
