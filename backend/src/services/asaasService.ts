import axios from 'axios';

const ASAAS_API_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://www.asaas.com/api/v3'
  : 'https://sandbox.asaas.com/api/v3';

console.log('🔌 Conectando ao Asaas em:', ASAAS_API_URL);

const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    access_token: process.env.ASAAS_API_KEY || '',
    'Content-Type': 'application/json',
  },
});

export const createCustomer = async (userData: { nome: string; email: string; cpf: string; telefone: string }) => {
  try {
    // Check if customer exists by email
    const { data: existingCustomers } = await asaasApi.get(
      `/customers?email=${encodeURIComponent(userData.email)}`,
    );

    if (existingCustomers.data && existingCustomers.data.length > 0) {
      // Update existing customer (PUT /customers/:id)
      const existingCustomer = existingCustomers.data[0];
      try {
        await asaasApi.put(`/customers/${existingCustomer.id}`, {
          name: userData.nome,
          cpfCnpj: userData.cpf.replace(/\D/g, ''),
          mobilePhone: userData.telefone.replace(/\D/g, ''),
          notificationDisabled: false,
        });
      } catch (err: any) {
        console.warn(
          '⚠️ Falha ao atualizar cliente Asaas (CPF/Tel pode ser inválido):',
          err.response?.data || err.message,
        );
      }
      return existingCustomer;
    }

    // Create new customer
    const { data: newCustomer } = await asaasApi.post('/customers', {
      name: userData.nome,
      email: userData.email,
      cpfCnpj: userData.cpf.replace(/\D/g, ''),
      mobilePhone: userData.telefone.replace(/\D/g, ''),
      notificationDisabled: false,
    });
    return newCustomer;
  } catch (error: any) {
    console.error(
      'Erro ao criar cliente Asaas:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const createSubscription = async (subscriptionData: any) => {
  try {
    const response = await asaasApi.post('/subscriptions', subscriptionData);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro Asaas (createSubscription):', error.message);
    if (error.response) {
      console.error(
        '📦 Detalhes do Erro:',
        JSON.stringify(error.response.data, null, 2),
      );
    }
    throw error;
  }
};

export default asaasApi;
