/**
 * Serviço de IA - Camada de abstração para provedores de LLM
 * 
 * Arquitetura desacoplada: trocar de provedor requer apenas
 * adicionar um novo adaptador neste arquivo e configurar AI_PROVIDER no .env
 * 
 * Provedores suportados: openai, gemini (em breve)
 */

require('dotenv').config();

const MAX_TOKENS = parseInt(process.env.MAX_TOKENS) || 2000;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// ===========================
// ADAPTADOR: OpenAI
// ===========================
async function callOpenAI(prompt, systemPrompt) {
  const { OpenAI } = require('openai');

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log(`[OpenAI] Enviando requisição para modelo ${AI_MODEL}...`);
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'Você é um assistente especializado em educação matemática do Ensino Fundamental brasileiro. Sempre responda em formato JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    console.log(`[OpenAI] Resposta recebida com sucesso. Tokens usados: ${response.usage?.total_tokens || 'N/A'}`);
    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('[OpenAI ERRO]', error.message);
    if (error.response) {
      console.error('[OpenAI DETALHES]', error.response.data);
    }
    throw new Error('Falha ao comunicar com a inteligência artificial. Tente novamente em instantes.');
  }
}

// ===========================
// ADAPTADOR: Google Gemini
// (Ativar quando necessário)
// ===========================
async function callGemini(prompt) {
  // TODO: implementar integração com Gemini
  // const { GoogleGenerativeAI } = require('@google/generative-ai');
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // ...
  throw new Error('Provedor Gemini ainda não implementado. Configure AI_PROVIDER=openai no .env');
}

// ===========================
// ROTEADOR DE PROVEDORES
// ===========================
async function callAI(prompt, systemPrompt) {
  if (!AI_PROVIDER) {
    throw new Error('AI_PROVIDER não configurado no .env');
  }

  switch (AI_PROVIDER.toLowerCase()) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY não configurada no .env');
      }
      return await callOpenAI(prompt, systemPrompt);

    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY não configurada no .env');
      }
      return await callGemini(prompt);

    default:
      throw new Error(`Provedor de IA desconhecido: ${AI_PROVIDER}. Use: openai | gemini`);
  }
}

module.exports = { callAI };
