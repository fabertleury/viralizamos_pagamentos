import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { queuePaymentProcessing, getQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição é válida
    // Opcionalmente, pode-se implementar verificação de assinatura do Mercado Pago
    // para garantir que a requisição é autêntica
    
    const body = await request.json();
    
    // Verificar o tipo de notificação
    if (body.type !== 'payment') {
      // Registrar a notificação recebida para fins de debug
      console.log('Notificação não relacionada a pagamento recebida:', body);
      return NextResponse.json({ status: 'success', message: 'Notification received but ignored' });
    }
    
    // Extrair o ID do pagamento
    const mercadoPagoId = body.data?.id;
    if (!mercadoPagoId) {
      console.error('ID do pagamento não encontrado na notificação');
      return NextResponse.json({ error: 'Payment ID not found' }, { status: 400 });
    }
    
    // Buscar todas as transações relacionadas a este ID do Mercado Pago 
    // (incluindo aquelas com prefixo para múltiplos posts)
    const transactions = await db.transaction.findMany({
      where: {
        provider: 'mercadopago',
        external_id: {
          startsWith: mercadoPagoId.toString()
        }
      },
      include: {
        payment_request: true
      }
    });
    
    if (!transactions || transactions.length === 0) {
      console.error(`Transações com Mercado Pago ID ${mercadoPagoId} não encontradas no banco`);
      
      // Registrar o webhook para referência futura
      await db.webhookLog.create({
        data: {
          type: 'mercadopago',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: false,
          error: 'Transactions not found'
        }
      });
      
      return NextResponse.json({ status: 'success', message: 'Webhook recorded but transactions not found' });
    }
    
    console.log(`Encontradas ${transactions.length} transações para o pagamento ${mercadoPagoId}`);
    
    try {
      // Buscar dados atualizados do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mercadoPagoId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });
      
      if (!mpResponse.ok) {
        throw new Error(`Failed to fetch payment data: ${mpResponse.status}`);
      }
      
      const mpData = await mpResponse.json();
      
      // Mapear status do Mercado Pago para nosso sistema
      const status = mapMercadoPagoStatus(mpData.status);
      
      // Processar cada transação encontrada
      for (const transaction of transactions) {
        // Verificar se temos o ID da transação
        if (!transaction.id) {
          console.error(`Transação sem ID encontrada para pagamento ${mercadoPagoId}. Pulando.`);
          continue;
        }
        
        // Atualizar a transação
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            status,
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || '{}'),
              mercadopago_data: mpData
            })
          }
        });
        
        // Registrar o webhook para esta transação
        await db.webhookLog.create({
          data: {
            transaction_id: transaction.id,
            type: 'mercadopago',
            event: 'payment.update',
            data: JSON.stringify(body),
            processed: true
          }
        });
        
        // Se o pagamento foi aprovado e a transação não foi processada ainda,
        // adicionar diretamente à fila Redis para processamento imediato
        if (status === 'approved' && !transaction.processed_at && transaction.payment_request_id) {
          // Buscar a fila de processamento
          const queue = getQueue('payment-processing');
          
          if (queue) {
            // Gerar jobId usando o ID da transação para garantir idempotência
            const jobId = `payment_${transaction.external_id}`;
            
            // Verificar e registrar os IDs para debug
            console.log(`[DEBUG] Adicionando job à fila:`, {
              transactionId: transaction.id,
              paymentRequestId: transaction.payment_request_id,
              externalId: transaction.external_id,
              jobId
            });
            
            // Adicionar à fila com jobId para evitar duplicação
            await queue.add(
              'process-payment',
              {
                transaction_id: transaction.id,       // Garantir que não é undefined
                payment_request_id: transaction.payment_request_id,
                external_id: transaction.external_id || mercadoPagoId.toString()
              },
              { 
                jobId, // Bull ignora jobs com mesmo ID
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 }
              }
            );
            
            console.log(`💰 [Webhook] Transação ${transaction.id} adicionada à fila Redis com jobId ${jobId}`);
          } else {
            console.warn(`⚠️ [Webhook] Fila de processamento não está disponível`);
          }
        }
      }
      
      // Se o pagamento foi aprovado, atualizar o payment_request
      // Como várias transações podem compartilhar o mesmo payment_request,
      // precisamos garantir que atualizamos apenas uma vez
      if (status === 'approved' && transactions.length > 0 && transactions[0].payment_request_id) {
        // Extrair o payment_request_id da primeira transação
        const paymentRequestId = transactions[0].payment_request_id;
        
        await db.paymentRequest.update({
          where: { id: paymentRequestId },
          data: {
            status: 'completed',
            processed_payment_id: transactions[0].id
          }
        });
        
        console.log(`Payment request ${paymentRequestId} atualizado para completed com ${transactions.length} transações`);
      }
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      // Registrar falha de processamento para cada transação
      for (const transaction of transactions) {
        if (transaction.id) {
          await db.paymentProcessingFailure.create({
            data: {
              transaction_id: transaction.id,
              error_code: 'PROCESSING_ERROR',
              error_message: (error as Error).message,
              stack_trace: (error as Error).stack,
              metadata: JSON.stringify({
                webhook_data: body,
                error: error
              })
            }
          });
        }
      }
      
      // Registrar o webhook com erro
      await db.webhookLog.create({
        data: {
          transaction_id: transactions[0]?.id,
          type: 'mercadopago',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: false,
          error: (error as Error).message
        }
      });
      
      throw error;
    }
    
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    
    // Mesmo em caso de erro, retornamos 200 para evitar que o Mercado Pago 
    // considere a notificação como falha e tente novamente
    return NextResponse.json({ 
      status: 'error', 
      message: (error as Error).message 
    });
  }
}

// Função para mapear status do Mercado Pago para nosso sistema
function mapMercadoPagoStatus(mpStatus: string): string {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'in_process':
      return 'processing';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
} 