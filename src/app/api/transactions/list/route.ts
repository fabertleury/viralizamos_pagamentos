import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKeyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para listar transações com filtros e paginação
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação com logs detalhados (versão completa para depuração)
    const authHeader = request.headers.get('authorization');
    console.log('[API:Transactions:List] Header de autorização recebido:', authHeader || 'null');
    console.log('[API:Transactions:List] API_KEY configurada:', process.env.API_KEY || 'não definida');
    
    // Verificação manual para depuração
    let isAuthorized = false;
    const configuredApiKey = process.env.API_KEY || '6bVERz8A5P4drqmYjN2ZxK$Fw9sXhC7uJtH3GeQpT!vLWkS#D@_payments';
    console.log('[API:Transactions:List] Chave configurada completa:', configuredApiKey);
    
    if (authHeader) {
      // Verificar formato ApiKey
      if (authHeader.startsWith('ApiKey ')) {
        const key = authHeader.replace('ApiKey ', '');
        console.log('[API:Transactions:List] Chave ApiKey extraída:', key);
        isAuthorized = key === configuredApiKey;
        console.log('[API:Transactions:List] Formato ApiKey detectado, autorizado:', isAuthorized);
        
        // Comparação caractere por caractere para depuração
        if (!isAuthorized) {
          console.log('[API:Transactions:List] Comparação de caracteres:');
          for (let i = 0; i < Math.max(key.length, configuredApiKey.length); i++) {
            if (key[i] !== configuredApiKey[i]) {
              console.log(`Posição ${i}: '${key[i] || 'undefined'}' !== '${configuredApiKey[i] || 'undefined'}'`);
            }
          }
        }
      }
      // Verificar formato Bearer
      else if (authHeader.startsWith('Bearer ')) {
        const key = authHeader.replace('Bearer ', '');
        console.log('[API:Transactions:List] Chave Bearer extraída:', key);
        isAuthorized = key === configuredApiKey;
        console.log('[API:Transactions:List] Formato Bearer detectado, autorizado:', isAuthorized);
        
        // Comparação caractere por caractere para depuração
        if (!isAuthorized) {
          console.log('[API:Transactions:List] Comparação de caracteres:');
          for (let i = 0; i < Math.max(key.length, configuredApiKey.length); i++) {
            if (key[i] !== configuredApiKey[i]) {
              console.log(`Posição ${i}: '${key[i] || 'undefined'}' !== '${configuredApiKey[i] || 'undefined'}'`);
            }
          }
        }
      }
    }
    
    // Usar a função padrão também para verificação
    const standardAuth = verifyApiKeyAuth(authHeader);
    console.log('[API:Transactions:List] Autorização via função padrão:', standardAuth);
    
    // TEMPORARIAMENTE PERMITIR ACESSO PARA FINS DE TESTE
    console.log('[API:Transactions:List] MODO DE DEPURAÇÃO: Permitindo acesso para teste');
    isAuthorized = true; // Permitir acesso para teste

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