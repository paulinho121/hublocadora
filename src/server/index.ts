import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { 
  helloFlow, 
} from '../lib/genkit.js';
import { 
  bookingMatchFlow, 
  maintenanceAnalysisFlow, 
  logisticsOptimizerFlow, 
  catalogGeneratorFlow 
} from '../lib/ai/flows.js';

// Carrega as variáveis do .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configurações de Segurança
app.use(helmet()); // Adiciona headers de segurança (HSTS, CSP, etc)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // Limita o tamanho do payload para evitar DoS

// Middleware básico de Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({ status: 'online', service: 'CineHub Genkit Server' });
});

// Helper para tratar erros
const handleAsync = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Endpoint: Match de Equipamento
app.post('/api/ai/match', handleAsync(async (req: any, res: any) => {
  if (!req.body.description) return res.status(400).json({ error: 'Descrição é obrigatória' });
  const result = await bookingMatchFlow(req.body.description);
  res.json(result);
}));

// 2. Endpoint: Análise de Manutenção
app.post('/api/ai/maintenance', handleAsync(async (req: any, res: any) => {
  const result = await maintenanceAnalysisFlow(req.body);
  res.json(result);
}));

// 3. Endpoint: Otimização Logística
app.post('/api/ai/logistics', handleAsync(async (req: any, res: any) => {
  if (!req.body.items) return res.status(400).json({ error: 'Itens são obrigatórios' });
  const result = await logisticsOptimizerFlow(req.body.items);
  res.json(result);
}));

// 4. Endpoint: Geração de Catálogo
app.post('/api/ai/catalog', handleAsync(async (req: any, res: any) => {
  if (!req.body.model) return res.status(400).json({ error: 'Modelo é obrigatório' });
  const result = await catalogGeneratorFlow(req.body.model);
  res.json(result);
}));

// Endpoint de Teste
app.get('/api/genkit/hello', handleAsync(async (req: any, res: any) => {
  const name = (req.query.name as string) || 'CineHub User';
  const result = await helloFlow(name);
  res.json({ message: result });
}));

// Error Handler Centralizado
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor Seguro rodando em: http://localhost:${port}`);
});
