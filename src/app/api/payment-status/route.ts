import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const externalId = url.searchParams.get('external_id');
    
    if (!token && !externalId) {
      return NextResponse.json(
        { error: 'É necessário fornecer token ou external_id' },
        { status: 400 }
      );
    }
    
    let paymentRequest;
    let transaction;
    
    // Buscar por token
    if (token) {
      console.log(`Verificando status do pagamento com token: ${token}`);
      
      paymentRequest = await db.paymentRequest.findUnique({
        where: { token },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });
      
      if (!paymentRequest) {
        return NextResponse.json(
          { error: 'Pagamento não encontrado' },
          { status: 404 }
        );
      }
      
      transaction = paymentRequest.transactions[0] || null;
    } 
    // Buscar por external_id
    else if (externalId) {
      console.log(`Verificando status do pagamento com external_id: ${externalId}`);
      
      transaction = await db.transaction.findFirst({
        where: { external_id: externalId },
        include: {
          payment_request: true
        },
        orderBy: { created_at: 'desc' }
      });
      
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transação não encontrada' },
          { status: 404 }
        );
      }
      
      paymentRequest = transaction.payment_request;
    }
    
    // Preparar resposta
    const response = {
      payment_status: paymentRequest?.status || 'unknown',
      transaction_status: transaction?.status || 'unknown',
      customer: {
        name: paymentRequest?.customer_name || '',
        email: paymentRequest?.customer_email || ''
      },
      payment: {
        amount: paymentRequest?.amount || 0,
        service: paymentRequest?.service_name || '',
        profile: paymentRequest?.profile_username || '',
        created_at: paymentRequest?.created_at || null,
        processed_at: paymentRequest?.processed_at || null
      },
      transaction: transaction ? {
        id: transaction.id,
        external_id: transaction.external_id,
        method: transaction.method,
        status: transaction.status,
        provider: transaction.provider,
        processed_at: transaction.processed_at
      } : null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, external_id: externalId } = body;
    
    if (!token && !externalId) {
      return NextResponse.json(
        { error: 'É necessário fornecer token ou external_id' },
        { status: 400 }
      );
    }
    
    let paymentRequest;
    let transaction;
    
    // Buscar por token
    if (token) {
      console.log(`Verificando status do pagamento com token: ${token}`);
      
      paymentRequest = await db.paymentRequest.findUnique({
        where: { token },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });
      
      if (!paymentRequest) {
        return NextResponse.json(
          { error: 'Pagamento não encontrado' },
          { status: 404 }
        );
      }
      
      transaction = paymentRequest.transactions[0] || null;
    } 
    // Buscar por external_id
    else if (externalId) {
      console.log(`Verificando status do pagamento com external_id: ${externalId}`);
      
      transaction = await db.transaction.findFirst({
        where: { external_id: externalId },
        include: {
          payment_request: true
        },
        orderBy: { created_at: 'desc' }
      });
      
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transação não encontrada' },
          { status: 404 }
        );
      }
      
      paymentRequest = transaction.payment_request;
    }
    
    // Preparar resposta
    const response = {
      payment_status: paymentRequest?.status || 'unknown',
      transaction_status: transaction?.status || 'unknown',
      customer: {
        name: paymentRequest?.customer_name || '',
        email: paymentRequest?.customer_email || ''
      },
      payment: {
        amount: paymentRequest?.amount || 0,
        service: paymentRequest?.service_name || '',
        profile: paymentRequest?.profile_username || '',
        created_at: paymentRequest?.created_at || null,
        processed_at: paymentRequest?.processed_at || null
      },
      transaction: transaction ? {
        id: transaction.id,
        external_id: transaction.external_id,
        method: transaction.method,
        status: transaction.status,
        provider: transaction.provider,
        processed_at: transaction.processed_at
      } : null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
} 