/**
 * auth.js — Gerenciador de Autenticação do ProMat
 *
 * Responsável por:
 * - Login / Cadastro / Logout via Supabase Auth
 * - Persistência e detecção de sessão
 * - Estado global do usuário
 * - UI de auth (modais + indicador na sidebar)
 */

// ============================================================
// ESTADO GLOBAL DE AUTH
// ============================================================
const AuthState = {
  usuario: null,        // objeto do usuário autenticado
  sessao: null,         // objeto de sessão (contém access_token)
  carregando: true,     // true enquanto verifica sessão inicial
};

// Retorna o access_token atual (para enviar nas chamadas à API)
function getAccessToken() {
  return AuthState.sessao?.access_token || null;
}

// ============================================================
// INICIALIZAÇÃO — detecta sessão persistida
// ============================================================
async function initAuth() {
  const sb = window.SupabaseClient.get();
  if (!sb) {
    AuthState.carregando = false;
    atualizarUIAuth();
    return;
  }

  // Recupera sessão do storage (persiste entre reloads)
  const { data: { session } } = await sb.auth.getSession();
  AuthState.sessao = session;
  AuthState.usuario = session?.user || null;
  AuthState.carregando = false;

  atualizarUIAuth();

  // Listener de mudanças de auth (login, logout, refresh de token)
  sb.auth.onAuthStateChange((_event, session) => {
    AuthState.sessao = session;
    AuthState.usuario = session?.user || null;
    atualizarUIAuth();
    if (window.HistoryManager) window.HistoryManager.renderizarSidebar();
  });
}

// ============================================================
// AÇÕES DE AUTH
// ============================================================
async function authLogin(email, password) {
  const sb = window.SupabaseClient.get();
  if (!sb) throw new Error('Serviço de auth indisponível.');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function authCadastro(email, password) {
  const sb = window.SupabaseClient.get();
  if (!sb) throw new Error('Serviço de auth indisponível.');

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function authLogout() {
  const sb = window.SupabaseClient.get();
  if (!sb) return;
  await sb.auth.signOut();
}

// ============================================================
// UI — Atualiza interface baseado no estado de auth
// ============================================================
function atualizarUIAuth() {
  const usuario = AuthState.usuario;

  // Botão/indicador na sidebar
  const authBtn = document.getElementById('auth-btn');
  const authInfo = document.getElementById('auth-user-info');

  if (!authBtn) return; // elementos ainda não renderizados

  if (usuario) {
    // Usuário logado
    authBtn.style.display = 'none';
    if (authInfo) {
      authInfo.style.display = 'flex';
      const emailEl = authInfo.querySelector('.auth-email');
      if (emailEl) emailEl.textContent = usuario.email;
    }
  } else {
    // Não logado
    authBtn.style.display = 'flex';
    if (authInfo) authInfo.style.display = 'none';
  }
}

// ============================================================
// HANDLERS DOS MODAIS
// ============================================================
function abrirModalLogin() {
  document.getElementById('auth-modal-overlay').classList.add('ativo');
  document.getElementById('auth-tab-login').click();
  document.getElementById('auth-email').focus();
}

function fecharModalAuth() {
  document.getElementById('auth-modal-overlay').classList.remove('ativo');
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
}

function trocarTabAuth(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-tab-login').classList.toggle('ativo', isLogin);
  document.getElementById('auth-tab-cadastro').classList.toggle('ativo', !isLogin);
  document.getElementById('auth-submit-btn').textContent = isLogin ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-title').textContent = isLogin ? 'Entrar no ProMat' : 'Criar sua conta';
  document.getElementById('auth-error').textContent = '';
  window._authTabAtiva = tab;
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const btnEl = document.getElementById('auth-submit-btn');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Preencha e-mail e senha.';
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = 'Aguarde...';

  try {
    if (window._authTabAtiva === 'cadastro') {
      await authCadastro(email, password);
      errorEl.style.color = '#10b981';
      errorEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar.';
    } else {
      await authLogin(email, password);
      fecharModalAuth();
      mostrarToast('Bem-vindo ao ProMat!', 'sucesso');
    }
  } catch (err) {
    errorEl.style.color = '#ef4444';
    // Traduz erros comuns do Supabase
    const msgs = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
      'User already registered': 'Este e-mail já está cadastrado.',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    };
    errorEl.textContent = msgs[err.message] || err.message;
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = window._authTabAtiva === 'cadastro' ? 'Criar conta' : 'Entrar';
  }
}

async function handleLogout() {
  await authLogout();
  mostrarToast('Você saiu do ProMat.', 'info');
}

// Inicializa variável de tab
window._authTabAtiva = 'login';

// Expõe globalmente
window.Auth = {
  init: initAuth,
  getToken: getAccessToken,
  login: authLogin,
  cadastro: authCadastro,
  logout: authLogout,
  abrirModal: abrirModalLogin,
  fecharModal: fecharModalAuth,
  estado: AuthState,
};
