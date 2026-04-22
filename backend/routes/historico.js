/**
 * routes/historico.js
 * Rotas para gerenciar o histórico de conteúdos gerados pelo usuário.
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verificarToken } = require('../services/supabaseService');

// Helper: extrai e valida token, retorna usuário ou responde 401
async function autenticar(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const usuario = await verificarToken(token);
  if (!usuario) {
    res.status(401).json({ erro: 'Não autenticado. Faça login para acessar o histórico.' });
    return null;
  }
  return usuario;
}

// Cria cliente admin (service_role — server-side only)
function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ======================================
// GET /api/historico
// Lista todos os conteúdos do usuário logado
// Query params: ?limit=20&tipo=exercicios
// ======================================
router.get('/', async (req, res) => {
  const usuario = await autenticar(req, res);
  if (!usuario) return;

  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const tipo = req.query.tipo || null;

  const supabase = getAdminClient();

  let query = supabase
    .from('generations')
    .select('id, type, title, prompt_data, created_at')
    .eq('user_id', usuario.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tipo) query = query.eq('type', tipo);

  const { data, error } = await query;

  if (error) {
    console.error('[Historico] Erro ao listar:', error.message);
    return res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }

  res.json({ sucesso: true, total: data.length, itens: data });
});

// ======================================
// GET /api/historico/:id
// Retorna um item completo pelo ID (inclui generated_content)
// ======================================
router.get('/:id', async (req, res) => {
  const usuario = await autenticar(req, res);
  if (!usuario) return;

  const { id } = req.params;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .eq('user_id', usuario.id) // garante que só o dono acessa
    .single();

  if (error || !data) {
    return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
  }

  res.json({ sucesso: true, item: data });
});

// ======================================
// DELETE /api/historico/:id
// Exclui um item pelo ID (apenas o dono pode excluir)
// ======================================
router.delete('/:id', async (req, res) => {
  const usuario = await autenticar(req, res);
  if (!usuario) return;

  const { id } = req.params;
  const supabase = getAdminClient();

  // Verifica se o item existe e pertence ao usuário antes de deletar
  const { data: existing } = await supabase
    .from('generations')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', usuario.id)
    .single();

  if (!existing) {
    return res.status(404).json({ erro: 'Conteúdo não encontrado ou sem permissão para excluir.' });
  }

  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id)
    .eq('user_id', usuario.id); // double-check de segurança

  if (error) {
    console.error('[Historico] Erro ao excluir:', error.message);
    return res.status(500).json({ erro: 'Erro ao excluir o conteúdo.' });
  }

  console.log(`[Historico] Item ${id} excluído pelo usuário ${usuario.id}`);
  res.json({ sucesso: true, mensagem: 'Conteúdo excluído com sucesso.' });
});

module.exports = router;
