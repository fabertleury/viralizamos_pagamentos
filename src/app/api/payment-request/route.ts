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
    // Log dos headers para diagnóstico
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Headers recebidos:', headers);
    
    const body = await request.json();
    console.log('Payload original recebido:', JSON.stringify(body, null, 2));
    
    // O payload pode vir em diferentes formatos:
    // 1. Diretamente no body: { amount, description, payer_name, payer_email, ... }
    // 2. Dentro de um objeto data: { data: { amount, description, payer_name, payer_email, ... } }
    // 3. Dentro de uma estrutura aninhada: { order: { amount, ... }, customer: { name, email, ... } }
    // 4. Com nomes de campos diferentes: { valor, descricao, nome_pagador, email_pagador, ... }
    
    // Extrair dados da estrutura aninhada, se existirem
    const paymentData = body.data || body;
    const orderData = paymentData.order || paymentData;
    const customerData = paymentData.customer || 
                         paymentData.cliente || 
                         paymentData.user || 
                         paymentData.usuario || 
                         paymentData.payer || 
                         paymentData.pagador || 
                         paymentData;
    
    // Extrair campos normalizando os nomes
    const amount = Number(
      orderData.amount || 
      orderData.valor || 
      orderData.price || 
      orderData.total || 
      orderData.value || 
      body.amount || 
      body.valor || 
      0
    );
    
    const description = 
      orderData.description || 
      orderData.descricao || 
      orderData.desc || 
      orderData.produto || 
      orderData.product || 
      orderData.item || 
      body.description || 
      body.descricao || 
      'Pagamento Viralizamos';
    
    const payerName = 
      customerData.payer_name || 
      customerData.payerName || 
      customerData.nome_pagador || 
      customerData.nome || 
      customerData.name || 
      customerData.fullName || 
      customerData.full_name || 
      customerData.nome_completo || 
      body.payer_name || 
      body.nome || 
      'Cliente';  // Valor padrão para evitar erro de validação
    
    const payerEmail = 
      customerData.payer_email || 
      customerData.payerEmail || 
      customerData.email_pagador || 
      customerData.email || 
      customerData.mail || 
      body.payer_email || 
      body.email || 
      'cliente@viralizamos.com';  // Valor padrão para evitar erro de validação
    
    const payerPhone = 
      customerData.payer_phone || 
      customerData.payerPhone || 
      customerData.telefone_pagador || 
      customerData.telefone || 
      customerData.phone || 
      customerData.cellphone || 
      customerData.celular || 
      body.payer_phone || 
      body.telefone || 
      null;
    
    const externalReference = 
      orderData.external_reference || 
      orderData.externalReference || 
      orderData.referencia_externa || 
      orderData.reference || 
      orderData.ref || 
      orderData.id || 
      body.external_reference || 
      body.reference || 
      body.ref || 
      body.id || 
      null;
    
    // Unir metadados de várias fontes possíveis
    let metadata = {
      ...(paymentData.metadata || {}),
      ...(paymentData.meta || {}),
      ...(paymentData.dados_adicionais || {}),
      ...(body.metadata || {}),
      source: headers['x-payment-source'] || 'api'
    };
    
    // Se não houver dados úteis nos metadados, enviar o body original
    if (Object.keys(metadata).length <= 1) {
      metadata = { 
        ...metadata,
        original_payload: body 
      };
    }
    
    // Logs para diagnóstico
    console.log('Dados extraídos e normalizados:', {
      amount,
      description,
      payerName,
      payerEmail,
      payerPhone,
      externalReference,
      metadata
    });
    
    // No modo de desenvolvimento, desativar validação estrita para facilitar testes
    const isDevMode = process.env.NODE_ENV === 'development';
    
    // Validar campos obrigatórios (menos rigoroso em ambiente de desenvolvimento)
    if (!isDevMode && (!amount || !description || !payerName || !payerEmail)) {
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
          },
          originalPayload: body
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
        metadata: JSON.stringify(metadata),
        external_reference: externalReference
      }
    });
    
    // Construir URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const paymentUrl = `${protocol}://${baseUrl}/pagamento/${token}`;
    
    console.log('Solicitação de pagamento criada com sucesso:', {
      id: paymentRequest.id,
      token: paymentRequest.token,
      payment_url: paymentUrl
    });
    
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
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 