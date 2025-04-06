import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { updatePaymentStatus } from '@/lib/payments';

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
    
    // Buscar o pagamento no banco de dados
    const payment = await db.payment.findFirst({
      where: {
        provider: 'mercadopago',
        provider_payment_id: mercadoPagoId.toString()
      }
    });
    
    if (!payment) {
      console.error(`Pagamento com Mercado Pago ID ${mercadoPagoId} não encontrado no banco`);
      
      // Registrar a notificação mesmo assim para referência futura
      await db.notification.create({
        data: {
          type: 'mercadopago_webhook',
          data: JSON.stringify(body)
        }
      });
      
      return NextResponse.json({ status: 'success', message: 'Notification recorded but payment not found' });
    }
    
    // Atualizar o status do pagamento
    await updatePaymentStatus(payment.id);
    
    // Registrar a notificação
    await db.notification.create({
      data: {
        payment_id: payment.id,
        type: 'mercadopago_webhook',
        data: JSON.stringify(body)
      }
    });
    
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