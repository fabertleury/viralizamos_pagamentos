/**
 * Script para simular um webhook do Mercado Pago para o microserviço de pagamentos
 * 
 * Este script simula um webhook do Mercado Pago para uma transação já existente
 * ou cria uma transação de teste se necessário.
 * 
 * Para executar:
 * node scripts/simulate-mercadopago-webhook.js [transaction_external_id]
 */

const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configurações
const WEBHOOK_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

// Gerar payload de webhook do Mercado Pago
function generateMercadoPagoWebhook(paymentId) {
  return {
    type: 'payment',
    data: {
      id: paymentId
    }
  };
}

// Função principal
async function simulateWebhook() {
  console.log('=== SIMULAÇÃO DE WEBHOOK DO MERCADO PAGO ===');
  
  try {
    // Verificar se foi fornecido um ID de transação
    const providedId = process.argv[2];
    let externalId;
    
    if (providedId) {
      console.log(`\nUsando ID fornecido: ${providedId}`);
      externalId = providedId;
    } else {
      // Buscar uma transação existente
      console.log('\nBuscando uma transação existente...');
      const transaction = await prisma.transaction.findFirst({
        where: {
          provider: 'mercadopago'
        }
      });
      
      if (transaction) {
        externalId = transaction.external_id;
        console.log(`\nTransação encontrada com external_id: ${externalId}`);
      } else {
        console.log('\nNenhuma transação encontrada. Criando nova transação de teste...');
        // Criar uma transação de teste
        externalId = 'test-' + Date.now().toString();
        
        // Buscar um payment_request
        const paymentRequest = await prisma.paymentRequest.findFirst();
        
        if (!paymentRequest) {
          console.error('Nenhum payment_request encontrado para criar uma transação de teste.');
          return { success: false, error: 'Nenhum payment_request encontrado' };
        }
        
        // Criar uma transação de teste
        const newTransaction = await prisma.transaction.create({
          data: {
            payment_request_id: paymentRequest.id,
            external_id: externalId,
            provider: 'mercadopago',
            method: 'pix',
            amount: 100.00,
            status: 'pending',
            metadata: JSON.stringify({
              test: true,
              created_at: new Date().toISOString()
            })
          }
        });
        
        console.log(`\nTransação de teste criada com external_id: ${externalId}`);
        console.log('ID da transação:', newTransaction.id);
      }
    }
    
    // Gerar payload de webhook
    const webhookPayload = generateMercadoPagoWebhook(externalId);
    console.log('\nPayload de webhook gerado:');
    console.log(JSON.stringify(webhookPayload, null, 2));
    
    // URL do webhook
    const webhookEndpoint = `${WEBHOOK_URL}/webhooks/mercadopago`;
    console.log(`\nEnviando webhook para: ${webhookEndpoint}`);
    
    // Enviar webhook
    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    // Obter resposta como texto
    const responseText = await response.text();
    
    // Tentar parsear como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    console.log(`\nResposta (status ${response.status}):`);
    console.log(JSON.stringify(responseData, null, 2));
    
    return {
      success: response.ok,
      status: response.status,
      external_id: externalId,
      response: responseData
    };
  } catch (error) {
    console.error('\nErro durante a simulação:', error);
    return { success: false, error: error.message };
  }
}

// Executar a simulação
simulateWebhook()
  .then(result => {
    console.log('\n=== RESUMO DA SIMULAÇÃO ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Simulação concluída com sucesso!');
    } else {
      console.log('\n❌ Simulação falhou!');
    }
  })
  .catch(error => {
    console.error('\nErro ao executar simulação:', error);
  })
  .finally(() => {
    console.log('\nFechando conexões...');
    prisma.$disconnect();
  }); 