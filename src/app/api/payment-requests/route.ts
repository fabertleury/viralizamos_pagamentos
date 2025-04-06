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
    if (!body.amount || !body.customer_name || !body.customer_email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, customer_name, customer_email' },
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
    
    // Criar a solicitação de pagamento com os campos corretos
    const paymentRequest = await db.paymentRequest.create({
      data: {
        amount,
        token,
        service_id: body.service_id,
        profile_username: body.profile_username,
        customer_name: body.customer_name || body.payer_name,
        customer_email: body.customer_email || body.payer_email,
        customer_phone: body.customer_phone || body.payer_phone,
        service_name: body.service_name || body.description,
        return_url: body.return_url,
        status: 'pending',
        additional_data: body.additional_data || JSON.stringify(body),
        expires_at: expiresAt
      }
    });
    
    // Construir URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const paymentUrl = `${protocol}://${baseUrl}/pagamento/${token}`;
    
    // Retornar a solicitação criada com a URL de pagamento
    return NextResponse.json({
      id: paymentRequest.id,
      token: paymentRequest.token,
      amount: paymentRequest.amount,
      service_name: paymentRequest.service_name,
      status: paymentRequest.status,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      customer_phone: paymentRequest.customer_phone,
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
    const serviceId = searchParams.get('service_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Construir where clause
    const where: Record<string, any> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (serviceId) {
      where.service_id = serviceId;
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
    
    // Formatar resposta com os campos corretos
    const formattedRequests = paymentRequests.map((pr: any) => ({
      id: pr.id,
      token: pr.token,
      amount: pr.amount,
      service_name: pr.service_name,
      service_id: pr.service_id,
      status: pr.status,
      customer_name: pr.customer_name,
      customer_email: pr.customer_email,
      customer_phone: pr.customer_phone,
      profile_username: pr.profile_username,
      return_url: pr.return_url,
      created_at: pr.created_at,
      expires_at: pr.expires_at,
      processed_at: pr.processed_at,
      processed_payment_id: pr.processed_payment_id,
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