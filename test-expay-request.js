// Script para testar a função createPixPayment localmente
import dotenv from 'dotenv';
import { createPixPayment } from './src/lib/expay/index.js';

dotenv.config();

async function testExpayRequest() {
  console.log('Iniciando teste de requisição para o Expay...');
  
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
    
    console.log('Resposta recebida com sucesso:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Erro ao fazer requisição:');
    console.error(error);
  }
}

testExpayRequest(); 