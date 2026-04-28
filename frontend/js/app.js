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
  pastaAtivaId: null,
  itemAtualDaPastaId: null,
  gabaritoAtual: [],     // gabarito da geração atual para o modal
  temaAtual: '',         // tema para contexto do chat de IA
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

  // Inicializa Infra (Supabase + Auth)
  if (window.SupabaseClient) {
    await window.SupabaseClient.init();
    if (window.Auth) await window.Auth.init();
  }
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

  // Carrega histórico automaticamente ao acessar a view
  if (viewId === 'historico' && window.carregarHistorico) {
    carregarHistorico();
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

  if (window.Auth && window.Auth.estado.plano !== 'premium') {
    mostrarModalUpgrade('Organizar gerações em Pastas ilimitadas é um benefício exclusivo do plano Premium.');
    return;
  }

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
  // Auth ainda não resolveu — o overlay está ativo, mas por segurança ignoramos o clique
  if (window.Auth?.estado?.carregando) return;

  // Bloqueio de funcionalidades Premium para Plano Grátis
  if (tipo !== 'exercicios') {
    if (window.Auth && window.Auth.estado.plano !== 'premium') {
      if (window.mostrarModalUpgrade) {
        mostrarModalUpgrade('As funcionalidades de Prova, Desafio e Explicação de Tema são exclusivas para assinantes do Plano Premium.');
      } else {
        alert('Esta funcionalidade é exclusiva para o Plano Premium.');
      }
      return;
    }
  }

  estado.tipoAtual = tipo;

  const formIcon = document.getElementById('form-header-icon');
  const formTitle = document.getElementById('form-header-title');
  const actionTypeInput = document.getElementById('form-tipo-acao');
  const qtdGroup = document.getElementById('grupo-quantidade');
  const nivelGroup = document.getElementById('grupo-nivel');

  actionTypeInput.value = tipo;

  const confs = {
    'exercicios': { icone: 'ph-list-numbers', titulo: 'Lista de Exercícios', qtd: true, nivel: true },
    'prova': { icone: 'ph-exam', titulo: 'Prova / Avaliação', qtd: true, nivel: true },
    'atividade-extra': { icone: 'ph-lightbulb', titulo: 'Desafio / Atividade Extra', qtd: false, nivel: true },
    'explicacao': { icone: 'ph-chalkboard-teacher', titulo: 'Explicação de Tema', qtd: false, nivel: false },
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

  const tipoQuestoesGroup = document.getElementById('grupo-tipo-questoes');
  if (tipoQuestoesGroup) {
    tipoQuestoesGroup.style.display = tipo === 'prova' ? '' : 'none';
  }

  renderizarDestinoForm();
  atualizarSugestoesTemas(document.getElementById('serie').value);
  navegarPara('form');
}

// Renderiza o strip de destino (pasta ativa ou conversa solta)
function renderizarDestinoForm() {
  const container = document.getElementById('form-destino-container');
  if (!container) return;

  const usuario = window.Auth?.estado?.usuario;

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
    // Se for guest, não mostra opção de criar pasta para evitar confusão de persistência local
    container.innerHTML = `
      <div class="form-destino-strip">
        <div class="destino-info">
          <i class="ph ph-chat-circle-text"></i>
          <div>
            <div class="destino-label">Conversa solta</div>
            <div class="destino-nome">Não será salva em pasta</div>
          </div>
        </div>
        ${usuario ? `
        <button type="button" class="btn-trocar-destino" onclick="abrirModalNovaPasta()">
          <i class="ph ph-folder-plus"></i> Criar pasta
        </button>
        ` : ''}
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
  document.getElementById('gabarito-modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('gabarito-modal-overlay')) fecharModalGabarito();
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

  // ── VERIFICAÇÃO GUEST MODE ──────────────────────────────────
  if (window.GuestMode) {
    const check = window.GuestMode.verificarLimite();
    if (!check.podeGerar) {
      window.GuestMode.mostrarBloqueio();
      return; // bloqueia antes de qualquer chamada
    }
  }
  // ────────────────────────────────────────────────────────────

  const params = { serie, tema, nivel, quantidade };
  if (tipo === 'prova') {
    params.totalQuestoes = quantidade;
    params.tipoQuestoes = document.getElementById('tipo-questoes').value;
  }
  if (tipo === 'atividade-extra') params.tipo = 'desafio';

  const btnGerar = document.getElementById('btn-gerar');
  const btnSpinner = document.getElementById('btn-gerar-spinner');
  const btnTexto = document.getElementById('btn-gerar-texto');

  btnGerar.disabled = true;
  btnSpinner.style.display = 'block';
  btnTexto.textContent = 'Processando...';

  try {
    let res;
    if (tipo === 'exercicios') res = await gerarExercicios(params);
    if (tipo === 'prova') res = await gerarProva(params);
    if (tipo === 'atividade-extra') res = await gerarAtividadeExtra(params);
    if (tipo === 'explicacao') res = await gerarExplicacao(params);

    estado.dadosAtuais = res.dados;
    estado.tipoAtual = tipo;

    // EVENTO PIXEL: Prova/Conteúdo Gerado
    window.fbPixel?.provaGerada({ tipo, serie, tema, nivel });

    // ── REGISTRAR GERAÇÃO GUEST ─────────────────────────────
    if (window.GuestMode) window.GuestMode.registrarGeracao();
    // ────────────────────────────────────────────────────────

    // Salva no histórico local APENAS se houver pasta ativa (pastas ainda são locais).
    // Se for conversa solta (sem pasta), a persistência agora é só no backend via API,
    // garantindo que não vaze histórico falso para Guests e que o Authenticated use a nuvem.
    if (estado.pastaAtivaId) {
      HistoryManager.adicionar({
        tipo,
        tema,
        serie,
        dados: res.dados,
        pastaId: estado.pastaAtivaId,
      });
    } else {
      // Se estiver logado, pede para a sidebar recarregar da nuvem para exibir o novo item
      if (window.Auth?.estado?.usuario) {
        HistoryManager.renderizarSidebar();
      }
    }

    renderizarResultado(res.dados, tipo);
    navegarPara('result');
    mostrarToast(estado.pastaAtivaId ? 'Salvo na pasta com sucesso!' : 'Conteúdo gerado!', 'sucesso');

    // ── BANNER PÓS-GERAÇÃO PARA VISITANTE ───────────────────
    setTimeout(() => {
      if (window.GuestMode) window.GuestMode.mostrarBannerSalvar();
    }, 600); // aguarda a view renderizar
    // ────────────────────────────────────────────────────────

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
    if (window.MathJax) MathJax.typesetPromise([listaEl]).catch(() => { });
  } else if (tipo === 'atividade-extra' && dados.etapas) {
    renderizarDesafioDOM(dados, listaEl);
    document.getElementById('toolbar-btn-gabarito').style.display = dados.gabarito?.length ? '' : 'none';
    if (window.MathJax) MathJax.typesetPromise([listaEl]).catch(() => { });
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

      let textoEnunciado = item.enunciado || '';
      // Garante quebra de linha antes de itens romanos (I, II, III...) mesmo se colados em dois-pontos ou pontos
      textoEnunciado = textoEnunciado.replace(/([:.\s])\s*([IVX]+\.)/g, '$1\n$2');

      enunciadoEl.innerHTML = MathRenderer.prepararTexto(textoEnunciado).replace(/\n/g, '<br>');
      textoEl.appendChild(enunciadoEl);

      // Opções (se for múltipla escolha)
      if (item.opcoes && Array.isArray(item.opcoes) && item.opcoes.length > 0) {
        const opcoesContainer = document.createElement('div');
        opcoesContainer.className = 'exercicio-opcoes';

        const letras = ['a', 'b', 'c', 'd', 'e', 'f'];
        item.opcoes.forEach((opt, oIdx) => {
          const optEl = document.createElement('div');
          optEl.className = 'opcao-item';

          const letraEl = document.createElement('span');
          letraEl.className = 'opcao-letra';
          letraEl.textContent = `${letras[oIdx]})`;

          const labelEl = document.createElement('span');
          labelEl.className = 'opcao-texto';
          labelEl.textContent = MathRenderer.prepararTexto(opt);

          optEl.appendChild(letraEl);
          optEl.appendChild(labelEl);
          opcoesContainer.appendChild(optEl);
        });
        textoEl.appendChild(opcoesContainer);
      }

      // Badge de tipo
      if (item.tipo) {
        const tipoEl = document.createElement('span');
        tipoEl.className = 'ex-tipo';
        tipoEl.textContent = item.tipo.replace('_', ' ');
        textoEl.appendChild(tipoEl);
      }

      wrapper.appendChild(numEl);
      wrapper.appendChild(textoEl);
      listaEl.appendChild(wrapper);
    });
  }

  // Gabarito — salva globalmente para o modal
  estado.gabaritoAtual = dados.gabarito || [];
  estado.temaAtual = dados.tema || '';

  // Renderiza gabarito lateral simples (respostas rápidas)
  listaGabi.innerHTML = '';
  if (estado.gabaritoAtual.length > 0) {
    estado.gabaritoAtual.forEach((g, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'gab-item';
      itemEl.style.cursor = 'pointer';
      itemEl.title = 'Clique para ver a resolução completa';
      itemEl.onclick = () => abrirModalGabarito();

      const numEl = document.createElement('span');
      numEl.className = 'gab-num';
      numEl.textContent = `${g.numero || idx + 1}.`;

      const respEl = document.createElement('span');
      respEl.className = 'gab-resp';
      respEl.textContent = g.alternativa_correta
        ? `Alt. ${g.alternativa_correta} — ${MathRenderer.prepararTexto(g.resposta || '')}`
        : MathRenderer.prepararTexto(g.resposta || '');

      itemEl.appendChild(numEl);
      itemEl.appendChild(respEl);
      listaGabi.appendChild(itemEl);
    });

    const btnCompleto = document.createElement('button');
    btnCompleto.className = 'btn btn-primary';
    btnCompleto.style.cssText = 'width:100%; margin-top:12px; font-size:13px;';
    btnCompleto.innerHTML = '<i class="ph ph-books"></i> Ver resolução completa';
    btnCompleto.onclick = abrirModalGabarito;
    listaGabi.appendChild(btnCompleto);
  } else {
    listaGabi.innerHTML = '<p class="estado-vazio-mini">Sem gabarito disponível.</p>';
  }

  // Renderiza LaTeX
  if (window.MathJax) {
    MathJax.typesetPromise([listaEl, listaGabi]).catch(err => console.warn('MathJax:', err));
  }
}

// Renderiza a view de explicação no listaEl usando DOM (não innerHTML+escaparHtml)
function renderizarExplicacaoDOM(dados, container) {
  container.innerHTML = ''; // limpa

  // Título da explicação
  const h2 = document.createElement('h2');
  h2.style.cssText = 'font-family:var(--font-display); font-size:22px; color:var(--brand-900); margin-bottom:16px;';
  h2.textContent = dados.tema || 'Explicação do Tema';
  container.appendChild(h2);

  // Figura geométrica SVG (se existir e for válida para a explicação)
  if (dados.figura && dados.figura.tipo && window.GeoRenderer) {
    const figWrap = GeoRenderer.criarWrapperFigura(dados.figura);
    if (figWrap) {
      figWrap.style.margin = '0 auto 24px';
      container.appendChild(figWrap);
    }
  }

  // Texto principal
  const textoEl = document.createElement('div');
  textoEl.style.cssText = 'font-size:16px; margin-bottom:28px; line-height:1.8; color:var(--text-main);';
  // Suporte a quebras de linha no texto da explicação
  textoEl.innerHTML = MathRenderer.prepararTexto(dados.explicacao || '').replace(/\n/g, '<br>');
  container.appendChild(textoEl);

  // Exemplos
  if (dados.exemplos && dados.exemplos.length > 0) {
    const h3 = document.createElement('h3');
    h3.style.cssText = 'font-family:var(--font-display); margin: 32px 0 16px; color:var(--brand-900); font-size:18px;';
    h3.textContent = 'Exemplos Práticos';
    container.appendChild(h3);

    dados.exemplos.forEach(e => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg-app); padding:18px; border-radius:12px; margin-bottom:14px; border:1px solid var(--border-color);';

      const titulo = document.createElement('strong');
      titulo.style.cssText = 'color:var(--brand-700); font-size:15px; display:block; margin-bottom:6px;';
      titulo.textContent = e.titulo || '';
      card.appendChild(titulo);

      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:14px; line-height:1.6; color:var(--text-main);';
      desc.innerHTML = MathRenderer.prepararTexto(e.descricao || '').replace(/\n/g, '<br>');
      card.appendChild(desc);
      container.appendChild(card);
    });
  }

  // Dica do professor
  if (dados.dicasDoProfessor) {
    const dica = document.createElement('div');
    dica.style.cssText = 'border-left: 4px solid var(--brand-500); padding: 18px; background: var(--brand-50); margin-top:32px; border-radius: 0 12px 12px 0; font-size:14px;';
    const dicaLabel = document.createElement('strong');
    dicaLabel.style.color = 'var(--brand-900)';
    dicaLabel.textContent = '💡 Dica para o Professor: ';
    dica.appendChild(dicaLabel);
    const dicaTexto = document.createElement('span');
    dicaTexto.textContent = dados.dicasDoProfessor;
    dica.appendChild(dicaTexto);
    container.appendChild(dica);
  }

  // Links de Saiba Mais / Referências
  if (dados.referencias && Array.isArray(dados.referencias) && dados.referencias.length > 0) {
    const linkContainer = document.createElement('div');
    linkContainer.style.cssText = 'margin-top:40px; padding-top:24px; border-top:1px solid var(--border-color);';

    const h4 = document.createElement('h4');
    h4.style.cssText = 'font-family:var(--font-display); font-size:16px; color:var(--text-main); margin-bottom:16px;';
    h4.textContent = '📚 Referências para aprofundamento (Sites Brasileiros):';
    linkContainer.appendChild(h4);

    const refGrid = document.createElement('div');
    refGrid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;';

    dados.referencias.forEach(ref => {
      const refCard = document.createElement('a');
      refCard.href = ref.url;
      refCard.target = '_blank';
      refCard.style.cssText = 'text-decoration:none; display:block; padding:12px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:8px; transition:var(--trans);';

      // Hover effect emulado via JS inline ou classes existentes
      refCard.onmouseover = () => { refCard.style.borderColor = 'var(--brand-400)'; refCard.style.background = 'white'; };
      refCard.onmouseout = () => { refCard.style.borderColor = 'var(--border-color)'; refCard.style.background = 'var(--bg-app)'; };

      const refNome = document.createElement('strong');
      refNome.style.cssText = 'display:block; font-size:13px; color:var(--brand-700); margin-bottom:4px;';
      refNome.textContent = ref.nome;

      const refDesc = document.createElement('p');
      refDesc.style.cssText = 'font-size:12px; color:var(--text-muted); line-height:1.4; margin:0;';
      refDesc.textContent = ref.descricao;

      refCard.appendChild(refNome);
      refCard.appendChild(refDesc);
      refGrid.appendChild(refCard);
    });

    linkContainer.appendChild(refGrid);
    container.appendChild(linkContainer);
  }
}

// ============================================================
// RENDERIZAÇÃO DE DESAFIO (Atividade Extra)
// ============================================================
function renderizarDesafioDOM(dados, container) {
  container.innerHTML = '';

  // Banner de contexto / missão
  const banner = document.createElement('div');
  banner.style.cssText = `
    background: linear-gradient(135deg, var(--brand-700) 0%, var(--brand-500) 100%);
    color: white; border-radius: 16px; padding: 28px 32px; margin-bottom: 32px;
    position: relative; overflow: hidden;
  `;

  // Emoji decorativo de fundo
  const bgEmoji = document.createElement('div');
  bgEmoji.style.cssText = 'position:absolute; right:20px; top:10px; font-size:80px; opacity:0.15; line-height:1;';
  bgEmoji.textContent = '🔥';
  banner.appendChild(bgEmoji);

  // Badge de nível
  if (dados.nivel) {
    const levelBadge = document.createElement('span');
    levelBadge.style.cssText = 'background:rgba(255,255,255,0.2); color:white; font-size:11px; font-weight:700; padding:4px 10px; border-radius:100px; letter-spacing:0.05em; display:inline-block; margin-bottom:12px;';
    levelBadge.textContent = `⚡ Nível ${dados.nivel}`;
    banner.appendChild(levelBadge);
  }

  const titleEl = document.createElement('h2');
  titleEl.style.cssText = 'color:white; font-family:var(--font-display); font-size:24px; font-weight:800; margin:0 0 12px; line-height:1.2;';
  titleEl.textContent = dados.titulo || '🔥 Desafio Matemático';
  banner.appendChild(titleEl);

  if (dados.contexto) {
    const ctxEl = document.createElement('p');
    ctxEl.style.cssText = 'color:rgba(255,255,255,0.9); font-size:15px; line-height:1.6; margin:0;';
    ctxEl.innerHTML = MathRenderer.prepararTexto(dados.contexto).replace(/\n/g, '<br>');
    banner.appendChild(ctxEl);
  }

  container.appendChild(banner);

  // Figura SVG (se existir)
  if (dados.figura && dados.figura.tipo && window.GeoRenderer) {
    const figWrap = GeoRenderer.criarWrapperFigura(dados.figura);
    if (figWrap) {
      figWrap.style.cssText = 'margin: 0 auto 28px; display:block; max-width: 320px;';
      container.appendChild(figWrap);
    }
  }

  // Etapas do desafio
  const etapas = dados.etapas || [];
  const etapaColors = [
    { bg: '#f0fdf4', border: '#22c55e', badge: '#16a34a' },
    { bg: '#fff7ed', border: '#f97316', badge: '#c2410c' },
    { bg: '#faf5ff', border: '#a855f7', badge: '#7e22ce' },
  ];

  etapas.forEach((etapa, idx) => {
    const col = etapaColors[idx] || etapaColors[0];
    const card = document.createElement('div');
    card.style.cssText = `
      background:${col.bg}; border:1.5px solid ${col.border}; border-radius:14px;
      padding:22px 26px; margin-bottom:20px;
    `;

    const cardHeader = document.createElement('div');
    cardHeader.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:14px;';

    const stepBadge = document.createElement('span');
    stepBadge.style.cssText = `background:${col.badge}; color:white; font-size:11px; font-weight:700; padding:4px 12px; border-radius:100px;`;
    stepBadge.textContent = etapa.titulo || `Etapa ${etapa.numero}`;
    cardHeader.appendChild(stepBadge);
    card.appendChild(cardHeader);

    const enunciadoEl = document.createElement('div');
    enunciadoEl.style.cssText = 'font-size:15px; color:#1e293b; line-height:1.7;';

    let textoEnunciado = etapa.enunciado || '';
    textoEnunciado = textoEnunciado.replace(/([:.\s])\s*([IVX]+\.)/g, '$1\n$2');
    enunciadoEl.innerHTML = MathRenderer.prepararTexto(textoEnunciado).replace(/\n/g, '<br>');
    card.appendChild(enunciadoEl);

    container.appendChild(card);
  });
}

function toggleGabarito() {
  document.getElementById('gabarito-panel').classList.toggle('ativo');
}

// ============================================================
// MODAL DE GABARITO COMPLETO
// ============================================================
function abrirModalGabarito() {
  if (window.Auth && window.Auth.estado.plano !== 'premium') {
    mostrarModalUpgrade('O acesso à resolução passo a passo de todas as questões é uma funcionalidade exclusiva do Premium.');
    return;
  }

  const overlay = document.getElementById('gabarito-modal-overlay');
  const lista = document.getElementById('gabarito-modal-lista');
  const gabarito = estado.gabaritoAtual || [];

  lista.innerHTML = '';

  if (gabarito.length === 0) {
    lista.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Gabarito não disponível.</p>';
  } else {
    gabarito.forEach((g, idx) => {
      const card = document.createElement('div');
      card.className = 'gab-card';

      const header = document.createElement('div');
      header.className = 'gab-card-header';

      const numBadge = document.createElement('span');
      numBadge.className = 'gab-card-num';
      // Usa titulo se for desafio, caso contrário usa "Questão N"
      numBadge.textContent = g.titulo || `Questão ${g.numero || idx + 1}`;
      header.appendChild(numBadge);

      if (g.alternativa_correta) {
        const altBadge = document.createElement('span');
        altBadge.className = 'gab-alt-badge';
        altBadge.textContent = `Alternativa: ${g.alternativa_correta}`;
        header.appendChild(altBadge);
      }
      card.appendChild(header);

      if (g.resposta) {
        const resp = document.createElement('p');
        resp.className = 'gab-card-resp';
        resp.innerHTML = MathRenderer.prepararTexto(g.resposta).replace(/\n/g, '<br>');
        card.appendChild(resp);
      }

      if (g.resolucao) {
        const resolTitle = document.createElement('strong');
        resolTitle.className = 'gab-resol-title';
        resolTitle.textContent = '📝 Resolução passo a passo:';
        card.appendChild(resolTitle);

        const resolEl = document.createElement('div');
        resolEl.className = 'gab-card-resolucao';

        let textoFinal = g.resolucao || '';
        // Garante quebras antes de "Passo N:" caso a IA esqueça
        if (!textoFinal.includes('\n')) {
          textoFinal = textoFinal.replace(/(Passo\s+\d+[:\s])/g, '\n$1').trim();
        }
        // Usa innerHTML com <br> para respeitar as quebras de linha
        resolEl.innerHTML = MathRenderer.prepararTexto(textoFinal).replace(/\n/g, '<br>');
        card.appendChild(resolEl);
      }

      lista.appendChild(card);
    });
  }

  overlay.classList.add('ativo');

  if (window.MathJax) MathJax.typesetPromise([lista]).catch(() => { });
}

function fecharModalGabarito() {
  document.getElementById('gabarito-modal-overlay').classList.remove('ativo');
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
      if (parsed && parsed.pastas && Array.isArray(parsed.pastas)) {
        // Limpeza imediata se houver mais de 20 conversas soltas (chats antigos)
        if (parsed.conversas_soltas && parsed.conversas_soltas.length > 20) {
          parsed.conversas_soltas = parsed.conversas_soltas.slice(0, 20);
          localStorage.setItem(this.KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
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
      // Mantém no máximo 20 conversas soltas — as mais antigas são removidas automaticamente
      if (dados.conversas_soltas.length > 20) dados.conversas_soltas = dados.conversas_soltas.slice(0, 20);
    }

    this._salvar(dados);
  },

  abrirItem(itemId, pastaId, isCloud = false) {
    let item = null;

    if (isCloud) {
      // Se for item da nuvem e a função global de abrir histórico existir, usa ela
      // pois ela já faz o fetch dos dados completos (generated_content) que não vêm na listagem leve.
      if (window.abrirItemHistorico) {
        window.abrirItemHistorico(itemId);
        return;
      }
      item = (this._cacheCloud || []).find(i => i.id === itemId);
    } else if (pastaId) {
      // Pastas continuam locais
      const dados = this._dados();
      const pasta = dados.pastas.find(p => p.id === pastaId);
      item = pasta?.itens.find(i => i.id === itemId);
    }

    if (!item || !item.dados) return;

    estado.dadosAtuais = item.dados;
    estado.tipoAtual = item.tipo;
    renderizarResultado(item.dados, item.tipo, pastaId);
    navegarPara('result');
  },

  excluirConversa(itemId, pastaId) {
    const dados = this._dados();
    if (pastaId) {
      const pasta = dados.pastas.find(p => p.id === pastaId);
      if (pasta) pasta.itens = pasta.itens.filter(i => i.id !== itemId);
    } else {
      dados.conversas_soltas = dados.conversas_soltas.filter(i => i.id !== itemId);
    }
    this._salvar(dados);
    mostrarToast('Conversa excluída.', 'info');
  },

  async renderizarSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const labels = { exercicios: 'Lista', prova: 'Prova', 'atividade-extra': 'Extra', explicacao: 'Explicação' };
    const usuario = window.Auth?.estado?.usuario;

    // Se for GUEST (não logado), mostra apenas um aviso e bloqueia visualização local.
    if (!usuario) {
      nav.innerHTML = `
        <div class="estado-vazio" style="padding:20px; text-align:center;">
          <i class="ph ph-lock-key" style="font-size:32px; color:var(--text-muted); margin-bottom:12px; display:block;"></i>
          <p style="color:var(--text-main); font-weight:600; font-size:14px; margin-bottom:8px;">Histórico Bloqueado</p>
          <p style="font-size:13px; color:var(--text-muted); line-height:1.5; margin-bottom:16px;">
            Visitantes podem gerar 1 conteúdo gratuito. Crie uma conta para liberar o histórico ilimitado.
          </p>
          <button class="btn btn-primary" style="width:100%; padding:8px;" onclick="if(window.abrirCadastroGuest) abrirCadastroGuest()">
            Criar conta grátis
          </button>
        </div>`;
      return;
    }

    // Se for AUTHENTICATED (logado), busca da nuvem as conversas soltas
    const dadosLocais = this._dados();
    let soltas = [];
    let isCloud = false;

    try {
      const cloudData = await obterHistoricoCloud();
      soltas = cloudData.map(c => ({
        id: c.id,
        tema: c.title,
        tipo: c.type,
        data: c.created_at,
        dados: c.generated_content,
        isCloud: true
      }));
      this._cacheCloud = soltas;
      isCloud = true;
    } catch (e) {
      // Se falhar a nuvem, mantemos vazio (sem misturar com local antigo)
      console.warn('Erro ao buscar histórico da nuvem:', e.message);
    }

    let html = '';

    // ---- 1. Pastas (Sempre Locais nesta etapa - visíveis apenas para auth) ----
    if (dadosLocais.pastas.length > 0) {
      html += `<div class="nav-section"><div class="nav-section-title">Minhas Pastas (Local)</div>`;
      html += dadosLocais.pastas.map(pasta => {
        const isAtiva = estado.pastaAtivaId === pasta.id;
        const isAberta = isAtiva;
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
                      <div class="historico-item-conteudo">
                        <div class="historico-titulo">${escaparHtml(i.tema)}</div>
                        <div class="historico-meta">
                          <span class="historico-tipo-badge">${labels[i.tipo] || 'Conteúdo'}</span>
                          ${new Date(i.data).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <button class="btn-excluir-conversa" title="Excluir" onclick="event.stopPropagation(); HistoryManager.excluirConversa('${i.id}', '${pasta.id}')">
                        <i class="ph ph-trash"></i>
                      </button>
                    </div>
                  `).join('')
          }
            </div>
          </div>`;
      }).join('');
      html += '</div>';
    }

    // ---- 2. Conversas soltas (Nuvem apenas) ----
    if (soltas.length > 0) {
      html += `<div class="nav-section"><div class="nav-section-title">Recentes</div>`;
      html += soltas.map(i => `
        <div class="historico-item historico-item-deletavel" onclick="HistoryManager.abrirItem('${i.id}', null, true)">
          <div class="historico-item-conteudo">
            <div class="historico-titulo">${escaparHtml(i.tema)}</div>
            <div class="historico-meta">
              <span class="historico-tipo-badge">${labels[i.tipo] || 'Conteúdo'}</span>
              ${new Date(i.data).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <!-- O botão de excluir conversa solta na nuvem precisa de lógica via API se quisermos implementar aqui, ou fica só visual por enquanto.
               O delete da nuvem já está na tela viewHistorico. Aqui na sidebar é só atalho de leitura. -->
        </div>
      `).join('');
      html += `</div>`;
    }

    // Estado completamente vazio
    if (soltas.length === 0 && dadosLocais.pastas.length === 0) {
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
    span.textContent = 'Online';
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

const MathRenderer = {
  prepararTexto: (texto) => {
    if (!texto) return '';
    let limpo = String(texto);

    // 1. Reduzir escapes duplos gerados pela IA (\\\\ -> \\)
    limpo = limpo.replace(/\\\\/g, '\\');

    // 2. Fallback: Converter blocos antigos $$ ... $$ para \\[ ... \\]
    limpo = limpo.replace(/\$\$(.*?)\$\$/gs, '\\[$1\\]');

    // 3. Fallback: Converter inline antigo $ ... $ para \\( ... \\)
    // Previne match com dinheiro (R$) garantindo espaço ou início da linha
    limpo = limpo.replace(/(^|\s)\$([^$\n]+?)\$(?=\s|[.,!?]|$)/g, '$1\\($2\\)');

    return limpo;
  }
};

// ============================================================
// MODAL UPGRADE PREMIUM
// ============================================================
window.mostrarModalUpgrade = function (mensagem) {
  const overlay = document.getElementById('modal-upgrade-overlay');
  const msgEl = document.getElementById('upgrade-mensagem');
  if (overlay && msgEl) {
    msgEl.textContent = mensagem || 'Você atingiu seu limite gratuito. Desbloqueie gerações ilimitadas e ferramentas profissionais.';
    overlay.classList.add('ativo');

    // EVENTO PIXEL: Visualizou planos/upgrade
    window.fbPixel?.viewContent('Upgrade', 97);
  }
};

window.iniciarCheckoutPremium = function (plano) {
  const email = window.Auth?.estado?.usuario?.email || '';
  const queryParam = email ? `?email=${encodeURIComponent(email)}` : '';

  let checkoutUrl = '';
  if (plano === 'anual') checkoutUrl = 'https://pay.cakto.com.br/x2uug56_859311' + queryParam;
  else if (plano === 'mensal') checkoutUrl = 'https://pay.cakto.com.br/zscdfkk' + queryParam;
  else checkoutUrl = 'https://pay.cakto.com.br/x2uug56_859311' + queryParam;

  // Fecha modal de upgrade atual
  document.getElementById('modal-upgrade-overlay').classList.remove('ativo');

  // EVENTO PIXEL: Clicou em assinar/upgrade
  window.fbPixel?.upgradeClicado(window.Auth?.estado?.plano || 'guest');

  // Redireciona o usuário (em nova aba)
  window.open(checkoutUrl, '_blank');

  // Ativa a flag e começa o polling imediatamente
  localStorage.setItem('promat_checkout_pending', 'true');
  window.iniciarPollingPremium();
};

/* =========================================
   SISTEMA DE POLLING PÓS-PAGAMENTO
========================================= */
let pollingInterval = null;
let pollingTimeout = null;

window.iniciarPollingPremium = function () {
  const banner = document.getElementById('checkout-pending-banner');
  if (!banner) return;

  // Reseta estado visual (mostra o banner)
  banner.classList.add('ativo');

  // Limpa intervalos antigos para evitar concorrência
  if (pollingInterval) clearInterval(pollingInterval);
  if (pollingTimeout) clearTimeout(pollingTimeout);

  const tempoLimite = 120000; // 120 segundos (2 minutos)
  const intervaloCheck = 3000; // 3 segundos

  // Loop de checagem
  pollingInterval = setInterval(async () => {
    const usuario = window.Auth?.estado?.usuario;
    if (!usuario) {
      clearInterval(pollingInterval);
      return;
    }

    // Força o auth.js a buscar o perfil atualizado do Supabase
    await window.carregarPerfil(usuario.id);

    if (window.AuthState?.plano === 'premium') {
      // SUCESSO!
      clearInterval(pollingInterval);
      clearTimeout(pollingTimeout);
      localStorage.removeItem('promat_checkout_pending');

      fecharPolling();
      mostrarToast('🎉 Seu plano Premium foi ativado com sucesso!', 'sucesso');

      // Atualiza a interface
      if (typeof atualizarUIAuth === 'function') {
        atualizarUIAuth();
      }
    }
  }, intervaloCheck);

  // Timeout caso demore mais de 120 segundos (para silenciosamente)
  pollingTimeout = setTimeout(() => {
    clearInterval(pollingInterval);
    // Não fecha o banner automaticamente se demorar, mas permite que o usuário feche.
    // O texto poderia mudar, mas manter o banner visível com botão de forçar verificação é melhor UX.
  }, tempoLimite);
};

window.forcarVerificacaoPagamento = async function () {
  const btn = document.getElementById('btn-verificar-pagamento');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Verificando...';
  }

  const usuario = window.Auth?.estado?.usuario;
  if (usuario) {
    await window.carregarPerfil(usuario.id);
    if (window.AuthState?.plano === 'premium') {
      localStorage.removeItem('promat_checkout_pending');
      fecharPolling();
      mostrarToast('🎉 Pagamento localizado! Plano Premium ativado!', 'sucesso');
      if (typeof atualizarUIAuth === 'function') atualizarUIAuth();
      return;
    }
  }

  // Se ainda não ativou, avisa via toast em vez de travar a tela
  mostrarToast('O pagamento ainda não foi confirmado. Tente novamente em instantes.', 'aviso');

  // Restaura o botão
  if (btn) {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Verificar agora';
    }, 1500);
  }
};

window.fecharPolling = function () {
  const banner = document.getElementById('checkout-pending-banner');
  if (banner) banner.classList.remove('ativo');

  // Paramos o polling em background quando o usuário fecha o aviso? 
  // Na verdade, é melhor manter em background se possível, mas como a UX pede pra fechar o aviso, 
  // limpar o flag do localStorage impede que ele volte no F5, o que é bom se o user desistiu.
  if (pollingInterval) clearInterval(pollingInterval);
  if (pollingTimeout) clearTimeout(pollingTimeout);

  // Opcional: remover o flag se o usuário explicitamente fechar o banner
  // Se for removido, ele não fará polling automático no próximo login/F5, 
  // o que é OK se ele sabe que pagou e vai checar depois.
  localStorage.removeItem('promat_checkout_pending');
};

/* =========================================
   CELEBRAÇÃO DE ATIVAÇÃO PREMIUM
========================================= */
window.mostrarCelebracaoPremium = function () {
  const overlay = document.getElementById('premium-celebration-overlay');
  if (overlay) {
    overlay.classList.add('ativo');

    // Efeito de confete opcional via CSS já é ativado pela classe .ativo

    // Atualiza a badge imediatamente para reforçar a mudança
    if (typeof atualizarUIAuth === 'function') {
      atualizarUIAuth();
    }
  }
};

window.fecharCelebracaoPremium = function () {
  const overlay = document.getElementById('premium-celebration-overlay');
  if (overlay) {
    overlay.classList.remove('ativo');
  }
};
