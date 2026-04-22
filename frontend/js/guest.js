/**
 * guest.js — Modo Visitante (Guest Mode) do ProMat
 *
 * Responsável por:
 * - Criar e persistir um sessionId único no localStorage
 * - Rastrear quantas gerações o visitante já fez
 * - Bloquear uma 2ª geração sem login
 * - Exibir CTA de cadastro após a 1ª geração
 * - Expor o sessionId para o backend via header X-Session-Id
 */

// ============================================================
// CHAVES DO LOCALSTORAGE
// ============================================================
const GUEST_SESSION_KEY  = 'promat_guest_session_id';
const GUEST_COUNT_KEY    = 'promat_guest_count';
const GUEST_LIMIT        = 1; // Uma geração gratuita

// ============================================================
// SESSÃO GUEST
// ============================================================
function getOrCreateSessionId() {
  let sid = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sid) {
    // Gera UUID v4 leve sem dependências
    sid = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(GUEST_SESSION_KEY, sid);
    localStorage.setItem(GUEST_COUNT_KEY, '0');
  }
  return sid;
}

function getSessionId() {
  return localStorage.getItem(GUEST_SESSION_KEY) || getOrCreateSessionId();
}

function getGeracoesGuest() {
  return parseInt(localStorage.getItem(GUEST_COUNT_KEY) || '0', 10);
}

function incrementarGeracoesGuest() {
  const atual = getGeracoesGuest();
  localStorage.setItem(GUEST_COUNT_KEY, String(atual + 1));
}

function resetarContadorGuest() {
  localStorage.setItem(GUEST_COUNT_KEY, '0');
}

/** Limpa a sessão guest após migração para conta */
function limparSessaoGuest() {
  localStorage.removeItem(GUEST_SESSION_KEY);
  localStorage.removeItem(GUEST_COUNT_KEY);
}

// ============================================================
// VERIFICAÇÃO DE LIMITE
// ============================================================

/**
 * Verifica se o visitante pode gerar conteúdo.
 * @returns { podeGerar: boolean, motivo: string|null }
 */
function verificarLimiteGuest() {
  const usuario = window.Auth?.estado?.usuario;

  // Usuário logado: sem limite guest
  if (usuario) return { podeGerar: true, motivo: null };

  const usadas = getGeracoesGuest();
  if (usadas >= GUEST_LIMIT) {
    return {
      podeGerar: false,
      motivo: 'limite',
    };
  }

  return { podeGerar: true, motivo: null };
}

/**
 * Registra que uma geração guest foi feita (chamado após sucesso).
 */
function registrarGeracaoGuest() {
  const usuario = window.Auth?.estado?.usuario;
  if (!usuario) incrementarGeracoesGuest();
}

// ============================================================
// UI — BANNER DE BLOQUEIO
// ============================================================

/**
 * Exibe o modal de bloqueio pedindo login/cadastro.
 * Chamado quando visitante tenta 2ª geração.
 */
function mostrarBloqueioGuest() {
  let overlay = document.getElementById('guest-bloqueio-overlay');
  if (!overlay) {
    overlay = _criarModalBloqueio();
    document.body.appendChild(overlay);
  }
  overlay.classList.add('ativo');
}

function fecharBloqueioGuest() {
  const overlay = document.getElementById('guest-bloqueio-overlay');
  if (overlay) overlay.classList.remove('ativo');
}

function _criarModalBloqueio() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'guest-bloqueio-overlay';
  // Clique fora fecha
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharBloqueioGuest();
  });

  overlay.innerHTML = `
    <div class="modal guest-bloqueio-modal">
      <div class="guest-bloqueio-icon">🎉</div>
      <h2 class="guest-bloqueio-titulo">Você acabou de ver o ProMat funcionar!</h2>
      <p class="guest-bloqueio-texto">
        Crie sua conta gratuita agora e tenha acesso ao histórico completo
        de tudo que você gerar — em qualquer lugar, a qualquer hora.
      </p>

      <div class="guest-bloqueio-beneficios">
        <div class="guest-beneficio">
          <i class="ph-fill ph-clock-counter-clockwise"></i>
          <span>Histórico completo salvo na nuvem</span>
        </div>
        <div class="guest-beneficio">
          <i class="ph-fill ph-infinity"></i>
          <span>Gerações ilimitadas</span>
        </div>
        <div class="guest-beneficio">
          <i class="ph-fill ph-devices"></i>
          <span>Acesso de qualquer dispositivo</span>
        </div>
      </div>

      <div class="guest-bloqueio-actions">
        <button class="btn btn-primary btn-block" onclick="abrirCadastroGuest()">
          <i class="ph ph-user-plus"></i> Criar conta gratuita
        </button>
        <button class="btn btn-ghost btn-block" onclick="abrirLoginGuest()">
          Já tenho conta — Entrar
        </button>
      </div>

      <button class="btn-fechar-guest" onclick="fecharBloqueioGuest()" title="Fechar">
        <i class="ph ph-x"></i>
      </button>
    </div>
  `;

  return overlay;
}

function abrirCadastroGuest() {
  fecharBloqueioGuest();
  if (window.Auth) {
    window.Auth.abrirModal();
    setTimeout(() => trocarTabAuth('cadastro'), 50);
  }
}

function abrirLoginGuest() {
  fecharBloqueioGuest();
  if (window.Auth) {
    window.Auth.abrirModal();
    setTimeout(() => trocarTabAuth('login'), 50);
  }
}

// ============================================================
// BANNER PÓS-1ª GERAÇÃO (incentivo suave)
// ============================================================

/**
 * Exibe uma faixa suave no topo do resultado após a 1ª geração,
 * incentivando o cadastro para salvar o conteúdo.
 */
function mostrarBannerSalvarGuest() {
  const usuario = window.Auth?.estado?.usuario;
  if (usuario) return; // logado, não precisa

  const usadas = getGeracoesGuest();
  if (usadas < 1) return; // ainda não gerou nada

  // Remove banner anterior se existir
  const existente = document.getElementById('guest-save-banner');
  if (existente) existente.remove();

  const banner = document.createElement('div');
  banner.id = 'guest-save-banner';
  banner.className = 'guest-save-banner';
  banner.innerHTML = `
    <div class="guest-save-banner-inner">
      <i class="ph-fill ph-warning-circle"></i>
      <span>Este conteúdo <strong>não está salvo</strong>. Crie sua conta para salvar no histórico.</span>
      <button class="btn-guest-cadastrar" onclick="abrirCadastroGuest()">
        Criar conta grátis <i class="ph ph-arrow-right"></i>
      </button>
      <button class="btn-fechar-banner" onclick="this.parentElement.parentElement.remove()">
        <i class="ph ph-x"></i>
      </button>
    </div>
  `;

  // Insere no topo da result toolbar
  const toolbar = document.querySelector('.result-toolbar');
  if (toolbar) toolbar.insertAdjacentElement('afterend', banner);
}

// ============================================================
// EXPORTS GLOBAIS
// ============================================================
window.GuestMode = {
  getSessionId,
  getOrCreateSessionId,
  verificarLimite: verificarLimiteGuest,
  registrarGeracao: registrarGeracaoGuest,
  mostrarBloqueio: mostrarBloqueioGuest,
  mostrarBannerSalvar: mostrarBannerSalvarGuest,
  limparSessao: limparSessaoGuest,
  resetarContador: resetarContadorGuest,
};

// Expõe funções de UI globalmente (usadas pelos botões do modal)
window.fecharBloqueioGuest = fecharBloqueioGuest;
window.abrirCadastroGuest  = abrirCadastroGuest;
window.abrirLoginGuest     = abrirLoginGuest;
