/**
 * Servidor Principal — Assistente de Exercícios para Professores de Matemática
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const gerarRoutes = require('./routes/gerar');
const historicoRoutes = require('./routes/historico');
const webhookRoutes = require('./routes/webhook');

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
  'null', // file:// protocol
].filter(Boolean);

// Em produção, aceita qualquer subdomínio Vercel
const allowedPatterns = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // curl, Postman, file://
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowedPatterns.some(p => p.test(origin))) return callback(null, true);
    callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
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
// FRONTEND & LANDING ESTÁTICO
// ======================================
const frontendPath = path.join(__dirname, '..', 'frontend');
const landingPath = path.join(__dirname, '..', 'landing');

app.use('/landing', express.static(landingPath));
app.use(express.static(frontendPath));

// ======================================
// ROTAS DA API
// ======================================
app.use('/api/gerar', gerarRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/webhook', webhookRoutes);

// Migração de gerações guest → usuário autenticado (chamada após login)
app.post('/api/auth/migrar-guest', async (req, res) => {
  const { verificarToken, migrarGeracoesGuest } = require('./services/supabaseService');

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ erro: 'sessionId obrigatório' });

  const usuario = await verificarToken(token);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado' });

  const total = await migrarGeracoesGuest(sessionId, usuario.id);
  res.json({ sucesso: true, migradas: total });
});

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

// Configuração pública — expõe apenas variáveis seguras para o frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
  });
});

// ======================================
// FEEDBACK
// ======================================
app.post('/api/feedback', (req, res) => {
  const { mensagem, usuario } = req.body;
  if (!mensagem) return res.status(400).json({ erro: 'A mensagem é obrigatória' });

  const emailDestino = process.env.FEEDBACK_EMAIL || 'seu_email_aqui@gmail.com';
  const https = require('https');

  const postData = JSON.stringify({
    _subject: 'Novo Feedback do ProMat!',
    _replyto: usuario || 'sem_email@visitante.com',
    _captcha: 'false',
    Usuario: usuario || 'Visitante',
    Mensagem: mensagem
  });

  const options = {
    hostname: 'formsubmit.co',
    port: 443,
    path: `/ajax/${emailDestino}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Referer': req.headers.origin || 'https://promat.com.br',
      'User-Agent': 'Mozilla/5.0',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const formReq = https.request(options, (formRes) => {
    let body = '';
    formRes.on('data', chunk => body += chunk);
    formRes.on('end', () => {
      try {
        const json = JSON.parse(body);
        // FormSubmit retorna json.success = "false" se precisar de ativação
        if (json.success === 'false') {
          console.warn('[Feedback] FormSubmit requer ativação. Verifique o email:', emailDestino);
          // Retornamos sucesso pro frontend para não frustrar o usuário, 
          // mas o dono precisa confirmar o email.
        }
        res.json({ sucesso: true, aviso: json.message });
      } catch (e) {
        res.json({ sucesso: true }); // Ignora erro de parse
      }
    });
  });

  formReq.on('error', (e) => {
    console.error('[Feedback] Erro ao enviar:', e.message);
    res.status(500).json({ erro: 'Não foi possível enviar o feedback.' });
  });

  formReq.write(postData);
  formReq.end();
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

  const sbStatus = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'Configurado ✅' : 'Pendente ❌';
  console.log(`║  Supabase: ${sbStatus.padEnd(30)}║`);
  console.log(`║  Frontend: http://localhost:${PORT.toString().padEnd(16)}║`);
  console.log('╚══════════════════════════════════════════╝\n');

  if (!process.env.OPENAI_API_KEY && process.env.AI_PROVIDER !== 'gemini') {
    console.warn('⚠️  ATENÇÃO: OPENAI_API_KEY não configurada!');
    console.warn('   Copie o arquivo .env.example para .env e configure sua chave.\n');
  }
});

module.exports = app;
