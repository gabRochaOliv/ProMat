/**
 * Rotas de Geração de Conteúdo
 * Todos os endpoints de geração de exercícios, provas e atividades
 */

const express = require('express');
const router = express.Router();
const { callAI } = require('../services/aiService');
const {
  buildExerciseListPrompt,
  buildProvaPrompt,
  buildAtividadeExtraPrompt,
  buildExplicacaoPrompt,
} = require('../services/promptBuilder');
const { validarTema } = require('../services/moderationService');
const { 
  verificarToken, 
  salvarGeracao,
  obterPerfilUsuario,
  verificarUsoDiario,
  verificarUsoGuest
} = require('../services/supabaseService');

const MAX_EXERCISES = parseInt(process.env.MAX_EXERCISES) || 20;

// Helper: extrai Bearer token do header Authorization
function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Helper: extrai sessionId do header X-Session-Id
function extractSessionId(req) {
  return req.headers['x-session-id'] || null;
}

// ======================================
// VALIDAÇÃO COMUM
// ======================================
function validateSerie(serie) {
  const valid = ['6ano', '7ano', '8ano', '9ano'];
  return valid.includes(serie);
}

function validateNivel(nivel) {
  const valid = ['facil', 'medio', 'dificil'];
  return valid.includes(nivel);
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().substring(0, 200);
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().substring(0, 200);
}

// ======================================
// MIDDLEWARE DE LIMITES (GUEST, FREE, PREMIUM)
// ======================================
async function checkUsageLimits(req, res, next) {
  const token = extractToken(req);
  const sessionId = extractSessionId(req);
  
  // Usuário Logado
  if (token) {
    const usuario = await verificarToken(token);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    
    req.usuario = usuario;
    const perfil = await obterPerfilUsuario(usuario.id);
    req.plano = perfil.plan;
    
    if (perfil.plan === 'premium') return next(); // Liberado
    
    const usoHoje = await verificarUsoDiario(usuario.id);
    if (usoHoje >= 3) {
      return res.status(403).json({ 
        erro: 'limite_excedido', 
        plano: 'free', 
        limite: 3,
        mensagem: 'Você atingiu o limite de 3 gerações por dia no plano Free.'
      });
    }
    return next();
  }
  
  // Visitante (Guest)
  if (!sessionId) {
    return res.status(401).json({ erro: 'Autenticação ou Session ID obrigatório.' });
  }
  
  const usoTotal = await verificarUsoGuest(sessionId);
  if (usoTotal >= 1) {
    return res.status(403).json({
      erro: 'limite_excedido',
      plano: 'guest',
      limite: 1,
      mensagem: 'Visitantes podem gerar apenas 1 conteúdo. Crie sua conta gratuita para continuar!'
    });
  }
  
  req.plano = 'guest';
  return next();
}

// ======================================
// POST /api/gerar/exercicios
// Gera lista de exercícios
// ======================================
router.post('/exercicios', checkUsageLimits, async (req, res) => {
  try {
    const { serie, tema, nivel, quantidade } = req.body;

    // Validação
    if (!serie || !tema || !nivel || !quantidade) {
      return res.status(400).json({
        erro: 'Campos obrigatórios: serie, tema, nivel, quantidade',
      });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida. Use: 6ano, 7ano, 8ano, 9ano' });
    }

    if (!validateNivel(nivel)) {
      return res.status(400).json({ erro: 'Nível inválido. Use: facil, medio, dificil' });
    }

    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 1 || qtd > MAX_EXERCISES) {
      return res.status(400).json({
        erro: `Quantidade deve ser entre 1 e ${MAX_EXERCISES}`,
      });
    }

    const temaClean = sanitizeText(tema);
    if (!temaClean) {
      return res.status(400).json({ erro: 'Tema inválido' });
    }

    // Moderação de conteúdo
    const moderacao = validarTema(temaClean);
    if (!moderacao.valido) {
      return res.status(400).json({ erro: moderacao.motivo });
    }

    const prompt = buildExerciseListPrompt({
      serie,
      tema: temaClean,
      nivel,
      quantidade: qtd,
    });

    const resultado = await callAI(prompt);

    // Salva geração no banco (não-bloqueante)
    const sessionId = extractSessionId(req);
    salvarGeracao({
      userId: req.usuario ? req.usuario.id : null,
      sessionId: req.usuario ? null : sessionId,
      type: 'exercicios',
      title: temaClean,
      promptData: { serie, tema: temaClean, nivel, quantidade: qtd },
      generatedContent: resultado,
    });

    return res.json({
      sucesso: true,
      tipo: 'exercicios',
      dados: resultado,
    });
  } catch (err) {
    console.error('[ERRO] /api/gerar/exercicios:', err.message);
    return res.status(500).json({
      erro: 'Erro ao gerar exercícios. Verifique a configuração da API de IA.',
      detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ======================================
// POST /api/gerar/prova
// Gera prova completa
// ======================================
router.post('/prova', checkUsageLimits, async (req, res) => {
  try {
    const { serie, tema, totalQuestoes, tipoQuestoes, nivel } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const qtd = parseInt(totalQuestoes) || 10;
    // V/F e Múltipla Escolha ocupam muito espaço no JSON (muitos tokens)
    let maxQuestoes = 10;
    if (tipoQuestoes === 'vf') maxQuestoes = 5;
    else if (tipoQuestoes === 'multipla_escolha') maxQuestoes = 7;
    
    const qtdLimitada = Math.min(Math.max(qtd, 3), maxQuestoes);

    const temaClean = sanitizeText(tema);
    
    // Moderação de conteúdo
    const moderacao = validarTema(temaClean);
    if (!moderacao.valido) {
      return res.status(400).json({ erro: moderacao.motivo });
    }

    const prompt = buildProvaPrompt({
      serie,
      tema: temaClean,
      totalQuestoes: qtdLimitada,
      tipoQuestoes,
      nivel
    });

    const resultado = await callAI(prompt);

    // Salva geração no banco (não-bloqueante)
    const sessionId = extractSessionId(req);
    salvarGeracao({
      userId: req.usuario ? req.usuario.id : null,
      sessionId: req.usuario ? null : sessionId,
      type: 'prova',
      title: temaClean,
      promptData: { serie, tema: temaClean, totalQuestoes: qtdLimitada, tipoQuestoes, nivel },
      generatedContent: resultado,
    });

    return res.json({
      sucesso: true,
      tipo: 'prova',
      dados: resultado,
    });
  } catch (err) {
    console.error('[ERRO] /api/gerar/prova:', err.message);
    return res.status(500).json({
      erro: 'Erro ao gerar a prova.',
      detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ======================================
// POST /api/gerar/atividade-extra
// Gera atividade extra ou desafio
// ======================================
router.post('/atividade-extra', checkUsageLimits, async (req, res) => {
  try {
    const { serie, tema, tipo, nivel } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const tipoValido = ['desafio', 'atividade'].includes(tipo) ? tipo : 'atividade';
    const temaClean = sanitizeText(tema);

    // Moderação de conteúdo
    const moderacao = validarTema(temaClean);
    if (!moderacao.valido) {
      return res.status(400).json({ erro: moderacao.motivo });
    }

    const prompt = buildAtividadeExtraPrompt({
      serie,
      tema: temaClean,
      tipo: tipoValido,
      nivel,
    });

    const resultado = await callAI(prompt);

    // Salva geração no banco (não-bloqueante)
    const sessionId = extractSessionId(req);
    salvarGeracao({
      userId: req.usuario ? req.usuario.id : null,
      sessionId: req.usuario ? null : sessionId,
      type: 'atividade-extra',
      title: temaClean,
      promptData: { serie, tema: temaClean, tipo: tipoValido, nivel },
      generatedContent: resultado,
    });

    return res.json({
      sucesso: true,
      tipo: 'atividade-extra',
      dados: resultado,
    });
  } catch (err) {
    console.error('[ERRO] /api/gerar/atividade-extra:', err.message);
    return res.status(500).json({
      erro: 'Erro ao gerar a atividade.',
      detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ======================================
// POST /api/gerar/explicacao
// Gera explicação simples do tema
// ======================================
router.post('/explicacao', checkUsageLimits, async (req, res) => {
  try {
    const { serie, tema } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const temaClean = sanitizeText(tema);

    // Moderação de conteúdo
    const moderacao = validarTema(temaClean);
    if (!moderacao.valido) {
      return res.status(400).json({ erro: moderacao.motivo });
    }

    const prompt = buildExplicacaoPrompt({ serie, tema: temaClean });

    const resultado = await callAI(prompt);

    // Salva geração no banco (não-bloqueante)
    const sessionId = extractSessionId(req);
    salvarGeracao({
      userId: req.usuario ? req.usuario.id : null,
      sessionId: req.usuario ? null : sessionId,
      type: 'explicacao',
      title: temaClean,
      promptData: { serie, tema: temaClean },
      generatedContent: resultado,
    });

    return res.json({
      sucesso: true,
      tipo: 'explicacao',
      dados: resultado,
    });
  } catch (err) {
    console.error('[ERRO] /api/gerar/explicacao:', err.message);
    return res.status(500).json({
      erro: 'Erro ao gerar a explicação.',
      detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ======================================
// POST /api/gerar/chat-gabarito
// Chat contextual sobre o gabarito
// ======================================
router.post('/chat-gabarito', async (req, res) => {
  try {
    const { pergunta, contextoGabarito, tema } = req.body;

    if (!pergunta) {
      return res.status(400).json({ erro: 'A pergunta é obrigatória.' });
    }

    const contextoPergunta = contextoGabarito
      ? `Contexto do gabarito:\n${contextoGabarito}\n\n`
      : '';

    const prompt = `Você é um professor especialista em Matemática do Ensino Fundamental. 
O professor está revisando um gabarito sobre "${tema || 'Matemática'}" e tem uma dúvida.

${contextoPergunta}Pergunta do professor: "${pergunta}"

Responda de forma clara, pedagógica e objetiva. Se for uma dúvida sobre a resolução, explique o raciocínio passo a passo. 
Não gere exercícios novos. Apenas explique o conteúdo pedido.
Use LaTeX para expressões matemáticas usando a notação \\( expressao \\) para inline e $$ expressao $$ para blocos.
Responda diretamente, sem introduções longas.`;

    const systemPrompt = 'Você é um professor de Matemática experiente respondendo dúvidas pedagógicas de outros professores. Seja claro, preciso e use LaTeX para expressões matemáticas.';

    const resultado = await callAI(prompt, systemPrompt, false);

    // A IA retorna JSON — mas aqui queremos texto. Se retornou JSON, extraímos a resposta.
    let resposta = '';
    if (typeof resultado === 'string') {
      resposta = resultado;
    } else if (resultado.resposta) {
      resposta = resultado.resposta;
    } else if (resultado.answer) {
      resposta = resultado.answer;
    } else {
      resposta = JSON.stringify(resultado);
    }

    return res.json({ sucesso: true, resposta });

  } catch (err) {
    console.error('[ERRO DETALHADO] /api/gerar/chat-gabarito:', err);
    return res.status(500).json({
      erro: 'Erro ao processar a pergunta.',
      detalhe: err.message
    });
  }
});

module.exports = router;
