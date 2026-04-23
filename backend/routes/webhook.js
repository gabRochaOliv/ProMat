const express = require('express');
const router = express.Router();
const { atualizarPlanoPorEmail } = require('../services/supabaseService');

/**
 * Função utilitária para limpar dados sensíveis do payload antes de logar
 */
function sanitizePayload(payload) {
  if (!payload) return null;
  const safePayload = JSON.parse(JSON.stringify(payload)); // Deep clone
  // Mascarar campos sensíveis se existirem (ex: senhas, tokens de cartão)
  if (safePayload.card_number) safePayload.card_number = '***';
  if (safePayload.cvv) safePayload.cvv = '***';
  return safePayload;
}

/**
 * Rota de Webhook da Cakto Pay
 * URL Final: POST /api/webhook/cakto
 */
router.post('/cakto', async (req, res) => {
  console.log('\n=============================================');
  console.log(`[Webhook Cakto] 🔴 REQUISIÇÃO RECEBIDA: ${new Date().toISOString()}`);
  
  try {
    const payload = req.body;

    // 1. Log Seguro do Payload
    console.log('[Webhook Cakto] Payload Estrutura:');
    console.log(JSON.stringify(sanitizePayload(payload), null, 2));

    // 2. Extrair informações cruas de status para log e análise
    const eventType = payload.event || payload.type || payload.order_status || payload.status;
    const dataStatus = payload.data?.status;
    const dataSubStatus = payload.data?.subscription?.status;

    console.log(`[Webhook Cakto] Análise de Status Cru:`);
    console.log(`  - event/type: "${eventType || 'N/A'}"`);
    console.log(`  - data.status: "${dataStatus || 'N/A'}"`);
    console.log(`  - data.subscription.status: "${dataSubStatus || 'N/A'}"`);

    // 3. Extrair o Email do Cliente (Buscador Recursivo Agressivo)
    let email = null;
    
    function extractEmailRecursive(obj) {
      if (!obj) return null;
      if (typeof obj === 'string' && obj.includes('@') && obj.includes('.')) {
        if (obj.trim().length > 5 && !obj.includes(' ')) return obj.trim().toLowerCase();
      }
      if (typeof obj === 'object') {
        const knownKeys = ['email', 'customer_email', 'buyer_email', 'client_email'];
        for (const key of knownKeys) {
          if (obj[key] && typeof obj[key] === 'string' && obj[key].includes('@')) {
             return obj[key].trim().toLowerCase();
          }
        }
        for (const key in obj) {
          const found = extractEmailRecursive(obj[key]);
          if (found) return found;
        }
      }
      return null;
    }

    email = extractEmailRecursive(payload);
    console.log(`[Webhook Cakto] Email extraído: ${email ? `"${email}"` : 'NENHUM EMAIL ENCONTRADO'}`);

    if (!email) {
      console.warn('[Webhook Cakto] ⚠️ Alerta: Evento recebido sem email válido. Abortando ativação.');
      return res.status(200).send('Ignorado: Sem email');
    }

    // 4. Validação Robusta de Eventos de Sucesso
    function isEventoAprovado(payloadData) {
      const statusSucesso = [
        'purchase_approved', 'subscription_renewed', 'approved', 'paid', 
        'active', 'order.approved', 'charge.succeeded', 'subscription.active', 
        'payment_approved', 'pix.paid', 'completed', 'aprovado', 'pago', 
        'sucesso', 'concluido', 'ativo'
      ];

      // Array de todos os possíveis campos que indicam sucesso na Cakto
      const camposAValidar = [
        payloadData.event,
        payloadData.type,
        payloadData.order_status,
        payloadData.status,
        payloadData.data?.status,
        payloadData.data?.subscription?.status
      ];

      // Se QUALQUER um desses campos cruzar com nossa lista de sucesso, é aprovado
      for (const valor of camposAValidar) {
        if (valor && typeof valor === 'string') {
          if (statusSucesso.includes(valor.toLowerCase().trim())) {
            return true;
          }
        }
      }
      return false;
    }

    const isApproved = isEventoAprovado(payload);
    console.log(`[Webhook Cakto] Decisão Final: Evento aprovado? ${isApproved ? 'SIM ✅' : 'NÃO ❌'}`);

    // 5. Atualização no Banco de Dados
    if (isApproved) {
      console.log(`[Webhook Cakto] Iniciando processo de ativação PREMIUM para: ${email}`);
      const resultado = await atualizarPlanoPorEmail(email, 'premium');

      if (resultado.sucesso) {
        console.log(`[Webhook Cakto] ✅ SUCESSO TOTAL: Plano Premium ativado para ${email}!`);
      } else {
        console.error(`[Webhook Cakto] ❌ FALHA NO UPDATE DO BANCO: ${resultado.erro}`);
      }
    } else {
      console.log('[Webhook Cakto] Evento ignorado (não é evento de aprovação).');
    }

    console.log('[Webhook Cakto] Processamento concluído com código 200.');
    console.log('=============================================\n');
    return res.status(200).send('Webhook processado');

  } catch (err) {
    console.error('[Webhook Cakto] 🚨 ERRO CRÍTICO INTERNO:', err);
    console.log('=============================================\n');
    return res.status(500).send('Erro interno');
  }
});

/**
 * Rota de Debug Interna (Somente para testes)
 * URL Final: POST /api/webhook/cakto-debug
 */
router.post('/cakto-debug', async (req, res) => {
  console.log('\n[Webhook DEBUG] Acionado por teste interno');
  const { email, event = 'approved' } = req.body;
  
  if (!email) {
    return res.status(400).json({ erro: 'Forneça um email para testar' });
  }

  console.log(`[Webhook DEBUG] Simulando webhook da Cakto para o email: ${email} (Evento: ${event})`);
  
  try {
    const isApproved = ['approved', 'paid', 'active'].includes(event.toLowerCase());
    
    if (isApproved) {
      const resultado = await atualizarPlanoPorEmail(email, 'premium');
      console.log(`[Webhook DEBUG] Resultado do Update:`, resultado);
      return res.status(200).json({ 
        mensagem: 'Simulação concluída', 
        detalhes: resultado 
      });
    } else {
      return res.status(200).json({ mensagem: 'Simulação ignorada (evento não aprovado)' });
    }
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
