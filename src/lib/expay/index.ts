import { ExpayPaymentRequest, ExpayPaymentResponse, ExpayWebhookNotification, ExpayWebhookResponse } from './types';

// Configuração da Expay
let merchantKey = '';

// Inicializar a configuração da Expay
export const initExpay = (key: string) => {
  if (!key) {
    throw new Error('EXPAY_MERCHANT_KEY não configurado no ambiente');
  }
  merchantKey = key;
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
    currency_code: 'BRL',
    ...data
  };

  try {
    const response = await fetch('https://expaybrasil.com/en/purchase/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar pagamento: ${response.status}`);
    }

    const result = await response.json();
    return result as ExpayPaymentResponse;
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Verificar status do pagamento
export const checkPaymentStatus = async (notification: ExpayWebhookNotification): Promise<ExpayWebhookResponse> => {
  try {
    const response = await fetch('https://expaybrasil.com/en/request/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        merchant_key: getMerchantKey(),
        token: notification.token
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao verificar status: ${response.status}`);
    }

    const result = await response.json();
    return result as ExpayWebhookResponse;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw error;
  }
}; 