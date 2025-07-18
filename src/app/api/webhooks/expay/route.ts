import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { checkPaymentStatus } from '@/lib/expay';

/**
 * Webhook para receber notificações do Expay
 * 
 * Conforme documentação:
 * 1. Expay envia um POST com date_notification, invoice_id e token
 * 2. Devemos responder com token e merchant_key
 * 3. Expay responderá com os detalhes completos da transação
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Recebida notificação do Expay');
    
    // Obter os dados da notificação
    const notification = await request.json();
    console.log('[WEBHOOK] Dados da notificação:', JSON.stringify(notification));
    
    // Verificar se a notificação contém os campos necessários
    if (!notification.token || !notification.invoice_id) {
      console.error('[WEBHOOK] Notificação inválida, faltam campos obrigatórios');
      return NextResponse.json({ error: 'Notificação inválida' }, { status: 400 });
    }
    
    // Verificar se existe uma solicitação de pagamento com o invoice_id informado
    const paymentRequest = await db.paymentRequest.findFirst({
      where: { id: notification.invoice_id },
      include: { transactions: true }
    });
    
    if (!paymentRequest) {
      console.error(`[WEBHOOK] Pedido com ID ${notification.invoice_id} não encontrado`);
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    
    console.log(`[WEBHOOK] Pedido encontrado: ${paymentRequest.id}`);
    
    try {
      // Verificar o status do pagamento no Expay
      const statusResponse = await checkPaymentStatus(notification);
      console.log('[WEBHOOK] Status do pagamento:', JSON.stringify(statusResponse));
      
      if (statusResponse.result && statusResponse.transaction_request) {
        const transactionStatus = statusResponse.transaction_request.status;
        console.log(`[WEBHOOK] Status da transação: ${transactionStatus}`);
        
        // Mapear o status do Expay para o status interno
        let newStatus;
        switch (transactionStatus) {
          case 'paid':
            newStatus = 'approved';
            break;
          case 'canceled':
            newStatus = 'cancelled';
            break;
          case 'refunded':
            newStatus = 'refunded';
            break;
          case 'pending':
          default:
            newStatus = 'pending';
            break;
        }
        
        // Atualizar o status da transação
        if (paymentRequest.transactions.length > 0) {
          const transaction = paymentRequest.transactions[0];
          
          // Só atualizar se o status for diferente
          if (transaction.status !== newStatus) {
            console.log(`[WEBHOOK] Atualizando status da transação de ${transaction.status} para ${newStatus}`);
            
            await db.transaction.update({
              where: { id: transaction.id },
              data: { 
                status: newStatus,
                updated_at: new Date(),
                processed_at: newStatus === 'approved' ? new Date() : undefined
              }
            });
            
            // Se o pagamento foi aprovado, também atualizar o status do pedido
            if (newStatus === 'approved' && paymentRequest.status !== 'paid') {
              console.log(`[WEBHOOK] Atualizando status do pedido para paid`);
              
              await db.paymentRequest.update({
                where: { id: paymentRequest.id },
                data: { 
                  status: 'paid',
                  processed_at: new Date()
                }
              });
              
              // Registrar a notificação de pagamento
              await db.paymentNotificationLog.create({
                data: {
                  transaction_id: transaction.id,
                  type: 'webhook',
                  status: 'success',
                  target_url: 'expay_webhook',
                  payload: JSON.stringify(notification),
                  response: JSON.stringify(statusResponse)
                }
              });
            }
          } else {
            console.log(`[WEBHOOK] Status da transação já está como ${newStatus}, nenhuma atualização necessária`);
          }
        } else {
          console.warn(`[WEBHOOK] Pedido ${paymentRequest.id} não tem transações associadas`);
        }
      }
    } catch (error) {
      console.error('[WEBHOOK] Erro ao verificar status do pagamento:', error);
      
      // Registrar o erro, mas não falhar o webhook
      if (paymentRequest.transactions.length > 0) {
        await db.paymentNotificationLog.create({
          data: {
            transaction_id: paymentRequest.transactions[0].id,
            type: 'webhook',
            status: 'error',
            target_url: 'expay_webhook',
            payload: JSON.stringify(notification),
            error_message: error instanceof Error ? error.message : 'Erro desconhecido',
            error_stack: error instanceof Error ? error.stack : undefined
          }
        });
      }
    }
    
    // Responder com sucesso para o Expay
    return NextResponse.json({ 
      success: true,
      message: 'Notificação recebida com sucesso'
    });
    
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar notificação do Expay:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao processar notificação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 