/**
 * Construtor de Prompts para Geração de Exercícios de Matemática
 * Responsável por criar prompts eficientes e bem estruturados para a IA
 */

const SERIES_LABELS = {
  '6ano': '6º ano do Ensino Fundamental',
  '7ano': '7º ano do Ensino Fundamental',
  '8ano': '8º ano do Ensino Fundamental',
  '9ano': '9º ano do Ensino Fundamental',
};

const NIVEL_LABELS = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

const NIVEL_INSTRUCOES = {
  facil: 'Os exercícios devem ser simples e diretos, com cálculos básicos, para fixação do conceito fundamental. Ideal para introdução ao tema.',
  medio: 'Os exercícios devem ter nível intermediário, exigindo aplicação do conceito com pequenas variações e contexto.',
  dificil: 'Os exercícios devem ser desafiadores, com problemas contextualizados, múltiplas etapas e raciocínio mais elaborado.',
};

const REGRAS_MATEMATICAS = `
REGRAS DE FORMATAÇÃO MATEMÁTICA (MUITO IMPORTANTE):
- NUNCA use cifrões ($ ou $$) para delimitar matemática. Eles estão estritamente proibidos.
- Para expressões no meio do texto (inline), use EXCLUSIVAMENTE a notação: \\( expressao \\). Exemplo: "A variável \\( x \\) vale \\( 10 \\)".
- Para cálculos destacados ou equações completas (blocos isolados), use EXCLUSIVAMENTE a notação: \\[ expressao \\]
- SÍMBOLO DE MOEDA: Escreva sempre fora do bloco LaTeX: R$ \\( 25,50 \\) ou simplesmente R$ 25,50.
- SEPARADOR DECIMAL: No Brasil usamos vírgula. No LaTeX, use chaves para a vírgula não criar espaço extra: \\( 3{,}5 \\).
- Escreva a matemática com clareza, fechando sempre todas as chaves { } e parênteses.

EXEMPLOS OBRIGATÓRIOS DE LATEX:
- Frações: \\frac{a}{b}
- Limites: \\lim_{x \\to 0} f(x)
- Potências/Índices: x^2 ou a_n
- Raízes: \\sqrt{x} ou \\sqrt[n]{x}
- Integrais: \\int_{a}^{b} x dx
- Somatórios: \\sum_{i=1}^{n} x_i

ATENÇÃO CRÍTICA AO JSON: Como a saída será um JSON, VOCÊ DEVE ESCAPAR AS BARRAS (BACKSLASHES) DO LATEX DUPLAMENTE.
  ERRADO: \\frac{1}{2} ou \\text{limite} ou \\( x \\) ou \\[ x \\]
  CORRETO: \\\\frac{1}{2} e \\\\text{limite} e \\\\( x \\\\) e \\\\[ x \\\\]
  Se você usar apenas uma barra, o parser do JSON transformará \\f, \\t, \\r, etc em caracteres inválidos, corrompendo a equação! É OBRIGATÓRIO usar dupla barra nas funções LaTeX.
`;

const REGRAS_VISUAIS = `
FIGURAS GEOMÉTRICAS (IMPORTANTE — use quando o exercício envolver geometria):
Se um exercício envolver uma figura geométrica (triângulo, retângulo, quadrado, círculo, trapézio, losango, ângulo ou gráfico), adicione o campo "figura" ao objeto do exercício.
O campo "figura" deve seguir EXATAMENTE este esquema:

  Para retângulo:
  "figura": { "tipo": "retangulo", "dados": { "base": 8, "altura": 5, "labels": { "base": "8 cm", "altura": "5 cm" } } }

  Para quadrado:
  "figura": { "tipo": "quadrado", "dados": { "lado": 6 } }

  Para triângulo comum (com base e altura):
  "figura": { "tipo": "triangulo", "dados": { "base": 10, "altura": 8, "labels": { "base": "10 cm", "altura": "8 cm" } } }

  Para triângulo retângulo:
  "figura": { "tipo": "triangulo_retangulo", "dados": { "cateto_a": 3, "cateto_b": 4, "hipotenusa": 5 } }

  Para círculo:
  "figura": { "tipo": "circulo", "dados": { "raio": 7, "labels": { "raio": "r = 7 cm" } } }

  Para trapézio:
  "figura": { "tipo": "trapezio", "dados": { "base_maior": 12, "base_menor": 8, "altura": 5 } }

  Para losango:
  "figura": { "tipo": "losango", "dados": { "diagonal_maior": 16, "diagonal_menor": 12 } }

  Para ângulo isolado:
  "figura": { "tipo": "angulo", "dados": { "graus": 60 } }

  Para gráfico/plano cartesiano:
  "figura": { "tipo": "plano_cartesiano", "dados": { "pontos": [{"x": 0, "y": 0, "label": "A"}, {"x": 3, "y": 6, "label": "B"}], "range_x": [-1, 5], "range_y": [-1, 8] } }

IMPORTANTE: o campo "figura" é OPCIONAL. Só inclua quando realmente necessário (exercício de geometria/gráfico). Nunca force figuras em exercícios de álgebra, frações ou porcentagem.

ESTRUTURA DO TEXTO:
- Seja direto e claro.
- Para problemas com muitos dados, use tópicos ou quebras de linha (\n) para organizar a informação.
- Se houver alternativas, use OBRIGATORIAMENTE o campo "opcoes" do JSON em vez de escrevê-las no enunciado.
`;

/**
 * Cria o prompt para geração de lista de exercícios
 */
function buildExerciseListPrompt({ serie, tema, nivel, quantidade }) {
  const serieLabel = SERIES_LABELS[serie] || serie;
  const nivelLabel = NIVEL_LABELS[nivel] || nivel;
  const nivelInstrucao = NIVEL_INSTRUCOES[nivel] || '';

  return `Você é um professor experiente de Matemática do Ensino Fundamental.

Gere exatamente ${quantidade} exercícios de Matemática sobre "${tema}" para alunos do ${serieLabel}.

NÍVEL: ${nivelLabel}
${nivelInstrucao}

REGRAS OBRIGATÓRIAS:
- Use linguagem clara e adequada para crianças/adolescentes da faixa etária
- Varie os formatos (cálculo direto, problema contextualizado, múltipla escolha, verdadeiro/falso)
- IMPORTANTE: Para questões de múltipla escolha, forneça as alternativas OBRIGATORIAMENTE no campo "opcoes" do JSON.
- Mantenha o enunciado organizado, usando quebras de linha (\n) se necessário para separar instruções de dados.
- Todos os exercícios devem ter resposta correta e verificável
- Não inclua as respostas no enunciado dos exercícios; todas as respostas devem ser fornecidas OBRIGATORIAMENTE no campo "gabarito" do JSON de saída.
- Numere cada exercício sequencialmente
- Mantenha coerência matemática rigorosa — não pode haver erro nos cálculos
${REGRAS_MATEMATICAS}
${REGRAS_VISUAIS}

FORMATO DE SAÍDA (JSON - siga EXATAMENTE este formato):
{
  "titulo": "Título da lista baseado no tema",
  "serie": "${serieLabel}",
  "nivel": "${nivelLabel}",
  "tema": "${tema}",
  "exercicios": [
    {
      "numero": 1,
      "enunciado": "Texto completo do exercício",
      "tipo": "calculo|problema|multipla_escolha|vf",
      "opcoes": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "figura": { "tipo": "retangulo", "dados": { "base": 8, "altura": 5 } }
    }
  ],
  "gabarito": [
    {
      "numero": 1,
      "resposta": "Resposta completa com resolução resumida"
    }
  ]
}

NOTA: o campo "figura" é OPCIONAL — inclua apenas nos exercícios que realmente precisam de representação visual.

Gere apenas o JSON, sem texto antes ou depois.`;
}

/**
 * Cria o prompt para geração de prova
 */
function buildProvaPrompt({ serie, tema, totalQuestoes, tipoQuestoes = 'misto', nivel = 'medio' }) {
  const serieLabel = SERIES_LABELS[serie] || serie;
  const nivelLabel = { facil: 'Fácil (básico)', medio: 'Médio', dificil: 'Avançado/Desafiador' }[nivel];

  const descritoresTipo = {
    misto: "um mix variado de múltipla escolha, sequência V/F, cálculos e questões dissertativas.",
    multipla_escolha: "exclusivamente questões de múltipla escolha (Marque X) com exatamente 5 alternativas (a, b, c, d, e) cada.",
    dissertativa: "questões abertas e dissertativas onde o aluno deve resolver e explicar por extenso.",
    calculo: "questões focadas puramente em cálculos e operações matemáticas.",
    vf: "questões de sequência V ou F. O enunciado deve listar 4 ou 5 afirmações (I, II, III...) e as alternativas (a, b, c, d, e) devem ser combinações como 'V-F-V-F', 'F-V-F-V', etc.",
  };

  const estiloInstrucao = descritoresTipo[tipoQuestoes] || descritoresTipo.misto;

  return `Professor de Matemática. Gere uma prova JSON sobre "${tema}" para ${serieLabel}.
Nível: ${nivelLabel} | Questões: ${totalQuestoes} | Estilo: ${estiloInstrucao}

REGRAS:
- Enunciado: apenas pergunta/afirmações. Use OBRIGATORIAMENTE \\n antes de CADA item romano (I., II., III...) para que fiquem em linhas separadas.
- Múltipla escolha: "opcoes" com 5 strings. Outros tipos: "opcoes": [].
- V/F: enunciado lista afirmações (I, II, III...), opcoes traz sequências ("V-V-F", "F-V-V"...).
- LaTeX: use \\( expr \\). NUNCA use $.
- "resolucao" no gabarito: passo a passo conciso separado por \\n.

JSON de saída (estrutura obrigatória):
{"titulo":"Avaliação — ${tema}","subtitulo":"Nome: ___________ Data: ___/___/____ Nota: ____","serie":"${serieLabel}","nivel":"${nivelLabel}","tema":"${tema}","instrucoes":"Leia com atenção.","questoes":[{"numero":1,"enunciado":"...","tipo":"multipla_escolha","opcoes":["A","B","C","D","E"],"valor":2,"figura":null}],"gabarito":[{"numero":1,"alternativa_correta":"B","resposta":"Resposta direta","resolucao":"Passo 1: ...\\nPasso 2: ..."}]}

Responda SOMENTE com o JSON completo.`;
}

/**
 * Cria o prompt para atividade extra / desafio
 */
function buildAtividadeExtraPrompt({ serie, tema, tipo, nivel = 'medio' }) {
  const serieLabel = SERIES_LABELS[serie] || serie;
  const nivelLabel = { facil: 'Fácil', medio: 'Médio', dificil: 'Avançado/Desafiador' }[nivel] || 'Médio';

  return `Você é um professor criativo e apaixonado por Matemática. Crie UM ÚNICO desafio matemático criativo e envolvente sobre "${tema}" para alunos do ${serieLabel}.

Nível de dificuldade: ${nivelLabel}

DIRETRIZES CRIATIVAS:
- O desafio deve ter um CONTEXTO REAL e MOTIVADOR (viagem, esporte, construção, culinária, tecnologia, etc.)
- Deve ser diferente de um exercício comum. Pode ser um problema investigativo, um enigma, uma missão, uma situação-problema complexa.
- Apresente como uma "missão" ou "aventura matemática" com título chamativo.
- Divida em etapas progressivas (3 etapas): warmup → núcleo → desafio bônus.
- Se o tema envolver geometria, inclua a figura SVG. Caso contrário, deixe figura como null.
- LaTeX: use \\( expr \\) para inline. NUNCA use $.

GABARITO:
- Resolução COMPLETA e DETALHADA de cada etapa.
- Linguagem de professor explicando para o aluno, com entusiasmo.
- Explique o PORQUÊ de cada passo.

FORMATO JSON (responda SOMENTE com o JSON):
{
  "titulo": "🔥 Título criativo e chamativo do desafio",
  "contexto": "Descrição imersiva da história/missão que contextualiza o desafio (2-3 frases motivadoras)",
  "nivel": "${nivelLabel}",
  "serie": "${serieLabel}",
  "tema": "${tema}",
  "figura": null,
  "etapas": [
    {
      "numero": 1,
      "titulo": "Etapa 1 — Aquecimento",
      "enunciado": "Enunciado da primeira etapa, mais simples"
    },
    {
      "numero": 2,
      "titulo": "Etapa 2 — O Desafio Principal",
      "enunciado": "Enunciado do desafio central, mais complexo"
    },
    {
      "numero": 3,
      "titulo": "Etapa 3 — Bônus: Vai Além!",
      "enunciado": "Uma extensão criativa para quem terminar antes"
    }
  ],
  "gabarito": [
    {
      "numero": 1,
      "titulo": "Etapa 1",
      "resposta": "Resposta direta e concisa",
      "resolucao": "Explicação detalhada passo a passo da etapa 1"
    },
    {
      "numero": 2,
      "titulo": "Etapa 2",
      "resposta": "Resposta direta e concisa",
      "resolucao": "Explicação detalhada passo a passo da etapa 2"
    },
    {
      "numero": 3,
      "titulo": "Etapa 3 — Bônus",
      "resposta": "Resposta da extensão",
      "resolucao": "Explicação da etapa bônus"
    }
  ]
}`;
}

/**
 * Cria o prompt para explicação de tema
 */
function buildExplicacaoPrompt({ serie, tema }) {
  const serieLabel = SERIES_LABELS[serie] || serie;

  return `Você é um professor didático e profundo de Matemática do Ensino Fundamental.

Explique o tema "${tema}" de forma clara, didática e completa para alunos do ${serieLabel}.

REGRAS:
- Linguagem adequada à faixa etária, mas sem perder o rigor matemático.
- Divida a explicação em: Introdução, Conceito Principal e Aplicação.
- Use pelo menos 2 exemplos práticos e detalhados.
- Se o tema envolver geometria ou gráficos, utilize a regra de figuras abaixo.
- IMPORTANTE: No final, forneça um link real e confiável (como Khan Academy, Brasil Escola ou similares) que contenha mais conteúdo sobre este tema específico.
${REGRAS_MATEMATICAS}
${REGRAS_VISUAIS}

FORMATO DE SAÍDA (JSON):
{
  "tema": "${tema}",
  "serie": "${serieLabel}",
  "explicacao": "Texto explicativo completo e estruturado",
  "figura": { "tipo": "...", "dados": { ... } },
  "exemplos": [
    {
      "titulo": "Título do exemplo",
      "descricao": "Exemplo prático e detalhado"
    }
  ],
  "dicasDoProfessor": "Dicas de como abordar este conteúdo em sala de aula",
  "referencias": [
    {
      "nome": "Nome do Site (ex: Brasil Escola)",
      "url": "https://url-especifica-do-tema",
      "descricao": "Breve descrição do que o professor encontrará neste link"
    }
  ]
}

NOTA: o campo "figura" é OPCIONAL. Só use se for realmente útil para a explicação.
IMPORTANTE: As referências devem ser de sites brasileiros confiáveis (Brasil Escola, Toda Matéria, Mundo Educação, etc.).

Gere apenas o JSON, sem texto antes ou depois.`;
}

module.exports = {
  buildExerciseListPrompt,
  buildProvaPrompt,
  buildAtividadeExtraPrompt,
  buildExplicacaoPrompt,
  SERIES_LABELS,
  NIVEL_LABELS,
};
