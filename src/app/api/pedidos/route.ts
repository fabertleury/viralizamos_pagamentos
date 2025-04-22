import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * API interna para buscar pedidos pelo email
 * Usada pelo formulário de acompanhamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[API] Buscando pedidos para o email: ${email}`);

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

    // Em vez de verificar se o usuário existe no banco de pagamentos,
    // vamos apenas usar os dados dos pedidos que já temos
    const user = {
      id: email, // Usar o email como ID temporário
      name: paymentRequests.length > 0 ? paymentRequests[0].customer_name : email.split('@')[0],
      email: email
    };
    
    console.log(`[API] Usando dados de pedidos para ${email} sem acessar tabela de usuários`);

    // Formatar os pedidos para a resposta
    const orders = paymentRequests.map(request => {
      const latestTransaction = request.transactions.length > 0 
        ? request.transactions[0] 
        : null;
      
      return {
        id: request.id,
        token: request.token,
        status: request.status,
        service_name: request.service_name || 'Serviço Viralizamos',
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

    console.log(`[API] Encontrados ${orders.length} pedidos para o email ${email}`);

    return NextResponse.json({
      success: true,
      orders,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email
      } : null
    });

  } catch (error) {
    console.error('[API] Erro ao buscar pedidos:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 