import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Buscando transação pelo token de pagamento: ${token}`);
    
    // Buscar o payment_request com o token fornecido
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { token },
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
    
    if (!paymentRequest) {
      console.error(`[API] Payment request não encontrado para o token: ${token}`);
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se há transações associadas
    if (!paymentRequest.transactions || paymentRequest.transactions.length === 0) {
      console.error(`[API] Nenhuma transação encontrada para o token: ${token}`);
      return NextResponse.json(
        { error: 'Nenhuma transação encontrada para esta solicitação de pagamento' },
        { status: 404 }
      );
    }
    
    // Usar a primeira transação (a mais recente)
    const transaction = paymentRequest.transactions[0];
    
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
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      customer_phone: paymentRequest.customer_phone,
      customer: {
        name: paymentRequest.customer_name,
        email: paymentRequest.customer_email,
        phone: paymentRequest.customer_phone
      }
    };
    
    return NextResponse.json(transactionData);
  } catch (error) {
    console.error('[API] Erro ao buscar transação pelo token:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transação' },
      { status: 500 }
    );
  }
} 