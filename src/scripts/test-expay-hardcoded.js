// Script para testar a integração com a API da Expay usando dados hardcoded
const axios = require('axios');

// DADOS HARDCODED FORNECIDOS
const MERCHANT_KEY = '$2y$12$oxjI0EfQJ/0RQgNbHVV4rePuYVWA7XXPLnmFZqRsIqgXE/FTjc2cO';
const MERCHANT_ID = '909';
const MERCHANT_NAME = 'viralizamos';
const MERCHANT_URL = 'https://viralizamos.com';
const MERCHANT_CURRENCY_CODE = 'BRL';
const MERCHANT_CURRENCY_SYMBOL = 'R$';
const MERCHANT_REQUEST_URL = 'http://expaybrasil.com/en/purchase/link';
const MERCHANT_TRANSACTION_STATUS_URL = 'http://expaybrasil.com/en/request/status';

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
    console.log('==========================================');
    console.log('Iniciando teste de criação de pagamento PIX na Expay');
    console.log('==========================================');
    
    console.log('Merchant Key configurada:', MERCHANT_KEY ? 'Sim (comprimento: ' + MERCHANT_KEY.length + ')' : 'Não');
    
    // Criar um ID único para a fatura
    const invoiceId = `test-${Date.now()}`;
    console.log('ID da fatura:', invoiceId);
    
    // Criar o objeto de invoice no formato correto
    const invoiceData = {
      invoice_id: invoiceId,
      invoice_description: "Teste de Pagamento",
      total: "4.99",
      devedor: "Cliente Teste",
      email: "teste@exemplo.com",
      cpf_cnpj: "00000000000",
      notification_url: "https://pagamentos.viralizamos.com/api/webhooks/expay",
      telefone: "0000000000",
      items: [
        {
          name: "Produto Teste",
          price: "4.99",
          description: "Teste de integracao",
          qty: "1"
        }
      ]
    };
    
    // Criar o objeto de parâmetros para a requisição
    const formData = new URLSearchParams();
    formData.append('merchant_key', MERCHANT_KEY);
    formData.append('currency_code', MERCHANT_CURRENCY_CODE);
    formData.append('invoice', JSON.stringify(invoiceData));
    
    console.log('Dados do invoice:', JSON.stringify(invoiceData, null, 2));
    console.log('Dados do formulário:', formData.toString().replace(/merchant_key=[^&]+/, 'merchant_key=***HIDDEN***'));
    
    // Usar a URL hardcoded
    const endpointUrl = MERCHANT_REQUEST_URL;
    
    console.log('URL da API:', endpointUrl);
    console.log('Iniciando requisição para Expay...');
    
    // Fazer a requisição usando axios
    const response = await axios({
      method: 'POST',
      url: endpointUrl,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: formData,
      timeout: 30000 // 30 segundos
    });
    
    console.log('==========================================');
    console.log('Resposta recebida com status:', response.status);
    console.log('Content-Type da resposta:', response.headers['content-type']);
    console.log('Headers completos da resposta:', JSON.stringify(response.headers, null, 2));
    
    // Verificar se a resposta é uma string
    if (typeof response.data === 'string') {
      console.log('Resposta é uma string, tamanho:', response.data.length);
      console.log('Conteúdo da resposta:', JSON.stringify(response.data));
      
      // Tentar analisar como JSON se parecer JSON
      if (response.data.trim().startsWith('{') && response.data.trim().endsWith('}')) {
        try {
          const jsonData = JSON.parse(response.data);
          console.log('String analisada como JSON:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Não foi possível analisar a string como JSON:', e.message);
        }
      }
    } else {
      // Verificar se a resposta contém dados
      console.log('Resposta da API (dados):', JSON.stringify(response.data, null, 2));
      
      // Verificar se a resposta está no formato esperado (com pix_request)
      if (response.data && response.data.pix_request) {
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
    }
    console.log('==========================================');
  } catch (error) {
    console.error('==========================================');
    console.error('ERRO NO TESTE:', error.message);
    
    // Verificar se há dados na resposta de erro
    if (error.response) {
      console.error('Status da resposta de erro:', error.response.status);
      console.error('Headers da resposta de erro:', JSON.stringify(error.response.headers, null, 2));
      console.error('Dados da resposta de erro:', error.response.data);
      
      // Se a resposta for HTML, mostrar os primeiros caracteres
      if (error.response.headers['content-type']?.includes('text/html')) {
        console.error('Resposta HTML recebida, primeiros 200 caracteres:');
        console.error(error.response.data.substring(0, 200));
      }
    } else if (error.request) {
      console.error('Requisição enviada mas sem resposta');
      console.error('Detalhes da requisição:', error.request);
    } else {
      console.error('Erro na configuração da requisição:', error);
    }
    console.error('==========================================');
  }
  
  console.log('Teste concluído');
};

// Executar o teste e garantir que a saída seja exibida
console.log('Iniciando script de teste com dados hardcoded...');
testCreatePixPayment()
  .then(() => {
    console.log('Script finalizado com sucesso');
  })
  .catch((error) => {
    console.error('Erro não tratado no script:', error);
  }); 