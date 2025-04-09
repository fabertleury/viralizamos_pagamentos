/**
 * Script para testar a notificação entre microserviços de pagamentos e orders
 * 
 * Este script vai:
 * 1. Buscar uma transação "approved" no banco de dados, ou
 * 2. Criar uma transação fake se não encontrar nenhuma
 * 3. Chamar a função notifyOrdersService diretamente
 * 
 * Para executar:
 * node scripts/test-notification.js
 */

// Importar módulos e configuração
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Carregar variáveis de ambiente
require('dotenv').config();

// Obter a URL do serviço de orders
const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
console.log(`URL do serviço de orders: ${ordersServiceUrl}`);

// Obter o segredo JWT
const jwtSecret = process.env.JWT_SECRET || 'payment_service_secret';

// Função para testar a conexão de rede com o serviço de orders
async function testConnection() {
  console.log('\n=== TESTANDO CONEXÃO COM O SERVIÇO DE ORDERS ===');
  
  try {
    console.log(`Verificando conectividade com: ${ordersServiceUrl}`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout após 10 segundos')), 10000);
    });
    
    const fetchPromise = fetch(`${ordersServiceUrl}/api/ping`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ Conexão com o serviço de orders estabelecida com sucesso!');
      console.log(`Resposta: ${data}`);
      return true;
    } else {
      console.log(`❌ Erro ao conectar com o serviço de orders: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro de conexão: ${error.message}`);
    console.log('\nPossíveis causas:');
    console.log('1. URL incorreta configurada em ORDERS_SERVICE_URL');
    console.log('2. Serviço de orders não está em execução');
    console.log('3. Problemas de rede entre os serviços (firewall, proxy, etc.)');
    console.log('4. Endpoint /api/ping não existe no serviço de orders');
    return false;
  }
}

// Função para testar a autenticação com o serviço de orders
async function testAuthentication() {
  console.log('\n=== TESTANDO AUTENTICAÇÃO COM O SERVIÇO DE ORDERS ===');
  
  try {
    // Criar um token JWT de teste
    const token = jwt.sign(
      { test: true, timestamp: Date.now() }, 
      jwtSecret,
      { expiresIn: '5m' }
    );
    
    console.log(`Enviando requisição autenticada para: ${ordersServiceUrl}/api/orders/webhook/ping`);
    
    const response = await fetch(`${ordersServiceUrl}/api/orders/webhook/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Autenticação com o serviço de orders estabelecida com sucesso!');
      console.log(`Resposta: ${JSON.stringify(data)}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Erro ao autenticar com o serviço de orders: ${response.status} ${response.statusText}`);
      console.log(`Resposta: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\nPossíveis causas:');
        console.log('1. Segredo JWT (JWT_SECRET) diferente entre os serviços');
        console.log('2. Token expirado ou inválido');
      }
      
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro de autenticação: ${error.message}`);
    return false;
  }
}

// Função para enviar uma notificação de teste para o serviço de orders
async function testWebhook() {
  console.log('\n=== ENVIANDO NOTIFICAÇÃO DE TESTE PARA O SERVIÇO DE ORDERS ===');
  
  try {
    // Buscar uma transação aprovada no banco
    console.log('Buscando uma transação aprovada no banco...');
    const transaction = await prisma.transaction.findFirst({
      where: {
        status: 'approved',
      },
      include: {
        payment_request: true
      }
    });
    
    let transactionData;
    
    if (transaction) {
      console.log(`Transação encontrada: ${transaction.id}`);
      console.log('Detalhes:', {
        external_id: transaction.external_id,
        provider: transaction.provider,
        method: transaction.method,
        amount: transaction.amount,
        payment_request_id: transaction.payment_request_id,
        profile_username: transaction.payment_request?.profile_username || 'N/A',
      });
      
      transactionData = transaction;
    } else {
      console.log('Nenhuma transação aprovada encontrada. Criando dados fake...');
      
      // Criar dados fake para teste
      const fakeId = `fake_${Date.now()}`;
      
      transactionData = {
        id: fakeId,
        status: 'approved',
        amount: 29.90,
        external_id: `fake_mp_${Date.now()}`,
        payment_request_id: `fake_pr_${Date.now()}`,
        provider: 'mercadopago',
        method: 'pix',
        payment_request: {
          id: `fake_pr_${Date.now()}`,
          customer_name: 'Cliente Teste',
          customer_email: 'teste@example.com',
          profile_username: 'usuarioteste',
          service_id: 'sv_instagram_likes',
          external_service_id: '123'
        },
        metadata: JSON.stringify({
          service_type: 'instagram_likes',
          total_quantity: 100,
          is_followers_service: false
        })
      };
      
      console.log('Dados fake criados:', transactionData);
    }
    
    // Extrair dados adicionais
    let metadata = {};
    let posts = [];
    
    try {
      if (transactionData.metadata) {
        metadata = typeof transactionData.metadata === 'string' 
          ? JSON.parse(transactionData.metadata) 
          : transactionData.metadata;
      }
      
      if (transactionData.payment_request?.additional_data) {
        const additionalData = typeof transactionData.payment_request.additional_data === 'string'
          ? JSON.parse(transactionData.payment_request.additional_data)
          : transactionData.payment_request.additional_data;
        
        posts = additionalData.posts || [];
      }
    } catch (error) {
      console.error('Erro ao extrair dados adicionais:', error);
    }
    
    // Determinar tipo de serviço e outras informações
    const isFollowersService = !!metadata.is_followers_service;
    const serviceType = metadata.service_type || 'instagram_likes';
    const totalQuantity = metadata.total_quantity || 100;
    
    // Construir o payload para o serviço de orders
    const payload = {
      type: 'payment_approved',
      transaction_id: transactionData.id,
      payment_id: transactionData.payment_request_id,
      status: 'approved',
      amount: transactionData.amount,
      metadata: {
        service: transactionData.payment_request.service_id,
        external_service_id: transactionData.payment_request.external_service_id || '',
        profile: transactionData.payment_request.profile_username,
        service_type: serviceType,
        posts: posts.length > 0 ? posts.map(post => ({
          id: post.id,
          code: post.code,
          url: post.url,
          caption: post.caption,
          quantity: post.quantity
        })) : [
          {
            id: 'fake_post_id',
            code: 'ABC123',
            url: 'https://instagram.com/p/ABC123',
            caption: 'Teste',
            quantity: totalQuantity
          }
        ],
        customer: {
          name: transactionData.payment_request.customer_name,
          email: transactionData.payment_request.customer_email,
          phone: transactionData.payment_request.customer_phone
        },
        total_quantity: totalQuantity,
        is_followers_service: isFollowersService
      }
    };
    
    // Gerar token JWT para autenticação
    const token = jwt.sign(
      { transaction_id: transactionData.id }, 
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    // Webhook URL
    const webhookUrl = `${ordersServiceUrl}/api/orders/webhook/payment`;
    console.log(`Enviando notificação para: ${webhookUrl}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Enviar notificação para o serviço de orders
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    // Verificar resposta
    const responseText = await response.text();
    console.log(`\nResposta do serviço de orders (status ${response.status}):`);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log(JSON.stringify(responseJson, null, 2));
      
      if (response.ok) {
        console.log('\n✅ Notificação enviada e processada com sucesso!');
        
        if (responseJson.orders_created > 0) {
          console.log(`${responseJson.orders_created} pedidos foram criados no serviço de orders.`);
        } else {
          console.log('Embora a notificação tenha sido aceita, nenhum pedido foi criado.');
        }
        
        return true;
      } else {
        console.log('\n❌ Erro ao processar a notificação.');
        return false;
      }
    } catch (e) {
      console.log(responseText);
      return false;
    }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
}

// Função principal de teste
async function runTests() {
  console.log('=== TESTE DE COMUNICAÇÃO ENTRE MICROSERVIÇOS DE PAGAMENTOS E ORDERS ===\n');
  
  try {
    // Testar conexão básica
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      console.log('\n❌ FALHA: Não foi possível estabelecer conexão com o serviço de orders.');
      console.log('   As próximas etapas serão puladas.');
      return { success: false, reason: 'connection_failed' };
    }
    
    // Testar autenticação
    const authOk = await testAuthentication();
    
    if (!authOk) {
      console.log('\n❌ FALHA: Problemas de autenticação com o serviço de orders.');
      console.log('   Verifique o JWT_SECRET nos dois serviços.');
      return { success: false, reason: 'authentication_failed' };
    }
    
    // Enviar webhook de teste
    const webhookOk = await testWebhook();
    
    if (!webhookOk) {
      console.log('\n⚠️ ALERTA: A notificação foi enviada, mas ocorreram problemas no processamento.');
      return { success: false, reason: 'webhook_processing_failed' };
    }
    
    console.log('\n✅ SUCESSO: Todos os testes passaram! A comunicação entre os serviços está funcionando corretamente.');
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
    return { success: false, reason: 'unknown_error', error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar os testes
runTests()
  .then(result => {
    console.log('\n=== RESULTADO DO TESTE ===');
    console.log(`Status: ${result.success ? 'SUCESSO' : 'FALHA'}`);
    if (!result.success) {
      console.log(`Motivo: ${result.reason}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\nErro fatal:', error);
    process.exit(1);
  }); 