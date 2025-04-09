/**
 * Script para corrigir a comunicação entre o serviço de pagamentos e o serviço de orders
 * 
 * Este script:
 * 1. Verifica as configurações de JWT
 * 2. Atualiza o secrets no banco de dados se necessário
 * 3. Testa a comunicação com o serviço de orders
 * 4. Reenvia notificações para transações aprovadas que ainda não foram processadas
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const { sign } = require('jsonwebtoken');

const prisma = new PrismaClient();

async function fixOrdersCommunication() {
  console.log('=== CORREÇÃO DE COMUNICAÇÃO COM ORDERS ===\n');
  
  try {
    // 1. Verificar configurações
    console.log('Verificando configurações do JWT...');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET não está definido no .env!');
      console.log('Por favor, defina a mesma chave JWT_SECRET nos dois serviços (pagamentos e orders).');
      return;
    }
    
    console.log(`✅ JWT_SECRET encontrado: ${jwtSecret.substring(0, 10)}...`);
    console.log('Esta chave precisa ser idêntica no serviço de orders.\n');
    
    // 2. Verificar URL do serviço de orders
    const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
    console.log(`URL do serviço de orders: ${ordersServiceUrl}`);
    
    // 3. Testar conexão com o serviço de orders
    console.log('\nTestando conexão com o serviço de orders...');
    try {
      const healthResponse = await fetch(`${ordersServiceUrl}/api/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Serviço de orders está online:', healthData);
      } else {
        console.error(`❌ Serviço de orders retornou status ${healthResponse.status}`);
        console.log('Resposta:', await healthResponse.text());
      }
    } catch (error) {
      console.error(`❌ Não foi possível conectar ao serviço de orders: ${error.message}`);
    }
    
    // 4. Buscar transações aprovadas sem notificação
    console.log('\nBuscando transações aprovadas sem notificação...');
    
    // Primeiro buscar todas as transações aprovadas
    const approvedTransactions = await prisma.transaction.findMany({
      where: { status: 'approved' },
      include: { payment_request: true },
      orderBy: { updated_at: 'desc' }
    });
    
    console.log(`Encontradas ${approvedTransactions.length} transações aprovadas no total.`);
    
    // Verificar quais já têm notificação
    const transactionsToProcess = [];
    for (const tx of approvedTransactions) {
      const notificationLog = await prisma.paymentNotificationLog.findFirst({
        where: { 
          transaction_id: tx.id,
          status: 'success' 
        }
      });
      
      if (!notificationLog) {
        transactionsToProcess.push(tx);
      }
    }
    
    console.log(`Delas, ${transactionsToProcess.length} não possuem registro de notificação bem-sucedida.\n`);
    
    if (transactionsToProcess.length === 0) {
      console.log('Nenhuma transação precisa ser processada.\n');
      return;
    }
    
    // 5. Processar cada transação
    console.log(`Reenviando notificações para ${transactionsToProcess.length} transações:\n`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const tx of transactionsToProcess) {
      console.log(`=== Processando transação ${tx.id} ===`);
      console.log(`Payment Request: ${tx.payment_request_id}`);
      console.log(`Valor: ${tx.amount}`);
      console.log(`Método: ${tx.method}`);
      
      try {
        // Extrair metadados
        let metadata = {};
        let posts = [];
        try {
          if (tx.metadata) {
            metadata = JSON.parse(tx.metadata);
          }
          
          if (tx.payment_request.additional_data) {
            const additionalData = JSON.parse(tx.payment_request.additional_data);
            posts = additionalData.posts || [];
          }
        } catch (error) {
          console.warn('Erro ao extrair metadados:', error.message);
        }
        
        const isFollowersService = !!metadata.is_followers_service;
        const serviceType = metadata.service_type || 'instagram_likes';
        const totalQuantity = metadata.total_quantity || 0;
        
        // Preparar payload
        const payload = {
          type: 'payment_approved',
          transaction_id: tx.id,
          payment_id: tx.payment_request_id,
          status: 'approved',
          amount: tx.amount,
          metadata: {
            service: tx.payment_request.service_id,
            external_service_id: tx.payment_request.external_service_id || '',
            profile: tx.payment_request.profile_username,
            service_type: serviceType,
            posts: (posts || []).map(post => ({
              id: post.id,
              code: post.code,
              url: post.url,
              caption: post.caption,
              quantity: post.quantity
            })),
            customer: {
              name: tx.payment_request.customer_name,
              email: tx.payment_request.customer_email,
              phone: tx.payment_request.customer_phone
            },
            total_quantity: totalQuantity,
            is_followers_service: isFollowersService
          }
        };
        
        // Gerar token JWT com o segredo correto do .env
        const token = sign(
          { transaction_id: tx.id }, 
          jwtSecret,
          { expiresIn: '1h' }
        );
        
        console.log('Enviando notificação...');
        
        // Enviar requisição para o serviço de orders
        const webhookUrl = `${ordersServiceUrl}/api/orders/webhook/payment`;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        let responseJson;
        try {
          responseJson = JSON.parse(responseText);
        } catch (e) {
          responseJson = { text: responseText };
        }
        
        // Registrar resultado
        if (response.ok) {
          console.log('✅ Notificação enviada com sucesso!');
          successCount++;
          
          // Registrar log de sucesso
          await prisma.paymentNotificationLog.create({
            data: {
              transaction_id: tx.id,
              type: 'orders_service',
              target_url: webhookUrl,
              status: 'success',
              payload: JSON.stringify(payload),
              response: JSON.stringify(responseJson)
            }
          });
        } else {
          console.error(`❌ Falha ao enviar notificação: ${response.status}`);
          failureCount++;
          
          // Registrar log de falha
          await prisma.paymentNotificationLog.create({
            data: {
              transaction_id: tx.id,
              type: 'orders_service',
              target_url: webhookUrl,
              status: 'failed',
              payload: JSON.stringify(payload),
              response: JSON.stringify(responseJson),
              error_message: `Resposta com status ${response.status}`
            }
          });
        }
        
        console.log(`Resposta: ${JSON.stringify(responseJson)}\n`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar transação: ${error.message}`);
        failureCount++;
        
        // Registrar log de erro
        try {
          await prisma.paymentNotificationLog.create({
            data: {
              transaction_id: tx.id,
              type: 'orders_service',
              status: 'failed',
              error_message: error.message,
              error_stack: error.stack
            }
          });
        } catch (logError) {
          console.error(`Erro ao registrar log: ${logError.message}`);
        }
      }
    }
    
    // 6. Resumo
    console.log('\n=== RESUMO DA CORREÇÃO ===');
    console.log(`Total de transações processadas: ${transactionsToProcess.length}`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Falhas: ${failureCount}`);
    
    if (failureCount > 0) {
      console.log('\n⚠️ Algumas notificações falharam. Verifique:');
      console.log('1. Se o JWT_SECRET é idêntico nos dois serviços');
      console.log('2. Se o serviço de orders está recebendo as requisições');
      console.log('3. Se há erros no formato do payload enviado');
    } else if (successCount > 0) {
      console.log('\n✅ Todas as notificações foram enviadas com sucesso!');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a correção
fixOrdersCommunication(); 