// Script para testar a integração com a API da Expay seguindo o exemplo em PHP
const axios = require('axios');
require('dotenv').config();

// Função para testar a criação de pagamento PIX
const testCreatePixPayment = async () => {
  try {
    console.log('==========================================');
    console.log('Iniciando teste de criação de pagamento PIX na Expay');
    console.log('==========================================');
    
    // Obter a chave do merchant das variáveis de ambiente
    const merchantKey = process.env.EXPAY_MERCHANT_KEY;
    if (!merchantKey) {
      console.error('ERRO: EXPAY_MERCHANT_KEY não configurado no ambiente');
      return;
    }
    
    console.log('Merchant Key configurada:', merchantKey ? 'Sim (comprimento: ' + merchantKey.length + ')' : 'Não');
    
    // Criar um ID único para a fatura
    const invoiceId = `test-${Date.now()}`;
    console.log('ID da fatura:', invoiceId);
    
    // Criar o objeto de invoice exatamente como no exemplo PHP
    const invoiceData = {
      invoice_id: invoiceId,
      invoice_description: "Descrição da fatura",
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
          description: "Teste de integração",
          qty: "1"
        }
      ]
    };
    
    // Criar o objeto de parâmetros para a requisição
    const formData = new URLSearchParams();
    formData.append('merchant_key', merchantKey);
    formData.append('currency_code', 'BRL');
    formData.append('invoice', JSON.stringify(invoiceData));
    
    console.log('Dados do invoice:', JSON.stringify(invoiceData, null, 2));
    console.log('Dados do formulário:', formData.toString().replace(/merchant_key=[^&]+/, 'merchant_key=***HIDDEN***'));
    
    const endpointUrl = 'https://expaybrasil.com/en/purchase/link';
    
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
console.log('Iniciando script de teste...');
testCreatePixPayment()
  .then(() => {
    console.log('Script finalizado com sucesso');
  })
  .catch((error) => {
    console.error('Erro não tratado no script:', error);
  }); 