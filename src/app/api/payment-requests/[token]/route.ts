import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PaymentResponse } from '@/types/payment';

// Buscar solicitação de pagamento por token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`Buscando pagamento com token: ${token}`);
    
    // Buscar a solicitação de pagamento com a última transação
    const paymentRequest = await db.paymentRequest.findUnique({
      where: {
        token
      },
      include: {
        transactions: {
          orderBy: [
            { status: 'asc' }, // 'pending' vem antes de 'completed'
            { created_at: 'desc' }
          ],
          take: 1
        }
      }
    } satisfies Prisma.PaymentRequestFindUniqueArgs);
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se a solicitação expirou
    if (paymentRequest.expires_at && new Date(paymentRequest.expires_at) < new Date()) {
      // Atualizar status para expirado se ainda não estiver
      if (paymentRequest.status === 'pending') {
        await db.paymentRequest.update({
          where: { id: paymentRequest.id },
          data: { status: 'expired' }
        });
        paymentRequest.status = 'expired';
      }
    }
    
    // Formatar resposta
    const response: PaymentResponse = {
      id: paymentRequest.id,
      token: paymentRequest.token,
      amount: paymentRequest.amount,
      description: paymentRequest.service_name,
      status: paymentRequest.status,
      payer_name: paymentRequest.customer_name,
      payer_email: paymentRequest.customer_email,
      payer_phone: paymentRequest.customer_phone,
      expires_at: paymentRequest.expires_at,
      created_at: paymentRequest.created_at,
      payment: paymentRequest.transactions[0] ? {
        id: paymentRequest.transactions[0].id,
        status: paymentRequest.transactions[0].status,
        method: paymentRequest.transactions[0].method,
        pix_code: paymentRequest.transactions[0].pix_code,
        pix_qrcode: paymentRequest.transactions[0].pix_qrcode,
        amount: paymentRequest.transactions[0].amount
      } : undefined
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar solicitação de pagamento:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar solicitação de pagamento',
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 