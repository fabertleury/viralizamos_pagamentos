const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configurações
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:3002/api/orders/create';
const API_KEY = process.env.ORDERS_API_KEY || 'default_key';

// Função para testar a conexão com o microserviço de orders
async function testOrdersConnection() {
  console.log('🔄 Testando conexão com microserviço de orders...');
  console.log(`🔗 URL: ${ORDERS_API_URL}`);
  
  try {
    const response = await axios.get('http://localhost:3002/api/ping', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    if (response.data && response.data.status === 'ok') {
      console.log('✅ Conexão com orders bem sucedida!');
      console.log('📊 Resposta:', response.data);
      return true;
    } else {
      console.log('⚠️ Conexão estabelecida, mas resposta inesperada:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Falha na conexão com microserviço de orders:', error.message);
    return false;
  }
}

// Função para testar o processamento de fila de pagamentos
async function testQueueProcessing() {
  console.log('\n🔄 Testando processador de fila de pagamentos...');
  
  try {
    // Buscar item de exemplo na fila
    const pendingItem = await prisma.processingQueue.findFirst({
      where: {
        status: 'pending',
        type: 'payment_confirmation'
      },
      include: {
        payment_request: true
      }
    });
    
    if (!pendingItem) {
      console.log('⚠️ Nenhum item pendente na fila para testar.');
      return;
    }
    
    console.log(`🔍 Item encontrado: ${pendingItem.id}`);
    
    // Extrair informações
    const metadata = pendingItem.metadata ? JSON.parse(pendingItem.metadata) : {};
    console.log('📋 Metadata:', metadata);
    
    // Verificar transaction_id
    if (!metadata.transaction_id) {
      console.log('❌ Erro: transaction_id não encontrado no metadata!');
      return;
    }
    
    // Buscar transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: metadata.transaction_id }
    });
    
    if (!transaction) {
      console.log(`❌ Erro: Transação ${metadata.transaction_id} não encontrada!`);
      return;
    }
    
    console.log('✅ Transação encontrada:', {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      method: transaction.method
    });
    
    // Verificar dados do serviço
    const serviceData = pendingItem.payment_request.additional_data ? 
      JSON.parse(pendingItem.payment_request.additional_data).service : null;
      
    if (!serviceData) {
      console.log('❌ Erro: Dados do serviço não encontrados!');
      return;
    }
    
    console.log('✅ Dados do serviço encontrados:', {
      id: serviceData.id,
      name: serviceData.name, 
      quantity: serviceData.quantity
    });
    
    // Formatar dados para envio ao microserviço de orders
    const orderData = {
      transaction_id: transaction.id,
      service_id: pendingItem.payment_request.service_id,
      external_payment_id: metadata.external_id,
      amount: transaction.amount,
      quantity: serviceData.quantity || 100,
      target_username: pendingItem.payment_request.profile_username,
      customer_email: pendingItem.payment_request.customer_email,
      customer_name: pendingItem.payment_request.customer_name,
      payment_data: {
        method: transaction.method,
        status: transaction.status
      }
    };
    
    console.log('📤 Dados preparados para envio:', orderData);
    
    // Verificar se podemos prosseguir para teste de envio real
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n⚠️ Deseja enviar dados de teste ao microserviço de orders? (s/n) ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        try {
          console.log('🔄 Enviando dados para orders...');
          
          const response = await axios.post(ORDERS_API_URL, orderData, {
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Resposta do microserviço de orders:', response.data);
          if (response.data.success) {
            console.log(`🎉 Order criada com sucesso! ID: ${response.data.order_id}`);
          } else {
            console.log('❌ Falha ao criar order:', response.data.error);
          }
        } catch (error) {
          console.error('❌ Erro ao enviar dados para orders:', error.message);
          if (error.response) {
            console.error('📋 Resposta de erro:', error.response.data);
          }
        }
      } else {
        console.log('❌ Operação cancelada pelo usuário.');
      }
      
      readline.close();
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar processamento de fila:', error);
    await prisma.$disconnect();
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando testes de conexão entre microserviços...\n');
  
  const ordersConnected = await testOrdersConnection();
  
  if (ordersConnected) {
    await testQueueProcessing();
  } else {
    console.log('⚠️ Teste de processamento de fila cancelado devido a falha na conexão com orders.');
    await prisma.$disconnect();
  }
}

runTests(); 