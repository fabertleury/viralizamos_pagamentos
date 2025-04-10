import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PaymentResponse } from '@/types/payment';

// Buscar solicitação de pagamento por token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`[API] Buscando detalhes do pedido com token: ${token}`);

    // Buscar o pedido pelo token
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { token },
      include: {
        transactions: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      }
    });

    if (!paymentRequest) {
      console.log(`[API] Pedido com token ${token} não encontrado`);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    console.log(`[API] Pedido encontrado: ${paymentRequest.id}`);

    // Formatar a resposta
    const transaction = paymentRequest.transactions.length > 0 
      ? paymentRequest.transactions[0]
      : null;

    const formattedPaymentRequest = {
      id: paymentRequest.id,
      token: paymentRequest.token,
      status: paymentRequest.status,
      service_name: paymentRequest.service_name,
      profile_username: paymentRequest.profile_username,
      amount: paymentRequest.amount,
      additional_data: paymentRequest.additional_data || '',
      created_at: paymentRequest.created_at,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      transaction: transaction ? {
        id: transaction.id,
        status: transaction.status,
        method: transaction.method,
        provider: transaction.provider,
        external_id: transaction.external_id,
        amount: transaction.amount,
        created_at: transaction.created_at,
        processed_at: transaction.processed_at
      } : null
    };

    return NextResponse.json({
      paymentRequest: formattedPaymentRequest
    });

  } catch (error) {
    console.error('[API] Erro ao buscar detalhes do pedido:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 