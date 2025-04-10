import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { checkApiKey } from '@/lib/auth';

/**
 * API para buscar pedidos de um cliente pelo email
 */
export async function POST(request: NextRequest) {
  // Verificar autenticação (opcional se quiser restringir acesso)
  // const isAuthorized = checkApiKey(request);
  // if (!isAuthorized) {
  //   return NextResponse.json(
  //     { error: 'Acesso não autorizado' },
  //     { status: 401 }
  //   );
  // }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[API] Buscando pedidos para o cliente com email: ${email}`);

    // Verificar se o usuário existe
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[API] Usuário com email ${email} não encontrado`);
      
      // Opção 1: Retornar erro 404
      // return NextResponse.json(
      //   { error: 'Usuário não encontrado' },
      //   { status: 404 }
      // );
      
      // Opção 2: Retornar lista vazia (menos intrusivo para o usuário final)
      return NextResponse.json({
        orders: [],
        user: null
      });
    }

    console.log(`[API] Usuário encontrado: ${user.id} - ${user.name}`);

    // Buscar payment requests com este email
    const paymentRequests = await db.paymentRequest.findMany({
      where: {
        customer_email: email
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        transactions: {
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });

    // Formatar os pedidos para a resposta
    const orders = paymentRequests.map(request => {
      const latestTransaction = request.transactions.length > 0 
        ? request.transactions[0] 
        : null;
      
      return {
        id: request.id,
        token: request.token,
        status: request.status,
        service_name: request.service_name,
        profile_username: request.profile_username,
        amount: request.amount,
        created_at: request.created_at,
        transaction: latestTransaction ? {
          id: latestTransaction.id,
          status: latestTransaction.status,
          method: latestTransaction.method,
          provider: latestTransaction.provider,
          created_at: latestTransaction.created_at,
          processed_at: latestTransaction.processed_at
        } : null,
        customer: {
          name: request.customer_name,
          email: request.customer_email
        }
      };
    });

    console.log(`[API] Encontrados ${orders.length} pedidos para o cliente ${email}`);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      orders
    });

  } catch (error) {
    console.error('[API] Erro ao buscar pedidos do cliente:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 