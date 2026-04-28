/**
 * ProMat — printer.js v3
 * Módulo de impressão via @media print nativo (sem popup)
 */

/**
 * Gera preview HTML para mostrar no modal (informativo)
 */
function gerarHtmlImpressao(dados, incluirGabarito = false) {
  const nome = dados.titulo || 'Documento de Matemática';
  return `
    <div style="text-align:center; padding: 16px;">
      <i class="ph-fill ph-file-text" style="font-size:40px; color:var(--brand-500); display:block; margin-bottom:10px;"></i>
      <p style="font-weight:700; font-size:14px; color:var(--text-main);">${escaparHtml(nome)}</p>
      <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">
        ${incluirGabarito
          ? '✅ Gabarito será incluído na última página.'
          : 'ℹ️ Gabarito não será impresso.'}
      </p>
      <p style="font-size:11px; color:var(--text-light); margin-top:8px;">O documento é impresso exatamente como aparece na tela.</p>
    </div>`;
}

/**
 * Abre o modal de configuração de impressão
 */
function abrirModalImpressao(dados, tipo) {
  if (window.Auth && window.Auth.estado.plano !== 'premium') {
    if (window.mostrarModalUpgrade) {
      window.mostrarModalUpgrade('A exportação para PDF profissional com gabarito é exclusiva para assinantes Premium.');
    } else {
      alert('Recurso exclusivo Premium');
    }
    return;
  }

  const overlay = document.getElementById('impressao-overlay');
  const preview = document.getElementById('impressao-preview-content');
  const checkGabarito = document.getElementById('incluir-gabarito-check');

  if (!overlay || !preview) return;

  function atualizarPreview() {
    const incluir = checkGabarito ? checkGabarito.checked : false;
    preview.innerHTML = gerarHtmlImpressao(dados, incluir);
  }

  atualizarPreview();
  if (checkGabarito) checkGabarito.onchange = atualizarPreview;

  overlay.classList.add('ativo');

  document.getElementById('btn-imprimir-agora').onclick = () => {
    const incluir = checkGabarito ? checkGabarito.checked : false;
    executarImpressao(incluir);
  };
}

/**
 * Fecha o modal de impressão
 */
function fecharModalImpressao() {
  const overlay = document.getElementById('impressao-overlay');
  if (overlay) overlay.classList.remove('ativo');
}

/**
 * Executa a impressão via @media print nativo
 */
function executarImpressao(incluirGabarito) {
  const panelGabi = document.getElementById('gabarito-panel');
  if (panelGabi) {
    if (incluirGabarito) {
      panelGabi.classList.remove('hide-on-print');
      panelGabi.classList.add('force-page-break');
      panelGabi.classList.add('ativo'); // garante visibil
    } else {
      panelGabi.classList.add('hide-on-print');
      panelGabi.classList.remove('force-page-break');
    }
  }

  // EVENTO PIXEL: PDF Baixado
  window.fbPixel?.pdfBaixado(window.estado?.tipoAtual || 'desconhecido');

  fecharModalImpressao();
  setTimeout(() => window.print(), 280);
}
