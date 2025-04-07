import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Endpoint de compatibilidade para manter compatibilidade com o site principal
 * que ainda usa /api/payment-request (singular) em vez de /api/payment-requests (plural)
 * Implementação exata do endpoint original para evitar problemas de tipagem.
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

// Função para gerar um token único
function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
} 