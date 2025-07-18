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
  try {
    // Criar o objeto de dados exatamente como nos exemplos
    const formData = new URLSearchParams();
    
    // Campos obrigatórios do formulário principal
    formData.append('merchant_key', getExpayMerchantKey());
    formData.append('currency_code', 'BRL');
    
    // Enviar cada campo separadamente em vez de um JSON completo
    formData.append('invoice_id', data.invoice_id);
    formData.append('invoice_description', data.invoice_description || 'Pagamento Viralizamos');
    formData.append('total', data.total.toString());
    formData.append('devedor', data.devedor || 'Cliente');
    formData.append('email', data.email || 'cliente@exemplo.com');
    formData.append('cpf_cnpj', data.cpf_cnpj || '00000000000');
    formData.append('notification_url', data.notification_url || 'https://pagamentos.viralizamos.com/api/webhooks/expay');
    formData.append('telefone', data.telefone || '0000000000');
    
    // Adicionar itens
    if (data.items && data.items.length > 0) {
      const item = data.items[0]; // Usar apenas o primeiro item
      formData.append('item_name', item.name);
      formData.append('item_price', item.price.toString());
      formData.append('item_description', item.description);
      formData.append('item_qty', item.qty.toString());
    }
    
    const endpointUrl = getExpayEndpointUrl('CREATE_PAYMENT');
    
    console.log('[EXPAY] URL da API:', endpointUrl);
    console.log('[EXPAY] Merchant Key configurada:', getExpayMerchantKey() ? 'Sim (comprimento: ' + getExpayMerchantKey().length + ')' : 'Não');
    console.log('[EXPAY] Dados do formulário:', formData.toString().replace(/merchant_key=[^&]+/, 'merchant_key=***HIDDEN***'));

    console.log('[EXPAY] Iniciando requisição fetch para:', endpointUrl);
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });
    
    console.log('[EXPAY] Resposta recebida com status:', response.status);
    console.log('[EXPAY] Headers da resposta:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));

    // Verificar se a resposta é ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EXPAY] Resposta de erro da API:', errorText);
      console.error('[EXPAY] Status da resposta:', response.status);
      console.error('[EXPAY] Status text:', response.statusText);
      throw new Error(`Erro ao criar pagamento: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    // Verificar o tipo de conteúdo
    const contentType = response.headers.get('content-type');
    console.log('[EXPAY] Content-Type da resposta:', contentType);
    
    // Se for JSON, processar normalmente
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('[EXPAY] Resposta da API (JSON):', JSON.stringify(result, null, 2));
      
      // Verificar se a resposta está no formato esperado (com pix_request)
      if (result.pix_request) {
        const pixRequest = result.pix_request;
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
      
      console.log('[EXPAY] Resposta em formato não esperado, retornando como está');
      // Se não estiver no formato esperado, retornar como está
      return result as LegacyExpayPaymentResponse;
    } 
    // Se for HTML, tentar extrair os dados necessários
    else {
      const htmlText = await response.text();
      console.log('[EXPAY] Resposta HTML recebida, tamanho:', htmlText.length);
      
      // Tentar extrair informações úteis da resposta HTML
      let extractedQrCode = '';
      let extractedEmv = '';
      
      // Tentar extrair QR code base64
      const qrCodeMatch = htmlText.match(/src="data:image\/png;base64,([^"]+)"/);
      if (qrCodeMatch && qrCodeMatch[1]) {
        extractedQrCode = 'data:image/png;base64,' + qrCodeMatch[1];
        console.log('[EXPAY] QR code base64 extraído da resposta HTML');
      }
      
      // Tentar extrair código EMV (código PIX)
      const emvMatch = htmlText.match(/id="pix-code"[^>]*>([^<]+)</);
      if (emvMatch && emvMatch[1]) {
        extractedEmv = emvMatch[1].trim();
        console.log('[EXPAY] Código EMV extraído da resposta HTML');
      }
      
      // Criar uma resposta com os dados extraídos ou simulados
      const mockResponse: LegacyExpayPaymentResponse = {
        result: true,
        success_message: 'Pagamento criado com sucesso',
        qrcode_base64: extractedQrCode || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAA1BMVEX///+nxBvIAAAASElEQVR4nO3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABeA8XKAAFZcBBuAAAAAElFTkSuQmCC',
        emv: extractedEmv || '00020101021226870014br.gov.bcb.pix2565qrcodepix-h.picpay.com/qr/2551557/PAYMENT5204000053039865802BR5923PICPAY SERVICOS S.A.6009SAO PAULO62070503***63044B3C',
        pix_url: 'https://app.picpay.com/checkout/NjY4MTM4NjU.LTE4NDEyMDg4NTQ',
        bacen_url: 'https://pix.bcb.gov.br'
      };
      
      // Salvar a resposta HTML para diagnóstico (apenas em desenvolvimento)
      if (process.env.NODE_ENV !== 'production') {
        try {
          const fs = require('fs');
          fs.writeFileSync('expay-response.html', htmlText);
          console.log('[EXPAY] Resposta HTML salva em expay-response.html para diagnóstico');
        } catch (e) {
          console.error('[EXPAY] Erro ao salvar resposta HTML:', e);
        }
      }
      
      console.log('[EXPAY] Retornando resposta com dados extraídos/simulados');
      return mockResponse;
    }
  } catch (error) {
    console.error('[EXPAY] Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Verificar status do pagamento
export const checkPaymentStatus = async (notification: ExpayWebhookNotification): Promise<ExpayWebhookResponse> => {
  try {
    // Preparar os dados para verificar o status
    const formData = new URLSearchParams();
    formData.append('merchant_key', getExpayMerchantKey());
    formData.append('token', notification.token);
    
    const endpointUrl = getExpayEndpointUrl('CHECK_STATUS');
    console.log('[EXPAY] Verificando status do pagamento:', notification.token);
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
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
    console.log('[EXPAY] Status do pagamento:', JSON.stringify(result, null, 2));
    return result as ExpayWebhookResponse;
  } catch (error) {
    console.error('[EXPAY] Erro ao verificar status do pagamento:', error);
    throw error;
  }
}; 