/**
 * ProMat — app.js v3
 * Lógica principal: Roteamento, Histórico, Pastas como Contexto, Modals customizados
 */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const estado = {
  viewAtual: 'home',
  dadosAtuais: null,
  tipoAtual: null,
  backendOnline: false,
  pastaAtivaId: null,        // null = sem contexto de pasta
  itemAtualDaPastaId: null,  // para saber em qual pasta está o item visualizado
};

// Atalho de temas por série
const TEMAS_POR_SERIE = {
  '6ano': ['Frações', 'Números Inteiros', 'Porcentagem', 'MMC / MDC'],
  '7ano': ['Álgebra Básica', 'Equação 1º Grau', 'Números Racionais', 'Ângulos e Triângulos'],
  '8ano': ['Equação 2º Grau', 'Sistemas de Equações', 'Pitágoras', 'Probabilidade'],
  '9ano': ['Função Afim', 'Função Quadrática', 'Trigonometria', 'Estatística'],
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  configurarEventosUI();
  HistoryManager.renderizarSidebar();
  navegarPara('home');
  await verificarStatusBackend();
});

// ============================================================
// ROTEADOR
// ============================================================
function navegarPara(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('ativa'));
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('ativa');
  estado.viewAtual = viewId;

  if (viewId === 'home') {
    estado.dadosAtuais = null;
    estado.tipoAtual = null;
    atualizarUIContexto();
  }

  fecharSidebar(); // fecha drawer no mobile ao navegar
}

// ============================================================
// SIDEBAR MÓVEL
// ============================================================
function abrirSidebar() {
  document.getElementById('sidebar').classList.add('aberta');
  document.getElementById('sidebar-overlay').classList.add('ativo');
  document.body.style.overflow = 'hidden';
}

function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('aberta');
  document.getElementById('sidebar-overlay').classList.remove('ativo');
  document.body.style.overflow = '';
}

// ============================================================
// CONTEXTO DE PASTA
// ============================================================
function entrarNaPasta(pastaId) {
  const aulas = HistoryManager.obterAulas();
  const pasta = aulas.find(a => a.id === pastaId);
  if (!pasta) return;

  estado.pastaAtivaId = pastaId;
  atualizarUIContexto();
  HistoryManager.renderizarSidebar();
  fecharSidebar();
}

function sairDoPastaContexto() {
  estado.pastaAtivaId = null;
  atualizarUIContexto();
  HistoryManager.renderizarSidebar();
}

function atualizarUIContexto() {
  const aulas = HistoryManager.obterAulas();
  const pasta = estado.pastaAtivaId ? aulas.find(a => a.id === estado.pastaAtivaId) : null;

  // Banner na sidebar
  const sidebarBanner = document.getElementById('sidebar-contexto-banner');
  const sidebarNome = document.getElementById('sidebar-contexto-nome');
  if (pasta) {
    sidebarBanner.classList.add('ativo');
    sidebarNome.textContent = pasta.nome;
  } else {
    sidebarBanner.classList.remove('ativo');
  }

  // Banner na home
  const homeBanner = document.getElementById('home-context-bar');
  const homeNome = document.getElementById('home-ctx-nome');
  const heroSub = document.getElementById('hero-subtitle');
  if (pasta) {
    homeBanner.classList.add('ativo');
    homeNome.textContent = pasta.nome;
    if (heroSub) heroSub.textContent = `Gerando conteúdo para: ${pasta.nome}`;
  } else {
    homeBanner.classList.remove('ativo');
    if (heroSub) heroSub.textContent = 'Escolha o tipo de material e gere em segundos com IA.';
  }
}

// ============================================================
// MODAL: NOVA PASTA
// ============================================================
function abrirModalNovaPasta() {
  fecharSidebar();
  const overlay = document.getElementById('modal-nova-pasta-overlay');
  const input = document.getElementById('input-nome-pasta');
  const sugsEl = document.getElementById('sugestoes-nome-pasta');

  // Sugestões automáticas com data atual
  const hoje = new Date().toLocaleDateString('pt-BR');
  const sugestoes = [
    `Aula ${hoje}`,
    `Revisão`,
    `Prova`,
    `Exercícios extras`,
  ];
  sugsEl.innerHTML = sugestoes.map(s =>
    `<button type="button" onclick="document.getElementById('input-nome-pasta').value='${s}'; document.getElementById('input-nome-pasta').focus();">${s}</button>`
  ).join('');

  input.value = `Aula ${hoje}`;
  overlay.classList.add('ativo');
  setTimeout(() => input.select(), 80);
}

function fecharModalNovaPasta() {
  document.getElementById('modal-nova-pasta-overlay').classList.remove('ativo');
}

function confirmarCriacaoPasta() {
  const nome = document.getElementById('input-nome-pasta').value.trim();
  if (!nome) {
    mostrarToast('Digite um nome para a pasta.', 'aviso');
    document.getElementById('input-nome-pasta').focus();
    return;
  }
  fecharModalNovaPasta();
  const novoId = HistoryManager.criarPasta(nome);
  entrarNaPasta(novoId);
}

// Permite salvar com Enter no modal
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('input-nome-pasta');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirmarCriacaoPasta(); });
});

// ============================================================
// MODAL: RENOMEAR PASTA
// ============================================================
function abrirRenomearPasta(pastaId, e) {
  e.stopPropagation(); // não aciona o click de expansão da pasta
  const aulas = HistoryManager.obterAulas();
  const pasta = aulas.find(a => a.id === pastaId);
  if (!pasta) return;

  const novoNome = window._promptModalInline(pasta.nome);
  // Forma inline: reabre o modal de pasta com valor preenchido
  const overlay = document.getElementById('modal-nova-pasta-overlay');
  const input = document.getElementById('input-nome-pasta');
  input.value = pasta.nome;
  overlay.classList.add('ativo');
  setTimeout(() => input.select(), 80);

  // Troca o botão confirmar temporariamente
  const btn = overlay.querySelector('.modal-footer .btn-primary');
  btn.textContent = 'Renomear';
  btn.onclick = () => {
    const novoNomeVal = input.value.trim();
    if (!novoNomeVal) return;
    HistoryManager.renomearPasta(pastaId, novoNomeVal);
    fecharModalNovaPasta();
    btn.textContent = 'Criar pasta';
    btn.onclick = confirmarCriacaoPasta;
  };
}

// ============================================================
// FORMULÁRIO
// ============================================================
function iniciarNovaConversa() {
  navegarPara('home');
}

function abrirFormulario(tipo) {
  estado.tipoAtual = tipo;

  const formIcon = document.getElementById('form-header-icon');
  const formTitle = document.getElementById('form-header-title');
  const actionTypeInput = document.getElementById('form-tipo-acao');
  const qtdGroup = document.getElementById('grupo-quantidade');
  const nivelGroup = document.getElementById('grupo-nivel');

  actionTypeInput.value = tipo;

  const confs = {
    'exercicios':      { icone: 'ph-list-numbers',        titulo: 'Lista de Exercícios',       qtd: true,  nivel: true },
    'prova':           { icone: 'ph-exam',                 titulo: 'Prova / Avaliação',          qtd: true,  nivel: false },
    'atividade-extra': { icone: 'ph-lightbulb',            titulo: 'Desafio / Atividade Extra',  qtd: false, nivel: false },
    'explicacao':      { icone: 'ph-chalkboard-teacher',   titulo: 'Explicação de Tema',         qtd: false, nivel: false },
  };

  const c = confs[tipo];
  formIcon.innerHTML = `<i class="ph-fill ${c.icone}"></i>`;
  formTitle.textContent = c.titulo;

  qtdGroup.style.display = c.qtd ? '' : 'none';
  if (tipo === 'prova') {
    document.getElementById('label-quantidade').innerHTML = 'Total de Questões <span class="req">*</span>';
  } else {
    document.getElementById('label-quantidade').innerHTML = 'Quantidade <span class="req">*</span>';
  }
  nivelGroup.style.display = c.nivel ? '' : 'none';

  renderizarDestinoForm();
  atualizarSugestoesTemas(document.getElementById('serie').value);
  navegarPara('form');
}

// Renderiza o strip de destino (pasta ativa ou conversa solta)
function renderizarDestinoForm() {
  const container = document.getElementById('form-destino-container');
  if (!container) return;

  if (estado.pastaAtivaId) {
    const aulas = HistoryManager.obterAulas();
    const pasta = aulas.find(a => a.id === estado.pastaAtivaId);
    const nome = pasta ? pasta.nome : '—';
    container.innerHTML = `
      <div class="form-destino-strip">
        <div class="destino-info">
          <i class="ph-fill ph-folder-open"></i>
          <div>
            <div class="destino-label">Salvar na pasta</div>
            <div class="destino-nome">${escaparHtml(nome)}</div>
          </div>
        </div>
        <button type="button" class="btn-trocar-destino" onclick="sairDoPastaContexto(); renderizarDestinoForm();">
          Mudar
        </button>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="form-destino-strip">
        <div class="destino-info">
          <i class="ph ph-chat-circle-text"></i>
          <div>
            <div class="destino-label">Conversa solta</div>
            <div class="destino-nome">Não será salva em pasta</div>
          </div>
        </div>
        <button type="button" class="btn-trocar-destino" onclick="abrirModalNovaPasta()">
          <i class="ph ph-folder-plus"></i> Criar pasta
        </button>
      </div>`;
  }
}

// ============================================================
// EVENTOS DE UI
// ============================================================
function configurarEventosUI() {
  // Série → sugestões
  const serieSel = document.getElementById('serie');
  if (serieSel) serieSel.addEventListener('change', () => atualizarSugestoesTemas(serieSel.value));

  // Nível
  document.querySelectorAll('.nivel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nivel-btn').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      document.getElementById('nivel-valor').value = btn.dataset.nivel;
    });
  });

  // Formulário
  const form = document.getElementById('form-principal');
  if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); await submeterFormulario(); });

  // Click fora dos modals fecha
  document.getElementById('impressao-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('impressao-overlay')) fecharModalImpressao();
  });
  document.getElementById('modal-nova-pasta-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-nova-pasta-overlay')) fecharModalNovaPasta();
  });
}

function atualizarSugestoesTemas(serie) {
  const container = document.getElementById('sugestoes-temas');
  if (!container) return;
  const temas = TEMAS_POR_SERIE[serie] || [];
  container.innerHTML = temas.map(t =>
    `<button type="button" class="tag-sugestao" onclick="document.getElementById('tema').value='${t}'">${t}</button>`
  ).join('');
}

// ============================================================
// SUBMISSÃO / GERAÇÃO
// ============================================================
async function submeterFormulario() {
  const tipo = document.getElementById('form-tipo-acao').value;
  const serie = document.getElementById('serie').value;
  const tema = document.getElementById('tema').value.trim();
  const nivel = document.getElementById('nivel-valor').value;
  const quantidade = parseInt(document.getElementById('quantidade').value) || 10;

  if (!tema) { mostrarToast('Informe o tema ou assunto.', 'aviso'); return; }

  const params = { serie, tema, nivel, quantidade };
  if (tipo === 'prova') params.totalQuestoes = quantidade;
  if (tipo === 'atividade-extra') params.tipo = 'desafio';

  const btnGerar = document.getElementById('btn-gerar');
  const btnSpinner = document.getElementById('btn-gerar-spinner');
  const btnTexto = document.getElementById('btn-gerar-texto');

  btnGerar.disabled = true;
  btnSpinner.style.display = 'block';
  btnTexto.textContent = 'Processando...';

  try {
    let res;
    if (tipo === 'exercicios')      res = await gerarExercicios(params);
    if (tipo === 'prova')           res = await gerarProva(params);
    if (tipo === 'atividade-extra') res = await gerarAtividadeExtra(params);
    if (tipo === 'explicacao')      res = await gerarExplicacao(params);

    estado.dadosAtuais = res.dados;
    estado.tipoAtual = tipo;

    // Salva no histórico (com ou sem pasta de contexto)
    HistoryManager.adicionar({
      tipo,
      tema,
      serie,
      dados: res.dados,
      pastaId: estado.pastaAtivaId || null, // null = conversa solta
    });

    renderizarResultado(res.dados, tipo);
    navegarPara('result');
    mostrarToast(estado.pastaAtivaId ? 'Salvo na pasta com sucesso!' : 'Conteúdo gerado!', 'sucesso');

  } catch (e) {
    mostrarToast(e.message, 'erro');
  } finally {
    btnGerar.disabled = false;
    btnSpinner.style.display = 'none';
    btnTexto.textContent = 'Gerar com IA';
  }
}

function clonnerGeracao() {
  if (!estado.tipoAtual) return;
  abrirFormulario(estado.tipoAtual);
}

// ============================================================
// RENDERIZAÇÃO DE RESULTADO
// ============================================================
function renderizarResultado(dados, tipo, pastaId) {
  const tituloEl = document.getElementById('resultado-titulo');
  const infoEl = document.getElementById('resultado-info');
  const listaEl = document.getElementById('lista-exercicios');
  const panelGabi = document.getElementById('gabarito-panel');
  const listaGabi = document.getElementById('lista-gabarito');
  const pastaBadge = document.getElementById('resultado-pasta-badge');
  const pastaNomeEl = document.getElementById('resultado-pasta-nome');

  panelGabi.classList.remove('ativo', 'hide-on-print', 'force-page-break');

  tituloEl.textContent = dados.titulo || 'Documento de Matemática';

  infoEl.innerHTML = `
    <span class="doc-tag">${dados.serie || ''}</span>
    ${dados.nivel ? `<span class="doc-tag">${dados.nivel}</span>` : ''}
    <span class="doc-tag">${dados.tema || ''}</span>
  `;

  // Badge de pasta no resultado
  const pidAtual = pastaId !== undefined ? pastaId : estado.pastaAtivaId;
  if (pidAtual) {
    const aulas = HistoryManager.obterAulas();
    const pasta = aulas.find(a => a.id === pidAtual);
    if (pasta) {
      pastaBadge.classList.add('visivel');
      pastaNomeEl.textContent = pasta.nome;
    }
  } else {
    pastaBadge.classList.remove('visivel');
  }

  // Conteúdo principal
  if (tipo === 'explicacao') {
    renderizarExplicacaoDOM(dados, listaEl);
    document.getElementById('toolbar-btn-gabarito').style.display = 'none';
    // Renderiza LaTeX na explicação também
    if (window.MathJax) MathJax.typesetPromise([listaEl]).catch(() => {});
  } else {
    document.getElementById('toolbar-btn-gabarito').style.display = '';
    const itens = dados.exercicios || dados.questoes || dados.itens || [];
    listaEl.innerHTML = ''; // limpa primeiro

    itens.forEach((item, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'exercicio-linha';

      // Número
      const numEl = document.createElement('div');
      numEl.className = 'exercicio-num';
      numEl.textContent = `${item.numero || idx + 1}.`;

      // Corpo do exercício
      const textoEl = document.createElement('div');
      textoEl.className = 'exercicio-texto';

      // Figura geométrica SVG (se existir e for válida)
      if (item.figura && item.figura.tipo && window.GeoRenderer) {
        const figWrap = GeoRenderer.criarWrapperFigura(item.figura);
        if (figWrap) textoEl.appendChild(figWrap);
      }

      // Enunciado (texto)
      const enunciadoEl = document.createElement('p');
      enunciadoEl.className = 'exercicio-enunciado';
      enunciadoEl.textContent = item.enunciado || '';
      textoEl.appendChild(enunciadoEl);

      // Badge de tipo
      if (item.tipo) {
        const tipoEl = document.createElement('span');
        tipoEl.className = 'ex-tipo';
        tipoEl.textContent = item.tipo;
        textoEl.appendChild(tipoEl);
      }

      wrapper.appendChild(numEl);
      wrapper.appendChild(textoEl);
      listaEl.appendChild(wrapper);
    });
  }

  // Gabarito — usa DOM puro para nunca corromper LaTeX com HTML-escaping
  const gabarito = dados.gabarito || [];
  listaGabi.innerHTML = '';

  if (gabarito.length > 0) {
    gabarito.forEach((g, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'gab-item';

      const numEl = document.createElement('span');
      numEl.className = 'gab-num';
      numEl.textContent = `${g.numero || idx + 1}.`;

      const respEl = document.createElement('span');
      respEl.className = 'gab-resp';
      // textContent preserva LaTeX intacto — MathJax processa text nodes
      respEl.textContent = g.resposta || '';

      itemEl.appendChild(numEl);
      itemEl.appendChild(respEl);
      listaGabi.appendChild(itemEl);
    });
  } else {
    listaGabi.innerHTML = '<p class="estado-vazio-mini">Sem gabarito disponível.</p>';
  }

  // Renderiza LaTeX em ambos os painéis (enunciados + gabarito)
  if (window.MathJax) {
    MathJax.typesetPromise([listaEl, listaGabi]).catch(err => console.warn('MathJax typesetPromise:', err));
  }
}

// Renderiza a view de explicação no listaEl usando DOM (não innerHTML+escaparHtml)
function renderizarExplicacaoDOM(dados, container) {
  container.innerHTML = ''; // limpa

  // Texto principal
  const textoEl = document.createElement('div');
  textoEl.style.cssText = 'font-size:15px; margin-bottom:20px; line-height:1.7;';
  textoEl.textContent = dados.explicacao || '';
  container.appendChild(textoEl);

  // Exemplos
  if (dados.exemplos && dados.exemplos.length > 0) {
    const h3 = document.createElement('h3');
    h3.style.cssText = 'font-family:var(--font-display); margin: 28px 0 14px; color:var(--brand-900);';
    h3.textContent = 'Exemplos Práticos';
    container.appendChild(h3);

    dados.exemplos.forEach(e => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg-app); padding:14px; border-radius:8px; margin-bottom:10px;';

      const titulo = document.createElement('strong');
      titulo.style.color = 'var(--brand-700)';
      titulo.textContent = e.titulo || '';
      card.appendChild(titulo);
      card.appendChild(document.createElement('br'));

      const desc = document.createElement('span');
      desc.textContent = e.descricao || '';
      card.appendChild(desc);
      container.appendChild(card);
    });
  }

  // Dica do professor
  if (dados.dicasDoProfessor) {
    const dica = document.createElement('div');
    dica.style.cssText = 'border-left: 4px solid var(--brand-500); padding: 14px; background: var(--brand-50); margin-top:20px; border-radius: 0 8px 8px 0;';
    const dicaLabel = document.createElement('strong');
    dicaLabel.textContent = '💡 Dica para o Professor: ';
    dica.appendChild(dicaLabel);
    const dicaTexto = document.createTextNode(dados.dicasDoProfessor);
    dica.appendChild(dicaTexto);
    container.appendChild(dica);
  }
}

function toggleGabarito() {
  document.getElementById('gabarito-panel').classList.toggle('ativo');
}

// ============================================================
// IMPRESSÃO
// ============================================================
function abrirImpressaoAction() {
  if (estado.dadosAtuais) abrirModalImpressao(estado.dadosAtuais, estado.tipoAtual);
}

// ============================================================
// HISTÓRICO v3 — Pastas + Conversas Soltas
// ============================================================
const HistoryManager = {
  KEY: 'promat_v3',

  _dados() {
    try {
      const raw = localStorage.getItem(this.KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.pastas && Array.isArray(parsed.pastas)) return parsed;
    } catch (e) { /* reinicia */ }
    return { pastas: [], conversas_soltas: [] };
  },

  _salvar(dados) {
    localStorage.setItem(this.KEY, JSON.stringify(dados));
    this.renderizarSidebar();
  },

  obterAulas() { return this._dados().pastas; },
  obterConversasSoltas() { return this._dados().conversas_soltas; },

  criarPasta(nome) {
    const dados = this._dados();
    const nova = {
      id: 'pasta_' + Date.now(),
      nome: nome.trim(),
      data: new Date().toISOString(),
      itens: [],
    };
    dados.pastas.unshift(nova);
    this._salvar(dados);
    mostrarToast(`Pasta "${nova.nome}" criada!`, 'sucesso');
    return nova.id;
  },

  renomearPasta(pastaId, novoNome) {
    const dados = this._dados();
    const pasta = dados.pastas.find(p => p.id === pastaId);
    if (pasta) {
      pasta.nome = novoNome.trim();
      this._salvar(dados);
      atualizarUIContexto();
    }
  },

  adicionar(registro) {
    const dados = this._dados();
    const novoItem = {
      id: 'item_' + Date.now(),
      data: new Date().toISOString(),
      tipo: registro.tipo,
      tema: registro.tema,
      serie: registro.serie,
      dados: registro.dados,
      pastaId: registro.pastaId || null,
    };

    if (registro.pastaId) {
      const pasta = dados.pastas.find(p => p.id === registro.pastaId);
      if (pasta) {
        pasta.itens.unshift(novoItem);
      }
    } else {
      dados.conversas_soltas.unshift(novoItem);
      if (dados.conversas_soltas.length > 30) dados.conversas_soltas.pop();
    }

    this._salvar(dados);
  },

  abrirItem(itemId, pastaId) {
    const dados = this._dados();
    let item = null;

    if (pastaId) {
      const pasta = dados.pastas.find(p => p.id === pastaId);
      item = pasta?.itens.find(i => i.id === itemId);
    } else {
      item = dados.conversas_soltas.find(i => i.id === itemId);
    }

    if (!item) return;

    estado.dadosAtuais = item.dados;
    estado.tipoAtual = item.tipo;
    renderizarResultado(item.dados, item.tipo, pastaId);
    navegarPara('result');
  },

  renderizarSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const dados = this._dados();
    const labels = { exercicios: 'Lista', prova: 'Prova', 'atividade-extra': 'Extra', explicacao: 'Explicação' };

    let html = '';

    // ---- Conversas soltas recentes ----
    const soltas = dados.conversas_soltas.slice(0, 8);
    if (soltas.length > 0) {
      html += `<div class="nav-section"><div class="nav-section-title">Recentes</div>`;
      html += soltas.map(i => `
        <div class="historico-item" onclick="HistoryManager.abrirItem('${i.id}', null)">
          <div class="historico-titulo">${escaparHtml(i.tema)}</div>
          <div class="historico-meta">
            <span class="historico-tipo-badge">${labels[i.tipo] || 'Conteúdo'}</span>
            ${new Date(i.data).toLocaleDateString('pt-BR')}
          </div>
        </div>
      `).join('');
      html += `</div>`;
    }

    // ---- Pastas ----
    if (dados.pastas.length > 0) {
      html += `<div class="nav-section"><div class="nav-section-title">Pastas / Aulas</div>`;
      html += dados.pastas.map(pasta => {
        const isAtiva = estado.pastaAtivaId === pasta.id;
        const isAberta = isAtiva; // pastas ativas ficam expandidas por default
        return `
          <div class="pasta-item ${isAtiva ? 'ativa' : ''} ${isAberta ? 'aberta' : ''}" id="pasta-${pasta.id}">
            <div class="pasta-header" onclick="togglePasta('${pasta.id}')">
              <div class="pasta-header-left">
                <i class="ph-fill ph-folder${isAberta ? '-open' : ''}"></i>
                <div>
                  <div class="pasta-nome">${escaparHtml(pasta.nome)}</div>
                  <div class="pasta-count">${pasta.itens.length} item${pasta.itens.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:2px;">
                <button class="btn-renomear-pasta" onclick="abrirRenomearPasta('${pasta.id}', event)" title="Renomear pasta">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <i class="ph ph-caret-right pasta-toggle-icon"></i>
              </div>
            </div>
            <div class="pasta-conteudo">
              <div class="historico-item" style="font-size:12px;color:var(--brand-700);font-weight:600;" onclick="entrarNaPasta('${pasta.id}')">
                <i class="ph ph-plus" style="margin-right:4px;"></i> Criar conteúdo aqui
              </div>
              ${pasta.itens.length === 0
                ? '<div class="estado-vazio-mini">Pasta vazia</div>'
                : pasta.itens.map(i => `
                    <div class="historico-item" onclick="HistoryManager.abrirItem('${i.id}', '${pasta.id}')">
                      <div class="historico-titulo">${escaparHtml(i.tema)}</div>
                      <div class="historico-meta">
                        <span class="historico-tipo-badge">${labels[i.tipo] || 'Conteúdo'}</span>
                        ${new Date(i.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  `).join('')
              }
            </div>
          </div>`;
      }).join('');
      html += '</div>';
    }

    // Estado completamente vazio
    if (soltas.length === 0 && dados.pastas.length === 0) {
      html = `
        <div class="estado-vazio">
          <i class="ph ph-chat-circle-dots"></i>
          <p>Nenhuma conversa ainda.<br>Comece gerando um material!</p>
        </div>`;
    }

    nav.innerHTML = html;
  },
};

// Toggle de pasta (expande/colapsa sem entrar no contexto)
function togglePasta(pastaId) {
  const el = document.getElementById(`pasta-${pastaId}`);
  if (!el) return;
  el.classList.toggle('aberta');
  // Troca ícone da pasta
  const iconePasta = el.querySelector('.pasta-header-left i');
  if (iconePasta) {
    iconePasta.className = el.classList.contains('aberta') ? 'ph-fill ph-folder-open' : 'ph-fill ph-folder';
  }
}

// Expõe globalmente
window.HistoryManager = HistoryManager;
window.novaAula = () => abrirModalNovaPasta();

// ============================================================
// STATUS DO BACKEND
// ============================================================
async function verificarStatusBackend() {
  const dot = document.getElementById('api-dot');
  const span = document.getElementById('api-status-texto');
  try {
    const r = await verificarBackend();
    estado.backendOnline = true;
    dot.className = 'api-dot ok';
    span.innerHTML = `Online · <small>${r.modelo || 'gpt-4o-mini'}</small>`;
  } catch (e) {
    dot.className = 'api-dot err';
    span.textContent = 'Servidor offline';
  }
}

// ============================================================
// UTILITIES
// ============================================================
function mostrarToast(msg, tipo = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const icons = { sucesso: 'ph-check-circle', erro: 'ph-warning-circle', aviso: 'ph-warning', info: 'ph-info' };
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerHTML = `<i class="ph-fill ${icons[tipo] || 'ph-info'}"></i> <span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

function escaparHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
