import express from 'express';
import cors from 'cors';
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

// Request logger for troubleshooting
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
// origin: true dynamically reflects the requesting origin, which works with credentials: true
// whereas origin: '*' is rejected by modern browsers when credentials: true is set
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Routes
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
    return next();
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
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
});

// Start listening explicitly on 0.0.0.0 for containerized environments
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PSAI Backend] Server is running on http://0.0.0.0:${PORT}`);
});
