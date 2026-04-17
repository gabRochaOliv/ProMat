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
- Todo e qualquer número, operação, fração, potência, variável algébrica ou expressão matemática deve OBRIGATORIAMENTE ser formatada em LaTeX.
- Para expressões no meio do texto (inline), use a notação: \\( expressao \\). Exemplo: A variável \\( x \\) equivale a \\( 2x^2 + 5 \\).
- Para cálculos destacados ou equações completas (blocos isolados), use a notação dupla: $$ expressao $$
- Escreva a matemática com clareza, usando \\frac{}{}, \\sqrt{}, \\cdot, etc., sempre que aplicável.
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
- Varie os formatos (cálculo direto, problema contextualizado, complete, verdadeiro/falso quando adequado)
- Todos os exercícios devem ter resposta correta e verificável
- Não inclua o gabarito na lista (apenas os enunciados)
- Numere cada exercício
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
      "tipo": "calculo|problema|completar|vf",
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
function buildProvaPrompt({ serie, tema, totalQuestoes }) {
  const serieLabel = SERIES_LABELS[serie] || serie;

  return `Você é um professor experiente de Matemática do Ensino Fundamental.

Gere uma prova completa de Matemática sobre "${tema}" para alunos do ${serieLabel}.

Total de questões: ${totalQuestoes}
Distribuição sugerida: ${Math.ceil(totalQuestoes * 0.4)} fáceis, ${Math.ceil(totalQuestoes * 0.4)} médias, ${Math.floor(totalQuestoes * 0.2)} difíceis.

REGRAS:
- Questões variadas (cálculo, problema contextualizado, interpretação)
- Linguagem adequada para a série
- Sem erros matemáticos
- Estrutura formal de avaliação
${REGRAS_MATEMATICAS}
${REGRAS_VISUAIS}

FORMATO DE SAÍDA (JSON):
{
  "titulo": "Avaliação de Matemática — ${tema}",
  "subtitulo": "Nome: _________________________ Data: ___/___/____ Nota: ____",
  "serie": "${serieLabel}",
  "tema": "${tema}",
  "instrucoes": "Instrução geral para a prova",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Texto completo",
      "tipo": "calculo|problema|completar|vf",
      "valor": 1,
      "figura": null
    }
  ],
  "gabarito": [
    {
      "numero": 1,
      "resposta": "Resposta com resolução"
    }
  ]
}

NOTA: o campo "figura" é OPCIONAL. Use null quando não houver figura.

Gere apenas o JSON, sem texto antes ou depois.`;
}

/**
 * Cria o prompt para atividade extra / desafio
 */
function buildAtividadeExtraPrompt({ serie, tema, tipo }) {
  const serieLabel = SERIES_LABELS[serie] || serie;
  const tipoLabel = tipo === 'desafio' ? 'desafio matemático criativo' : 'atividade prática e aplicada';

  return `Você é um professor criativo de Matemática do Ensino Fundamental.

Crie um ${tipoLabel} sobre "${tema}" para alunos do ${serieLabel}.

REGRAS:
- Deve ser diferente de uma lista comum de exercícios
- Pode usar situações do cotidiano, jogos ou problemas contextualizados
- Linguagem motivadora e acessível
- Entre 3 e 5 itens ou etapas
${REGRAS_MATEMATICAS}

FORMATO DE SAÍDA (JSON):
{
  "titulo": "Título criativo da atividade",
  "tipo": "${tipo}",
  "descricao": "Breve descrição da atividade para o aluno",
  "itens": [
    {
      "numero": 1,
      "enunciado": "Texto do item"
    }
  ],
  "gabarito": [
    {
      "numero": 1,
      "resposta": "Resposta"
    }
  ]
}

Gere apenas o JSON, sem texto antes ou depois.`;
}

/**
 * Cria o prompt para explicação de tema
 */
function buildExplicacaoPrompt({ serie, tema }) {
  const serieLabel = SERIES_LABELS[serie] || serie;

  return `Você é um professor didático de Matemática do Ensino Fundamental.

Explique o tema "${tema}" de forma simples para alunos do ${serieLabel}.

REGRAS:
- Linguagem simples e acessível à faixa etária
- Use 2 exemplos práticos do cotidiano
- Explique o conceito central de forma clara
- Máximo de 3 parágrafos
${REGRAS_MATEMATICAS}

FORMATO DE SAÍDA (JSON):
{
  "tema": "${tema}",
  "serie": "${serieLabel}",
  "explicacao": "Texto explicativo completo",
  "exemplos": [
    {
      "titulo": "Título do exemplo",
      "descricao": "Exemplo prático"
    }
  ],
  "dicasDoProfessor": "Dica rápida para o professor ao ensinar este tema"
}

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
