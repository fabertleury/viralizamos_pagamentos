import { ExpayPaymentRequest, ExpayPaymentResponse, ExpayWebhookNotification, ExpayWebhookResponse, LegacyExpayPaymentResponse } from './types';
import { getExpayBaseUrl, getExpayEndpointUrl, getExpayMerchantKey, getExpayMerchantId } from './config';

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
  invoice?: string;
}): Promise<LegacyExpayPaymentResponse> => {
  const paymentData: ExpayPaymentRequest = {
    merchant_key: getExpayMerchantKey(),
    merchant_id: getExpayMerchantId(),
    currency_code: 'BRL',
    ...data,
    // Garantir que o invoice_id seja uma string
    invoice_id: String(data.invoice_id)
  };

  const endpointUrl = getExpayEndpointUrl('CREATE_PAYMENT');
  console.log('[EXPAY] Enviando solicitação para criar pagamento PIX:', JSON.stringify(paymentData).substring(0, 200) + '...');
  console.log('[EXPAY] URL da API:', endpointUrl);

  try {
    const response = await fetch(endpointUrl, {
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
    
    // Verificar se a resposta está no formato esperado (com pix_request)
    if (result.pix_request) {
      const pixRequest = result.pix_request;
      // Converter para o formato legado para compatibilidade
      return {
        result: pixRequest.result,
        success_message: pixRequest.success_message,
        qrcode_base64: pixRequest.pix_code?.qrcode_base64 || '',
        emv: pixRequest.pix_code?.emv || '',
        pix_url: pixRequest.pix_code?.pix_url || '',
        bacen_url: pixRequest.pix_code?.bacen_url || ''
      };
    }
    
    // Se não estiver no formato esperado, retornar como está
    return result as LegacyExpayPaymentResponse;
  } catch (error) {
    console.error('[EXPAY] Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Verificar status do pagamento
export const checkPaymentStatus = async (notification: ExpayWebhookNotification): Promise<ExpayWebhookResponse> => {
  try {
    const statusData = {
      merchant_key: getExpayMerchantKey(),
      merchant_id: getExpayMerchantId(),
      token: notification.token
    };
    
    const endpointUrl = getExpayEndpointUrl('CHECK_STATUS');
    console.log('[EXPAY] Verificando status do pagamento:', JSON.stringify(statusData));
    
    const response = await fetch(endpointUrl, {
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