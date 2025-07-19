// Script para testar a integração com a API da Expay usando axios
const axios = require('axios');
require('dotenv').config();

// Função para remover emojis e caracteres especiais
const removeEmojisAndSpecialChars = (text) => {
  if (!text) return '';
  
  // Remover emojis e caracteres especiais, mantendo apenas letras, números e pontuação básica
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\w\s.,;:!?@#$%&*()[\]{}+\-=/<>|"']/g, '')
    .trim();
};

// Função para testar a criação de pagamento PIX
const testCreatePixPayment = async () => {
  try {
    console.log('Iniciando teste de criação de pagamento PIX na Expay');
    
    // Obter a chave do merchant das variáveis de ambiente
    const merchantKey = process.env.EXPAY_MERCHANT_KEY;
    if (!merchantKey) {
      throw new Error('EXPAY_MERCHANT_KEY não configurado no ambiente');
    }
    
    console.log('Merchant Key configurada:', merchantKey ? 'Sim (comprimento: ' + merchantKey.length + ')' : 'Não');
    
    // Criar dados de teste
    const invoiceId = `test-${Date.now()}`;
    const invoiceDescription = removeEmojisAndSpecialChars('Teste de Pagamento Viralizamos');
    const total = 4.99;
    const devedor = removeEmojisAndSpecialChars('Cliente Teste');
    const email = 'teste@exemplo.com';
    
    // Criar o objeto de parâmetros para a requisição - campos separados
    const encodedParams = new URLSearchParams();
    
    // Campos obrigatórios
    encodedParams.set('merchant_key', merchantKey);
    encodedParams.set('currency_code', 'BRL');
    
    // Dados da fatura
    encodedParams.set('invoice_id', invoiceId);
    encodedParams.set('invoice_description', invoiceDescription);
    encodedParams.set('total', total.toString());
    encodedParams.set('devedor', devedor);
    encodedParams.set('email', email);
    encodedParams.set('cpf_cnpj', '00000000000');
    encodedParams.set('notification_url', 'https://pagamentos.viralizamos.com/api/webhooks/expay');
    encodedParams.set('telefone', '0000000000');
    
    // Dados do item
    encodedParams.set('item_name', 'Teste de Pagamento');
    encodedParams.set('item_price', total.toString());
    encodedParams.set('item_description', 'Teste de integração com Expay');
    encodedParams.set('item_qty', '1');
    
    const endpointUrl = 'https://expaybrasil.com/en/purchase/link';
    
    console.log('URL da API:', endpointUrl);
    console.log('Dados do formulário:', encodedParams.toString().replace(/merchant_key=[^&]+/, 'merchant_key=***HIDDEN***'));
    
    console.log('Iniciando requisição para Expay usando axios');
    
    // Configurar a requisição axios
    const options = {
      method: 'POST',
      url: endpointUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Viralizamos-Payments/1.0'
      },
      data: encodedParams,
      timeout: 30000 // 30 segundos
    };
    
    // Fazer a requisição usando axios
    const response = await axios.request(options);
    
    console.log('Resposta recebida com status:', response.status);
    console.log('Headers da resposta:', JSON.stringify(response.headers, null, 2));
    
    // Verificar se a resposta contém dados
    if (response.data) {
      console.log('Resposta da API (dados):', JSON.stringify(response.data, null, 2));
      
      // Verificar se a resposta está no formato esperado (com pix_request)
      if (response.data.pix_request) {
        const pixRequest = response.data.pix_request;
        console.log('Resposta no formato esperado com pix_request');
        
        // Extrair os dados importantes
        const result = {
          result: pixRequest.result,
          success_message: pixRequest.success_message,
          qrcode_base64: pixRequest.pix_code?.qrcode_base64 ? 'Base64 recebido (tamanho: ' + pixRequest.pix_code.qrcode_base64.length + ')' : 'Não recebido',
          emv: pixRequest.pix_code?.emv || 'Não recebido',
          pix_url: pixRequest.pix_code?.pix_url || 'Não recebido',
          bacen_url: pixRequest.pix_code?.bacen_url || 'Não recebido'
        };
        
        console.log('Dados extraídos:', result);
        
        // Verificar se o código EMV foi recebido
        if (pixRequest.pix_code?.emv) {
          console.log('Código EMV recebido com sucesso!');
          console.log('EMV:', pixRequest.pix_code.emv);
        } else {
          console.log('Código EMV não recebido!');
        }
      } else {
        console.log('Resposta em formato não esperado');
      }
    } else {
      console.log('Resposta sem dados');
    }
  } catch (error) {
    console.error('Erro no teste:', error.message);
    
    // Verificar se há dados na resposta de erro
    if (error.response) {
      console.error('Status da resposta de erro:', error.response.status);
      console.error('Dados da resposta de erro:', error.response.data);
      console.error('Headers da resposta de erro:', error.response.headers);
    } else if (error.request) {
      console.error('Requisição enviada mas sem resposta');
    }
  }
};

// Executar o teste
testCreatePixPayment(); 