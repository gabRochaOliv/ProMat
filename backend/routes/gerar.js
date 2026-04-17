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

const MAX_EXERCISES = parseInt(process.env.MAX_EXERCISES) || 20;

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

// ======================================
// POST /api/gerar/exercicios
// Gera lista de exercícios
// ======================================
router.post('/exercicios', async (req, res) => {
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

    const prompt = buildExerciseListPrompt({
      serie,
      tema: temaClean,
      nivel,
      quantidade: qtd,
    });

    const resultado = await callAI(prompt);

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
router.post('/prova', async (req, res) => {
  try {
    const { serie, tema, totalQuestoes } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const qtd = parseInt(totalQuestoes) || 10;
    const qtdLimitada = Math.min(Math.max(qtd, 5), 15); // entre 5 e 15

    const temaClean = sanitizeText(tema);
    const prompt = buildProvaPrompt({
      serie,
      tema: temaClean,
      totalQuestoes: qtdLimitada,
    });

    const resultado = await callAI(prompt);

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
router.post('/atividade-extra', async (req, res) => {
  try {
    const { serie, tema, tipo } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const tipoValido = ['desafio', 'atividade'].includes(tipo) ? tipo : 'atividade';
    const temaClean = sanitizeText(tema);

    const prompt = buildAtividadeExtraPrompt({
      serie,
      tema: temaClean,
      tipo: tipoValido,
    });

    const resultado = await callAI(prompt);

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
router.post('/explicacao', async (req, res) => {
  try {
    const { serie, tema } = req.body;

    if (!serie || !tema) {
      return res.status(400).json({ erro: 'Campos obrigatórios: serie, tema' });
    }

    if (!validateSerie(serie)) {
      return res.status(400).json({ erro: 'Série inválida.' });
    }

    const temaClean = sanitizeText(tema);
    const prompt = buildExplicacaoPrompt({ serie, tema: temaClean });

    const resultado = await callAI(prompt);

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

module.exports = router;
