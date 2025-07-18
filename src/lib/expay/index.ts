import { ExpayPaymentRequest, ExpayPaymentResponse, ExpayWebhookNotification, ExpayWebhookResponse } from './types';

// Configuração da Expay
let merchantKey = '';
let baseUrl = '';

// Inicializar a configuração da Expay
export const initExpay = (key: string, url?: string) => {
  if (!key) {
    throw new Error('EXPAY_MERCHANT_KEY não configurado no ambiente');
  }
  merchantKey = key;
  baseUrl = url || process.env.EXPAY_BASE_URL || 'https://expaybrasil.com';
};

// Obter a merchant key
export const getMerchantKey = () => {
  if (!merchantKey) {
    const key = process.env.EXPAY_MERCHANT_KEY;
    if (!key) {
      throw new Error('EXPAY_MERCHANT_KEY não configurado no ambiente');
    }
    merchantKey = key;
  }
  return merchantKey;
};

// Obter a URL base
export const getBaseUrl = () => {
  if (!baseUrl) {
    baseUrl = process.env.EXPAY_BASE_URL || 'https://expaybrasil.com';
  }
  return baseUrl;
};

// Criar um pagamento PIX
export const createPixPayment = async (data: {
  invoice_id: string;
  invoice_description: string;
  total: number;
  devedor: string;
  email: string;
  cpf_cnpj: string;
  notification_url: string;
  telefone: string;
  items: Array<{
    name: string;
    price: number;
    description: string;
    qty: number;
  }>;
}): Promise<ExpayPaymentResponse> => {
  const paymentData: ExpayPaymentRequest = {
    merchant_key: getMerchantKey(),
    merchant_id: process.env.EXPAY_MERCHANT_ID || '909',
    currency_code: 'BRL',
    ...data
  };

  console.log('[EXPAY] Enviando solicitação para criar pagamento PIX:', JSON.stringify(paymentData).substring(0, 200) + '...');
  console.log('[EXPAY] URL da API:', `${getBaseUrl()}/en/purchase/link`);

  try {
    const response = await fetch(`${getBaseUrl()}/en/purchase/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    // Verificar se a resposta é ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EXPAY] Resposta de erro da API:', errorText);
      throw new Error(`Erro ao criar pagamento: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    // Verificar o tipo de conteúdo
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('[EXPAY] Resposta não é JSON:', responseText);
      throw new Error(`Resposta não é JSON: ${responseText.substring(0, 200)}`);
    }

    const result = await response.json();
    console.log('[EXPAY] Resposta da API:', JSON.stringify(result).substring(0, 200) + '...');
    return result as ExpayPaymentResponse;
  } catch (error) {
    console.error('[EXPAY] Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Verificar status do pagamento
export const checkPaymentStatus = async (notification: ExpayWebhookNotification): Promise<ExpayWebhookResponse> => {
  try {
    const statusData = {
      merchant_key: getMerchantKey(),
      merchant_id: process.env.EXPAY_MERCHANT_ID || '909',
      token: notification.token
    };
    
    console.log('[EXPAY] Verificando status do pagamento:', JSON.stringify(statusData));
    
    const response = await fetch(`${getBaseUrl()}/en/request/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(statusData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EXPAY] Erro ao verificar status:', errorText);
      throw new Error(`Erro ao verificar status: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('[EXPAY] Resposta não é JSON:', responseText);
      throw new Error(`Resposta não é JSON: ${responseText.substring(0, 200)}`);
    }

    const result = await response.json();
    console.log('[EXPAY] Status do pagamento:', JSON.stringify(result));
    return result as ExpayWebhookResponse;
  } catch (error) {
    console.error('[EXPAY] Erro ao verificar status do pagamento:', error);
    throw error;
  }
}; 