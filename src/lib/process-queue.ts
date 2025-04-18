import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Processa itens da fila de processamento
 */
export async function processQueue() {
  console.log('Iniciando processamento da fila...');
  
  try {
    // Buscar itens pendentes na fila
    const pendingItems = await prisma.processingQueue.findMany({
      where: {
        status: 'pending',
        type: 'payment_confirmation',
        attempts: {
          lt: 3  // Menos que 3 tentativas
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'asc' }
      ],
      take: 10,
      include: {
        payment_request: true
      }
    });
    
    console.log(`Encontrados ${pendingItems.length} itens pendentes na fila`);
    
    if (pendingItems.length === 0) {
      return { processed: 0, success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    
    // Processar cada item da fila
    for (const item of pendingItems) {
      console.log(`Processando item ${item.id}...`);
      
      try {
        // Analisar metadata para obter transaction_id
        const metadata = item.metadata ? JSON.parse(item.metadata) : {};
        const transactionId = metadata.transaction_id;
        const externalId = metadata.external_id;
        
        if (!transactionId) {
          throw new Error('ID da transação não encontrado no metadata');
        }
        
        // Buscar informações da transação
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId }
        });
        
        if (!transaction) {
          throw new Error(`Transação ${transactionId} não encontrada`);
        }
        
        // Buscar pelo serviço selecionado pelo cliente
        const serviceData = item.payment_request.additional_data ? 
          JSON.parse(item.payment_request.additional_data).service : null;
        
        if (!serviceData) {
          throw new Error('Dados do serviço não encontrados');
        }
        
        // Função para limpar URLs de caracteres extras
        function cleanUrl(url: string | null): string {
          if (!url) return '';
          return url.replace(/["';]+/g, '');
        }
        
        // Enviar para API do sistema de pedidos
        const orderApiEndpoint = cleanUrl(process.env.ORDERS_API_URL || 'https://api.viralizamos.com/orders');
        const response = await axios.post(`${orderApiEndpoint}/create`, {
          transaction_id: transaction.id,
          service_id: item.payment_request.service_id,
          external_payment_id: externalId,  // ID externo do pagamento
          amount: transaction.amount,
          quantity: serviceData.quantity || 100,
          target_username: item.payment_request.profile_username,
          customer_email: item.payment_request.customer_email,
          customer_name: item.payment_request.customer_name,
          payment_data: {
            method: transaction.method,
            status: transaction.status
          }
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.ORDERS_API_KEY || 'default_key'}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Verificar resposta da API
        if (response.data && response.data.success) {
          const orderIdFromResponse = response.data.order_id;
          
          // Atualizar para processado
          await prisma.processingQueue.update({
            where: { id: item.id },
            data: {
              status: 'processed',
              processed_at: new Date(),
              attempts: item.attempts + 1,
              metadata: JSON.stringify({
                ...metadata,
                order_id: orderIdFromResponse,
                processed_at: new Date().toISOString()
              })
            }
          });
          
          // Atualizar a transação com as informações do pedido
          await prisma.transaction.update({
            where: { id: transactionId },
            data: {
              processed_at: new Date()
            }
          });
          
          // Atualizar o request de pagamento
          await prisma.paymentRequest.update({
            where: { id: item.payment_request_id },
            data: {
              status: 'completed',
              processed_at: new Date(),
              processed_payment_id: orderIdFromResponse
            }
          });
          
          console.log(`Item ${item.id} processado com sucesso. Pedido criado: ${orderIdFromResponse}`);
          success++;
        } else {
          throw new Error(`Falha ao criar pedido: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        console.error(`Erro ao processar item ${item.id}:`, error);
        
        // Atualizar tentativas
        await prisma.processingQueue.update({
          where: { id: item.id },
          data: {
            attempts: item.attempts + 1,
            last_error: error instanceof Error ? error.message : 'Erro desconhecido',
            next_attempt_at: new Date(Date.now() + 5 * 60 * 1000), // Tentar novamente em 5 minutos
            status: item.attempts + 1 >= 3 ? 'failed' : 'pending'
          }
        });
        
        failed++;
      }
    }
    
    console.log(`Processamento concluído: ${success} sucesso(s), ${failed} falha(s)`);
    
    return {
      processed: pendingItems.length,
      success,
      failed
    };
  } catch (error) {
    console.error('Erro ao processar fila:', error);
    throw error;
  }
} 