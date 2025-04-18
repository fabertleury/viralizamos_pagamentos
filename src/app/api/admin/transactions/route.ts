import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKeyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para listar transações para o painel administrativo
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

    // Obter parâmetros da requisição
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (method) {
      where.method = method;
    }
    
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { external_id: { contains: search } },
        { payment_request: { customer_name: { contains: search, mode: 'insensitive' } } },
        { payment_request: { customer_email: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    // Adicionar filtro de data
    if (startDate || endDate) {
      where.created_at = {};
      
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where.created_at.lte = endDateObj;
      }
    }

    // Buscar transações e contar total
    const [transactions, totalCount] = await Promise.all([
      db.transaction.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          payment_request: true
        }
      }),
      db.transaction.count({ where })
    ]);

    // Formatar os dados para resposta
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      externalId: transaction.external_id,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.created_at.toISOString(),
      method: transaction.method,
      provider: transaction.provider,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
      customerName: transaction.payment_request?.customer_name || null,
      customerEmail: transaction.payment_request?.customer_email || null,
      customerPhone: transaction.payment_request?.customer_phone || null,
    }));

    return NextResponse.json({
      data: formattedTransactions,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    return NextResponse.json(
      { error: 'Erro ao listar transações' },
      { status: 500 }
    );
  }
} 