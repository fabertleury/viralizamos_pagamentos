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
    console.log('Payload recebido:', JSON.stringify(body));
    
    // O payload pode vir em diferentes formatos:
    // 1. Diretamente no body: { amount, description, payer_name, payer_email, ... }
    // 2. Dentro de um objeto data: { data: { amount, description, payer_name, payer_email, ... } }
    // 3. Com nomes de campos diferentes: { valor, descricao, nome_pagador, email_pagador, ... }
    
    const paymentData = body.data || body;
    
    // Extrair campos normalizando os nomes
    const amount = Number(
      paymentData.amount || 
      paymentData.valor || 
      paymentData.price || 
      paymentData.total || 
      0
    );
    
    const description = 
      paymentData.description || 
      paymentData.descricao || 
      paymentData.desc || 
      'Pagamento Viralizamos';
    
    const payerName = 
      paymentData.payer_name || 
      paymentData.payerName || 
      paymentData.nome_pagador || 
      paymentData.nome || 
      paymentData.name || 
      '';
    
    const payerEmail = 
      paymentData.payer_email || 
      paymentData.payerEmail || 
      paymentData.email_pagador || 
      paymentData.email || 
      '';
    
    const payerPhone = 
      paymentData.payer_phone || 
      paymentData.payerPhone || 
      paymentData.telefone_pagador || 
      paymentData.telefone || 
      paymentData.phone || 
      null;
    
    const externalReference = 
      paymentData.external_reference || 
      paymentData.externalReference || 
      paymentData.referencia_externa || 
      paymentData.reference || 
      null;
    
    const metadata = 
      paymentData.metadata || 
      paymentData.meta || 
      paymentData.dados_adicionais || 
      null;
    
    // Logs para diagnóstico
    console.log('Dados normalizados:', {
      amount,
      description,
      payerName,
      payerEmail,
      payerPhone,
      externalReference
    });
    
    // Validar campos obrigatórios
    if (!amount || !description || !payerName || !payerEmail) {
      console.error('Validação falhou:', {
        hasAmount: Boolean(amount),
        hasDescription: Boolean(description),
        hasPayerName: Boolean(payerName),
        hasPayerEmail: Boolean(payerEmail)
      });
      
      return NextResponse.json(
        { 
          error: 'Campos obrigatórios: amount, description, payer_name, payer_email',
          received: {
            amount: amount || null,
            description: description || null,
            payer_name: payerName || null,
            payer_email: payerEmail || null
          }
        },
        { status: 400 }
      );
    }
    
    // Garantir que o valor é um número válido
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'O valor (amount) deve ser um número positivo' },
        { status: 400 }
      );
    }
    
    // Gerar token único para acesso à página de pagamento
    const token = generateToken();
    
    // Definir data de expiração (padrão: 24 horas)
    const expiresAt = paymentData.expires_at 
      ? new Date(paymentData.expires_at) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Criar a solicitação de pagamento
    const paymentRequest = await db.paymentRequest.create({
      data: {
        amount,
        description,
        token,
        status: 'pending',
        payer_name: payerName,
        payer_email: payerEmail,
        payer_phone: payerPhone,
        expires_at: expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
        external_reference: externalReference
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
      { 
        error: 'Erro ao criar solicitação de pagamento',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
} 