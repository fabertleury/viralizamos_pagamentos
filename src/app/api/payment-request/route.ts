import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import jwt from 'jsonwebtoken';

// Interface para o tipo de Post
interface Post {
  id?: string;
  postId?: string;
  code?: string;
  postCode?: string;
  url?: string;
  postLink?: string;
  image_url?: string;
  thumbnail_url?: string;
  display_url?: string;
  is_reel?: boolean;
  type?: string;
  quantity?: number;
}

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

// Validar a configuração do banco de dados
if (!process.env.DATABASE_URL) {
  console.error('ERRO CRÍTICO: DATABASE_URL não definida para o endpoint /api/payment-request');
}

const payment = new Payment(client);

// Função para gerar um token único para o pagamento
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Função para gerar chave de idempotência
function generateIdempotencyKey(paymentRequestId: string): string {
  return `pix_${paymentRequestId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Endpoint de compatibilidade para manter compatibilidade com o site principal
 * que ainda usa /api/payment-request (singular) em vez de /api/payment-requests (plural)
 * 
 * SOLUÇÃO INTEGRADA: Este endpoint agora cria tanto a solicitação de pagamento
 * quanto o pagamento PIX, eliminando a necessidade de chamadas adicionais.
 */
export async function POST(request: NextRequest) {
  console.log('[SOLUÇÃO INTEGRADA] Recebida solicitação de pagamento');
  
  // Obter o body da requisição diretamente sem verificação de token
  const body = await request.json();
  console.log('[SOLUÇÃO INTEGRADA] Dados recebidos:', JSON.stringify(body).substring(0, 200) + '...');
  
  try {
    // Se recebemos apenas um payment_request_id, buscar os dados da solicitação existente
    if (body.payment_request_id) {
      console.log('[SOLUÇÃO INTEGRADA] Criando pagamento para solicitação existente:', body.payment_request_id);
      
      // Buscar a solicitação de pagamento
      const existingRequest = await db.paymentRequest.findUnique({
        where: { id: body.payment_request_id }
      });
      
      if (!existingRequest) {
        return NextResponse.json(
          { error: 'Solicitação de pagamento não encontrada' },
          { status: 404 }
        );
      }
      
      // Verificar se a solicitação já tem uma transação
      const existingTransaction = await db.transaction.findFirst({
        where: { payment_request_id: body.payment_request_id }
      });
      
      if (existingTransaction) {
        return NextResponse.json({
          id: existingRequest.id,
          token: existingRequest.token,
          amount: existingRequest.amount,
          service_name: existingRequest.service_name,
          status: existingRequest.status,
          customer_name: existingRequest.customer_name,
          customer_email: existingRequest.customer_email,
          customer_phone: existingRequest.customer_phone,
          created_at: existingRequest.created_at,
          expires_at: existingRequest.expires_at,
          payment: {
            id: existingTransaction.id,
            status: existingTransaction.status,
            method: existingTransaction.method,
            pix_code: existingTransaction.pix_code,
            pix_qrcode: existingTransaction.pix_qrcode,
            amount: existingTransaction.amount
          }
        });
      }
      
      // Gerar chave de idempotência para o Mercado Pago
      const idempotencyKey = generateIdempotencyKey(existingRequest.id);
      console.log('[SOLUÇÃO INTEGRADA] Chave de idempotência:', idempotencyKey);
      
      // Criar payload para o Mercado Pago
      const paymentData = {
        transaction_amount: existingRequest.amount,
        description: existingRequest.service_name || 'Pagamento Viralizamos',
        payment_method_id: 'pix',
        payer: {
          email: existingRequest.customer_email,
          first_name: existingRequest.customer_name.split(' ')[0],
          last_name: existingRequest.customer_name.split(' ').slice(1).join(' ') || 'Sobrenome',
          identification: {
            type: 'CPF',
            number: '00000000000'
          }
        },
        notification_url: `${process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`
      };
      
      console.log('[SOLUÇÃO INTEGRADA] Enviando dados para Mercado Pago:', JSON.stringify(paymentData).substring(0, 200) + '...');
      
      try {
        // Criar o pagamento no Mercado Pago
        const mpResponse = await payment.create({ body: paymentData });
        
        if (!mpResponse || !mpResponse.id) {
          throw new Error('Resposta inválida do Mercado Pago');
        }
        
        console.log('[SOLUÇÃO INTEGRADA] Resposta do Mercado Pago:', JSON.stringify(mpResponse).substring(0, 200) + '...');
        
        // Criar a transação
        const transaction = await db.transaction.create({
          data: {
            payment_request_id: existingRequest.id,
            external_id: mpResponse.id.toString(),
            status: 'pending',
            method: 'pix',
            amount: existingRequest.amount,
            provider: 'mercadopago',
            pix_code: mpResponse.point_of_interaction?.transaction_data?.qr_code || undefined,
            pix_qrcode: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || undefined,
            metadata: JSON.stringify({
              mercadopago_response: mpResponse,
              idempotencyKey
            })
          }
        });
        
        // Atualizar o status da solicitação
        await db.paymentRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'processing' }
        });
        
        // Retornar a resposta
        return NextResponse.json({
          id: existingRequest.id,
          token: existingRequest.token,
          amount: existingRequest.amount,
          service_name: existingRequest.service_name,
          status: 'processing',
          customer_name: existingRequest.customer_name,
          customer_email: existingRequest.customer_email,
          customer_phone: existingRequest.customer_phone,
          created_at: existingRequest.created_at,
          expires_at: existingRequest.expires_at,
          payment: {
            id: transaction.id,
            status: transaction.status,
            method: transaction.method,
            pix_code: transaction.pix_code,
            pix_qrcode: transaction.pix_qrcode,
            amount: transaction.amount
          }
        });
        
      } catch (mpError) {
        console.error('[SOLUÇÃO INTEGRADA] Erro ao criar pagamento no Mercado Pago:', mpError);
        
        try {
          await db.paymentProcessingFailure.create({
            data: {
              transaction_id: 'error',
              error_code: 'MP_PAYMENT_CREATION_ERROR',
              error_message: mpError instanceof Error ? mpError.message : 'Erro desconhecido',
              stack_trace: mpError instanceof Error ? mpError.stack : undefined,
              metadata: JSON.stringify({
                payment_request_id: existingRequest.id,
                idempotencyKey
              })
            }
          });
        } catch (logError) {
          console.error('[SOLUÇÃO INTEGRADA] Erro ao registrar falha:', logError);
        }
        
        return NextResponse.json(
          { error: 'Erro ao criar pagamento no Mercado Pago' },
          { status: 500 }
        );
      }
    }
    
    // Continuar com o fluxo original para criação de nova solicitação
    // Validar campos obrigatórios
    if (!body.amount || !body.customer_name || !body.customer_email) {
      console.log('[SOLUÇÃO INTEGRADA] Erro: campos obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, customer_name, customer_email' },
        { status: 400 }
      );
    }
    
    // Garantir que o valor é um número válido
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      console.log('[SOLUÇÃO INTEGRADA] Erro: valor inválido:', amount);
      return NextResponse.json(
        { error: 'O valor (amount) deve ser um número positivo' },
        { status: 400 }
      );
    }
    
    // Gerar token único para acesso à página de pagamento
    const token = generateToken();
    console.log('[SOLUÇÃO INTEGRADA] Token gerado:', token);
    
    // Definir data de expiração (padrão: 24 horas)
    const expiresAt = body.expires_at 
      ? new Date(body.expires_at) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    console.log('[SOLUÇÃO INTEGRADA] Criando registro no banco de dados');
    console.log('[SOLUÇÃO INTEGRADA] DATABASE_URL configurada:', !!process.env.DATABASE_URL);
    
    // Verificar se há múltiplos posts e suas quantidades
    let posts = [];
    let additionalData: any = null;
    let externalServiceId: string | null = null;
    
    // Determinar o tipo de serviço
    const serviceType = additionalData?.service_type || body.service_type || '';
    const isFollowersService = serviceType.toLowerCase().includes('seguidores') || 
                              serviceType.toLowerCase().includes('followers');
    
    try {
      if (body.additional_data) {
        if (typeof body.additional_data === 'string') {
          additionalData = JSON.parse(body.additional_data);
        } else {
          additionalData = body.additional_data;
        }
        
        posts = additionalData.posts || [];
        
        // Tentar extrair external_service_id se disponível
        if (additionalData.external_service_id) {
          externalServiceId = additionalData.external_service_id;
          console.log('[SOLUÇÃO INTEGRADA] External service ID encontrado nos dados adicionais:', externalServiceId);
        }
      }
    } catch (e) {
      console.error('[SOLUÇÃO INTEGRADA] Erro ao analisar additional_data:', e);
    }
    
    // Calcular corretamente a distribuição das quantidades entre os posts
    const totalQuantity = additionalData?.quantity || body.quantity || 0;
    const postsCount = posts.length;
    const baseQuantityPerPost = Math.floor(totalQuantity / postsCount);
    const remainder = totalQuantity % postsCount;
    
    // Mapear posts com suas quantidades calculadas
    const postsWithQuantities = posts.map((post: Post, index: number) => {
      // Se o post já tiver uma quantidade específica, usá-la
      if (post.quantity && post.quantity > 0) {
        return {
          ...post,
          quantity: post.quantity,
          calculated_quantity: post.quantity
        };
      }
      
      // Caso contrário, calcular a quantidade
      // Distribuir o resto para os primeiros posts
      const extraQuantity = index < remainder ? 1 : 0;
      const calculatedQuantity = baseQuantityPerPost + extraQuantity;
      
      return {
        id: post.id || post.postId,
        code: post.code || post.postCode || '',
        url: post.url || post.postLink || `https://instagram.com/p/${post.code || post.postCode || ''}`,
        image_url: post.image_url || post.thumbnail_url || post.display_url || '',
        is_reel: post.is_reel || post.type === 'reel' || post.type === 'video' || false,
        type: post.type || (post.is_reel || post.type === 'reel' || post.type === 'video' ? 'reel' : 'post'),
        quantity: calculatedQuantity,
        calculated_quantity: calculatedQuantity
      };
    });
    
    console.log('[SOLUÇÃO INTEGRADA] Quantidade total distribuída:', totalQuantity);
    console.log('[SOLUÇÃO INTEGRADA] Distribuição por post:', postsWithQuantities.map((p: { calculated_quantity: number }) => p.calculated_quantity));
    
    // Salvar os dados adicionais atualizados com as quantidades distribuídas
    const updatedAdditionalData = {
      ...additionalData,
      posts: postsWithQuantities,
      total_quantity: totalQuantity,
      posts_count: postsCount
    };
    
    // Armazenar o additional_data atualizado
    const additionalDataString = JSON.stringify(updatedAdditionalData);
    
    // Usar o valor de postsWithQuantities
    posts = postsWithQuantities;
    
    // Criar a solicitação de pagamento
    const paymentRequest = await db.paymentRequest.create({
      data: {
        amount: body.amount,
        token,
        service_id: body.service_id,
        external_service_id: body.external_service_id || externalServiceId || undefined,
        profile_username: body.profile_username,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        service_name: body.service_name,
        return_url: body.return_url,
        status: 'pending',
        additional_data: additionalDataString,
        expires_at: expiresAt
      }
    });
    
    console.log('[SOLUÇÃO INTEGRADA] Registro criado com ID:', paymentRequest.id);
    
    // ETAPA 2: Criar o pagamento PIX diretamente
    console.log('[SOLUÇÃO INTEGRADA] Criando pagamento PIX para:', paymentRequest.id);
    
    // Construir URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const paymentUrl = `${protocol}://${baseUrl.replace(/^https?:\/\//i, '')}/pagamento/${token}`;
    
    // Gerar chave de idempotência para o Mercado Pago
    const idempotencyKey = generateIdempotencyKey(paymentRequest.id);
    console.log('[SOLUÇÃO INTEGRADA] Chave de idempotência:', idempotencyKey);
    
    // Criar payload para o Mercado Pago
    const paymentData = {
      transaction_amount: paymentRequest.amount,
      description: paymentRequest.service_name || 'Pagamento Viralizamos',
      payment_method_id: 'pix',
      payer: {
        email: paymentRequest.customer_email,
        first_name: paymentRequest.customer_name.split(' ')[0],
        last_name: paymentRequest.customer_name.split(' ').slice(1).join(' ') || 'Sobrenome',
        identification: {
          type: 'CPF',
          number: '00000000000'
        }
      },
      notification_url: `${process.env.WEBHOOK_URL || baseUrl}/api/webhooks/mercadopago`
    };
    
    console.log('[SOLUÇÃO INTEGRADA] Enviando dados para Mercado Pago:', JSON.stringify(paymentData).substring(0, 200) + '...');
    
    try {
      // Criar o pagamento no Mercado Pago
      const mpResponse = await payment.create({ body: paymentData });
      
      if (!mpResponse || !mpResponse.id) {
        throw new Error('Resposta inválida do Mercado Pago');
      }
      
      console.log('[SOLUÇÃO INTEGRADA] Resposta do Mercado Pago:', JSON.stringify(mpResponse).substring(0, 200) + '...');
      
      // Tratar diferentemente com base no tipo de serviço
      let transactionId = '';
      let transactionStatus = 'pending';
      let transactionMethod = 'pix';
      let transactionAmount = paymentRequest.amount;
      let transactionPixCode = mpResponse.point_of_interaction?.transaction_data?.qr_code || undefined;
      let transactionPixQrcode = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || undefined;
      let transactionCreatedAt = new Date();
      
      // Criar uma única transação, independentemente do tipo de serviço ou número de posts
      const transaction = await db.transaction.create({
        data: {
          payment_request_id: paymentRequest.id,
          external_id: mpResponse.id.toString(),
          status: 'pending',
          method: 'pix',
          amount: paymentRequest.amount,
          provider: 'mercadopago',
          pix_code: mpResponse.point_of_interaction?.transaction_data?.qr_code || undefined,
          pix_qrcode: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || undefined,
          metadata: JSON.stringify({
            mercadopago_response: mpResponse,
            idempotency_key: idempotencyKey,
            service_id: body.service_id,
            service_name: body.service_name,
            service_type: serviceType,
            profile_username: body.profile_username,
            is_followers_service: isFollowersService,
            total_quantity: totalQuantity,
            posts: postsWithQuantities,
            posts_count: postsCount
          })
        }
      });
      
      console.log('[SOLUÇÃO INTEGRADA] Transação única criada com ID:', transaction.id);
      
      // Atualizar variáveis para retorno
      transactionId = transaction.id;
      transactionStatus = transaction.status;
      transactionMethod = transaction.method;
      transactionAmount = transaction.amount;
      transactionPixCode = transaction.pix_code || undefined;
      transactionPixQrcode = transaction.pix_qrcode || undefined;
      transactionCreatedAt = transaction.created_at;
      
      // Atualizar a solicitação de pagamento para 'processing'
      await db.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'processing' }
      });
      
      console.log('[SOLUÇÃO INTEGRADA] Status atualizado para processing');
      
      // Criar um registro de fila de processamento
      await db.processingQueue.create({
        data: {
          payment_request_id: paymentRequest.id,
          status: 'pending',
          type: 'payment_confirmation',
          priority: 1,
          metadata: JSON.stringify({
            transaction_id: transactionId,
            external_id: mpResponse.id.toString()
          })
        }
      });
      
      console.log('[SOLUÇÃO INTEGRADA] Adicionado à fila de processamento');
      
      // Salvar resposta para idempotência
      const responseData = {
        id: transactionId,
        status: transactionStatus,
        method: transactionMethod,
        amount: transactionAmount,
        pix_code: transactionPixCode,
        pix_qrcode: transactionPixQrcode,
        created_at: transactionCreatedAt
      };
      
      await db.paymentIdempotencyLog.create({
        data: {
          key: idempotencyKey,
          response: JSON.stringify(responseData)
        }
      });
      
      console.log('[SOLUÇÃO INTEGRADA] Registro de idempotência criado');
      
      // Retornar a resposta completa com a URL de pagamento e detalhes do PIX
      return NextResponse.json({
        id: paymentRequest.id,
        token: paymentRequest.token,
        amount: paymentRequest.amount,
        service_name: paymentRequest.service_name,
        status: 'processing', // Status já atualizado para processing
        customer_name: paymentRequest.customer_name,
        customer_email: paymentRequest.customer_email,
        customer_phone: paymentRequest.customer_phone,
        created_at: paymentRequest.created_at,
        expires_at: paymentRequest.expires_at,
        payment_url: paymentUrl,
        payment: {
          id: transactionId,
          status: transactionStatus,
          method: transactionMethod,
          pix_code: transactionPixCode,
          pix_qrcode: transactionPixQrcode,
          amount: transactionAmount
        }
      });
      
    } catch (mpError) {
      console.error('[SOLUÇÃO INTEGRADA] Erro ao criar pagamento no Mercado Pago:', mpError);
      
      try {
        await db.paymentProcessingFailure.create({
          data: {
            transaction_id: 'error',
            error_code: 'MP_PAYMENT_CREATION_ERROR',
            error_message: mpError instanceof Error ? mpError.message : 'Erro desconhecido',
            stack_trace: mpError instanceof Error ? mpError.stack : undefined,
            metadata: JSON.stringify({
              payment_request_id: paymentRequest.id,
              idempotency_key: idempotencyKey,
              error: mpError
            })
          }
        });
      } catch (logError) {
        console.error('[SOLUÇÃO INTEGRADA] Erro ao registrar falha:', logError);
      }
      
      // Mesmo com erro, ainda retornamos a URL de pagamento
      // para que o usuário possa tentar novamente na página
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
        payment_url: paymentUrl,
        // Não incluímos detalhes de pagamento pois houve erro
        mp_error: process.env.NODE_ENV === 'development' ? (mpError as Error).message : undefined
      });
    }
    
  } catch (error) {
    console.error('[SOLUÇÃO INTEGRADA] Erro geral:', error);
    
    // Informações para diagnóstico
    console.error('[SOLUÇÃO INTEGRADA] DATABASE_URL configurada:', !!process.env.DATABASE_URL);
    console.error('[SOLUÇÃO INTEGRADA] NODE_ENV:', process.env.NODE_ENV);
    
    return NextResponse.json(
      {
        error: 'Erro ao processar solicitação de pagamento',
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 