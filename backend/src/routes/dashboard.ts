import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/dashboard/stats
 * Aggregates mood logs, sentiment distributions, and emotional progression scores
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch recent sessions
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        mode: true,
        summaryShort: true,
        summaryLong: true,
        updatedAt: true
      }
    });

    // 2. Fetch all user messages that have sentiments
    const userMessages = await prisma.message.findMany({
      where: {
        session: { userId },
        sender: 'user',
        sentiment: { not: null }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        sentiment: true,
        sentimentScore: true
      }
    });

    // 3. Compute Sentiment Distribution (Pie Chart data)
    const sentimentCounts: Record<string, number> = {
      Neutral: 0,
      Anxiolytic: 0,
      Depressive: 0,
      Happy: 0,
      Stressed: 0
    };

    userMessages.forEach((msg) => {
      if (msg.sentiment && msg.sentiment in sentimentCounts) {
        sentimentCounts[msg.sentiment]++;
      }
    });

    const sentimentDistribution = Object.keys(sentimentCounts).map((key) => ({
      name: key,
      value: sentimentCounts[key]
    }));

    // 4. Compute Daily Emotional Progression (Line/Area Chart data)
    // Group messages by Date (YYYY-MM-DD)
    const dailyScores: Record<string, { totalScore: number; count: number }> = {};

    userMessages.forEach((msg) => {
      const dateStr = msg.createdAt.toISOString().split('T')[0];
      const score = msg.sentimentScore !== null ? msg.sentimentScore : 50;

      if (!dailyScores[dateStr]) {
        dailyScores[dateStr] = { totalScore: 0, count: 0 };
      }
      dailyScores[dateStr].totalScore += score;
      dailyScores[dateStr].count += 1;
    });

    const moodProgression = Object.keys(dailyScores)
      .map((dateStr) => {
        const stats = dailyScores[dateStr];
        return {
          date: dateStr,
          averageScore: Math.round((stats.totalScore / stats.count) * 10) / 10,
          count: stats.count
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15); // limit to last 15 active days for visualization spacing

    // 5. Calculate overall wellness stats (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessages = userMessages.filter((m) => m.createdAt >= sevenDaysAgo);
    let avgWeeklyScore = 50;
    let dominantMood = 'Neutral';

    if (recentMessages.length > 0) {
      const totalScore = recentMessages.reduce((sum, m) => sum + (m.sentimentScore || 50), 0);
      avgWeeklyScore = Math.round(totalScore / recentMessages.length);

      const recentCounts: Record<string, number> = {};
      recentMessages.forEach((m) => {
        if (m.sentiment) {
          recentCounts[m.sentiment] = (recentCounts[m.sentiment] || 0) + 1;
        }
      });
      
      let maxCount = 0;
      Object.keys(recentCounts).forEach((key) => {
        if (recentCounts[key] > maxCount) {
          maxCount = recentCounts[key];
          dominantMood = key;
        }
      });
    } else if (userMessages.length > 0) {
      // Fallback to all time stats if no messages in last 7 days
      const totalScore = userMessages.reduce((sum, m) => sum + (m.sentimentScore || 50), 0);
      avgWeeklyScore = Math.round(totalScore / userMessages.length);
    }

    // Translate sentiments for display
    const moodTranslations: Record<string, string> = {
      Neutral: 'Neutro',
      Anxiolytic: 'Ansioso/Preocupado',
      Depressive: 'Triste/Desanimado',
      Happy: 'Feliz/Em Paz',
      Stressed: 'Estressado/Irritado'
    };

    return res.json({
      sessions,
      sentimentDistribution,
      moodProgression,
      summaryStats: {
        avgWeeklyScore,
        dominantMood: moodTranslations[dominantMood] || dominantMood,
        totalSessionsCount: await prisma.session.count({ where: { userId } }),
        totalMessagesCount: userMessages.length
      }
    });
  } catch (error) {
    console.error('Error compiling dashboard statistics:', error);
    return res.status(500).json({ message: 'Erro ao gerar dados do painel emocional' });
  }
});

export default router;
