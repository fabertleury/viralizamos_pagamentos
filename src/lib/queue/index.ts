import Bull, { Queue, JobOptions } from 'bull';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { ORDERS_API_URL, ORDERS_API_KEY, cleanUrl } from '@/lib/constants';

// Interface para dados de post
interface PostData {
  id?: string;
  code?: string;
  shortcode?: string;
  url?: string;
  type?: string;
  is_reel?: boolean;
  quantity?: number;
  calculated_quantity?: number;
}

// Interface para capturar respostas do provedor
interface ProviderResponse {
  order_id: string;
  success: boolean;
  data: any;
}

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
  paymentProcessingQueue.process('process-payment', async (job) => {
    const { transaction_id: transactionId, payment_request_id: paymentRequestId, external_id: externalId } = job.data;
    
    console.log(`🔄 [Queue] Processando pagamento: ${transactionId}`);
    
    // Validar os dados recebidos
    if (!transactionId) {
      console.error('❌ [Queue] ID da transação não fornecido no job');
      throw new Error('ID da transação (transaction_id) não fornecido');
    }
    
    if (!paymentRequestId) {
      console.error('❌ [Queue] ID do payment request não fornecido no job');
      throw new Error('ID do payment request (payment_request_id) não fornecido');
    }
    
    // Registrar os dados do job para debug
    console.log('📋 [Queue] Dados do job:', {
      transactionId,
      paymentRequestId,
      externalId
    });
    
    // Buscar informações da transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      console.error(`❌ [Queue] Transação não encontrada: ${transactionId}`);
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
      console.error(`❌ [Queue] Payment Request não encontrado: ${paymentRequestId}`);
      throw new Error(`Payment Request ${paymentRequestId} não encontrado`);
    }
    
    // Obter dados do serviço
    let serviceData = null;
    let serviceId = null;
    let posts: PostData[] = [];
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
    
    console.log(`🔗 [Queue] Enviando para ${ORDERS_API_URL}`);
    
    let createdOrderIds: string[] = [];
    let providerResponses: ProviderResponse[] = [];
    
    // Verificar se temos múltiplos posts ou apenas um serviço
    if (posts.length > 0) {
      // PROCESSAMENTO DE MÚLTIPLOS POSTS EM LOTE
      console.log(`📊 [Queue] Processando ${posts.length} posts em lote`);
      
      try {
        // Obter informações do provider_id se disponível
        let provider_id = null;
        if (serviceData && serviceData.provider_id) {
          provider_id = serviceData.provider_id;
          console.log(`ℹ️ [Queue] Usando provider_id do serviço: ${provider_id}`);
        }
        
        console.log(`🔄 [Queue] Enviando lote para ${ORDERS_API_URL}`);
        
        // Construir um único payload com todos os posts
        const batchPayload = {
          transaction_id: transaction.id,
          service_id: serviceId,
          provider_id: provider_id,
          external_service_id: serviceData?.external_id || null,
          external_payment_id: externalId,
          external_transaction_id: externalId,
          amount: transaction.amount,
          quantity: totalQuantity,
          total_quantity: totalQuantity,
          target_username: targetUsername,
          customer_email: paymentRequest.customer_email,
          customer_name: paymentRequest.customer_name,
          payment_data: {
            method: transaction.method,
            status: transaction.status
          },
          // Incluir todos os posts no mesmo payload
          posts: posts.map(post => {
            // Garantir que o postCode e postUrl estão definidos
            const postCode = post.code || post.shortcode || null;
            let postUrl = post.url || (postCode ? 
              (post.is_reel || post.type === 'reel' ? 
                `https://instagram.com/reel/${postCode}/` : 
                `https://instagram.com/p/${postCode}/`)
              : null);
              
            // Limpar a URL para garantir que não tenha caracteres extras
            postUrl = cleanUrl(postUrl);
              
            return {
              id: post.id || `post-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              code: postCode,
              url: postUrl,
              type: post.type || (post.is_reel ? 'reel' : 'post'),
              is_reel: post.is_reel || post.type === 'reel',
              quantity: post.quantity || post.calculated_quantity || Math.floor(totalQuantity / posts.length)
            };
          })
        };
        
        console.log(`📦 [Queue] Enviando payload em lote com ${posts.length} posts:`);
        console.log(JSON.stringify(batchPayload, null, 2));
        
        // Verificar se o endpoint está configurado corretamente para batch ou create
        let endpoint = ORDERS_API_URL;
        // Se o endpoint não contém "batch" e estamos enviando múltiplos posts, ajustar para o endpoint de batch
        if (posts.length > 1 && !endpoint.includes('/batch')) {
          endpoint = endpoint.replace('/create', '/batch');
          console.log(`📦 [Queue] Ajustando endpoint para batch: ${endpoint}`);
        }
        
        // Enviar requisição para API em lote
        const response = await axios.post(endpoint, batchPayload, {
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `batch_${transaction.id}_${Date.now()}`
          }
        });
        
        // Verificar resposta
        if (!response.data || !response.data.success) {
          throw new Error(`Falha ao processar lote de pedidos: ${JSON.stringify(response.data)}`);
        }
        
        // Extrair IDs de pedidos criados
        if (response.data.orders && Array.isArray(response.data.orders)) {
          createdOrderIds = response.data.orders.map((order: any) => order.id);
          
          // Mapear respostas
          providerResponses = response.data.orders.map((order: any) => ({
            order_id: order.id,
            success: true,
            data: order
          }));
        }
        
        // Salvar a resposta completa do provedor em um log específico
        await prisma.providerResponseLog.create({
          data: {
            transaction_id: transaction.id,
            payment_request_id: paymentRequestId,
            provider_id: provider_id || 'unknown',
            service_id: serviceId,
            order_id: createdOrderIds.join(','),
            response_data: JSON.stringify(response.data),
            status: response.data.success ? 'success' : 'error',
            created_at: new Date()
          }
        }).catch((error: Error) => {
          console.warn(`⚠️ [Queue] Erro ao salvar log de resposta do provedor: ${error.message}`);
        });
        
        console.log(`✅ [Queue] ${createdOrderIds.length} pedidos criados em lote com sucesso: ${createdOrderIds.join(', ')}`);
      } catch (error) {
        console.error(`❌ [Queue] Erro ao criar pedidos em lote:`, error);
        throw error;
      }
    } else {
      // PROCESSAMENTO DE SERVIÇO ÚNICO (sem posts)
      console.log(`🔄 [Queue] Processando serviço único (sem posts)`);
      
      try {
        // Gerar um external_order_id único que será enviado para o provedor
        const external_order_id = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Obter informações do provider_id se disponível
        let provider_id = null;
        if (serviceData && serviceData.provider_id) {
          provider_id = serviceData.provider_id;
          console.log(`ℹ️ [Queue] Usando provider_id do serviço: ${provider_id}`);
        }
        
        // Construir URL do perfil ou target
        const targetUrl = cleanUrl(`https://instagram.com/${targetUsername}`);
        
        const response = await axios.post(ORDERS_API_URL, {
          transaction_id: transaction.id,
          service_id: serviceId,
          provider_id: provider_id, // ID do provedor de serviços
          external_service_id: serviceData?.external_id || null, // ID externo do serviço (usado pelo provedor)
          external_order_id: external_order_id, // ID externo do pedido (será enviado ao provedor)
          external_payment_id: externalId,
          amount: transaction.amount,
          quantity: totalQuantity || serviceData.quantity || 100,
          target_username: targetUsername,
          target_url: targetUrl, // URL do perfil para receber o serviço
          customer_email: paymentRequest.customer_email,
          customer_name: paymentRequest.customer_name,
          payment_data: {
            method: transaction.method,
            status: transaction.status
          }
        }, {
          headers: {
            'Authorization': `Bearer ${ORDERS_API_KEY}`,
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
        
        // Salvar resposta completa para uso posterior
        providerResponses.push({
          order_id: orderIdFromResponse,
          success: true,
          data: response.data
        });
        
        // Salvar a resposta completa do provedor em um log específico
        await prisma.providerResponseLog.create({
          data: {
            transaction_id: transaction.id,
            payment_request_id: paymentRequestId,
            provider_id: provider_id || 'unknown',
            service_id: serviceId,
            order_id: orderIdFromResponse,
            response_data: JSON.stringify(response.data),
            status: response.data.success ? 'success' : 'error',
            created_at: new Date()
          }
        }).catch((error: Error) => {
          console.warn(`⚠️ [Queue] Erro ao salvar log de resposta do provedor: ${error.message}`);
        });
        
        console.log(`✅ [Queue] Pedido único criado com sucesso: ${orderIdFromResponse}`);
      } catch (error) {
        console.error(`❌ [Queue] Erro ao criar pedido único:`, error);
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
          processed_orders: createdOrderIds,
          processed_at: new Date().toISOString(),
          provider_responses: posts.length > 0 ? 
            posts.map((post, idx) => ({
              order_id: idx < createdOrderIds.length ? createdOrderIds[idx] : null,
              post_code: post?.code || null,
              response_data: idx < providerResponses.length ? providerResponses[idx].data : null
            })) : 
            [{order_id: createdOrderIds[0], response_data: providerResponses[0]?.data}]
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
          processed_orders: createdOrderIds,
          processed_at: new Date().toISOString(),
          provider_responses: posts.length > 0 ? 
            posts.map((post, idx) => ({
              order_id: idx < createdOrderIds.length ? createdOrderIds[idx] : null,
              post_code: post?.code || null,
              response_data: idx < providerResponses.length ? providerResponses[idx].data : null
            })) : 
            [{order_id: createdOrderIds[0], response_data: providerResponses[0]?.data}],
          order_details: createdOrderIds.map((id, index) => ({
            order_id: id,
            post: posts[index] ? {
              code: posts[index]?.code || null,
              url: posts[index]?.url || null,
              type: posts[index]?.type || (posts[index]?.is_reel ? 'reel' : 'post'),
              quantity: posts[index]?.quantity || posts[index]?.calculated_quantity || Math.floor(totalQuantity / posts.length)
            } : null
          }))
        })
      }
    });
    
    console.log(`✅ [Queue] ${createdOrderIds.length} pedidos criados com sucesso: ${createdOrderIds.join(', ')}`);
    console.log(`🔍 [Queue] Detalhes: ${createdOrderIds.map((id, idx) => 
      `Pedido ${idx+1}: ${id} - Post: ${idx < posts.length ? posts[idx]?.code || 'N/A' : 'Serviço único'}`).join(', ')}`);
    
    return {
      success: true,
      orderIds: createdOrderIds,
      details: posts.length > 0 ? 
        posts.map((post: PostData, idx: number) => ({
          order_id: idx < createdOrderIds.length ? createdOrderIds[idx] : null,
          post_code: post?.code || null,
          quantity: post?.quantity || post?.calculated_quantity || Math.floor(totalQuantity / posts.length)
        })) :
        [{ 
          order_id: createdOrderIds[0] || null, 
          post_code: null,
          quantity: totalQuantity || serviceData?.quantity || 100
        }]
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