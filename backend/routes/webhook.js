const express = require('express');
const router = express.Router();
const { atualizarPlanoPorEmail } = require('../services/supabaseService');

/**
 * Rota de Webhook da Cakto Pay
 * URL Final: POST /api/webhook/cakto
 */
router.post('/cakto', async (req, res) => {
  try {
    const payload = req.body;

    // Log básico para monitoramento (recomendado em produção)
    console.log('\n[Webhook Cakto] Evento recebido!');

    // TODO: No futuro, validar header de assinatura criptográfica da Cakto aqui
    // const signature = req.headers['x-cakto-signature'];
    // validarAssinaturaCakto(signature, req.body, process.env.CAKTO_WEBHOOK_SECRET);

    // 1. Identificar o tipo do evento
    // A Cakto geralmente envia o status no campo `event`, `status` ou `data.status`
    const eventType = payload.event || payload.type || payload.status || payload.data?.status;

    // 2. Extrair o Email do Cliente (comprador)
    // Procuramos em vários níveis devido à variação de documentação de gateways
    let email = null;
    if (payload.data?.customer?.email) email = payload.data.customer.email;
    else if (payload.customer?.email) email = payload.customer.email;
    else if (payload.data?.buyer?.email) email = payload.data.buyer.email;
    else if (payload.buyer?.email) email = payload.buyer.email;
    else if (payload.email) email = payload.email;

    console.log(`[Webhook Cakto] Tipo de evento: ${eventType} | Email: ${email || 'Não encontrado'}`);

    // Lista de eventos considerados "sucesso/pagamento confirmado"
    const isApproved = [
      'approved', 'paid', 'active', 'order.approved', 'charge.succeeded', 'subscription.active'
    ].includes(String(eventType).toLowerCase());

    // 3. Atualização no Banco de Dados
    if (isApproved && email) {
      console.log(`[Webhook Cakto] Pagamento confirmado para ${email}. Ativando Premium...`);

      const resultado = await atualizarPlanoPorEmail(email, 'premium');

      if (resultado.sucesso) {
        console.log(`[Webhook Cakto] ✅ Plano Premium ativado com sucesso para ${email}!`);
      } else {
        console.warn(`[Webhook Cakto] ⚠️ Falha ao ativar premium para ${email}: ${resultado.erro}`);
        // Se o usuário ainda não tiver criado a conta, o webhook vai falhar ao encontrar o email.
        // Em um sistema real robusto, salvaríamos esse evento pendente numa tabela de "compras avulsas"
        // para ativar quando ele criar a conta. Por ora, assumimos que ele já está cadastrado.
      }
    } else {
      console.log('[Webhook Cakto] Evento ignorado (não é confirmação de pagamento ou falta email).');
    }

    // 4. Retornar 200 OK para o gateway (importante para não haver retentativas)
    return res.status(200).send('Webhook processado com sucesso');

  } catch (err) {
    console.error('[Webhook Cakto] Erro interno:', err.message);
    // Retorna 500 para a Cakto tentar enviar o webhook novamente mais tarde
    return res.status(500).send('Erro interno no servidor');
  }
});

module.exports = router;
