import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

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
    
    // Buscar a transação no banco de dados
    const transaction = await db.transaction.findFirst({
      where: {
        provider: 'mercadopago',
        external_id: mercadoPagoId.toString()
      },
      include: {
        payment_request: true
      }
    });
    
    if (!transaction) {
      console.error(`Transação com Mercado Pago ID ${mercadoPagoId} não encontrada no banco`);
      
      // Registrar o webhook para referência futura
      await db.webhookLog.create({
        data: {
          type: 'mercadopago',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: false,
          error: 'Transaction not found'
        }
      });
      
      return NextResponse.json({ status: 'success', message: 'Webhook recorded but transaction not found' });
    }
    
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
      
      // Se o pagamento foi aprovado, atualizar o payment_request
      if (status === 'approved') {
        await db.paymentRequest.update({
          where: { id: transaction.payment_request_id },
          data: {
            status: 'completed',
            processed_payment_id: transaction.id
          }
        });
      }
      
      // Registrar o webhook
      await db.webhookLog.create({
        data: {
          transaction_id: transaction.id,
          type: 'mercadopago',
          event: 'payment.update',
          data: JSON.stringify(body),
          processed: true
        }
      });
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      // Registrar falha de processamento
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
      
      // Registrar o webhook com erro
      await db.webhookLog.create({
        data: {
          transaction_id: transaction.id,
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