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

/**
 * Migra gerações guest para um usuário autenticado.
 * Chamada logo após o login/cadastro quando o visitante tinha um sessionId.
 *
 * @param {string} sessionId - ID da sessão guest
 * @param {string} userId    - ID do usuário recém-autenticado
 * @returns {Promise<number>} Número de registros migrados
 */
async function migrarGeracoesGuest(sessionId, userId) {
  if (!supabaseAdmin || !sessionId || !userId) return 0;

  // Sanitiza: session_id deve ter prefixo "guest_" para evitar abuse
  if (!sessionId.startsWith('guest_')) {
    console.warn('[Supabase] migrarGeracoesGuest: sessionId inválido ignorado:', sessionId);
    return 0;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('generations')
      .update({ user_id: userId, session_id: null })
      .eq('session_id', sessionId)
      .is('user_id', null) // Só migra itens sem user_id (genuinamente guest)
      .select('id');

    if (error) {
      console.error('[Supabase] Erro na migração guest:', error.message);
      return 0;
    }

    const total = data?.length || 0;
    if (total > 0) {
      console.log(`[Supabase] Migradas ${total} geração(ões) do session ${sessionId} → user ${userId}`);
    }
    return total;
  } catch (err) {
    console.error('[Supabase] Erro inesperado na migração guest:', err.message);
    return 0;
  }
}

/**
 * Retorna o perfil do usuário (ex: plan: 'free' ou 'premium')
 */
async function obterPerfilUsuario(userId) {
  if (!supabaseAdmin || !userId) return { plan: 'free' };
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();
  
  if (error) console.error('[Supabase] Erro ao buscar perfil:', error.message);
  return data || { plan: 'free' };
}

/**
 * Conta quantas gerações o usuário fez HOJE (desde meia-noite)
 */
async function verificarUsoDiario(userId) {
  if (!supabaseAdmin || !userId) return 0;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeISO = hoje.toISOString();

  const { count, error } = await supabaseAdmin
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', hojeISO);
    
  if (error) console.error('[Supabase] Erro ao contar uso diário:', error.message);
  return count || 0;
}

/**
 * Conta quantas gerações o visitante já fez no total com este sessionId
 */
async function verificarUsoGuest(sessionId) {
  if (!supabaseAdmin || !sessionId) return 0;
  
  const { count, error } = await supabaseAdmin
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
    
  if (error) console.error('[Supabase] Erro ao contar uso guest:', error.message);
  return count || 0;
}

/**
 * Atualiza o plano de um usuário baseando-se no e-mail (usado via Webhook Cakto)
 */
async function atualizarPlanoPorEmail(email, plano = 'premium') {
  if (!supabaseAdmin || !email) {
    console.error('[Supabase] Falha de inicialização: Supabase não configurado ou email nulo');
    return { sucesso: false, erro: 'Sem Supabase configurado ou email nulo' };
  }
  
  const emailLimpo = email.toLowerCase().trim();
  console.log(`[Supabase] Tentando atualizar plano para '${plano}' do email '${emailLimpo}'...`);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ plan: plano })
      .eq('email', emailLimpo)
      .select('id, email, plan');
      
    if (error) {
      console.error(`[Supabase] ERRO POSTGREST ao atualizar plano para ${emailLimpo}:`, error);
      return { sucesso: false, erro: error.message };
    }
    
    if (!data || data.length === 0) {
      console.warn(`[Supabase] ALERTA: Usuário não encontrado na tabela 'profiles' com o email: '${emailLimpo}'`);
      return { sucesso: false, erro: 'Usuário não encontrado com este email na tabela profiles' };
    }
    
    console.log(`[Supabase] Update realizado com sucesso. Dados do usuário:`, data[0]);
    return { sucesso: true, perfil: data[0] };
  } catch (err) {
    console.error(`[Supabase] Exceção ao atualizar plano para ${emailLimpo}:`, err.message);
    return { sucesso: false, erro: err.message };
  }
}

module.exports = { 
  verificarToken, 
  salvarGeracao, 
  migrarGeracoesGuest, 
  obterPerfilUsuario, 
  verificarUsoDiario, 
  verificarUsoGuest,
  atualizarPlanoPorEmail
};
