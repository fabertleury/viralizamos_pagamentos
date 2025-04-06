import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { createPix } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.payment_request_id) {
      return NextResponse.json(
        { error: 'O campo payment_request_id é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar a solicitação de pagamento
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: body.payment_request_id },
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se a solicitação está expirada
    if (paymentRequest.expires_at && new Date() > new Date(paymentRequest.expires_at)) {
      // Atualizar status para expirado
      await db.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'expired' }
      });
      
      return NextResponse.json(
        { error: 'Esta solicitação de pagamento expirou' },
        { status: 400 }
      );
    }
    
    // Verificar se já existe um pagamento pendente ou completo
    const existingPayment = await db.payment.findFirst({
      where: {
        payment_request_id: paymentRequest.id,
        status: { in: ['pending', 'completed'] }
      }
    });
    
    if (existingPayment) {
      // Se já existe um pagamento pendente ou completo, retornar o pagamento existente
      return NextResponse.json(existingPayment);
    }
    
    // Preparar URL para receber notificações de webhook
    const webhookUrl = process.env.WEBHOOK_URL 
      ? `${process.env.WEBHOOK_URL}/api/webhooks/mercadopago` 
      : undefined;
    
    // Criar um novo pagamento PIX
    const payment = await createPix({
      paymentRequestId: paymentRequest.id,
      webhookUrl
    });
    
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Erro ao processar pagamento PIX:', error);
    return NextResponse.json(
      { error: `Falha ao processar pagamento: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 