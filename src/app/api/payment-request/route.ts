import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';

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
  
  try {
    const body = await request.json();
    console.log('[SOLUÇÃO INTEGRADA] Dados recebidos:', JSON.stringify(body).substring(0, 200) + '...');
    
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
    
    // Criar a solicitação de pagamento diretamente
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
        additional_data: typeof body.additional_data === 'string'
          ? body.additional_data
          : JSON.stringify(body.additional_data || body),
        expires_at: expiresAt
      }
    });
    
    console.log('[SOLUÇÃO INTEGRADA] Registro criado com ID:', paymentRequest.id);
    
    // Verificar se há múltiplos posts e suas quantidades
    const additionalData = typeof body.additional_data === 'string' 
      ? JSON.parse(body.additional_data) 
      : body.additional_data;
    
    // Determinar o tipo de serviço
    const serviceType = additionalData?.service_type || body.service_type || '';
    const isFollowersService = serviceType.toLowerCase().includes('seguidores') || 
                              serviceType.toLowerCase().includes('followers');
    
    // Se for serviço de posts/reels, verificar posts selecionados
    let posts = [];
    if (!isFollowersService) {
      posts = additionalData?.posts || [];
      console.log('[SOLUÇÃO INTEGRADA] Posts encontrados:', posts.length);
      
      // Validar que há pelo menos 1 post e no máximo 5
      if (posts.length === 0) {
        console.error('[SOLUÇÃO INTEGRADA] Nenhum post selecionado para serviço que requer posts');
        return NextResponse.json(
          { error: 'É necessário selecionar pelo menos 1 post para este serviço' },
          { status: 400 }
        );
      }
      
      if (posts.length > 5) {
        console.error('[SOLUÇÃO INTEGRADA] Mais de 5 posts selecionados:', posts.length);
        return NextResponse.json(
          { error: 'É permitido selecionar no máximo 5 posts/reels no total' },
          { status: 400 }
        );
      }
    } else {
      console.log('[SOLUÇÃO INTEGRADA] Serviço de seguidores detectado para:', body.profile_username);
    }
    
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
      
      if (isFollowersService) {
        // Para serviço de seguidores, criar apenas uma transação
        const followersTxn = await db.transaction.create({
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
              is_followers_service: true,
              followers_quantity: additionalData?.quantity || body.quantity || 0
            })
          }
        });
        
        console.log('[SOLUÇÃO INTEGRADA] Transação de seguidores criada com ID:', followersTxn.id);
        
        // Atualizar variáveis para retorno
        transactionId = followersTxn.id;
        transactionStatus = followersTxn.status;
        transactionMethod = followersTxn.method;
        transactionAmount = followersTxn.amount;
        transactionPixCode = followersTxn.pix_code || undefined;
        transactionPixQrcode = followersTxn.pix_qrcode || undefined;
        transactionCreatedAt = followersTxn.created_at;
      }
      // Criar transações no banco - uma para cada post, se houver múltiplos posts
      else if (posts.length > 1) {
        console.log('[SOLUÇÃO INTEGRADA] Processando múltiplos posts:', posts.length);
        
        // Array para armazenar IDs de todas as transações criadas
        const createdTransactionIds = [];
        
        // Criar transações separadas para cada post
        for (const post of posts) {
          // Extrair a quantidade específica para este post
          const postQuantity = post.quantity || 0;
          const postId = post.id || post.postId;
          const postCode = post.code || post.postCode || '';
          const postUrl = post.url || post.postLink || `https://instagram.com/p/${postCode}`;
          const imageUrl = post.image_url || post.thumbnail_url || post.display_url || '';
          const isReel = post.is_reel || post.type === 'reel' || post.type === 'video' || false;
          const postType = post.type || (isReel ? 'reel' : 'post');
          
          // Criar uma transação para este post específico
          const postTxn = await db.transaction.create({
            data: {
              payment_request_id: paymentRequest.id,
              external_id: `${mpResponse.id.toString()}_${postId}`,
              status: 'pending',
              method: 'pix',
              amount: paymentRequest.amount / posts.length, // Dividir o valor proporcionalmente
              provider: 'mercadopago',
              pix_code: mpResponse.point_of_interaction?.transaction_data?.qr_code || undefined,
              pix_qrcode: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || undefined,
              metadata: JSON.stringify({
                mercadopago_response: mpResponse,
                idempotency_key: idempotencyKey,
                post_id: postId,
                post_code: postCode,
                post_url: postUrl,
                image_url: imageUrl,
                is_reel: isReel,
                post_type: postType,
                quantity: postQuantity,
                is_multi_post: true,
                service_id: body.service_id,
                service_name: body.service_name,
                service_type: serviceType,
                profile_username: body.profile_username,
                complete_post_data: post
              })
            }
          });
          
          createdTransactionIds.push(postTxn.id);
          
          // Usar a primeira transação como referência para retorno
          if (createdTransactionIds.length === 1) {
            transactionId = postTxn.id;
            transactionStatus = postTxn.status;
            transactionMethod = postTxn.method;
            transactionAmount = postTxn.amount;
            transactionPixCode = postTxn.pix_code || undefined;
            transactionPixQrcode = postTxn.pix_qrcode || undefined;
            transactionCreatedAt = postTxn.created_at;
          }
        }
        
        console.log('[SOLUÇÃO INTEGRADA] Criadas transações para todos os posts:', createdTransactionIds);
      }
      // Caso tradicional - uma única transação
      else {
        const singlePostTxn = await db.transaction.create({
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
              is_multi_post: false,
              service_id: body.service_id,
              service_name: body.service_name,
              service_type: serviceType,
              profile_username: body.profile_username,
              post_data: posts.length === 1 ? posts[0] : null
            })
          }
        });
        
        console.log('[SOLUÇÃO INTEGRADA] Transação única criada com ID:', singlePostTxn.id);
        
        // Atualizar variáveis para retorno
        transactionId = singlePostTxn.id;
        transactionStatus = singlePostTxn.status;
        transactionMethod = singlePostTxn.method;
        transactionAmount = singlePostTxn.amount;
        transactionPixCode = singlePostTxn.pix_code || undefined;
        transactionPixQrcode = singlePostTxn.pix_qrcode || undefined;
        transactionCreatedAt = singlePostTxn.created_at;
      }
      
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
      
      // Registrar o erro
      try {
        await db.paymentProcessingFailure.create({
          data: {
            transaction_id: 'error', // Placeholder pois não temos transaction_id
            error_code: 'MP_PAYMENT_CREATION_ERROR',
            error_message: (mpError as Error).message,
            stack_trace: (mpError as Error).stack,
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