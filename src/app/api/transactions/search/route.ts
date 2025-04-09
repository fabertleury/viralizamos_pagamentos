import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TransactionResponse, Transaction, PaymentRequest } from '@/lib/types';
import { isValidUuid, getSingleValue } from '@/lib/helpers';

/**
 * Endpoint para buscar transações
 * Permite buscar por ID, ID externo ou token
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID não fornecido. Use o parâmetro ?id=valor' },
        { status: 400 }
      );
    }

    // Verificar se o ID é um UUID válido
    const idValue = getSingleValue(id);
    const isUuid = isValidUuid(idValue);
    
    console.log(`[API] Buscando transação com ${isUuid ? 'UUID' : 'ID externo'}: ${idValue}`);
    
    let transaction: Transaction | null = null;
    
    if (isUuid) {
      // Buscar por ID (UUID)
      transaction = await db.transaction.findUnique({
        where: { id: idValue },
        include: {
          payment_request: true,
        },
      }) as Transaction | null;
    } else {
      // Buscar por ID externo
      transaction = await db.transaction.findFirst({
        where: { external_id: idValue },
        include: {
          payment_request: true,
        },
      }) as Transaction | null;
    }
    
    if (!transaction) {
      // Se não encontrar como UUID ou ID externo, tentar buscar por token
      console.log(`[API] Transação não encontrada por ID, tentando buscar por token: ${idValue}`);
      
      const paymentRequest = await db.paymentRequest.findUnique({
        where: { token: idValue },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      }) as PaymentRequest | null;
      
      if (paymentRequest?.transactions && paymentRequest.transactions.length > 0) {
        transaction = paymentRequest.transactions[0];
        // Adicionar o payment_request ao objeto transaction para manter consistência
        transaction.payment_request = paymentRequest;
      }
    }
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }
    
    // Transformar o objeto para o formato esperado
    const transactionData: TransactionResponse = {
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
      customer_name: transaction.payment_request?.customer_name || null,
      customer_email: transaction.payment_request?.customer_email || null,
      customer_phone: transaction.payment_request?.customer_phone || null,
      customer: transaction.payment_request ? {
        name: transaction.payment_request.customer_name,
        email: transaction.payment_request.customer_email,
        phone: transaction.payment_request.customer_phone
      } : null
    };
    
    return NextResponse.json(transactionData);
  } catch (error) {
    console.error('[API] Erro ao buscar transação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transação' },
      { status: 500 }
    );
  }
} 