/**
 * supabase.js — Cliente Supabase para o FRONTEND
 *
 * Usa o anon key (seguro para expor no frontend por design do Supabase).
 * O anon key + RLS garantem que cada usuário só acessa seus próprios dados.
 *
 * VARIÁVEIS: Injetadas pelo backend via /api/config ou configuradas inline.
 * Em produção (Vercel), o backend pode servir uma rota /api/config que devolve
 * as variáveis públicas (SUPABASE_URL e SUPABASE_ANON_KEY).
 */

// Aguarda a definição de SUPABASE_CONFIG (injetada pelo backend via /api/config)
let _supabaseClient = null;

async function initSupabase() {
  if (_supabaseClient) return _supabaseClient;

  try {
    // Busca configuração do backend (nunca hardcoda chaves no frontend)
    const resp = await fetch('/api/config');
    if (!resp.ok) throw new Error('Config indisponível');
    const config = await resp.json();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.warn('[Supabase] Configuração ausente. Auth desabilitada.');
      return null;
    }

    // Carrega o SDK via CDN (já incluso no HTML)
    const { createClient } = supabase; // global do CDN
    _supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    return _supabaseClient;
  } catch (err) {
    console.warn('[Supabase] Não foi possível inicializar:', err.message);
    return null;
  }
}

// Getter síncrono após init
function getSupabase() {
  return _supabaseClient;
}

window.SupabaseClient = { init: initSupabase, get: getSupabase };
