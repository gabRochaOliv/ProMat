/**
 * Serviço de IA - Camada de abstração para provedores de LLM
 *
 * Provedores suportados: openai
 */

require('dotenv').config();

const MAX_TOKENS = parseInt(process.env.MAX_TOKENS) || 16000;
const AI_MODEL   = process.env.AI_MODEL    || 'gpt-4o-mini';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// ===========================
// REPARO DE JSON TRUNCADO
// ===========================
/**
 * Tenta reparar um JSON cortado no meio, fechando estruturas abertas.
 * Cobre os casos mais comuns: string aberta, arrays e objetos não fechados.
 */
function tentarRepararJSON(raw) {
  let s = raw.trim();

  // 1. Remove tudo após a última vírgula de nível raiz (linha incompleta)
  //    Ex: "..."resolucao":"Passo 1: ..." → corta antes da linha ruim
  const ultimoFechamento = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (ultimoFechamento > 0) {
    s = s.slice(0, ultimoFechamento + 1);
  }

  // 2. Fecha estruturas abertas contando chaves e colchetes
  let opens = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') opens.push(c === '{' ? '}' : ']');
    if (c === '}' || c === ']') opens.pop();
  }

  // 3. Se ficou dentro de uma string, fecha ela
  if (inString) s += '"';

  // 4. Fecha os colchetes/chaves pendentes em ordem inversa
  while (opens.length > 0) {
    s += opens.pop();
  }

  return s;
}

// ===========================
// ADAPTADOR: OpenAI
// ===========================
async function callOpenAI(prompt, systemPrompt, jsonMode = true) {
  const { OpenAI } = require('openai');

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let finalSystemPrompt = systemPrompt || 'Você é um assistente de educação matemática especializado.';
  if (jsonMode && !finalSystemPrompt.toLowerCase().includes('json')) {
    finalSystemPrompt += ' Responda obrigatoriamente no formato JSON.';
  }

  const params = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user',   content: prompt },
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
  };

  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  console.log(`[OpenAI] Enviando requisição para modelo ${AI_MODEL}...`);
  const response = await client.chat.completions.create(params);

  const finishReason = response.choices[0].finish_reason;
  console.log(`[OpenAI] Resposta recebida. Tokens: ${response.usage?.total_tokens || 'N/A'} | Motivo: ${finishReason}`);

  const content = response.choices[0].message.content;

  if (!jsonMode) return content;

  // Sanitização de LaTeX no JSON:
  // Se a IA gerou \frac em vez de \\frac, o JSON.parse vai interpretar \f como Form Feed.
  // A regex abaixo encontra barras invertidas (single backslash) que NÃO sejam:
  // 1. precedidas por outra barra (já escapadas)
  // 2. seguidas por n (newline), " (aspas), ou \ (barra)
  // E as transforma em duplas barras (\\).
  const safeContent = content.replace(/(?<!\\)\\(?![n"\\])/g, '\\\\');

  // Tenta parse normal primeiro
  try {
    return JSON.parse(safeContent);
  } catch (parseErr) {
    console.warn('[OpenAI] JSON truncado ou inválido detectado. Tentando reparo automático...');
    try {
      const reparado = tentarRepararJSON(safeContent);
      const resultado = JSON.parse(reparado);
      console.log('[OpenAI] Reparo de JSON bem-sucedido!');
      return resultado;
    } catch (repairErr) {
      console.error('[OpenAI] Falha no reparo do JSON:', repairErr.message);
      console.error('[OpenAI] Primeiros 500 chars do conteúdo bruto:', content?.slice(0, 500));
      throw new Error('A resposta da IA foi corrompida. Tente com menos questões ou um tema mais simples.');
    }
  }
}

// ===========================
// FUNÇÃO PRINCIPAL EXPORTADA
// ===========================
async function callAI(prompt, systemPrompt, jsonMode = true) {
  if (AI_PROVIDER === 'openai') {
    return await callOpenAI(prompt, systemPrompt, jsonMode);
  }
  throw new Error(`Provedor de IA "${AI_PROVIDER}" não suportado. Use: openai`);
}

module.exports = { callAI };
