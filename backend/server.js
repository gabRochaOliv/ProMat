/**
 * Servidor Principal — Assistente de Exercícios para Professores de Matemática
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const gerarRoutes = require('./routes/gerar');

const app = express();
const PORT = process.env.PORT || 3001;

// ======================================
// MIDDLEWARES GLOBAIS
// ======================================
app.use(express.json({ limit: '10kb' })); // Limita tamanho do body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS — permite apenas o frontend configurado
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  `http://localhost:${process.env.PORT || 3001}`,
  `http://127.0.0.1:${process.env.PORT || 3001}`,
  'null', // file:// protocol (abertura direta de arquivo)
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite sem origin (curl, Postman, file://)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ======================================
// RATE LIMITING — Controle de Custos
// ======================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30, // 30 req por janela por IP
  message: {
    erro: 'Muitas requisições. Aguarde alguns minutos antes de tentar novamente.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ======================================
// FRONTEND ESTÁTICO
// ======================================
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ======================================
// ROTAS DA API
// ======================================
app.use('/api/gerar', gerarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    versao: '1.0.0',
    provedor: process.env.AI_PROVIDER || 'openai',
    modelo: process.env.AI_MODEL || 'gpt-4o-mini',
    timestamp: new Date().toISOString(),
  });
});

// ======================================
// ERRO 404
// ======================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Fallback para SPA (qualquer rota não-API serve o index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ======================================
// INICIALIZAÇÃO
// ======================================
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Assistente de Exercícios — Backend      ║');
  console.log(`║  Servidor rodando: http://localhost:${PORT}  ║`);
  console.log(`║  Provedor IA: ${(process.env.AI_PROVIDER || 'openai').padEnd(26)}║`);
  console.log(`║  Modelo: ${(process.env.AI_MODEL || 'gpt-4o-mini').padEnd(32)}║`);
  console.log('╚══════════════════════════════════════════╝\n');

  if (!process.env.OPENAI_API_KEY && process.env.AI_PROVIDER !== 'gemini') {
    console.warn('⚠️  ATENÇÃO: OPENAI_API_KEY não configurada!');
    console.warn('   Copie o arquivo .env.example para .env e configure sua chave.\n');
  }
});
