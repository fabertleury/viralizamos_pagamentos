import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Usar a variável de ambiente para a API Key
const API_KEY = process.env.DIAGNOSTIC_API_KEY || "";

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'API key inválida' },
      { status: 401 }
    );
  }

  try {
    // Parâmetros de consulta
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const transaction_id = searchParams.get('transaction_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query: any = {};
    
    // Construir a consulta com base nos parâmetros fornecidos
    if (token) {
      query.token = token;
    }
    
    if (transaction_id) {
      // Buscar pagamentos que têm uma transação com esse ID
      const paymentsWithTransaction = await db.paymentRequest.findMany({
        where: {
          transactions: {
            some: {
              id: transaction_id
            }
          }
        },
        include: {
          transactions: true
        },
        take: limit
      });
      
      return NextResponse.json({
        status: 'success',
        count: paymentsWithTransaction.length,
        payments: paymentsWithTransaction
      });
    }

    // Se chegou aqui, não foi especificado transaction_id, então busca pelo token ou os mais recentes
    const recentPayments = await db.paymentRequest.findMany({
      where: query,
      include: {
        transactions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Estatísticas gerais
    const totalPayments = await db.paymentRequest.count();
    const completedPayments = await db.paymentRequest.count({
      where: { status: 'completed' }
    });
    const pendingPayments = await db.paymentRequest.count({
      where: { status: 'pending' }
    });
    const failedPayments = await db.paymentRequest.count({
      where: { status: 'failed' }
    });

    // Verificar pagamentos na fila de processamento
    const processingQueueItems = await db.processingQueue.findMany({
      where: {
        type: 'payment_reprocess'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      status: 'success',
      stats: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: failedPayments,
      },
      payments: recentPayments,
      processing_queue: processingQueueItems
    });
  } catch (error) {
    console.error('Erro ao buscar informações de diagnóstico:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    );
  }
} 