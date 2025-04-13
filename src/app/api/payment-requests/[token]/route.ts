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
    console.error('[API] Token não fornecido na requisição');
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`[API] Buscando detalhes do pedido com token: ${token}`);

    // Verificar a conexão com o banco de dados
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('[API] Conexão com o banco de dados OK');
    } catch (dbError) {
      console.error('[API] Erro na conexão com o banco de dados:', dbError);
      return NextResponse.json(
        { error: 'Erro de conexão com o banco de dados' },
        { status: 500 }
      );
    }

    // Verificar se o token tem formato válido
    if (token.length < 8 || token.length > 64) {
      console.warn(`[API] Token com formato inválido: ${token}`);
    }

    console.log(`[API] Executando consulta para token: ${token}`);

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
      
      // Vamos verificar se há algum pedido no banco para diagnosticar problemas
      const totalPaymentRequests = await db.paymentRequest.count();
      console.log(`[API] Total de pedidos no banco: ${totalPaymentRequests}`);
      
      // Buscar alguns tokens para depuração
      if (totalPaymentRequests > 0) {
        const sampleRequests = await db.paymentRequest.findMany({
          select: { token: true },
          take: 5
        });
        console.log('[API] Exemplos de tokens existentes:', sampleRequests.map(r => r.token));
      }
      
      return NextResponse.json(
        { 
          error: 'Pedido não encontrado',
          details: 'O token fornecido não corresponde a nenhum pedido no sistema.'
        },
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
      service_name: paymentRequest.service_name || 'Serviço não especificado',
      profile_username: paymentRequest.profile_username || '',
      amount: paymentRequest.amount,
      description: paymentRequest.additional_data || '',
      created_at: paymentRequest.created_at,
      updated_at: paymentRequest.updated_at || paymentRequest.created_at,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      transaction: transaction ? {
        id: transaction.id,
        status: transaction.status,
        method: transaction.method,
        provider: transaction.provider,
        external_id: transaction.external_id || '',
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
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 