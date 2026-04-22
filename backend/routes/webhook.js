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

    // 2. Identificar o tipo do evento
    const eventType = payload.event || payload.type || payload.status || payload.data?.status || payload.data?.event;
    console.log(`[Webhook Cakto] Tipo de evento cru: "${eventType}"`);

    // 3. Extrair o Email do Cliente
    let email = null;
    
    // Tenta diferentes caminhos comuns de gateways
    const possiveisCaminhos = [
      payload.data?.customer?.email,
      payload.customer?.email,
      payload.data?.buyer?.email,
      payload.buyer?.email,
      payload.email,
      payload.data?.client?.email,
      payload.client?.email,
      payload.data?.email
    ];

    for (const caminho of possiveisCaminhos) {
      if (caminho && typeof caminho === 'string' && caminho.includes('@')) {
        email = caminho;
        break;
      }
    }

    console.log(`[Webhook Cakto] Email extraído: ${email ? `"${email}"` : 'NENHUM EMAIL ENCONTRADO'}`);

    if (!email) {
      console.warn('[Webhook Cakto] ⚠️ Alerta: Evento recebido sem email válido. Abortando ativação.');
      return res.status(200).send('Ignorado: Sem email'); // Retorna 200 para a Cakto parar de tentar
    }

    // 4. Validação de Eventos de Sucesso
    // Adicionamos várias variações comuns de status de sucesso da Cakto/Kiwify/Hotmart
    const statusSucesso = ['approved', 'paid', 'active', 'order.approved', 'charge.succeeded', 'subscription.active', 'payment_approved', 'pix.paid'];
    const isApproved = eventType ? statusSucesso.includes(String(eventType).toLowerCase()) : false;

    console.log(`[Webhook Cakto] Status verificado: "${String(eventType).toLowerCase()}" | É aprovado? ${isApproved}`);

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
