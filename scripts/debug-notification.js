/**
 * Script de diagnóstico para identificar problemas com notificações para orders
 * 
 * Este script vai:
 * 1. Verificar transações com status 'approved'
 * 2. Verificar logs de notificação e webhooks
 * 3. Testar manualmente o envio de notificação para uma transação
 * 4. Verificar configuração do serviço de orders
 * 
 * Para executar:
 * node -r ts-node/register scripts/debug-notification.js
 */

// Importar módulos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch');

// Como estamos em um arquivo .js e precisamos importar um .ts, vamos usar um modo de acesso direto
let notifyOrdersService;
try {
  // Tentar todas as formas de importar a função
  try {
    const ordersService = require('../src/lib/orders-service');
    notifyOrdersService = ordersService.notifyOrdersService;
    console.log('Importado notifyOrdersService de src/lib/orders-service');
  } catch (e) {
    console.warn('Falha ao importar de src/lib/orders-service:', e.message);
    try {
      // Tentar importar do runtime
      const ordersService = require('../.next/server/chunks/');
      notifyOrdersService = ordersService.notifyOrdersService;
      console.log('Importado notifyOrdersService do runtime Next.js');
    } catch (e2) {
      console.warn('Falha ao importar do runtime Next.js:', e2.message);
      
      // Implementar uma versão simplificada para diagnóstico
      console.warn('Usando implementação simplificada para diagnóstico');
      notifyOrdersService = async (transactionId) => {
        console.log(`[Diagnóstico] Simulando notificação para a transação ${transactionId}`);
        
        // Buscar a transação
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: { payment_request: true }
        });
        
        if (!transaction) {
          console.error(`[Diagnóstico] Transação ${transactionId} não encontrada`);
          return false;
        }
        
        // Verificar se já existe registro de notificação
        const existingNotification = await prisma.paymentNotificationLog.findFirst({
          where: { transaction_id: transactionId }
        });
        
        console.log(`[Diagnóstico] Transação ${transactionId} ${existingNotification ? 'JÁ POSSUI' : 'NÃO POSSUI'} registro de notificação`);
        
        // Verificar se o status é approved
        if (transaction.status !== 'approved') {
          console.log(`[Diagnóstico] Transação ${transactionId} não está aprovada (status: ${transaction.status})`);
          return false;
        }
        
        // Verificar URL do serviço de orders
        const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
        const webhookUrl = `${ordersServiceUrl}/api/orders/webhook/payment`;
        
        console.log(`[Diagnóstico] URL do webhook: ${webhookUrl}`);
        
        // Simular envio da notificação
        try {
          console.log(`[Diagnóstico] Simulando requisição para ${webhookUrl}...`);
          const response = await fetch(webhookUrl, {
            method: 'HEAD',
            timeout: 5000
          }).catch(err => {
            throw new Error(`Falha na conexão: ${err.message}`);
          });
          
          console.log(`[Diagnóstico] Serviço respondeu com status ${response.status}`);
          return response.ok;
        } catch (error) {
          console.error(`[Diagnóstico] Erro ao conectar: ${error.message}`);
          return false;
        }
      };
    }
  }
} catch (error) {
  console.error('Erro fatal ao importar notifyOrdersService:', error);
  process.exit(1);
}

async function diagnoseNotificationIssues() {
  console.log('\n====== DIAGNÓSTICO DE NOTIFICAÇÕES PARA ORDERS ======\n');
  
  // 1. Verificar variáveis de ambiente críticas
  console.log('Verificando variáveis de ambiente:');
  const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
  const jwtSecret = process.env.JWT_SECRET || 'payment_service_secret';
  
  console.log(`- ORDERS_SERVICE_URL: ${ordersServiceUrl}`);
  console.log(`- JWT_SECRET definido: ${jwtSecret ? 'Sim' : 'Não'}`);
  
  if (!process.env.ORDERS_SERVICE_URL) {
    console.warn('\n⚠️ AVISO: ORDERS_SERVICE_URL não está definido no .env, usando valor padrão');
  }
  
  // 2. Verificar se o serviço de orders está acessível
  console.log('\nVerificando conectividade com o serviço de orders:');
  try {
    const healthCheckUrl = `${ordersServiceUrl}/api/health`;
    console.log(`Testando URL: ${healthCheckUrl}`);
    
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      timeout: 5000,
    }).catch(err => {
      throw new Error(`Falha na conexão: ${err.message}`);
    });
    
    if (response.ok) {
      console.log('✅ Serviço de orders está respondendo corretamente.');
      try {
        const healthData = await response.json();
        console.log('Resposta do health check:', healthData);
      } catch (e) {
        console.log('Resposta não é JSON, mas o serviço está ativo.');
      }
    } else {
      console.error(`❌ Serviço de orders retornou status ${response.status}`);
      console.error('Resposta:', await response.text());
    }
  } catch (error) {
    console.error(`❌ Não foi possível conectar ao serviço de orders: ${error.message}`);
  }

  // 3. Verificar transações aprovadas recentes
  console.log('\nVerificando transações aprovadas das últimas 24 horas:');
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const approvedTransactions = await prisma.transaction.findMany({
    where: {
      status: 'approved',
      updated_at: {
        gte: oneDayAgo
      }
    },
    include: {
      payment_request: true
    },
    orderBy: {
      updated_at: 'desc'
    },
    take: 5
  });
  
  if (approvedTransactions.length === 0) {
    console.log('Nenhuma transação aprovada encontrada nas últimas 24 horas.');
  } else {
    console.log(`Encontradas ${approvedTransactions.length} transações aprovadas recentes:`);
    for (const tx of approvedTransactions) {
      console.log(`- ID: ${tx.id} | Data: ${tx.updated_at} | Método: ${tx.method} | Valor: ${tx.amount}`);
    }
  }
  
  // 4. Verificar logs de notificação recentes
  console.log('\nVerificando logs de notificação recentes:');
  const recentNotificationLogs = await prisma.paymentNotificationLog.findMany({
    orderBy: {
      created_at: 'desc'
    },
    take: 5
  });
  
  if (recentNotificationLogs.length === 0) {
    console.log('❌ Nenhum log de notificação encontrado!');
  } else {
    console.log(`Encontrados ${recentNotificationLogs.length} logs de notificação:`);
    for (const log of recentNotificationLogs) {
      console.log(`- ID: ${log.id} | Data: ${log.created_at} | Status: ${log.status} | Tipo: ${log.type}`);
      if (log.error_message) {
        console.log(`  Erro: ${log.error_message}`);
      }
    }
  }
  
  // 5. Verificar webhooks recentes
  console.log('\nVerificando logs de webhooks recentes:');
  const recentWebhookLogs = await prisma.webhookLog.findMany({
    orderBy: {
      created_at: 'desc'
    },
    take: 5
  });
  
  if (recentWebhookLogs.length === 0) {
    console.log('Nenhum log de webhook encontrado.');
  } else {
    console.log(`Encontrados ${recentWebhookLogs.length} logs de webhook:`);
    for (const log of recentWebhookLogs) {
      console.log(`- ID: ${log.id} | Data: ${log.created_at} | Tipo: ${log.type} | Evento: ${log.event || 'N/A'}`);
      if (log.error) {
        console.log(`  Erro: ${log.error}`);
      }
    }
  }
  
  // 6. Testar envio de notificação para uma transação específica
  if (approvedTransactions.length > 0) {
    const testTransaction = approvedTransactions[0];
    console.log(`\nTestando envio de notificação para a transação ${testTransaction.id}:`);
    
    try {
      const result = await notifyOrdersService(testTransaction.id);
      if (result) {
        console.log('✅ Notificação enviada com sucesso!');
      } else {
        console.log('❌ Notificação falhou, mas sem erro específico.');
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação: ${error.message}`);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    // Verificar se a notificação foi registrada no banco
    const notificationLog = await prisma.paymentNotificationLog.findFirst({
      where: {
        transaction_id: testTransaction.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (notificationLog) {
      console.log(`Log de notificação criado: ${notificationLog.id} (Status: ${notificationLog.status})`);
      if (notificationLog.error_message) {
        console.log(`Erro registrado: ${notificationLog.error_message}`);
      }
    } else {
      console.log('❌ Nenhum log de notificação foi criado para o teste!');
    }
  }
  
  console.log('\n====== DIAGNÓSTICO CONCLUÍDO ======\n');
}

// Executar e depois fechar a conexão com o banco
diagnoseNotificationIssues()
  .catch(error => {
    console.error('Erro ao executar diagnóstico:', error);
  })
  .finally(() => {
    console.log('Fechando conexões...');
    prisma.$disconnect();
  }); 