import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CRISIS_PATTERNS = [
  /\bquero\s+(me\s+)?(matar|suicidar|cortar|machucar|enforcar)\b/i,
  /\bpensando\s+em\s+(me\s+)?(matar|suicidar|cortar|machucar|enforcar)\b/i,
  /\bquero\s+morrer\b/i,
  /\bpensando\s+em\s+morrer\b/i,
  /\btirar\s+(a\s+)?minha\s+vida\b/i,
  /\bacabar\s+com\s+(a\s+)?minha\s+vida\b/i,
  /\b(não|nao)\s+quero\s+mais\s+(viver|existir)\b/i,
  /\b(não|nao)\s+(aguento|suporto)\s+mais\s+(viver|a\s+vida)\b/i,
  /\b(dar\s+(um\s+)?fim\s+(a|à|na|na\s+minha)\s+(vida|tudo)|desistir\s+de\s+viver)\b/i,
  /\bsuic[íi]d(io|ar|ando|ou)\b/i,
  /\bauto(-)?mutila[çc][ãa]o\b/i,
  /\bme\s+auto\s*mutilar\b/i,
  /\b(cortar|abrir)\s+(os\s+)?(meus\s+)?pulsos\b/i,
  /\b(tomar|beber|ingerir)\s+(veneno|chumbinho|remédios?|remedios?)\s+(para\s+morrer|pra\s+morrer)\b/i,
  /\boverdose\s+intencional\b/i,
  /\bme\s+jogar\s+(da\s+janela|da\s+ponte|no\s+tr[eê]m|na\s+frente)\b/i,
  /\bi\s+want\s+to\s+(die|kill\s+myself|hurt\s+myself|commit\s+suicide)\b/i,
  /\b(thought\s+of|thinking\s+about)\s+suicide\b/i,
  /\b(end|take)\s+my\s+own\s+life\b/i
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
