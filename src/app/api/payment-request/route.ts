import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import crypto from 'crypto';

// Função para gerar um token único
function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Este endpoint é apenas um proxy para o endpoint correto /api/payment-requests
// Foi criado para manter compatibilidade com o frontend existente que usa payment-request (singular)
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