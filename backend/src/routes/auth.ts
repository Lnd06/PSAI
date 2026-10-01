import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Security: Enforce JWT_SECRET configuration or use strong random ephemeral secret in dev/container
let JWT_SECRET: string = (process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ [Security Alert] JWT_SECRET não configurado no ambiente. Chave randômica efêmera segura (256-bit) gerada dinamicamente para esta instância.');
}

// Security: Rate limiter for authentication, registration and password recovery (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas nesta rota de autenticação. Por segurança, tente novamente em 15 minutos.' }
});

// Zod schemas for request validation with email normalization (lowercase & trim)
const RegisterSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').max(128),
  securityQuestion1: z.string().min(3, 'Selecione ou digite a pergunta de segurança 1').max(200),
  securityAnswer1: z.string().min(1, 'A resposta 1 não pode ser vazia').max(100),
  securityQuestion2: z.string().min(3, 'Selecione ou digite a pergunta de segurança 2').max(200),
  securityAnswer2: z.string().min(1, 'A resposta 2 não pode ser vazia').max(100)
});

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres')
});

// Extend Express Request type to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Authentication Middleware
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    next();
  });
}

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Este e-mail já está em uso' });
    }

    // Hash password and security answers
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);
    const securityAnswer1Hash = await bcrypt.hash(validatedData.securityAnswer1.trim().toLowerCase(), salt);
    const securityAnswer2Hash = await bcrypt.hash(validatedData.securityAnswer2.trim().toLowerCase(), salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name.trim(),
        email: validatedData.email,
        passwordHash,
        securityQuestion1: validatedData.securityQuestion1,
        securityAnswer1Hash,
        securityQuestion2: validatedData.securityQuestion2,
        securityAnswer2Hash,
        openRouterApiKey: null,
        aiModel: 'gemini-flash-latest'
      }
    });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        telefone: user.telefone,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionId: user.subscriptionId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Erro interno ao realizar cadastro' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      return res.status(400).json({ message: 'E-mail ou senha incorretos' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'E-mail ou senha incorretos' });
    }

    // Check if security question verification is configured
    if (user.securityQuestion1 && user.securityAnswer1Hash) {
      return res.json({
        status: 'verification_required',
        email: user.email,
        question: user.securityQuestion1
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        telefone: user.telefone,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionId: user.subscriptionId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
});

/**
 * POST /api/auth/login/verify-step
 * Validates security answer and logs in
 */
router.post('/login/verify-step', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, securityAnswer } = req.body;

    if (!email || !password || !securityAnswer) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(400).json({ message: 'E-mail ou senha incorretos' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'E-mail ou senha incorretos' });
    }

    if (!user.securityAnswer1Hash) {
      return res.status(400).json({ message: 'Verificação de segurança inválida' });
    }

    // Compare security answer
    const isAnswerCorrect = await bcrypt.compare(
      String(securityAnswer).trim().toLowerCase(),
      user.securityAnswer1Hash
    );

    if (!isAnswerCorrect) {
      return res.status(400).json({ message: 'Resposta de verificação incorreta. Acesso negado.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        telefone: user.telefone,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionId: user.subscriptionId
      }
    });
  } catch (error) {
    console.error('Login verification error:', error);
    return res.status(500).json({ message: 'Erro interno ao verificar login' });
  }
});

/**
 * GET /api/auth/me
 * Validates JWT token and returns current user details from DB
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        openRouterApiKey: true,
        geminiApiKey: true,
        aiModel: true,
        cpf: true,
        telefone: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionId: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});

/**
 * PUT /api/auth/profile
 * Updates user profile details, custom AI models, OpenRouter keys and Gemini API keys
 */
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, openRouterApiKey, geminiApiKey, aiModel, cpf, telefone } = req.body;

    if (name && typeof name === 'string' && name.trim().length < 2) {
      return res.status(400).json({ message: 'O nome deve ter pelo menos 2 caracteres' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ? name.trim() : undefined,
        openRouterApiKey: openRouterApiKey !== undefined ? (openRouterApiKey ? openRouterApiKey.trim() : null) : undefined,
        geminiApiKey: geminiApiKey !== undefined ? (geminiApiKey ? geminiApiKey.trim() : null) : undefined,
        aiModel: aiModel !== undefined ? aiModel.trim() : undefined,
        cpf: cpf !== undefined ? (cpf ? cpf.trim() : null) : undefined,
        telefone: telefone !== undefined ? (telefone ? telefone.trim() : null) : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        openRouterApiKey: true,
        geminiApiKey: true,
        aiModel: true,
        cpf: true,
        telefone: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionId: true
      }
    });

    return res.json({
      message: 'Configurações de perfil salvas com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Erro ao atualizar configurações' });
  }
});

/**
 * POST /api/auth/recover-password/questions
 * Returns security questions for a given email if configured
 */
router.post('/recover-password/questions', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'E-mail é obrigatório' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ message: 'Nenhum usuário encontrado com este e-mail' });
    }

    if (!user.securityQuestion1 || !user.securityQuestion2) {
      return res.status(400).json({ 
        message: 'Este usuário não configurou perguntas de segurança para recuperação.' 
      });
    }

    return res.json({
      question1: user.securityQuestion1,
      question2: user.securityQuestion2
    });
  } catch (error) {
    console.error('Error fetching security questions:', error);
    return res.status(500).json({ message: 'Erro ao buscar perguntas de segurança' });
  }
});

/**
 * POST /api/auth/recover-password/verify
 * Verifies security answers and resets the password
 */
router.post('/recover-password/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, answer1, answer2, newPassword } = req.body;

    if (!email || !answer1 || !answer2 || !newPassword) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || !user.securityAnswer1Hash || !user.securityAnswer2Hash) {
      return res.status(400).json({ message: 'Solicitação de recuperação inválida' });
    }

    // Compare answers (lowercased and trimmed)
    const isAnswer1Correct = await bcrypt.compare(
      String(answer1).trim().toLowerCase(),
      user.securityAnswer1Hash
    );

    const isAnswer2Correct = await bcrypt.compare(
      String(answer2).trim().toLowerCase(),
      user.securityAnswer2Hash
    );

    if (!isAnswer1Correct || !isAnswer2Correct) {
      return res.status(400).json({ message: 'Respostas de segurança incorretas' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(String(newPassword), salt);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

    return res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('Error verifying recovery questions:', error);
    return res.status(500).json({ message: 'Erro ao redefinir a senha' });
  }
});

export default router;
