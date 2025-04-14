import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKeyAuth } from '@/lib/auth';

/**
 * Endpoint para fornecer estatísticas para o dashboard do painel administrativo
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!verifyApiKeyAuth(authHeader)) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }

    // Obter parâmetros (período: hoje, semana, mês, total)
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    
    // Definir data de início baseada no período
    const startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // uma data bem antiga para pegar tudo
        break;
    }

    // Realizar consultas em paralelo
    const [
      totalTransactions,
      transactionsByStatus,
      transactionsByMethod,
      totalAmountApproved,
      totalAmountPending,
    ] = await Promise.all([
      // Total de transações no período
      db.transaction.count({
        where: {
          created_at: { gte: startDate }
        }
      }),
      
      // Transações agrupadas por status
      db.$queryRaw`
        SELECT 
          status, 
          COUNT(*) as count, 
          SUM(amount) as total_amount 
        FROM transactions 
        WHERE created_at >= ${startDate} 
        GROUP BY status
      `,
      
      // Transações agrupadas por método de pagamento
      db.$queryRaw`
        SELECT 
          method, 
          COUNT(*) as count, 
          SUM(amount) as total_amount 
        FROM transactions 
        WHERE created_at >= ${startDate} 
        GROUP BY method
      `,
      
      // Valor total aprovado
      db.transaction.aggregate({
        where: {
          status: 'approved',
          created_at: { gte: startDate }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Valor total pendente
      db.transaction.aggregate({
        where: {
          status: 'pending',
          created_at: { gte: startDate }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    // Formatar dados para resposta
    const stats = {
      period,
      totalTransactions,
      transactionsByStatus,
      transactionsByMethod,
      totals: {
        approved: totalAmountApproved._sum.amount || 0,
        pending: totalAmountPending._sum.amount || 0
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    );
  }
} 