/**
 * ProMat — geometry.js
 * Módulo de renderização de figuras geométricas via SVG
 * Suporta: triângulo, triângulo retângulo, quadrado, retângulo, círculo,
 *          trapézio, losango, ângulo isolado, plano cartesiano simples
 */

const GeoRenderer = (() => {

  // ─── Estilo visual padrão ─────────────────────────────────────────
  const STYLE = {
    stroke: '#1e293b',
    fill: '#f0fdfa',
    fillAccent: '#ccfbf1',
    strokeWidth: 1.8,
    font: '13px Inter, system-ui, sans-serif',
    fontSmall: '11px Inter, system-ui, sans-serif',
    colorLabel: '#0f766e',   // brand-700
    colorDim: '#334155',     // text
    colorAngle: '#0d9488',   // brand-600
  };

  /**
   * Cria um elemento SVG base com viewBox adequado
   */
  function criarSVG(w, h) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('style', `max-width:${w}px; height:auto; display:block;`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return svg;
  }

  /**
   * Cria um texto SVG centralizado
   */
  function criarTexto(x, y, texto, opts = {}) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', opts.anchor || 'middle');
    t.setAttribute('dominant-baseline', opts.baseline || 'middle');
    t.setAttribute('fill', opts.cor || STYLE.colorLabel);
    t.setAttribute('font-family', 'Inter, system-ui, sans-serif');
    t.setAttribute('font-size', opts.size || 13);
    t.setAttribute('font-weight', opts.bold ? '700' : '500');
    t.textContent = texto;
    return t;
  }

  /**
   * Cria um arco de ângulo
   */
  function criarArcoAngulo(cx, cy, r, startAngle, endAngle) {
    const toRad = a => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`);
    path.setAttribute('fill', STYLE.fillAccent);
    path.setAttribute('stroke', 'none');
    return path;
  }

  // ─── Renderers individuais ─────────────────────────────────────────

  /**
   * Retângulo / Quadrado
   * dados: { base, altura, labels: { base, altura } }
   */
  function renderRetangulo(dados) {
    const { base: bVal, altura: hVal } = dados;
    const labels = dados.labels || {};
    const PAD = 40;
    const MAX_W = 280, MAX_H = 160;
    const rawW = bVal > hVal ? MAX_W : MAX_H;
    const rawH = hVal > bVal ? MAX_W : MAX_H;
    const scaleB = rawW / (bVal || 1);
    const scaleH = rawH / (hVal || 1);
    const scale = Math.min(scaleB, scaleH, 3);
    const W = Math.round(bVal * scale);
    const H = Math.round(hVal * scale);
    const svgW = W + PAD * 2;
    const svgH = H + PAD * 2;

    const svg = criarSVG(svgW, svgH);
    const x0 = PAD, y0 = PAD;

    // Retângulo
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x0); rect.setAttribute('y', y0);
    rect.setAttribute('width', W); rect.setAttribute('height', H);
    rect.setAttribute('fill', STYLE.fill);
    rect.setAttribute('stroke', STYLE.stroke);
    rect.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(rect);

    // Marca de ângulo reto em cada canto
    const marcaSize = 8;
    [[x0, y0 + H], [x0, y0], [x0 + W, y0], [x0 + W, y0 + H]].forEach(([cx, cy]) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const dx = cx === x0 ? 1 : -1;
      const dy = cy === y0 ? 1 : -1;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M ${cx + dx * marcaSize} ${cy} L ${cx + dx * marcaSize} ${cy + dy * marcaSize} L ${cx} ${cy + dy * marcaSize}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', STYLE.colorAngle);
      p.setAttribute('stroke-width', 1.2);
      g.appendChild(p);
      svg.appendChild(g);
    });

    // Labels
    const baseLabel = labels.base || `${bVal} cm`;
    const altLabel = labels.altura || `${hVal} cm`;
    svg.appendChild(criarTexto(x0 + W / 2, y0 - 14, baseLabel));
    svg.appendChild(criarTexto(x0 - 14, y0 + H / 2, altLabel, { anchor: 'middle' }));

    return svg;
  }

  /**
   * Triângulo genérico por 3 pontos (calculados a partir de base e altura)
   * dados: { base, altura, labels }
   */
  function renderTriangulo(dados) {
    const { base: bVal, altura: hVal } = dados;
    const labels = dados.labels || {};
    const PAD = 48;
    const W = 240, H = 140;
    const svg = criarSVG(W + PAD * 2, H + PAD);

    const x0 = PAD, xEnd = PAD + W;
    const yBase = H + PAD - 8;
    const xTopo = PAD + W / 2;
    const yTopo = PAD;

    // Triângulo
    const pts = `${x0},${yBase} ${xEnd},${yBase} ${xTopo},${yTopo}`;
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', STYLE.fill);
    poly.setAttribute('stroke', STYLE.stroke);
    poly.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(poly);

    // Linha tracejada de altura
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', xTopo); hLine.setAttribute('y1', yTopo);
    hLine.setAttribute('x2', xTopo); hLine.setAttribute('y2', yBase);
    hLine.setAttribute('stroke', STYLE.colorAngle);
    hLine.setAttribute('stroke-width', 1.2);
    hLine.setAttribute('stroke-dasharray', '4,3');
    svg.appendChild(hLine);

    // Marca de ângulo reto na base (pé da altura)
    const m = 7;
    const marcaPath = `M ${xTopo - m} ${yBase} L ${xTopo - m} ${yBase - m} L ${xTopo} ${yBase - m}`;
    const marca = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    marca.setAttribute('d', marcaPath);
    marca.setAttribute('fill', 'none');
    marca.setAttribute('stroke', STYLE.colorAngle);
    marca.setAttribute('stroke-width', 1.2);
    svg.appendChild(marca);

    // Labels
    const baseLabel = labels.base || `${bVal} cm`;
    const altLabel  = labels.altura || `${hVal} cm`;
    svg.appendChild(criarTexto(x0 + W / 2, yBase + 18, baseLabel, { cor: STYLE.colorLabel }));
    svg.appendChild(criarTexto(xTopo + 18, yTopo + (H / 2), altLabel, { anchor: 'start', cor: STYLE.colorLabel }));

    // Label de lados extras se houver
    if (dados.lados && Array.isArray(dados.lados)) {
      dados.lados.forEach((l, i) => {
        if (i === 0) svg.appendChild(criarTexto(x0 + 30, yBase - 30, `${l} cm`, { cor: '#64748b', size: 11 }));
        if (i === 1) svg.appendChild(criarTexto(xEnd - 30, yBase - 30, `${l} cm`, { cor: '#64748b', size: 11 }));
      });
    }

    return svg;
  }

  /**
   * Triângulo retângulo (ângulo reto na base-esquerda)
   * dados: { cateto_a (horizontal), cateto_b (vertical), hipotenusa, labels }
   */
  function renderTrianguloRetangulo(dados) {
    const { cateto_a: aVal, cateto_b: bVal } = dados;
    const labels = dados.labels || {};
    const PAD = 44;
    const W = 180, H = 140;
    const svg = criarSVG(W + PAD * 2, H + PAD * 2);

    const xA = PAD, yA = PAD + H;   // canto reto
    const xB = PAD + W, yB = yA;    // base dir
    const xC = PAD, yC = PAD;       // topo

    const pts = `${xA},${yA} ${xB},${yB} ${xC},${yC}`;
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', STYLE.fill);
    poly.setAttribute('stroke', STYLE.stroke);
    poly.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(poly);

    // Ângulo reto
    const m = 10;
    const marcaPath = `M ${xA + m} ${yA} L ${xA + m} ${yA - m} L ${xA} ${yA - m}`;
    const marca = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    marca.setAttribute('d', marcaPath);
    marca.setAttribute('fill', 'none');
    marca.setAttribute('stroke', STYLE.colorAngle);
    marca.setAttribute('stroke-width', 1.5);
    svg.appendChild(marca);

    // Labels
    svg.appendChild(criarTexto(xA + W / 2, yA + 18, labels.cateto_a || `${aVal} cm`));
    svg.appendChild(criarTexto(xA - 18, yA - H / 2, labels.cateto_b || `${bVal} cm`));
    // Hipotenusa diagonal: calcular ponto médio
    const hxMid = (xB + xC) / 2 + 12;
    const hyMid = (yB + yC) / 2;
    const hipLabel = labels.hipotenusa || (dados.hipotenusa ? `${dados.hipotenusa} cm` : '?');
    svg.appendChild(criarTexto(hxMid, hyMid, hipLabel, { anchor: 'start', cor: '#64748b' }));

    return svg;
  }

  /**
   * Círculo
   * dados: { raio, diametro, labels }
   */
  function renderCirculo(dados) {
    const raioVal = dados.raio || (dados.diametro ? dados.diametro / 2 : 5);
    const labels = dados.labels || {};
    const PAD = 40;
    const R = 90;
    const svgW = R * 2 + PAD * 2;
    const svgH = R * 2 + PAD * 2;
    const cx = svgW / 2, cy = svgH / 2;

    const svg = criarSVG(svgW, svgH);

    // Círculo
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
    circle.setAttribute('r', R);
    circle.setAttribute('fill', STYLE.fill);
    circle.setAttribute('stroke', STYLE.stroke);
    circle.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(circle);

    // Centro
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('r', 3);
    dot.setAttribute('fill', STYLE.colorAngle);
    svg.appendChild(dot);

    // Linha do raio
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', cx + R); line.setAttribute('y2', cy);
    line.setAttribute('stroke', STYLE.colorAngle);
    line.setAttribute('stroke-width', 1.5);
    line.setAttribute('stroke-dasharray', '5,3');
    svg.appendChild(line);

    // Label raio
    const rLabel = labels.raio || `r = ${raioVal} cm`;
    svg.appendChild(criarTexto(cx + R / 2, cy - 12, rLabel));

    // Label diâmetro se pedido
    if (labels.diametro || dados.diametro) {
      const dLabel = labels.diametro || `d = ${dados.diametro} cm`;
      svg.appendChild(criarTexto(cx, cy + R + 20, dLabel));
    }

    return svg;
  }

  /**
   * Trapézio
   * dados: { base_maior, base_menor, altura, labels }
   */
  function renderTrapezio(dados) {
    const { base_maior: bMaiorV, base_menor: bMenorV, altura: hV } = dados;
    const labels = dados.labels || {};
    const PAD = 44;
    const W = 240, H = 120;
    const svg = criarSVG(W + PAD * 2, H + PAD * 2);

    const xL = PAD;
    const xR = PAD + W;
    const yBot = PAD + H;
    const offset = (W - (W * (bMenorV / bMaiorV))) / 2;
    const xTL = PAD + offset;
    const xTR = PAD + W - offset;
    const yTop = PAD;

    const pts = `${xL},${yBot} ${xR},${yBot} ${xTR},${yTop} ${xTL},${yTop}`;
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', STYLE.fill);
    poly.setAttribute('stroke', STYLE.stroke);
    poly.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(poly);

    // Linha de altura
    const midBot = (xL + xR) / 2;
    const midTop = (xTL + xTR) / 2;
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', midTop); hLine.setAttribute('y1', yTop);
    hLine.setAttribute('x2', midTop); hLine.setAttribute('y2', yBot);
    hLine.setAttribute('stroke', STYLE.colorAngle);
    hLine.setAttribute('stroke-width', 1.2);
    hLine.setAttribute('stroke-dasharray', '4,3');
    svg.appendChild(hLine);

    svg.appendChild(criarTexto(xL + W / 2, yBot + 18, labels.base_maior || `${bMaiorV} cm (base)`));
    svg.appendChild(criarTexto((xTL + xTR) / 2, yTop - 14, labels.base_menor || `${bMenorV} cm`));
    svg.appendChild(criarTexto(midTop + 18, yTop + H / 2, labels.altura || `h = ${hV} cm`, { anchor: 'start' }));

    return svg;
  }

  /**
   * Losango
   * dados: { diagonal_maior, diagonal_menor, labels }
   */
  function renderLosango(dados) {
    const { diagonal_maior: dMaior, diagonal_menor: dMenor } = dados;
    const labels = dados.labels || {};
    const PAD = 44;
    const W = 200, H = 140;
    const svg = criarSVG(W + PAD * 2, H + PAD * 2);

    const cx = PAD + W / 2, cy = PAD + H / 2;
    const dx = W / 2, dy = H / 2;
    const pts = `${cx},${cy - dy} ${cx + dx},${cy} ${cx},${cy + dy} ${cx - dx},${cy}`;

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', STYLE.fill);
    poly.setAttribute('stroke', STYLE.stroke);
    poly.setAttribute('stroke-width', STYLE.strokeWidth);
    svg.appendChild(poly);

    // Diagonais tracejadas
    [[cx - dx, cy, cx + dx, cy], [cx, cy - dy, cx, cy + dy]].forEach(([x1, y1, x2, y2]) => {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', STYLE.colorAngle);
      l.setAttribute('stroke-width', 1.2);
      l.setAttribute('stroke-dasharray', '4,3');
      svg.appendChild(l);
    });

    svg.appendChild(criarTexto(cx, cy + dy + 18, labels.diagonal_maior || `D = ${dMaior} cm`));
    svg.appendChild(criarTexto(cx + dx + 18, cy, labels.diagonal_menor || `d = ${dMenor} cm`, { anchor: 'start' }));

    return svg;
  }

  /**
   * Ângulo isolado
   * dados: { graus, label }
   */
  function renderAngulo(dados) {
    const graus = dados.graus || 60;
    const label = dados.label || `${graus}°`;
    const PAD = 40;
    const SIZE = 140;
    const svg = criarSVG(SIZE + PAD * 2, SIZE + PAD);

    const ox = PAD + 10, oy = PAD + SIZE - 10;
    const r = SIZE - 20;
    const toRad = a => (a * Math.PI) / 180;

    // Linha base (horizontal)
    const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1', ox); l1.setAttribute('y1', oy);
    l1.setAttribute('x2', ox + r); l1.setAttribute('y2', oy);
    l1.setAttribute('stroke', STYLE.stroke); l1.setAttribute('stroke-width', 2);
    svg.appendChild(l1);

    // Linha do ângulo
    const ex = ox + r * Math.cos(toRad(-graus));
    const ey = oy + r * Math.sin(toRad(-graus));
    const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1', ox); l2.setAttribute('y1', oy);
    l2.setAttribute('x2', ex); l2.setAttribute('y2', ey);
    l2.setAttribute('stroke', STYLE.stroke); l2.setAttribute('stroke-width', 2);
    svg.appendChild(l2);

    // Arco
    const arcR = 40;
    const ax = ox + arcR;
    const ay = oy;
    const bx = ox + arcR * Math.cos(toRad(-graus));
    const by = oy + arcR * Math.sin(toRad(-graus));
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arc.setAttribute('d', `M ${ax} ${ay} A ${arcR} ${arcR} 0 0 0 ${bx} ${by}`);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', STYLE.colorAngle);
    arc.setAttribute('stroke-width', 1.8);
    svg.appendChild(arc);

    // Ponto de origem
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', ox); dot.setAttribute('cy', oy);
    dot.setAttribute('r', 3);
    dot.setAttribute('fill', STYLE.colorAngle);
    svg.appendChild(dot);

    // Label do ângulo
    const midRad = toRad(-graus / 2);
    const labelR = arcR + 16;
    svg.appendChild(criarTexto(
      ox + labelR * Math.cos(midRad),
      oy + labelR * Math.sin(midRad),
      label,
      { cor: STYLE.colorAngle, bold: true }
    ));

    return svg;
  }

  /**
   * Plano cartesiano simples (2 pontos ou reta)
   * dados: { pontos: [{x,y,label}], range_x: [-5,5], range_y: [-5,5] }
   */
  function renderPlanoCartesiano(dados) {
    const SIZE = 220, PAD = 30;
    const svg = criarSVG(SIZE + PAD * 2, SIZE + PAD * 2);

    const pontos = dados.pontos || [];
    const rangeX = dados.range_x || [-5, 5];
    const rangeY = dados.range_y || [-5, 5];
    const xMin = rangeX[0], xMax = rangeX[1];
    const yMin = rangeY[0], yMax = rangeY[1];

    const toSvgX = x => PAD + ((x - xMin) / (xMax - xMin)) * SIZE;
    const toSvgY = y => PAD + ((yMax - y) / (yMax - yMin)) * SIZE;

    // Grade
    for (let gx = xMin; gx <= xMax; gx++) {
      const sx = toSvgX(gx);
      const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      grid.setAttribute('x1', sx); grid.setAttribute('y1', PAD);
      grid.setAttribute('x2', sx); grid.setAttribute('y2', PAD + SIZE);
      grid.setAttribute('stroke', '#e2e8f0'); grid.setAttribute('stroke-width', 1);
      svg.appendChild(grid);
      if (gx !== 0) svg.appendChild(criarTexto(sx, toSvgY(0) + 14, gx, { size: 10, cor: '#94a3b8' }));
    }
    for (let gy = yMin; gy <= yMax; gy++) {
      const sy = toSvgY(gy);
      const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      grid.setAttribute('x1', PAD); grid.setAttribute('y1', sy);
      grid.setAttribute('x2', PAD + SIZE); grid.setAttribute('y2', sy);
      grid.setAttribute('stroke', '#e2e8f0'); grid.setAttribute('stroke-width', 1);
      svg.appendChild(grid);
      if (gy !== 0) svg.appendChild(criarTexto(toSvgX(0) - 14, sy, gy, { size: 10, cor: '#94a3b8', anchor: 'end' }));
    }

    // Eixos
    const ox = toSvgX(0), oy = toSvgY(0);
    [[PAD, oy, PAD + SIZE, oy], [ox, PAD, ox, PAD + SIZE]].forEach(([x1,y1,x2,y2]) => {
      const ax = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ax.setAttribute('x1', x1); ax.setAttribute('y1', y1);
      ax.setAttribute('x2', x2); ax.setAttribute('y2', y2);
      ax.setAttribute('stroke', STYLE.stroke); ax.setAttribute('stroke-width', 1.5);
      svg.appendChild(ax);
    });

    // Labels eixos
    svg.appendChild(criarTexto(PAD + SIZE + 10, oy, 'x', { bold: true, cor: STYLE.colorDim, anchor: 'start' }));
    svg.appendChild(criarTexto(ox, PAD - 10, 'y', { bold: true, cor: STYLE.colorDim }));
    svg.appendChild(criarTexto(ox - 10, oy + 14, '0', { size: 10, cor: '#94a3b8' }));

    // Pontos
    pontos.forEach(p => {
      const sx = toSvgX(p.x), sy = toSvgY(p.y);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', sx); dot.setAttribute('cy', sy);
      dot.setAttribute('r', 4);
      dot.setAttribute('fill', STYLE.colorAngle);
      dot.setAttribute('stroke', 'white');
      dot.setAttribute('stroke-width', 1.5);
      svg.appendChild(dot);
      if (p.label) {
        svg.appendChild(criarTexto(sx + 10, sy - 10, p.label, { anchor: 'start', size: 12, bold: true }));
      }
    });

    // Reta se tiver 2+ pontos
    if (pontos.length >= 2) {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', toSvgX(pontos[0].x)); l.setAttribute('y1', toSvgY(pontos[0].y));
      l.setAttribute('x2', toSvgX(pontos[1].x)); l.setAttribute('y2', toSvgY(pontos[1].y));
      l.setAttribute('stroke', STYLE.colorAngle);
      l.setAttribute('stroke-width', 1.8);
      svg.insertBefore(l, dot);
    }

    return svg;
  }

  // ─── API pública ────────────────────────────────────────────────────

  /**
   * Renderiza uma figura dado um objeto {tipo, dados}
   * Retorna um elemento SVG DOM ou null se tipo não suportado
   */
  function renderizar(figura) {
    if (!figura || !figura.tipo) return null;
    try {
      switch (figura.tipo.toLowerCase()) {
        case 'retangulo':           return renderRetangulo(figura.dados || figura);
        case 'quadrado': {
          const lado = (figura.dados || figura).lado;
          const d = { base: lado, altura: lado, labels: { base: `${lado} cm`, altura: `${lado} cm` } };
          return renderRetangulo(d);
        }
        case 'triangulo':           return renderTriangulo(figura.dados || figura);
        case 'triangulo_retangulo':
        case 'triangulo-retangulo': return renderTrianguloRetangulo(figura.dados || figura);
        case 'circulo':
        case 'círculo':             return renderCirculo(figura.dados || figura);
        case 'trapezio':
        case 'trapézio':            return renderTrapezio(figura.dados || figura);
        case 'losango':             return renderLosango(figura.dados || figura);
        case 'angulo':
        case 'ângulo':              return renderAngulo(figura.dados || figura);
        case 'plano_cartesiano':
        case 'grafico':
        case 'gráfico':             return renderPlanoCartesiano(figura.dados || figura);
        default:                    return null;
      }
    } catch (e) {
      console.warn('GeoRenderer: erro ao renderizar figura', figura, e);
      return null;
    }
  }

  /**
   * Cria o wrapper HTML de uma figura com legenda opcional
   */
  function criarWrapperFigura(figura) {
    const svg = renderizar(figura);
    if (!svg) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'figura-geo-wrapper';
    wrapper.appendChild(svg);

    if (figura.legenda) {
      const leg = document.createElement('p');
      leg.className = 'figura-geo-legenda';
      leg.textContent = figura.legenda;
      wrapper.appendChild(leg);
    }

    return wrapper;
  }

  return { renderizar, criarWrapperFigura };
})();

// Expõe globalmente
window.GeoRenderer = GeoRenderer;
