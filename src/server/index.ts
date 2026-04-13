import express from 'express';
import cors from 'cors';
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

// Debug para confirmar se a chave foi carregada (mostra apenas os primeiros 5 caracteres por segurança)
const apiKey = process.env.GOOGLE_GENAI_API_KEY || '';
console.log(`[Server] Verificando chave: ${apiKey ? apiKey.substring(0, 7) + '...' : 'NÃO ENCONTRADA'}`);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rota raiz para confirmar que o servidor está online
app.get('/', (req, res) => {
  res.send('<h1>🚀 CineHub Genkit Server is Online!</h1><p>Use <code>/api/genkit/hello?name=Amigo</code> para testar a IA.</p>');
});

// 1. Endpoint: Match de Equipamento
app.post('/api/ai/match', async (req, res) => {
  try {
    const result = await bookingMatchFlow(req.body.description);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Endpoint: Análise de Manutenção
app.post('/api/ai/maintenance', async (req, res) => {
  try {
    const result = await maintenanceAnalysisFlow(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Endpoint: Otimização Logística
app.post('/api/ai/logistics', async (req, res) => {
  try {
    const result = await logisticsOptimizerFlow(req.body.items);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Endpoint: Geração de Catálogo
app.post('/api/ai/catalog', async (req, res) => {
  try {
    const result = await catalogGeneratorFlow(req.body.model);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint antigo para testar o Genkit Flow
app.get('/api/genkit/hello', async (req, res) => {
  const name = (req.query.name as string) || 'CineHub User';
  
  try {
    const result = await helloFlow(name);
    res.json({ message: result });
  } catch (error: any) {
    console.error('❌ Erro detalhado no Genkit:', error?.message || error);
    res.status(500).json({ 
      error: 'Erro ao processar a requisição de IA.',
      details: error?.message || 'Erro desconhecido'
    });
  }
});

app.listen(port, () => {
  console.log(`
🚀 Servidor Genkit rodando em: http://localhost:${port}
✨ Endpoint disponível: http://localhost:${port}/api/genkit/hello?name=Amigo
  `);
});
