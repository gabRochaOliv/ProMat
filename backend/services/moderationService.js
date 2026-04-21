/**
 * Serviço de Moderação de Conteúdo
 * Filtra temas inadequados, pornográficos ou não relacionados à matemática.
 */

const PALAVRAS_BLOQUEADAS = [
  'porn', 'sexo', 'puta', 'caralho', 'porra', 'vagina', 'penis', 'ereção', 
  'safada', 'novinha', 'viado', 'gay', 'lesbica', 'trans', 'droga', 'cocaina', 
  'maconha', 'arma', 'matar', 'suicidio', 'terrorismo', 'nazismo', 'hitler',
  'estupro', 'pedofilia', 'hentai', 'xvideos', 'pornhub'
];

// Usando radicais para capturar variações (singular/plural/conjugação)
const RADICAIS_MATEMATICOS = [
  'som', 'subtra', 'multiplic', 'divis', 'frac', 'porcent', 'por cent',
  'geometr', 'algebr', 'equac', 'num', 'calcul', 'triang', 
  'quadrad', 'circul', 'angul', 'pitagora', 'bhaskara', 'func', 
  'estatist', 'probab', 'area', 'perimetr', 'volum', 'raiz', 
  'potenc', 'express', 'mmc', 'mdc', 'logic', 'conjunt', 'razao', 
  'proporc', 'regra de tres', 'juro', 'grafic', 'plano cartesiano',
  'seno', 'cosse', 'tangent', 'trigono', 'poligon', 'decim',
  'inteir', 'racion', 'irracion', 'real', 'complex', 'matriz',
  'determina', 'vetor', 'limit', 'deriv', 'integr', 'aritmet',
  'modulo', 'valor absolut', 'inequac', 'polinomi', 'geomet'
];

/**
 * Valida se o tema é adequado e relacionado à matemática
 * @param {string} tema 
 * @returns {Object} { valido: boolean, motivo: string }
 */
function validarTema(tema) {
  if (!tema || typeof tema !== 'string') {
    return { valido: false, motivo: 'O tema não pode estar vazio.' };
  }

  // Normalização: remove acentos e deixa em minúsculas
  const temaNormalizado = tema.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Check for blocked words
  for (const palavra of PALAVRAS_BLOQUEADAS) {
    if (temaNormalizado.includes(palavra)) {
      return { 
        valido: false, 
        motivo: 'O tema contém palavras inadequadas ou ofensivas.' 
      };
    }
  }

  // 2. Check for math context using radicals
  const temRadicalMatematico = RADICAIS_MATEMATICOS.some(radical => 
    temaNormalizado.includes(radical)
  );
  
  // Lista de termos genéricos aceitáveis no contexto escolar
  const temasAceitaveis = ['problema', 'desafio', 'raciocinio', 'conta', 'exercicio', 'matematica', 'aula', 'revisao', 'prova'];
  const temTermoAceitavel = temasAceitaveis.some(termo => temaNormalizado.includes(termo));

  if (!temRadicalMatematico && !temTermoAceitavel) {
    return { 
      valido: false, 
      motivo: 'O ProMat é focado exclusivamente em Matemática. Por favor, insira um tema relacionado.' 
    };
  }

  return { valido: true };
}

module.exports = { validarTema };
