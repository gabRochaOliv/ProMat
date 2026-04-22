/**
 * historico.js — Módulo de Histórico do ProMat
 *
 * Gerencia a view de histórico:
 * - Carregamento de itens via /api/historico
 * - Filtro por tipo
 * - Visualização de conteúdo (reutiliza renderizarResultado)
 * - Exclusão com confirmação
 */

// ============================================================
// ESTADO LOCAL DO HISTÓRICO
// ============================================================
const HistoricoState = {
  itens: [],          // Todos os itens carregados
  tipoFiltro: '',     // Filtro ativo ('exercicios', 'prova', etc.)
  carregando: false,
};

// ============================================================
// RÓTULOS E BADGES
// ============================================================
const HIST_LABELS = {
  exercicios:       'Lista',
  prova:            'Prova',
  'atividade-extra': 'Extra',
  explicacao:       'Explicação',
};

const HIST_ICONS = {
  exercicios:       'ph-list-numbers',
  prova:            'ph-exam',
  'atividade-extra': 'ph-lightbulb',
  explicacao:       'ph-chalkboard-teacher',
};

const SERIE_LABELS = {
  '6ano': '6º Ano',
  '7ano': '7º Ano',
  '8ano': '8º Ano',
  '9ano': '9º Ano',
};

// ============================================================
// CARREGAR HISTÓRICO DO BACKEND
// ============================================================
async function carregarHistorico() {
  // Checa se está logado
  const usuario = window.Auth?.estado?.usuario;

  _histMostrarEstado('loading');

  if (!usuario) {
    _histMostrarEstado('nao-logado');
    return;
  }

  HistoricoState.carregando = true;

  try {
    const headers = {};
    const token = window.Auth?.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = HistoricoState.tipoFiltro
      ? `/api/historico?tipo=${HistoricoState.tipoFiltro}`
      : '/api/historico';

    const resp = await fetch(url, { headers });

    if (resp.status === 401) {
      _histMostrarEstado('nao-logado');
      return;
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    HistoricoState.itens = json.itens || [];

    if (HistoricoState.itens.length === 0) {
      _histMostrarEstado('vazio');
    } else {
      _histMostrarEstado('lista');
      _renderizarLista(HistoricoState.itens);
    }
  } catch (err) {
    console.error('[Historico] Erro ao carregar:', err.message);
    document.getElementById('hist-erro-msg').textContent = err.message;
    _histMostrarEstado('erro');
  } finally {
    HistoricoState.carregando = false;
  }
}

// ============================================================
// FILTRAR
// ============================================================
function filtrarHistorico(btn) {
  // Atualiza botões de filtro
  document.querySelectorAll('.hist-filtro-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');

  HistoricoState.tipoFiltro = btn.dataset.tipo || '';

  // Se já tem itens carregados, filtra localmente (mais rápido)
  if (HistoricoState.itens.length > 0 && !HistoricoState.tipoFiltro) {
    _renderizarLista(HistoricoState.itens);
    _histMostrarEstado('lista');
    return;
  }

  if (HistoricoState.tipoFiltro) {
    const filtrados = HistoricoState.itens.filter(i => i.type === HistoricoState.tipoFiltro);
    if (filtrados.length === 0) {
      _histMostrarEstado('vazio');
    } else {
      _renderizarLista(filtrados);
      _histMostrarEstado('lista');
    }
    return;
  }

  // Recarrega do servidor se necessário
  carregarHistorico();
}

// ============================================================
// ABRIR ITEM DO HISTÓRICO
// ============================================================
async function abrirItemHistorico(id) {
  try {
    const headers = {};
    const token = window.Auth?.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`/api/historico/${id}`, { headers });
    if (!resp.ok) throw new Error('Falha ao buscar conteúdo.');

    const json = await resp.json();
    const item = json.item;

    if (!item || !item.generated_content) {
      mostrarToast('Conteúdo não encontrado.', 'erro');
      return;
    }

    // Reutiliza a view de resultado existente
    estado.dadosAtuais = item.generated_content;
    estado.tipoAtual = item.type;
    estado.temaAtual = item.title;

    renderizarResultado(item.generated_content, item.type, null);
    navegarPara('result');
  } catch (err) {
    mostrarToast('Erro ao abrir conteúdo: ' + err.message, 'erro');
  }
}

// ============================================================
// EXCLUIR ITEM
// ============================================================
async function excluirItemHistorico(id, event) {
  // Previne propagação (não abre o item ao clicar no lixo)
  if (event) event.stopPropagation();

  const confirmar = confirm('Tem certeza que deseja excluir este conteúdo? Esta ação é irreversível.');
  if (!confirmar) return;

  try {
    const headers = {};
    const token = window.Auth?.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`/api/historico/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(json.erro || 'Erro ao excluir.');
    }

    // Remove do estado local e re-renderiza sem nova request
    HistoricoState.itens = HistoricoState.itens.filter(i => i.id !== id);

    // Animação de saída no card
    const card = document.querySelector(`[data-hist-id="${id}"]`);
    if (card) {
      card.style.transition = 'opacity 0.2s, transform 0.2s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (HistoricoState.itens.length === 0) {
          _histMostrarEstado('vazio');
        } else {
          _renderizarLista(HistoricoState.itens);
        }
      }, 200);
    }

    mostrarToast('Conteúdo excluído.', 'info');
  } catch (err) {
    mostrarToast('Erro ao excluir: ' + err.message, 'erro');
  }
}

// ============================================================
// RENDERIZAR LISTA
// ============================================================
function _renderizarLista(itens) {
  const lista = document.getElementById('hist-lista');
  if (!lista) return;

  lista.innerHTML = itens.map(item => {
    const tipo = item.type || 'exercicios';
    const label = HIST_LABELS[tipo] || 'Conteúdo';
    const icon = HIST_ICONS[tipo] || 'ph-file-text';
    const serie = item.prompt_data?.serie ? SERIE_LABELS[item.prompt_data.serie] || item.prompt_data.serie : null;
    const data = new Date(item.created_at);
    const dataStr = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const horaStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const titulo = escaparHtml(item.title || 'Sem título');

    return `
      <div class="hist-item" data-hist-id="${item.id}" onclick="abrirItemHistorico('${item.id}')">
        <div class="hist-item-top">
          <span class="hist-item-badge hist-badge-${tipo}">
            <i class="ph ${icon}"></i> ${label}
          </span>
          <button class="hist-btn-excluir" title="Excluir" onclick="excluirItemHistorico('${item.id}', event)">
            <i class="ph ph-trash"></i>
          </button>
        </div>
        <div class="hist-item-titulo">${titulo}</div>
        <div class="hist-item-meta">
          <i class="ph ph-calendar-blank"></i>
          <span>${dataStr} às ${horaStr}</span>
          ${serie ? `<span class="hist-item-serie"><i class="ph ph-graduation-cap"></i> ${serie}</span>` : ''}
        </div>
        <div class="hist-item-actions">
          <button class="hist-btn-abrir">
            <i class="ph ph-arrow-right"></i> Ver conteúdo
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// CONTROLE DE ESTADOS DA UI
// ============================================================
function _histMostrarEstado(estado) {
  const estados = ['nao-logado', 'loading', 'vazio', 'erro', 'lista'];
  estados.forEach(e => {
    const el = document.getElementById(`hist-estado-${e}`);
    if (el) el.style.display = 'none';
  });

  if (estado === 'lista') {
    // Mostra a lista, esconde estados
    const lista = document.getElementById('hist-lista');
    if (lista) lista.style.display = 'grid';
  } else {
    const lista = document.getElementById('hist-lista');
    if (lista) lista.style.display = 'none';

    const el = document.getElementById(`hist-estado-${estado}`);
    if (el) el.style.display = 'flex';
  }
}

// Expõe globalmente
window.carregarHistorico = carregarHistorico;
window.filtrarHistorico = filtrarHistorico;
window.abrirItemHistorico = abrirItemHistorico;
window.excluirItemHistorico = excluirItemHistorico;
