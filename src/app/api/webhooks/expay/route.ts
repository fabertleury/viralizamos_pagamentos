import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { checkPaymentStatus } from '@/lib/expay';
import { mapExpayStatus } from '@/lib/expay/types';
import { notifyOrdersService } from '@/lib/orders-service';
import { ExpayWebhookNotification } from '@/lib/expay/types';

export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição é válida
    const body = await request.json() as ExpayWebhookNotification;
    
    // Registrar webhook recebido para debug
    console.log('[Webhook Expay] Notificação recebida:', body);
    
    // Verificar dados necessários
    if (!body.invoice_id || !body.token) {
      console.error('[Webhook Expay] Dados incompletos na notificação');
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }
    
    // Buscar transação no banco
    const transaction = await db.transaction.findFirst({
      where: {
        provider: 'expay',
        external_id: body.invoice_id
      },
      include: {
        payment_request: true
      }
    });
    
    if (!transaction) {
      console.error(`[Webhook Expay] Transação ${body.invoice_id} não encontrada`);
      
      // Registrar webhook não processado
      await db.webhookLog.create({
        data: {
          type: 'expay',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: false,
          error: 'Transaction not found'
        }
      });
      
      return NextResponse.json({ 
        status: 'error', 
        message: 'Transaction not found' 
      });
    }
    
    try {
      // Verificar status atual do pagamento na Expay
      const paymentStatus = await checkPaymentStatus(body);
      
      if (!paymentStatus.result) {
        throw new Error('Falha ao verificar status do pagamento');
      }
      
      // Mapear status da Expay para nosso sistema
      const status = mapExpayStatus(paymentStatus.transaction_request.status);
      
      // Atualizar a transação
      await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status,
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            expay_data: paymentStatus
          })
        }
      });
      
      // Registrar o webhook processado
      await db.webhookLog.create({
        data: {
          transaction_id: transaction.id,
          type: 'expay',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: true
        }
      });
      
      // Se o pagamento foi aprovado
      if (status === 'approved' && !transaction.processed_at) {
        // Atualizar o payment_request
        await db.paymentRequest.update({
          where: { id: transaction.payment_request_id },
          data: {
            status: 'completed',
            processed_payment_id: transaction.id
          }
        });
        
        // Notificar o serviço de orders
        try {
          console.log(`[Webhook Expay] Notificando serviço de orders sobre a transação ${transaction.id}`);
          await notifyOrdersService(transaction.id);
        } catch (notificationError) {
          console.error('[Webhook Expay] Erro ao notificar serviço de orders:', notificationError);
          
          // Registrar erro de notificação
          await db.webhookLog.create({
            data: {
              transaction_id: transaction.id,
              type: 'expay_notification_error',
              event: 'order_service_notification_failed',
              data: JSON.stringify({
                error: notificationError instanceof Error ? notificationError.message : 'Erro desconhecido',
                stack: notificationError instanceof Error ? notificationError.stack : undefined,
                timestamp: new Date().toISOString()
              }),
              processed: false,
              error: notificationError instanceof Error ? notificationError.message : 'Erro desconhecido'
            }
          });
        }
      }
      
      return NextResponse.json({ status: 'success' });
    } catch (error) {
      console.error('[Webhook Expay] Erro ao processar pagamento:', error);
      
      // Registrar falha de processamento
      await db.paymentProcessingFailure.create({
        data: {
          transaction_id: transaction.id,
          error_code: 'PROCESSING_ERROR',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack_trace: error instanceof Error ? error.stack : undefined,
          metadata: JSON.stringify({
            webhook_data: body,
            error: error
          })
        }
      });
      
      // Registrar o webhook com erro
      await db.webhookLog.create({
        data: {
          transaction_id: transaction.id,
          type: 'expay',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });
      
      throw error;
    }
  } catch (error) {
    console.error('[Webhook Expay] Erro ao processar webhook:', error);
    
    // Retornar 200 mesmo com erro para evitar reenvio
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 