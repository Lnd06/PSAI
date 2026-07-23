import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  /\bi\s+want\s+to\s+(die|kill\s+myself|hurt\s+myself|suicide)\b/i,
  /\bthought\s+of\s+suicide\b/i
];

export interface CrisisEmergencyPayload {
  crisis: boolean;
  message: string;
  resources: {
    name: string;
    contact: string;
    description: string;
    link?: string;
  }[];
}

export function detectCrisis(text: string): { isCrisis: boolean; matchedTerms: string } {
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      return {
        isCrisis: true,
        matchedTerms: match ? match[0] : 'crisis_pattern_matched'
      };
    }
  }
  return { isCrisis: false, matchedTerms: '' };
}

export async function crisisGuardrailMiddleware(req: Request, res: Response, next: NextFunction) {
  const { content } = req.body;
  const user = (req as any).user; // Set by authentication middleware

  if (!content || typeof content !== 'string') {
    return next();
  }

  const { isCrisis, matchedTerms } = detectCrisis(content);

  if (isCrisis) {
    try {
      // Log the event securely for safety reporting, keeping actual content anonymous/masked
      await prisma.crisisLog.create({
        data: {
          userId: user?.id || null,
          contentLength: content.length,
          detectedTerms: matchedTerms
        }
      });
    } catch (err) {
      console.error('Error logging crisis event:', err);
    }

    const responsePayload: CrisisEmergencyPayload = {
      crisis: true,
      message: 'Detectamos termos sensíveis relacionados à crise ou automutilação. Como IA, não posso fornecer terapia clínica ou intervenção nesses momentos críticos.',
      resources: [
        {
          name: 'CVV - Centro de Valorização da Vida (Brasil)',
          contact: 'Telefone: 188',
          description: 'Apoio emocional e prevenção do suicídio gratuito, confidencial e disponível 24 horas por dia.',
          link: 'https://www.cvv.org.br/'
        },
        {
          name: 'SAMU (Brasil)',
          contact: 'Telefone: 192',
          description: 'Serviço de Atendimento Móvel de Urgência para emergências médicas imediatas.'
        },
        {
          name: 'Caps (Centro de Atenção Psicossocial)',
          contact: 'Procure a unidade do SUS mais próxima',
          description: 'Serviços de saúde mental públicos do governo brasileiro.'
        }
      ]
    };

    // HTTP 451: Unavailable For Legal Reasons (highly semantic) or 403
    return res.status(451).json(responsePayload);
  }

  next();
}
