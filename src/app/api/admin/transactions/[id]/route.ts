import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKeyAuth } from '@/lib/auth';

/**
 * Endpoint para obter detalhes de uma transação específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKeyAuth(authHeader)) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }

    const id = params.id;

    // Buscar transação por ID
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        payment_request: true
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    // Formatar os dados para resposta
    const transactionDetails = {
      id: transaction.id,
      externalId: transaction.external_id,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.created_at.toISOString(),
      updatedAt: transaction.updated_at.toISOString(),
      method: transaction.method,
      provider: transaction.provider,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
      
      // Dados do pedido
      paymentRequest: transaction.payment_request ? {
        id: transaction.payment_request.id,
        token: transaction.payment_request.token,
        status: transaction.payment_request.status,
        amount: transaction.payment_request.amount,
        createdAt: transaction.payment_request.created_at.toISOString()
      } : null,
      
      // Dados do cliente
      customer: {
        name: transaction.payment_request?.customer_name || null,
        email: transaction.payment_request?.customer_email || null,
        phone: transaction.payment_request?.customer_phone || null
      }
    };

    return NextResponse.json(transactionDetails);
  } catch (error) {
    console.error('Erro ao obter detalhes da transação:', error);
    return NextResponse.json(
      { error: 'Erro ao obter detalhes da transação' },
      { status: 500 }
    );
  }
} 