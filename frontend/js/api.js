/**
 * API Client — Comunicação com o Backend
 * Toda requisição ao servidor passa por aqui
 */

// Quando servido pelo backend (http://localhost:3001), usa URL relativa.
// Quando aberto via file:// ou Live Server (5500/5501), aponta para o servidor local porta 3001.
const isLocalFile = window.location.protocol === 'file:';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isLocalServer = isLocalhost && window.location.port !== '3001';

const API_BASE = isLocalFile || isLocalServer
  ? 'http://localhost:3001/api'
  : '/api';

// Armazena a chave de API local (apenas se o usuário quiser usar diretamente)
// NOTA: Em produção, a chave fica NO BACKEND (.env) — não no frontend
let _apiKeyOverride = null;

/**
 * Faz requisição POST para o backend
 * Envia o token de auth (se logado) e o sessionId (sempre)
 */
async function apiFetch(endpoint, body) {
  const headers = { 'Content-Type': 'application/json' };

  // Auth token (usuário logado)
  const token = window.Auth?.getToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Session ID (visitante ou usuário — identifica a sessão)
  const sessionId = window.GuestMode?.getSessionId?.();
  if (sessionId) headers['X-Session-Id'] = sessionId;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.erro === 'limite_excedido') {
      if (window.mostrarModalUpgrade) {
        window.mostrarModalUpgrade(data.mensagem);
      }
      const erro = new Error(data.mensagem);
      erro.codigo = 'limite_excedido';
      throw erro;
    }
    const mensagem = data.erro || `Erro HTTP ${response.status}`;
    throw new Error(mensagem);
  }

  return data;
}

/**
 * Verifica se o backend está online
 */
async function verificarBackend() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend offline');
    return await res.json();
  } catch (e) {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }
}

/**
 * Gera lista de exercícios
 */
async function gerarExercicios({ serie, tema, nivel, quantidade }) {
  return await apiFetch('/gerar/exercicios', { serie, tema, nivel, quantidade });
}

/**
 * Gera prova completa
 */
async function gerarProva({ serie, tema, totalQuestoes, tipoQuestoes, nivel }) {
  return await apiFetch('/gerar/prova', { serie, tema, totalQuestoes, tipoQuestoes, nivel });
}

/**
 * Gera atividade extra ou desafio
 */
async function gerarAtividadeExtra({ serie, tema, tipo }) {
  return await apiFetch('/gerar/atividade-extra', { serie, tema, tipo });
}

/**
 * Gera explicação do tema
 */
async function gerarExplicacao({ serie, tema }) {
  return await apiFetch('/gerar/explicacao', { serie, tema });
}

/**
 * Busca histórico do banco de dados (Supabase) via backend
 */
async function obterHistoricoCloud() {
  const headers = {};
  const token = window.Auth?.getToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/historico`, { headers });
  if (!response.ok) return [];
  const json = await response.json();
  return json.itens || [];
}
