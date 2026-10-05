import { Router, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './auth';
import { createCustomer, createSubscription, getPaymentPixQrCode } from '../services/asaasService';
import asaasApi from '../services/asaasService';

const router = Router();
const prisma = new PrismaClient();

// Tabela de Preços Padrão do PSAI
const PLAN_PRICES: Record<string, number> = {
  essencial: 39.00,
  profundo: 79.00,
  familia: 129.00
};

/**
 * POST /api/payments/create_payment
 * Cria uma assinatura na Asaas e retorna os links de checkout
 */
router.post('/create_payment', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planType, billingType, cpf, telefone } = req.body; // billingType: 'PIX', 'BOLETO', 'CREDIT_CARD'
    const userId = req.user!.id;

    console.log(`💳 Iniciando Checkout Asaas para usuário ${userId} | Plano: ${planType}`);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualiza CPF e Telefone se passados na requisição
    let userCpf = user.cpf || cpf;
    let userTelefone = user.telefone || telefone;

    if (cpf || telefone) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          cpf: userCpf,
          telefone: userTelefone
        }
      });
    }

    // Valida dados obrigatórios para cobrança Asaas
    if (!userCpf || !userTelefone) {
      return res.status(400).json({
        error: 'CPF e Telefone são obrigatórios para prosseguir com o pagamento.',
        missingFields: true
      });
    }

    // Determina o preço base do plano
    const price = PLAN_PRICES[planType.toLowerCase()];
    if (!price) {
      return res.status(400).json({ error: 'Plano selecionado é inválido.' });
    }

    // 1. Criar ou Buscar Cliente na Asaas
    const customer = await createCustomer({
      nome: user.name,
      email: user.email,
      cpf: userCpf,
      telefone: userTelefone
    });

    // 2. Criar a Assinatura (Subscription)
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/+$/, '');
    const subscriptionData = {
      customer: customer.id,
      billingType: billingType || 'UNDEFINED',
      value: price,
      nextDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // Próximo vencimento para amanhã para primeiro pagamento
      cycle: 'MONTHLY',
      description: `Assinatura PSAI - Plano ${planType.toUpperCase()}`,
      externalReference: `USER_${user.id}_PLAN_${planType.toLowerCase()}`,
      callback: {
        successUrl: `${frontendUrl}/profile?payment=success`,
        autoRedirect: true
      }
    };

    const subscription = await createSubscription(subscriptionData);

    // Salva a tentativa de assinatura no usuário para rastreabilidade
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: planType.toLowerCase(),
        subscriptionId: subscription.id
      }
    });

    // Pequeno atraso para a Asaas gerar a primeira cobrança da assinatura
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Buscar a primeira cobrança da assinatura para retornar o link de fatura e PIX
    let firstPayment: any = null;
    let pixData: { encodedImage: string; payload: string; expirationDate: string } | null = null;

    try {
      const paymentsRes = await asaasApi.get(
        `/payments?subscription=${subscription.id}`
      );
      firstPayment = paymentsRes.data?.data?.[0];

      // Se for pagamento via PIX, busca o QR Code e código Copia e Cola via endpoint dedicado
      if (firstPayment && (billingType === 'PIX' || firstPayment.billingType === 'PIX')) {
        pixData = await getPaymentPixQrCode(firstPayment.id);
      }
    } catch (err: any) {
      console.warn('⚠️ Não foi possível obter detalhes imediatos do primeiro pagamento:', err.message);
    }

    return res.json({
      subscriptionId: subscription.id,
      paymentId: firstPayment ? firstPayment.id : subscription.id,
      invoiceUrl: firstPayment ? firstPayment.invoiceUrl : null,
      bankSlipUrl: firstPayment ? firstPayment.bankSlipUrl : null,
      pixQrCodeImage: pixData?.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : null,
      pixCopyPaste: pixData?.payload || null,
      pixExpirationDate: pixData?.expirationDate || null
    });

  } catch (error: any) {
    console.error('Erro Checkout Asaas:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { error: 'Erro ao processar pagamento' };
    return res.status(status).json(errorData);
  }
});

/**
 * GET /api/payments/status
 * Verifica e sincroniza o status de assinatura ativa do usuário logado
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.subscriptionId) {
      return res.json({
        active: user.subscriptionStatus === 'active',
        plan: user.subscriptionPlan || 'trial',
        status: user.subscriptionStatus || 'trial',
        nextDueDate: null,
        cycle: null,
        cancelAtPeriodEnd: user.cancelAtPeriodEnd
      });
    }

    let active = user.subscriptionStatus === 'active';
    let nextDueDate: string | null = null;
    let cycle: string | null = null;

    try {
      if (user.subscriptionId.startsWith('sub_')) {
        const response = await asaasApi.get(`/subscriptions/${user.subscriptionId}`);
        const sub = response.data;
        active = sub.status === 'ACTIVE';
        nextDueDate = sub.nextDueDate || null;
        cycle = sub.cycle || null;

        // Auto-sincroniza com o banco local caso a Asaas tenha alterado o status
        const newDbStatus = sub.status === 'ACTIVE' ? 'active' : (sub.status === 'OVERDUE' ? 'overdue' : 'cancelled');
        if (newDbStatus !== user.subscriptionStatus) {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: newDbStatus }
          });
        }
      } else {
        // Cobrança avulsa
        const response = await asaasApi.get(`/payments/${user.subscriptionId}`);
        const pay = response.data;
        active = pay.status === 'RECEIVED' || pay.status === 'CONFIRMED';
        nextDueDate = pay.dueDate || null;

        const newDbStatus = active ? 'active' : (pay.status === 'OVERDUE' ? 'overdue' : 'cancelled');
        if (newDbStatus !== user.subscriptionStatus) {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: newDbStatus }
          });
        }
      }
    } catch (apiErr: any) {
      console.warn('[Payments Status] Falha ao consultar Asaas, usando status local do banco:', apiErr.message);
    }

    return res.json({
      active,
      plan: user.subscriptionPlan || 'trial',
      status: user.subscriptionStatus || (active ? 'active' : 'trial'),
      nextDueDate,
      cycle,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd
    });
  } catch (error: any) {
    console.error('Erro ao buscar status de assinatura:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao obter dados de assinatura.' });
  }
});

/**
 * POST /api/payments/cancel_subscription
 * Cancela a assinatura atual do usuário na Asaas
 */
router.post('/cancel_subscription', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user || !user.subscriptionId || user.subscriptionStatus === 'cancelled') {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada para cancelar.' });
    }

    if (user.subscriptionId.startsWith('sub_')) {
      try {
        await asaasApi.delete(`/subscriptions/${user.subscriptionId}`);
      } catch (err: any) {
        console.warn(`[Asaas] Assinatura ${user.subscriptionId} já cancelada ou não encontrada na API.`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          cancelAtPeriodEnd: true,
          subscriptionStatus: 'cancelled'
        }
      });

      return res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso. Você não receberá novas cobranças.'
      });
    }

    // Cancelamento local
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled',
        subscriptionPlan: 'trial',
        subscriptionId: null,
        cancelAtPeriodEnd: false
      }
    });

    return res.json({ success: true, message: 'Assinatura cancelada localmente.' });

  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
  }
});

/**
 * POST /api/payments/webhook
 * Recebe notificações de eventos de pagamento da Asaas e atualiza status no banco local com verificação rigorosa de token
 */
router.post('/webhook', async (req, res) => {
  const { event } = req.body;
  const targetObj = req.body.payment || req.body.subscription || {};
  const asaasToken = req.headers['asaas-access-token'];
  const configuredWebhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

  // Security: If ASAAS_WEBHOOK_TOKEN is not configured on the server, reject all external webhook triggers to prevent forge attacks
  if (!configuredWebhookToken || configuredWebhookToken.trim().length === 0) {
    console.error('🚨 [Security Alert] ASAAS_WEBHOOK_TOKEN não está configurado no servidor. Webhook bloqueado por segurança.');
    return res.status(503).json({ error: 'Webhook não configurado no servidor' });
  }

  // Security: Constant-time token verification to prevent timing attacks
  const receivedTokenStr = typeof asaasToken === 'string' ? asaasToken : '';
  const tokenMatches = receivedTokenStr.length === configuredWebhookToken.length &&
    crypto.timingSafeEqual(Buffer.from(receivedTokenStr), Buffer.from(configuredWebhookToken));

  if (!tokenMatches) {
    console.warn('⚠️ [Security Alert] Tentativa de chamada ao Webhook com token inválido recusada.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let extRef = targetObj.externalReference || '';
    let match = extRef.match(/^USER_(.+)_PLAN_(.+)$/);
    let userId = match ? match[1] : null;
    let planType = match ? match[2] : null;

    // Fallback: If externalReference wasn't found or didn't match, look up user by subscriptionId or payment ID
    if (!userId) {
      const subId = targetObj.subscription || targetObj.id;
      if (subId) {
        const foundUser = await prisma.user.findFirst({
          where: { subscriptionId: subId }
        });
        if (foundUser) {
          userId = foundUser.id;
          if (!planType) planType = foundUser.subscriptionPlan;
        }
      }
    }

    console.log(`🔔 Webhook Asaas Recebido: [${event}] ${userId ? `para Usuário ${userId}` : ''}`);

    if (userId) {
      // Ensure user exists before trying to update to prevent unhandled Prisma errors
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!userExists) {
        console.warn(`[Asaas Webhook] Usuário ${userId} não encontrado no banco de dados local.`);
        return res.json({ received: true });
      }

      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        const effectivePlan = (planType || userExists.subscriptionPlan || 'essencial').toLowerCase();
        console.log(`💰 Asaas: Pagamento Confirmado! Usuário: ${userId} | Plano: ${effectivePlan}`);
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionPlan: effectivePlan,
            subscriptionId: targetObj.subscription || targetObj.id,
            cancelAtPeriodEnd: false
          }
        });
      } else if (event === 'PAYMENT_OVERDUE') {
        console.warn(`⚠️ Asaas: Pagamento atrasado para Usuário: ${userId}`);
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'overdue' }
        });
      } else if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_DELETED') {
        console.warn(`↩️ Asaas: Pagamento estornado/deletado para Usuário: ${userId}`);
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'cancelled' }
        });
      } else if (event === 'SUBSCRIPTION_INACTIVATED' || event === 'SUBSCRIPTION_DELETED') {
        console.log(`🛑 Asaas: Assinatura inativada/deletada para Usuário: ${userId}`);
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'cancelled',
            cancelAtPeriodEnd: false
          }
        });
      }
    }
  } catch (error) {
    console.error('Erro ao processar Webhook Asaas:', error);
  }

  return res.json({ received: true });
});

export default router;
