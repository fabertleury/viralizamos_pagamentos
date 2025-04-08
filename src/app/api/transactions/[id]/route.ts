import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Verificar se o ID é um UUID válido
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let transaction = null;
    
    if (isUuid) {
      // Buscar por ID
      transaction = await db.transaction.findUnique({
        where: { id },
        include: {
          payment_request: true,
        },
      });
    } else {
      // Buscar por ID externo
      transaction = await db.transaction.findFirst({
        where: { external_id: id },
        include: {
          payment_request: true,
        },
      });
    }
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }
    
    // Transformar o objeto para o formato esperado pela página
    const transactionData = {
      id: transaction.id,
      external_id: transaction.external_id,
      amount: transaction.amount,
      status: transaction.status,
      created_at: transaction.created_at.toISOString(),
      payment_id: transaction.external_id,
      provider: transaction.provider,
      method: transaction.method,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
      status_provider: transaction.status,
      customer_name: transaction.payment_request?.customer_name,
      customer_email: transaction.payment_request?.customer_email,
      customer_phone: transaction.payment_request?.customer_phone,
    };
    
    return NextResponse.json(transactionData);
  } catch (error) {
    console.error('Erro ao buscar transação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transação' },
      { status: 500 }
    );
  }
} 