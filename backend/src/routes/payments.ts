import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './auth';
import { createCustomer, createSubscription } from '../services/asaasService';
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
        successUrl: 'http://localhost:3000/profile',
        autoRedirect: true
      }
    };

    const subscription = await createSubscription(subscriptionData);

    // Pequeno atraso para a Asaas gerar a primeira cobrança da assinatura
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Buscar a primeira cobrança da assinatura para retornar o link de fatura
    const paymentsRes = await asaasApi.get(
      `/payments?subscription=${subscription.id}`
    );
    const firstPayment = paymentsRes.data?.data?.[0];

    return res.json({
      paymentId: firstPayment ? firstPayment.id : subscription.id,
      invoiceUrl: firstPayment ? firstPayment.invoiceUrl : null,
      bankSlipUrl: firstPayment ? firstPayment.bankSlipUrl : null,
      pixQrCode: firstPayment ? firstPayment.pixQrCode : null
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
 * Verifica o status de assinatura ativa do usuário logado
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user || !user.subscriptionId) {
      return res.json({ active: false, nextDueDate: null });
    }

    if (user.subscriptionId.startsWith('sub_')) {
      const response = await asaasApi.get(`/subscriptions/${user.subscriptionId}`);
      const sub = response.data;
      return res.json({
        active: sub.status === 'ACTIVE',
        nextDueDate: sub.nextDueDate,
        cycle: sub.cycle
      });
    } else {
      // Cobrança Avulsa/Pix avulso
      const response = await asaasApi.get(`/payments/${user.subscriptionId}`);
      const pay = response.data;
      return res.json({
        active: pay.status === 'RECEIVED' || pay.status === 'CONFIRMED',
        nextDueDate: pay.dueDate,
        cycle: null
      });
    }
  } catch (error: any) {
    console.error('Erro ao buscar status de assinatura:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao obter dados de assinatura do Asaas.' });
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
      return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada.' });
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
          cancelAtPeriodEnd: true
        }
      });

      return res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso na Asaas. Acesso ativo até o fim do período já pago.'
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

    return res.json({ success: true, message: 'Assinatura encerrada localmente.' });

  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
  }
});

/**
 * POST /api/payments/webhook
 * Recebe notificações de eventos de pagamento e atualiza status no banco local
 */
router.post('/webhook', async (req, res) => {
  const { event, payment } = req.body;
  const asaasToken = req.headers['asaas-access-token'];

  if (process.env.ASAAS_WEBHOOK_TOKEN && asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    console.warn('⚠️ Tentativa de Webhook com token inválido recusada.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    try {
      if (!payment || !payment.externalReference) {
        console.warn('⚠️ Webhook Asaas: Recebido evento de pagamento sem externalReference.');
        return res.json({ received: true });
      }

      const match = payment.externalReference.match(/^USER_(.+)_PLAN_(.+)$/);
      if (!match) {
        console.warn(`⚠️ Webhook Asaas: Formato de externalReference inválido: ${payment.externalReference}`);
        return res.json({ received: true });
      }

      const userId = match[1];
      const planType = match[2];

      console.log(`💰 Asaas: Pagamento Confirmado! Usuário: ${userId} | Plano: ${planType}`);

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'active',
            subscriptionPlan: planType.toLowerCase(),
            subscriptionId: payment.subscription || payment.id,
            cancelAtPeriodEnd: false
          }
        });
      }
    } catch (error) {
      console.error('Erro ao processar Webhook Asaas:', error);
    }
  }

  return res.json({ received: true });
});

export default router;
