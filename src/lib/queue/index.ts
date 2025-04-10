import Bull, { Queue, JobOptions } from 'bull';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Nome das filas
const PAYMENT_PROCESSING_QUEUE = process.env.PAYMENT_PROCESSING_QUEUE || 'payment-processing-queue';

// Configuração do Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Opções padrão para jobs
const defaultJobOptions: JobOptions = {
  attempts: 3,              // Máximo de tentativas
  backoff: {
    type: 'exponential',    // Tipo de backoff
    delay: 60 * 1000        // Delay inicial (1 minuto)
  },
  removeOnComplete: 100,    // Manter apenas os últimos 100 jobs concluídos
  removeOnFail: 200         // Manter apenas os últimos 200 jobs com falha
};

// Fila de processamento de pagamentos
let paymentProcessingQueue: Queue | null = null;

/**
 * Inicializa as filas
 */
export function initializeQueues() {
  if (!paymentProcessingQueue) {
    paymentProcessingQueue = new Bull(PAYMENT_PROCESSING_QUEUE, redisUrl, {
      defaultJobOptions
    });
    
    console.log('📋 [Queue] Fila de processamento de pagamentos inicializada');
    
    // Configurar processadores
    setupProcessors();
  }
}

/**
 * Configurar processadores para as filas
 */
function setupProcessors() {
  if (!paymentProcessingQueue) return;
  
  // Processador para fila de pagamentos
  paymentProcessingQueue.process(async (job) => {
    const { transactionId, paymentRequestId, externalId } = job.data;
    
    console.log(`🔄 [Queue] Processando pagamento: ${transactionId}`);
    
    // Buscar informações da transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      throw new Error(`Transação ${transactionId} não encontrada`);
    }
    
    // Verificar se a transação já foi processada
    if (transaction.processed_at) {
      console.log(`⚠️ [Queue] Transação ${transactionId} já foi processada anteriormente`);
      return {
        success: true,
        alreadyProcessed: true,
        transactionId
      };
    }
    
    // Buscar payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId }
    });
    
    if (!paymentRequest) {
      throw new Error(`Payment Request ${paymentRequestId} não encontrado`);
    }
    
    // Obter dados do serviço
    let serviceData = null;
    let serviceId = null;
    let posts = [];
    let totalQuantity = 0;
    
    // Tentar obter de additional_data
    if (paymentRequest.additional_data) {
      try {
        const additionalData = JSON.parse(paymentRequest.additional_data);
        
        // Extrair posts se disponíveis
        posts = additionalData.posts || [];
        
        // Extrair quantidade total
        totalQuantity = additionalData.quantity || additionalData.total_quantity || 0;
        
        if (additionalData.service) {
          serviceData = additionalData.service;
          serviceId = serviceData.id;
        }
      } catch (e) {
        console.warn(`⚠️ [Queue] Erro ao analisar additional_data: ${e}`);
      }
    }
    
    // Se não tiver dados do serviço, mas tiver service_id
    if (!serviceData && paymentRequest.service_id) {
      serviceId = paymentRequest.service_id;
      serviceData = { id: serviceId, quantity: totalQuantity || 100 }; 
      console.log(`ℹ️ [Queue] Usando service_id: ${serviceId}`);
    }
    
    // Valor padrão se nada for encontrado
    if (!serviceData) {
      serviceId = "instagram-followers"; // Identificador genérico
      serviceData = { id: serviceId, quantity: totalQuantity || 100, name: "Serviço Instagram" };
      console.log(`⚠️ [Queue] Usando serviceId padrão: ${serviceId}`);
    }
    
    // Garantir que temos informações do usuário a ser envolvido
    const targetUsername = paymentRequest.profile_username || "unspecified_user";
    
    // Enviar para API do sistema de orders
    const ordersApiUrl = process.env.ORDERS_API_URL || 'https://orders.viralizamos.com/api/orders/create';
    const apiKey = process.env.ORDERS_API_KEY || 'default_key';
    
    console.log(`🔗 [Queue] Enviando para ${ordersApiUrl}`);
    
    let createdOrderIds = [];
    
    // Verificar se temos múltiplos posts ou apenas um serviço
    if (posts.length > 0) {
      // PROCESSAMENTO DE MÚLTIPLOS POSTS
      console.log(`📊 [Queue] Processando ${posts.length} posts`);
      
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const postQuantity = post.quantity || post.calculated_quantity || Math.floor(totalQuantity / posts.length);
        
        // Usar um jobId específico para cada post para garantir idempotência
        const postJobId = `${externalId}_${post.id || post.code || i}`;
        
        console.log(`🔄 [Queue] Processando post ${i+1}/${posts.length}: ${post.url || post.code}, quantidade: ${postQuantity}`);
        
        try {
          const response = await axios.post(ordersApiUrl, {
            transaction_id: transaction.id,
            service_id: serviceId,
            external_payment_id: postJobId, // ID único para cada post
            external_transaction_id: externalId,
            amount: transaction.amount / posts.length, // Distribuir o valor
            quantity: postQuantity,
            target_username: targetUsername,
            customer_email: paymentRequest.customer_email,
            customer_name: paymentRequest.customer_name,
            post_data: {
              post_id: post.id || post.code,
              post_url: post.url,
              post_type: post.type || (post.is_reel ? 'reel' : 'post'),
              post_code: post.code,
              is_reel: post.is_reel || post.type === 'reel'
            },
            payment_data: {
              method: transaction.method,
              status: transaction.status
            }
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': postJobId // Garantir que não haja duplicação
            }
          });
          
          // Verificar resposta
          if (!response.data || !response.data.success) {
            throw new Error(`Falha ao criar pedido para post ${i+1}: ${JSON.stringify(response.data)}`);
          }
          
          const orderIdFromResponse = response.data.order_id;
          createdOrderIds.push(orderIdFromResponse);
          
          console.log(`✅ [Queue] Pedido criado para post ${i+1}: ${orderIdFromResponse}`);
        } catch (error) {
          console.error(`❌ [Queue] Erro ao criar pedido para post ${i+1}:`, error);
          throw error;
        }
      }
    } else {
      // PROCESSAMENTO DE SERVIÇO ÚNICO (sem posts)
      console.log(`🔄 [Queue] Processando serviço único (sem posts)`);
      
      try {
        const response = await axios.post(ordersApiUrl, {
          transaction_id: transaction.id,
          service_id: serviceId,
          external_payment_id: externalId,
          amount: transaction.amount,
          quantity: totalQuantity || serviceData.quantity || 100,
          target_username: targetUsername,
          customer_email: paymentRequest.customer_email,
          customer_name: paymentRequest.customer_name,
          payment_data: {
            method: transaction.method,
            status: transaction.status
          }
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': externalId // Garantir que não haja duplicação
          }
        });
        
        // Verificar resposta
        if (!response.data || !response.data.success) {
          throw new Error(`Falha ao criar pedido: ${JSON.stringify(response.data)}`);
        }
        
        const orderIdFromResponse = response.data.order_id;
        createdOrderIds.push(orderIdFromResponse);
        
        console.log(`✅ [Queue] Pedido criado com sucesso: ${orderIdFromResponse}`);
      } catch (error) {
        console.error(`❌ [Queue] Erro ao criar pedido:`, error);
        throw error;
      }
    }
    
    // Atualizar a transação
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        processed_at: new Date(),
        metadata: JSON.stringify({
          ...JSON.parse(transaction.metadata || '{}'),
          processed_orders: createdOrderIds
        })
      }
    });
    
    // Atualizar o payment request
    await prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: {
        status: 'completed',
        processed_at: new Date(),
        processed_payment_id: transaction.id,
        additional_data: JSON.stringify({
          ...JSON.parse(paymentRequest.additional_data || '{}'),
          processed_orders: createdOrderIds
        })
      }
    });
    
    console.log(`✅ [Queue] ${createdOrderIds.length} pedidos criados com sucesso: ${createdOrderIds.join(', ')}`);
    
    return {
      success: true,
      orderIds: createdOrderIds
    };
  });
  
  // Lidar com falhas nos jobs
  paymentProcessingQueue.on('failed', (job, err) => {
    console.error(`❌ [Queue] Job falhou (${job.id}): ${err.message}`);
  });
  
  // Lidar com jobs concluídos
  paymentProcessingQueue.on('completed', (job, result) => {
    console.log(`✅ [Queue] Job concluído (${job.id})`);
  });
  
  console.log('🔄 [Queue] Processadores configurados');
}

/**
 * Recupera uma fila pelo nome
 */
export function getQueue(queueName: string): Queue | null {
  if (queueName === 'payment-processing') {
    // Se a fila não estiver inicializada, inicialize-a
    if (!paymentProcessingQueue) {
      initializeQueues();
    }
    return paymentProcessingQueue;
  }
  
  return null;
}

/**
 * Adiciona um pagamento à fila de processamento
 */
export async function queuePaymentProcessing(
  transactionId: string,
  paymentRequestId: string,
  externalId: string
): Promise<string> {
  try {
    const queue = getQueue('payment-processing');
    
    if (!queue) {
      throw new Error('Fila de processamento de pagamento não inicializada');
    }
    
    // Adicionar à fila com dados
    const job = await queue.add('process-payment', {
      transaction_id: transactionId,
      payment_request_id: paymentRequestId,
      external_id: externalId,
      created_at: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 segundos
      },
      removeOnComplete: {
        age: 24 * 3600 // manter jobs completos por 24h
      },
      removeOnFail: {
        age: 48 * 3600 // manter jobs falhos por 48h
      }
    });
    
    return job.id.toString();
  } catch (error) {
    console.error('[Queue] Erro ao adicionar pagamento à fila de processamento:', error);
    throw error;
  }
}

/**
 * Limpa todas as filas
 */
export async function clearQueues() {
  if (paymentProcessingQueue) {
    await paymentProcessingQueue.empty();
    console.log('🧹 [Queue] Fila de processamento de pagamentos limpa');
  }
}

/**
 * Para todas as filas
 */
export async function shutdownQueues() {
  if (paymentProcessingQueue) {
    await paymentProcessingQueue.close();
    paymentProcessingQueue = null;
    console.log('🛑 [Queue] Fila de processamento de pagamentos encerrada');
  }
} 