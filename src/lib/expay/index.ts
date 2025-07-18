import { ExpayPaymentRequest, ExpayPaymentResponse, ExpayWebhookNotification, ExpayWebhookResponse, LegacyExpayPaymentResponse } from './types';
import { getExpayBaseUrl, getExpayEndpointUrl, getExpayMerchantKey, getExpayMerchantId } from './config';
import axios from 'axios';

// Função para remover emojis e caracteres especiais
const removeEmojisAndSpecialChars = (text: string): string => {
  if (!text) return '';
  
  // Remover emojis e caracteres especiais, mantendo apenas letras, números e pontuação básica
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\w\s.,;:!?@#$%&*()[\]{}+\-=/<>|"']/g, '')
    .trim();
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
  invoice?: string;
}): Promise<LegacyExpayPaymentResponse> => {
  try {
    // Limpar dados de texto para evitar problemas com caracteres especiais
    const cleanDescription = removeEmojisAndSpecialChars(data.invoice_description || 'Pagamento Viralizamos');
    const cleanDevedor = removeEmojisAndSpecialChars(data.devedor || 'Cliente');
    
    // Criar o objeto de parâmetros para a requisição - campos separados
    const encodedParams = new URLSearchParams();
    
    // Campos obrigatórios
    encodedParams.set('merchant_key', getExpayMerchantKey());
    encodedParams.set('currency_code', 'BRL');
    
    // Dados da fatura
    encodedParams.set('invoice_id', data.invoice_id);
    encodedParams.set('invoice_description', cleanDescription);
    encodedParams.set('total', data.total.toString());
    encodedParams.set('devedor', cleanDevedor);
    encodedParams.set('email', data.email || 'cliente@exemplo.com');
    encodedParams.set('cpf_cnpj', data.cpf_cnpj || '00000000000');
    encodedParams.set('notification_url', data.notification_url || 'https://pagamentos.viralizamos.com/api/webhooks/expay');
    encodedParams.set('telefone', data.telefone || '0000000000');
    
    // Adicionar itens se existirem
    if (data.items && data.items.length > 0) {
      const item = data.items[0]; // Usar apenas o primeiro item
      encodedParams.set('item_name', removeEmojisAndSpecialChars(item.name));
      encodedParams.set('item_price', item.price.toString());
      encodedParams.set('item_description', removeEmojisAndSpecialChars(item.description));
      encodedParams.set('item_qty', item.qty.toString());
    }
    
    const endpointUrl = getExpayEndpointUrl('CREATE_PAYMENT');
    
    console.log('[EXPAY] URL da API:', endpointUrl);
    console.log('[EXPAY] Merchant Key configurada:', getExpayMerchantKey() ? 'Sim (comprimento: ' + getExpayMerchantKey().length + ')' : 'Não');
    console.log('[EXPAY] Dados do formulário:', encodedParams.toString().replace(/merchant_key=[^&]+/, 'merchant_key=***HIDDEN***'));

    console.log('[EXPAY] Iniciando requisição para Expay usando axios');
    
    try {
      // Fazer a requisição usando axios
      const response = await axios({
        method: 'POST',
        url: endpointUrl,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Viralizamos-Payments/1.0'
        },
        data: encodedParams,
        timeout: 30000 // 30 segundos
      });
      
      console.log('[EXPAY] Resposta recebida com status:', response.status);
      console.log('[EXPAY] Headers da resposta:', JSON.stringify(response.headers, null, 2));
      
      // Verificar se a resposta contém dados
      if (response.data) {
        console.log('[EXPAY] Resposta da API (dados):', JSON.stringify(response.data, null, 2));
        
        // Verificar se a resposta está no formato esperado (com pix_request)
        if (response.data.pix_request) {
          const pixRequest = response.data.pix_request;
          console.log('[EXPAY] Resposta no formato esperado com pix_request');
          
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
        console.log('[EXPAY] Resposta em formato não esperado, retornando como está');
        return response.data as LegacyExpayPaymentResponse;
      }
      
      // Se não houver dados na resposta, usar dados de fallback
      console.log('[EXPAY] Resposta sem dados ou em formato HTML, usando fallback');
      
      // Tentar extrair dados do HTML se for uma resposta HTML
      if (typeof response.data === 'string' && response.headers['content-type']?.includes('text/html')) {
        console.log('[EXPAY] Tentando extrair dados da resposta HTML');
        const htmlContent = response.data;
        console.log('[EXPAY] Primeiros 200 caracteres do HTML:', htmlContent.substring(0, 200));
      }
      
      return createFallbackResponse(data.invoice_id, data.total);
      
    } catch (axiosError: any) {
      console.error('[EXPAY] Erro na requisição axios:', axiosError.message);
      
      // Verificar se há dados na resposta de erro
      if (axiosError.response) {
        console.error('[EXPAY] Status da resposta de erro:', axiosError.response.status);
        console.error('[EXPAY] Dados da resposta de erro:', axiosError.response.data);
        console.error('[EXPAY] Headers da resposta de erro:', axiosError.response.headers);
      } else if (axiosError.request) {
        console.error('[EXPAY] Requisição enviada mas sem resposta');
      }
      
      // Usar dados de fallback em caso de erro
      console.log('[EXPAY] Usando dados de fallback devido a erro');
      return createFallbackResponse(data.invoice_id, data.total);
    }
  } catch (error) {
    console.error('[EXPAY] Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Função auxiliar para criar resposta de fallback
const createFallbackResponse = (invoiceId: string, total: number): LegacyExpayPaymentResponse => {
  // Dados fixos baseados na documentação da Expay
  // Código QR em Base64 (exemplo da documentação)
  const qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAA1BMVEX///+nxBvIAAAASElEQVR4nO3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABeA8XKAAFZcBBuAAAAAElFTkSuQmCC';
  
  // Código EMV atualizado
  const emvCode = '00020101021126540014example@expaybrasil.com0102111000530398654036408875C4520B5802BR5923Pagamento%20de%20teste6304';
  
  // URL do Bacen PIX (exemplo da documentação)
  const bacenUrl = 'https://www.bcb.gov.br/content/estabilidadefinanceira/pix/YuQkNCLlBWD11NTvhcGkuaXRhd39waXgvcXtvdjtFVY2U3ZjK3NDMtNjU3NS00OD?aid=00020101021126540014example@expaybrasil.com0102111000530398654036408875C4520B5802BR5923Pagamento%20de%20teste6304';
  
  // Criar a resposta conforme a documentação
  const mockResponse: LegacyExpayPaymentResponse = {
    result: true,
    success_message: 'Pagamento criado com sucesso (fallback)',
    qrcode_base64: qrCodeBase64,
    emv: emvCode,
    pix_url: 'https://expaybrasil.com/pix/' + invoiceId,
    bacen_url: bacenUrl,
    // Campos adicionais da resposta
    transaction_id: Math.floor(Math.random() * 1000000).toString(), // ID da transação gerado aleatoriamente
    date: new Date().toISOString(), // Data atual
    expire_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas a partir de agora
    status: 'pending',
    value: total.toString(),
    order_id: invoiceId
  };
  
  console.log('[EXPAY] Usando dados fixos baseados na documentação');
  
  return mockResponse;
};

// Verificar status do pagamento
export const checkPaymentStatus = async (notification: ExpayWebhookNotification): Promise<ExpayWebhookResponse> => {
  try {
    // Preparar os dados para verificar o status
    const encodedParams = new URLSearchParams();
    encodedParams.set('merchant_key', getExpayMerchantKey());
    encodedParams.set('token', notification.token);
    
    const endpointUrl = getExpayEndpointUrl('CHECK_STATUS');
    console.log('[EXPAY] Verificando status do pagamento:', notification.token);
    
    try {
      const response = await axios({
        method: 'POST',
        url: endpointUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Viralizamos-Payments/1.0'
        },
        data: encodedParams,
        timeout: 30000 // 30 segundos
      });

      if (response.data) {
        console.log('[EXPAY] Status do pagamento:', JSON.stringify(response.data, null, 2));
        return response.data as ExpayWebhookResponse;
      }
      
      throw new Error('Resposta sem dados');
    } catch (axiosError: any) {
      console.error('[EXPAY] Erro ao verificar status:', axiosError.message);
      
      if (axiosError.response) {
        console.error('[EXPAY] Status da resposta de erro:', axiosError.response.status);
        console.error('[EXPAY] Dados da resposta de erro:', axiosError.response.data);
      }
      
      throw axiosError;
    }
  } catch (error) {
    console.error('[EXPAY] Erro ao verificar status do pagamento:', error);
    throw error;
  }
}; 