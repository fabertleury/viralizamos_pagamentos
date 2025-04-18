import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para listar transações com filtros e paginação
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const method = url.searchParams.get('method');
    const search = url.searchParams.get('search');
    
    console.log(`[API] Listando transações: page=${page}, limit=${limit}, status=${status}, method=${method}, search=${search}`);
    
    // Construir a query com os filtros
    const where: any = {};
    
    if (status && status !== 'todos') {
      where.status = status;
    }
    
    if (method && method !== 'todos') {
      where.method = method;
    }
    
    // Busca por termo
    if (search) {
      where.OR = [
        // Busca por ID
        { id: { contains: search } },
        // Busca em campos relacionados a payment_request
        {
          payment_request: {
            OR: [
              { customer_name: { contains: search } },
              { customer_email: { contains: search } },
              { service_name: { contains: search } }
            ]
          }
        }
      ];
    }
    
    // Buscar total de transações com os filtros aplicados
    const totalCount = await db.transaction.count({ where });
    
    // Buscar transações com paginação
    const transactions = await db.transaction.findMany({
      where,
      include: {
        payment_request: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    console.log(`[API] Encontradas ${transactions.length} transações de um total de ${totalCount}`);
    
    return NextResponse.json({
      transactions,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('[API] Erro ao listar transações:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 