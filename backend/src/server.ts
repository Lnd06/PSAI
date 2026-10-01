import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Clean any accidental surrounding quotes from environment variables (common in Docker)
for (const key of Object.keys(process.env)) {
  const val = process.env[key];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      process.env[key] = trimmed.slice(1, -1);
    }
  }
}

import authRouter from './routes/auth';
import chatRouter from './routes/chat';
import dashboardRouter from './routes/dashboard';
import libraryRouter from './routes/library';
import paymentsRouter from './routes/payments';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Security: Disable X-Powered-By header to obscure Express framework fingerprint
app.disable('x-powered-by');

// Security: Add HTTP security headers via Helmet (HSTS, X-Content-Type-Options, Frameguard, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Allows SPA inline assets and fonts without breaking UI
  crossOriginEmbedderPolicy: false
}));

// Request logger for troubleshooting
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Security: Strict CORS Configuration with explicit origin validation
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (cleanUrl && !allowedOrigins.includes(cleanUrl)) {
      allowedOrigins.push(cleanUrl);
    }
  });
}

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin SPA)
    if (!requestOrigin) {
      return callback(null, true);
    }
    // Check against allowed list or vercel preview domains
    if (allowedOrigins.includes(requestOrigin) || /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(requestOrigin)) {
      return callback(null, true);
    }
    console.warn(`[Security - CORS Blocked] Origin not allowed: ${requestOrigin}`);
    return callback(new Error('Origem não permitida pela política de CORS do PSAI'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'asaas-access-token']
}));

// Security: Enforce explicit body payload limits to mitigate Denial of Service (DoS) memory exhaustion
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Security: Rate Limiting
// 1. General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Por favor, aguarde um minuto e tente novamente.' }
});

// 2. Strict Auth Rate Limiter (Brute-Force & Credential Stuffing Prevention)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de autenticação ou recuperação. Bloqueio temporário por 15 minutos.' }
});

// 3. AI Chat / TTS Rate Limiter (Cost Amplification & Resource Exhaustion Prevention)
export const chatAiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 35, // 35 AI/TTS requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de mensagens ou geração de voz por minuto atingido. Respire fundo e tente em alguns instantes.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/library', libraryRouter);
app.use('/api/payments', paymentsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Serve frontend static build files (SPA)
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Fallback to index.html for Single Page Application (SPA) routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return res.status(404).json({ message: 'Endpoint da API não encontrado.' });
  }
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('PSAI API is running. (Frontend dist not mounted)');
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ message: 'Acesso negado pela política de CORS.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
});

// Start listening explicitly on 0.0.0.0 for containerized environments
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PSAI Backend] Server is running on http://0.0.0.0:${PORT}`);
});
