/**
 * Script para testar a notificação de transações para o serviço de orders
 * com implementação corrigida
 * 
 * Para executar:
 * node scripts/test-notification-fix.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');
const { sign } = require('jsonwebtoken');

async function testNotification() {
  console.log('=== TESTE DE NOTIFICAÇÃO PARA ORDERS ===\n');
  
  try {
    // 1. Verificar configurações
    const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
    const webhookUrl = `${ordersServiceUrl}/api/orders/webhook/payment`;
    const jwtSecret = process.env.JWT_SECRET || 'payment_service_secret';
    
    console.log(`Usando URL: ${webhookUrl}`);
    console.log(`JWT Secret definido: ${jwtSecret ? 'Sim' : 'Não'}\n`);
    
    // 2. Buscar transação aprovada
    console.log('Buscando transação aprovada...');
    const transaction = await prisma.transaction.findFirst({
      where: { status: 'approved' },
      include: { payment_request: true },
      orderBy: { updated_at: 'desc' }
    });
    
    if (!transaction) {
      console.error('Nenhuma transação aprovada encontrada!');
      return;
    }
    
    console.log(`Transação encontrada: ${transaction.id}`);
    console.log(`Payment Request ID: ${transaction.payment_request_id}`);
    console.log(`Método: ${transaction.method}`);
    console.log(`Valor: ${transaction.amount}\n`);
    
    // 3. Verificar logs existentes
    const existingLogs = await prisma.paymentNotificationLog.findMany({
      where: { transaction_id: transaction.id },
      orderBy: { created_at: 'desc' }
    });
    
    if (existingLogs.length > 0) {
      console.log(`Transação já possui ${existingLogs.length} logs de notificação:`);
      for (const log of existingLogs) {
        console.log(`- ${log.created_at}: ${log.status} (${log.type})`);
        if (log.error_message) console.log(`  Erro: ${log.error_message}`);
      }
      console.log();
    }
    
    // 4. Preparar payload
    let metadata = {};
    let posts = [];
    try {
      if (transaction.metadata) {
        metadata = JSON.parse(transaction.metadata);
      }
      
      if (transaction.payment_request.additional_data) {
        const additionalData = JSON.parse(transaction.payment_request.additional_data);
        posts = additionalData.posts || [];
      }
    } catch (error) {
      console.warn('Erro ao extrair metadados:', error.message);
    }
    
    const isFollowersService = !!metadata.is_followers_service;
    const serviceType = metadata.service_type || 'instagram_likes';
    const totalQuantity = metadata.total_quantity || 0;
    
    const payload = {
      type: 'payment_approved',
      transaction_id: transaction.id,
      payment_id: transaction.payment_request_id,
      status: 'approved',
      amount: transaction.amount,
      metadata: {
        service: transaction.payment_request.service_id,
        external_service_id: transaction.payment_request.external_service_id || '',
        profile: transaction.payment_request.profile_username,
        service_type: serviceType,
        posts: (posts || []).map(post => ({
          id: post.id,
          code: post.code,
          url: post.url,
          caption: post.caption,
          quantity: post.quantity
        })),
        customer: {
          name: transaction.payment_request.customer_name,
          email: transaction.payment_request.customer_email,
          phone: transaction.payment_request.customer_phone
        },
        total_quantity: totalQuantity,
        is_followers_service: isFollowersService
      }
    };
    
    // 5. Gerar token JWT para autenticação
    const token = sign(
      { transaction_id: transaction.id }, 
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    console.log(`Token JWT gerado: ${token.substring(0, 20)}...`);
    console.log('Payload preparado:\n', JSON.stringify(payload, null, 2));
    console.log('\nEnviando notificação...');
    
    // 6. Enviar notificação
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    // 7. Verificar resposta
    const responseText = await response.text();
    console.log(`\nResposta do serviço (status ${response.status}):`);
    try {
      const responseJson = JSON.parse(responseText);
      console.log(JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log(responseText);
    }
    
    if (response.ok) {
      console.log('\n✅ Notificação enviada com sucesso!');
    } else {
      console.error(`\n❌ Falha ao enviar notificação: ${response.status} ${response.statusText}`);
    }
    
    // 8. Registrar resultado no banco para referência
    const logData = {
      transaction_id: transaction.id,
      type: 'orders_service_test',
      target_url: webhookUrl,
      status: response.ok ? 'success' : 'failed',
      payload: JSON.stringify(payload),
      response: responseText
    };
    
    if (!response.ok) {
      logData.error_message = `Falha com status ${response.status}`;
    }
    
    const log = await prisma.paymentNotificationLog.create({ data: logData });
    console.log(`\nLog de teste criado: ${log.id}`);
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testNotification(); 