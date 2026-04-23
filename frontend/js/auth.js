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
  nome: '',             // nome completo do usuário
  plano: 'guest',       // guest | free | premium
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
  AuthState.plano = session?.user ? 'free' : 'guest';
  AuthState.carregando = false;

  if (AuthState.usuario) {
    await carregarPerfil(AuthState.usuario.id);
  }

  atualizarUIAuth();

  // Verifica se o usuário acabou de voltar de um checkout Cakto
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutSuccess = urlParams.get('checkout') === 'success';
  const hasPendingFlag = localStorage.getItem('promat_checkout_pending') === 'true';

  if ((checkoutSuccess || hasPendingFlag) && AuthState.usuario && AuthState.plano !== 'premium') {
    // Limpa a URL para não ficar poluída se for o caso
    if (checkoutSuccess) window.history.replaceState({}, document.title, window.location.pathname);
    
    // Garante que o flag está setado para o polling funcionar corretamente
    localStorage.setItem('promat_checkout_pending', 'true');
    
    if (typeof window.iniciarPollingPremium === 'function') {
      window.iniciarPollingPremium();
    }
  }

  // Listener de mudanças de auth (login, logout, refresh de token)
  sb.auth.onAuthStateChange(async (_event, session) => {
    const eraLogado = !!AuthState.usuario;
    AuthState.sessao = session;
    AuthState.usuario = session?.user || null;
    AuthState.plano = session?.user ? 'free' : 'guest';
    
    if (AuthState.usuario) {
      await carregarPerfil(AuthState.usuario.id);
    }
    
    atualizarUIAuth();
    if (window.HistoryManager) window.HistoryManager.renderizarSidebar();

    // Migração guest → usuário: só na primeira entrada (SIGNED_IN a partir de estado deslogado)
    if (_event === 'SIGNED_IN' && !eraLogado && session?.user) {
      _migrarGeracoesGuestAposLogin(session);
    }
  });
}

/**
 * Busca o plano do usuário no Supabase e atualiza o estado
 */
async function carregarPerfil(userId) {
  const sb = window.SupabaseClient.get();
  if (!sb || !userId) return;
  const { data, error } = await sb.from('profiles').select('plan, full_name').eq('id', userId).single();
  if (!error && data) {
    const planoAnterior = AuthState.plano;
    AuthState.plano = data.plan;
    AuthState.nome = data.full_name || '';

    // Celebração de ativação Premium
    if (data.plan === 'premium') {
      const storageKey = `premium_toast_${userId}`;
      if (!localStorage.getItem(storageKey)) {
        if (typeof window.mostrarCelebracaoPremium === 'function') {
          window.mostrarCelebracaoPremium();
        } else if (window.mostrarToast) {
          // Fallback caso a função ainda não tenha carregado por algum motivo
          mostrarToast('Premium ativado com sucesso! Seu acesso completo já está liberado.', 'sucesso');
        }
        localStorage.setItem(storageKey, 'true');
      }
    }
    
    // Força a atualização da UI caso o perfil tenha sido carregado tardiamente
    if (planoAnterior !== data.plan) {
      atualizarUIAuth();
    }
  }
}

/**
 * Chama o backend para vincular gerações guest ao usuário recém-autenticado.
 */
async function _migrarGeracoesGuestAposLogin(session) {
  const sessionId = window.GuestMode?.getSessionId?.();
  if (!sessionId || !sessionId.startsWith('guest_')) return;

  try {
    const resp = await fetch('/api/auth/migrar-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    if (resp.ok) {
      const json = await resp.json();
      if (json.migradas > 0) {
        console.log(`[Auth] ${json.migradas} geração(ões) guest migradas para sua conta.`);
        if (window.mostrarToast) mostrarToast(`${json.migradas} conteúdo(s) guest foram salvos na sua conta!`, 'sucesso');
      }
      // Limpa sessão guest após migração bem-sucedida
      if (window.GuestMode) window.GuestMode.limparSessao();
    }
  } catch (err) {
    console.warn('[Auth] Migração guest falhou silenciosamente:', err.message);
  }
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

async function authCadastro(email, password, name) {
  const sb = window.SupabaseClient.get();
  if (!sb) throw new Error('Serviço de auth indisponível.');

  const { data, error } = await sb.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        full_name: name
      }
    }
  });
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
  const planBadge = document.getElementById('plan-badge');

  if (planBadge) {
    if (usuario) {
      planBadge.style.display = 'inline-block';
      if (AuthState.plano === 'premium') {
        planBadge.textContent = 'Plano Premium';
        planBadge.className = 'plan-badge premium';
      } else {
        planBadge.textContent = 'Plano Grátis';
        planBadge.className = 'plan-badge free';
      }
    } else {
      planBadge.style.display = 'none';
    }
  }

  // Controle visual dos cards bloqueados (Premium Only)
  const cardsPremium = document.querySelectorAll('.action-card.premium-only');
  const isPremium = AuthState.plano === 'premium';

  cardsPremium.forEach(card => {
    const tag = card.querySelector('.card-premium-tag');
    if (isPremium) {
      card.classList.remove('premium-locked');
      if (tag) tag.style.display = 'none';
    } else {
      card.classList.add('premium-locked');
      if (tag) tag.style.display = 'block';
    }
  });

  if (!authBtn) return; // elementos ainda não renderizados

  // Saudação personalizada na Home
  const greetingEl = document.getElementById('main-greeting');
  if (greetingEl) {
    if (usuario && AuthState.nome) {
      const primeiroNome = AuthState.nome.trim().split(' ')[0];
      greetingEl.innerHTML = `O que vamos criar hoje, <span>${primeiroNome}?</span>`;
    } else {
      greetingEl.innerHTML = `O que vamos criar <span>hoje?</span>`;
    }
  }

  if (usuario) {
    // Usuário logado
    authBtn.style.display = 'none';
    if (authInfo) {
      authInfo.style.display = 'flex';
      const emailEl = authInfo.querySelector('.auth-email');
      if (emailEl) {
        emailEl.textContent = AuthState.nome || usuario.email;
        emailEl.title = usuario.email; // Mostra email no hover se tiver nome
      }
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

  // Mostra/esconde campo de nome
  const nameGroup = document.getElementById('auth-name-group');
  if (nameGroup) nameGroup.style.display = isLogin ? 'none' : 'block';
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const btnEl = document.getElementById('auth-submit-btn');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Preencha todos os campos.';
    return;
  }

  const name = document.getElementById('auth-name').value.trim();
  if (window._authTabAtiva === 'cadastro' && !name) {
    errorEl.textContent = 'Informe seu nome.';
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = 'Processando...';

  try {
    if (window._authTabAtiva === 'login') {
      await authLogin(email, password);
      fecharModalAuth();
      mostrarToast('Bem-vindo ao ProMat!', 'sucesso');
    } else {
      await authCadastro(email, password, name);
      errorEl.style.color = '#10b981';
      errorEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar.';
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
  
  // Limpeza profunda de estado para evitar vazamento visual para o modo Guest
  if (window.HistoryManager) {
    window.HistoryManager._cacheCloud = [];
  }
  if (typeof estado !== 'undefined') {
    estado.dadosAtuais = null;
    estado.tipoAtual = null;
    estado.pastaAtivaId = null;
  }
  
  // Força o retorno para a tela inicial (limpa a visualização)
  if (window.navegarPara) {
    window.navegarPara('home');
  }
  
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
