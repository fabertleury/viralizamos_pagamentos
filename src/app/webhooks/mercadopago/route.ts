import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { notifyOrdersService } from '@/lib/orders-service';

/**
 * Webhook para receber notificações do Mercado Pago
 */
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
    
    // Buscar TODAS as transações que podem estar relacionadas a este pagamento
    // Esta mudança permite lidar com múltiplas transações por pagamento
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
    
    console.log(`[Webhook Mercado Pago] Encontradas ${transactions.length} transações para o pagamento ${mercadoPagoId}`);
    
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
      console.log(`[Webhook Mercado Pago] Status do pagamento ${mercadoPagoId}: ${mpData.status}`);
      
      // Mapear status do Mercado Pago para nosso sistema
      const status = mapMercadoPagoStatus(mpData.status);
      console.log(`[Webhook Mercado Pago] Status mapeado: ${status}`);
      
      // Loop para atualizar todas as transações encontradas
      for (const transaction of transactions) {
        // Atualizar cada transação
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
        
        console.log(`[Webhook Mercado Pago] Transação ${transaction.id} atualizada para status: ${status}`);
        
        // Registrar o webhook para cada transação
        await db.webhookLog.create({
          data: {
            transaction_id: transaction.id,
            type: 'mercadopago',
            event: 'payment.update',
            data: JSON.stringify(body),
            processed: true
          }
        });
      }
      
      // Se o pagamento foi aprovado, atualizar o payment_request
      // Só precisamos fazer isso uma vez, já que todas as transações
      // compartilham o mesmo payment_request
      if (status === 'approved' && transactions.length > 0) {
        const paymentRequestId = transactions[0].payment_request_id;
        const paymentRequest = transactions[0].payment_request;
        
        await db.paymentRequest.update({
          where: { id: paymentRequestId },
          data: {
            status: 'completed',
            processed_payment_id: transactions[0].id
          }
        });
        
        console.log(`[Webhook Mercado Pago] PaymentRequest ${paymentRequestId} atualizado para completed com ${transactions.length} transações`);
        
        // Criar ou atualizar o usuário com os dados da transação
        try {
          const customerEmail = paymentRequest.customer_email;
          const customerName = paymentRequest.customer_name;
          const customerPhone = paymentRequest.customer_phone;
          
          if (customerEmail) {
            console.log(`[Webhook Mercado Pago] Verificando se usuário ${customerEmail} já existe`);
            
            // Verificar se o usuário já existe
            const existingUser = await db.user.findUnique({
              where: { email: customerEmail }
            });
            
            if (existingUser) {
              console.log(`[Webhook Mercado Pago] Usuário ${customerEmail} já existe, atualizando...`);
              
              // Atualizar usuário existente
              await db.user.update({
                where: { email: customerEmail },
                data: {
                  name: customerName || existingUser.name,
                  updated_at: new Date()
                }
              });
              
              console.log(`[Webhook Mercado Pago] Usuário ${customerEmail} atualizado com sucesso!`);
            } else {
              console.log(`[Webhook Mercado Pago] Usuário ${customerEmail} não existe, criando...`);
              
              // Criar novo usuário
              await db.user.create({
                data: {
                  email: customerEmail,
                  name: customerName || customerEmail.split('@')[0],
                  role: 'customer',
                  created_at: new Date(),
                  updated_at: new Date()
                }
              });
              
              console.log(`[Webhook Mercado Pago] Usuário ${customerEmail} criado com sucesso!`);
            }
          } else {
            console.log(`[Webhook Mercado Pago] Sem e-mail do cliente para criar/atualizar usuário.`);
          }
        } catch (userError) {
          console.error('[Webhook Mercado Pago] Erro ao processar usuário:', userError);
          // Continuar o processamento mesmo se houver erro com o usuário
        }
        
        // Notificar o serviço de orders sobre a aprovação do pagamento
        try {
          console.log(`[Webhook Mercado Pago] Iniciando notificação ao serviço de orders para ${transactions.length} transações`);
          
          for (const transaction of transactions) {
            console.log(`[Webhook Mercado Pago] Notificando orders sobre a transação ${transaction.id}`);
            const notificationResult = await notifyOrdersService(transaction.id);
            console.log(`[Webhook Mercado Pago] Notificação para o serviço de orders ${notificationResult ? 'enviada com sucesso' : 'falhou'} para a transação ${transaction.id}`);
            
            // Registrar resultado da notificação
            await db.webhookLog.create({
              data: {
                transaction_id: transaction.id,
                type: 'mercadopago_notification_result',
                event: 'order_service_notification',
                data: JSON.stringify({
                  success: notificationResult,
                  timestamp: new Date().toISOString()
                }),
                processed: true
              }
            });
          }
        } catch (notificationError) {
          console.error('[Webhook Mercado Pago] Erro ao notificar serviço de orders:', notificationError);
          
          // Registrar erro de notificação
          await db.webhookLog.create({
            data: {
              transaction_id: transactions[0].id,
              type: 'mercadopago_notification_error',
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
          
          // Mesmo com erro, permitimos que o processamento continue
        }
      }
      
    } catch (error) {
      console.error('[Webhook Mercado Pago] Erro ao processar pagamento:', error);
      
      // Registrar falha de processamento para cada transação
      for (const transaction of transactions) {
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
      
      // Registrar o webhook com erro (uma vez é suficiente)
      await db.webhookLog.create({
        data: {
          transaction_id: transactions.length > 0 ? transactions[0].id : undefined,
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
    console.error('[Webhook Mercado Pago] Erro ao processar webhook do Mercado Pago:', error);
    
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