/**
 * supabaseService.js — Cliente Supabase para o BACKEND
 *
 * Usa o service_role key (NUNCA exposto no frontend).
 * O service_role bypassa o Row Level Security, permitindo operações
 * administrativas como inserir generations em nome do usuário.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] ⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  console.warn('[Supabase]    Gerações não serão salvas no banco de dados.');
}

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Verifica o token JWT de um usuário autenticado.
 * Retorna o objeto do usuário ou null se inválido.
 *
 * @param {string} token - Bearer token do usuário
 * @returns {Promise<object|null>}
 */
async function verificarToken(token) {
  if (!supabaseAdmin || !token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Salva uma geração de conteúdo no banco de dados.
 *
 * @param {object} params
 * @param {string|null} params.userId    - ID do usuário autenticado (ou null)
 * @param {string|null} params.sessionId - ID de sessão para guest mode futuro
 * @param {string}      params.type      - Tipo: exercicios | prova | atividade-extra | explicacao
 * @param {string}      params.title     - Tema/título do conteúdo
 * @param {object}      params.promptData    - Parâmetros usados (serie, tema, nivel, etc.)
 * @param {object}      params.generatedContent - JSON gerado pela IA
 * @returns {Promise<{id: string}|null>}
 */
async function salvarGeracao({ userId, sessionId, type, title, promptData, generatedContent }) {
  if (!supabaseAdmin) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: userId || null,
        session_id: sessionId || null,
        type,
        title,
        prompt_data: promptData,
        generated_content: generatedContent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Supabase] Erro ao salvar geração:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Supabase] Erro inesperado ao salvar geração:', err.message);
    return null;
  }
}

module.exports = { verificarToken, salvarGeracao };
