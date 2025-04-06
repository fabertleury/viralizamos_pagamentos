import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Endpoint para receber solicitações de pagamento do site principal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.amount || !body.description || !body.payer_name || !body.payer_email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, description, payer_name, payer_email' },
        { status: 400 }
      );
    }
    
    // Garantir que o valor é um número válido
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'O valor (amount) deve ser um número positivo' },
        { status: 400 }
      );
    }
    
    // Gerar token único para acesso à página de pagamento
    const token = generateToken();
    
    // Definir data de expiração (padrão: 24 horas)
    const expiresAt = body.expires_at 
      ? new Date(body.expires_at) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Criar a solicitação de pagamento
    const paymentRequest = await db.paymentRequest.create({
      data: {
        amount,
        description: body.description,
        token,
        status: 'pending',
        payer_name: body.payer_name,
        payer_email: body.payer_email,
        payer_phone: body.payer_phone,
        expires_at: expiresAt,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        external_reference: body.external_reference
      }
    });
    
    // Construir URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const paymentUrl = `${protocol}://${baseUrl}/pagamento/${token}`;
    
    // Retornar a solicitação criada com a URL de pagamento
    return NextResponse.json({
      id: paymentRequest.id,
      token: paymentRequest.token,
      amount: paymentRequest.amount,
      description: paymentRequest.description,
      status: paymentRequest.status,
      payer_name: paymentRequest.payer_name,
      payer_email: paymentRequest.payer_email,
      payer_phone: paymentRequest.payer_phone,
      created_at: paymentRequest.created_at,
      expires_at: paymentRequest.expires_at,
      payment_url: paymentUrl
    });
  } catch (error) {
    console.error('Erro ao criar solicitação de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar solicitação de pagamento' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para listar solicitações de pagamento (somente para admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    
    // Paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    
    // Filtros
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Construir where clause
    const where: Record<string, any> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (externalReference) {
      where.external_reference = externalReference;
    }
    
    if (startDate || endDate) {
      where.created_at = {};
      
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.created_at.lte = new Date(endDate);
      }
    }
    
    // Contar total de registros (para paginação)
    const total = await db.paymentRequest.count({ where });
    
    // Buscar registros com paginação
    const paymentRequests = await db.paymentRequest.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        payments: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      }
    });
    
    // Formatar resposta
    const formattedRequests = paymentRequests.map((pr: any) => ({
      id: pr.id,
      token: pr.token,
      amount: pr.amount,
      description: pr.description,
      status: pr.status,
      payer_name: pr.payer_name,
      payer_email: pr.payer_email,
      payer_phone: pr.payer_phone,
      external_reference: pr.external_reference,
      created_at: pr.created_at,
      expires_at: pr.expires_at,
      last_payment: pr.payments[0] ? {
        id: pr.payments[0].id,
        status: pr.payments[0].status,
        method: pr.payments[0].method,
        amount: pr.payments[0].amount,
        created_at: pr.payments[0].created_at
      } : null
    }));
    
    // Retornar resultado com metadados de paginação
    return NextResponse.json({
      data: formattedRequests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar solicitações de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao listar solicitações de pagamento' },
      { status: 500 }
    );
  }
}

// Função para gerar um token único
function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
} 