// Script para testar a função createPixPayment
import { createPixPayment } from '../lib/expay';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

console.log('Configurações do Expay:');
console.log('EXPAY_MERCHANT_KEY:', process.env.EXPAY_MERCHANT_KEY ? `Configurado (${process.env.EXPAY_MERCHANT_KEY.substring(0, 10)}...)` : 'Não configurado');
console.log('EXPAY_BASE_URL:', process.env.EXPAY_BASE_URL || 'Não configurado');
console.log('EXPAY_MERCHANT_ID:', process.env.EXPAY_MERCHANT_ID || 'Não configurado');

async function testExpayRequest() {
  console.log('\nIniciando teste de requisição para o Expay...');
  
  try {
    const result = await createPixPayment({
      invoice_id: 'teste-local-' + Date.now(),
      invoice_description: 'Teste Local',
      total: 1.00,
      devedor: 'Cliente Teste',
      email: 'teste@exemplo.com',
      cpf_cnpj: '00000000000',
      notification_url: 'https://pagamentos.viralizamos.com/api/webhooks/expay',
      telefone: '0000000000',
      items: [{
        name: 'Item de Teste',
        price: 1.00,
        description: 'Descrição do Item de Teste',
        qty: 1
      }]
    });
    
    console.log('\nResposta recebida com sucesso:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\nErro ao fazer requisição:');
    console.error(error);
  }
}

// Executar o teste
testExpayRequest(); 