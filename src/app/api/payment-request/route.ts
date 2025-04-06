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
    
    // O payload pode vir em diferentes formatos
    const paymentData = body.data || body;
    const orderData = paymentData.order || paymentData;
    const customerData = paymentData.customer || 
                         paymentData.cliente || 
                         paymentData.user || 
                         paymentData.usuario || 
                         paymentData.payer || 
                         paymentData.pagador || 
                         paymentData;
    
    // Extrair campos adaptando para a estrutura real da tabela
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
    
    // Extrair campos do serviço
    const serviceId = 
      orderData.service_id || 
      orderData.serviceId || 
      orderData.id_servico || 
      orderData.servico_id || 
      body.service_id || 
      null;
    
    const serviceName = 
      orderData.service_name || 
      orderData.serviceName || 
      orderData.nome_servico || 
      orderData.servico_nome || 
      orderData.description || 
      orderData.descricao || 
      body.service_name || 
      body.description || 
      'Pagamento Viralizamos';
    
    // Extrair campos do cliente
    const customerName = 
      customerData.customer_name || 
      customerData.customerName || 
      customerData.payer_name || 
      customerData.payerName || 
      customerData.nome || 
      customerData.name || 
      body.customer_name || 
      body.payer_name || 
      body.nome || 
      'Cliente';
    
    const customerEmail = 
      customerData.customer_email || 
      customerData.customerEmail || 
      customerData.payer_email || 
      customerData.payerEmail || 
      customerData.email || 
      body.customer_email || 
      body.payer_email || 
      body.email || 
      'cliente@viralizamos.com';
    
    const customerPhone = 
      customerData.customer_phone || 
      customerData.customerPhone || 
      customerData.payer_phone || 
      customerData.payerPhone || 
      customerData.telefone || 
      customerData.phone || 
      body.customer_phone || 
      body.payer_phone || 
      body.telefone || 
      null;
      
    // Extrair username do perfil
    const profileUsername = 
      paymentData.profile_username || 
      paymentData.profileUsername || 
      paymentData.username || 
      paymentData.profile || 
      body.profile_username || 
      body.username || 
      null;
      
    // URL de retorno após o pagamento
    const returnUrl = 
      paymentData.return_url || 
      paymentData.returnUrl || 
      paymentData.redirectUrl || 
      paymentData.redirect_url || 
      paymentData.callback || 
      body.return_url || 
      body.callback || 
      null;
    
    // Dados adicionais (armazenados como JSON)
    const additionalData = JSON.stringify({
      original_payload: body,
      source: headers['x-payment-source'] || 'api',
      user_agent: headers['user-agent'] || null,
      origin: headers['origin'] || null
    });
    
    // Logs para diagnóstico
    console.log('Dados extraídos e normalizados:', {
      amount,
      service_id: serviceId,
      service_name: serviceName,
      profile_username: profileUsername,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      return_url: returnUrl
    });
    
    // Validação no ambiente de produção
    const isDevMode = process.env.NODE_ENV === 'development';
    
    if (!isDevMode && (!amount || amount <= 0 || !customerName || !customerEmail)) {
      console.error('Validação falhou:', {
        hasAmount: Boolean(amount) && amount > 0,
        hasCustomerName: Boolean(customerName),
        hasCustomerEmail: Boolean(customerEmail)
      });
      
      return NextResponse.json(
        { 
          error: 'Campos obrigatórios: amount, customer_name, customer_email',
          received: {
            amount: amount || null,
            customer_name: customerName || null,
            customer_email: customerEmail || null
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
    
    // Criar a solicitação de pagamento com os campos corretos da tabela
    const paymentRequest = await db.paymentRequest.create({
      data: {
        token,
        amount,
        service_id: serviceId,
        service_name: serviceName,
        profile_username: profileUsername,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        return_url: returnUrl,
        status: 'pending',
        additional_data: additionalData,
        expires_at: expiresAt
      }
    });
    
    // Construir URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_BASE_URL || 
                   request.headers.get('host') || 
                   'pagamentos.viralizamos.com';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
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
      service_name: paymentRequest.service_name,
      status: paymentRequest.status,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
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