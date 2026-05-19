import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

Sentry.init({
  dsn: process.env.SENTRY_SERVER_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// Em produção, ALLOWED_ORIGINS é obrigatório — nunca aceitar wildcard
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);
if (!allowedOrigins?.length) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ALLOWED_ORIGINS env var is required in production');
  }
  console.warn('[CORS] ALLOWED_ORIGINS not set — restricting to localhost only');
}

app.use(helmet());
Sentry.setupExpressErrorHandler(app);
app.use(cors({
  origin: allowedOrigins?.length
    ? allowedOrigins
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'online', service: 'CineHub Server' });
});

app.use((err: any, req: any, res: any, next: any) => {
  Sentry.captureException(err);
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${port}`);
});
