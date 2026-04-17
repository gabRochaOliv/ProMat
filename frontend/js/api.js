/**
 * API Client — Comunicação com o Backend
 * Toda requisição ao servidor passa por aqui
 */

// Quando servido pelo backend (http://localhost:3001), usa URL relativa.
// Quando aberto via file://, aponta para o servidor local.
const API_BASE = window.location.protocol === 'file:'
  ? 'http://localhost:3001/api'
  : '/api';

// Armazena a chave de API local (apenas se o usuário quiser usar diretamente)
// NOTA: Em produção, a chave fica NO BACKEND (.env) — não no frontend
let _apiKeyOverride = null;

/**
 * Faz requisição POST para o backend
 */
async function apiFetch(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
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
async function gerarProva({ serie, tema, totalQuestoes }) {
  return await apiFetch('/gerar/prova', { serie, tema, totalQuestoes });
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
