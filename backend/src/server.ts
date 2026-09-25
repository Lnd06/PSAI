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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for local development/testing, can restrict to frontend URL in production
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`[PSAI Backend] Server is running on http://localhost:${PORT}`);
});
