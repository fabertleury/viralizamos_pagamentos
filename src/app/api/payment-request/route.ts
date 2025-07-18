import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { generateToken } from '@/lib/token';
import { generateIdempotencyKey } from '@/lib/idempotency';
import { createPixPayment } from '@/lib/expay';
import { isEmailBlocked } from '@/lib/email-block';

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
    // Verificar se o email está bloqueado
    const email = body.customer_email || body.email;
    if (email) {
      const isBlocked = await isEmailBlocked(email);
      if (isBlocked) {
        console.log(`[BLOQUEIO] Tentativa de pagamento bloqueada para email: ${email}`);
        
        // Retornar erro 403 (Forbidden)
        return NextResponse.json(
          {
            error: 'Email bloqueado',
            message: 'Este email está impedido de realizar compras no sistema.',
            code: 'EMAIL_BLOCKED'
          },
          { status: 403 }
        );
      }
    }

    // Gerar token único para esta solicitação
    const token = generateToken();

    // Processar dados adicionais
    let additionalDataString = null;
    let serviceType = 'instagram_likes';
    let isFollowersService = false;
    let totalQuantity = 0;
    let postsWithQuantities = [];
    let postsCount = 0;
    let externalServiceId = null;

    if (body.additional_data) {
      additionalDataString = JSON.stringify(body.additional_data);
      
      // Extrair informações dos dados adicionais
      const additionalData = typeof body.additional_data === 'string' 
        ? JSON.parse(body.additional_data) 
        : body.additional_data;
      
      serviceType = additionalData.service_type || 'instagram_likes';
      isFollowersService = serviceType === 'instagram_followers';
      externalServiceId = additionalData.external_service_id;
      
      if (additionalData.posts) {
        postsWithQuantities = additionalData.posts;
        postsCount = additionalData.posts.length;
        totalQuantity = additionalData.posts.reduce((total: number, post: any) => total + (post.quantity || 0), 0);
      }
    }

    // Data de expiração (24 horas)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
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
    
    // Gerar chave de idempotência
    const idempotencyKey = generateIdempotencyKey(paymentRequest.id);
    console.log('[SOLUÇÃO INTEGRADA] Chave de idempotência:', idempotencyKey);

    // Preparar os itens para a Expay
    const items = [{
      name: paymentRequest.service_name || 'Serviço Viralizamos',
      price: paymentRequest.amount,
      description: paymentRequest.service_name || 'Pagamento Viralizamos',
      qty: 1
    }];

    try {
      // Construir URL de notificação corretamente
      let notificationUrl = '';
      if (process.env.WEBHOOK_URL) {
        notificationUrl = `${process.env.WEBHOOK_URL}/api/webhooks/expay`;
      } else {
        // Usar o baseUrl como fallback
        const fullBaseUrl = `${protocol}://${baseUrl.replace(/^https?:\/\//i, '')}`;
        notificationUrl = `${fullBaseUrl}/api/webhooks/expay`;
      }
      
      // Remover qualquer caractere inválido da URL
      notificationUrl = notificationUrl.replace(/[;,\s]+$/, '');
      
      console.log('[SOLUÇÃO INTEGRADA] URL de notificação:', notificationUrl);
      
      // Criar pagamento na Expay
      const expayPayment = await createPixPayment({
        invoice: '',  // Campo vazio conforme exemplo da documentação
        invoice_id: paymentRequest.id,
        invoice_description: paymentRequest.service_name || 'Pagamento Viralizamos',
        total: paymentRequest.amount,
        devedor: paymentRequest.customer_name,
        email: paymentRequest.customer_email,
        cpf_cnpj: '00000000000', // TODO: Implementar campo de CPF/CNPJ
        notification_url: notificationUrl,
        telefone: paymentRequest.customer_phone || '0000000000',
        items
      });
      
      // Criar a transação
      const transaction = await db.transaction.create({
        data: {
          payment_request_id: paymentRequest.id,
          provider: 'expay',
          external_id: paymentRequest.id, // Usando o mesmo ID da invoice
          status: 'pending',
          method: 'pix',
          amount: paymentRequest.amount,
          pix_code: expayPayment.emv,
          pix_qrcode: expayPayment.qrcode_base64,
          metadata: JSON.stringify({
            expay_response: expayPayment,
            idempotency_key: idempotencyKey,
            service_id: body.service_id,
            service_name: body.service_name,
            service_type: serviceType,
            profile_username: body.profile_username,
            is_followers_service: isFollowersService,
            total_quantity: totalQuantity,
            posts: postsWithQuantities,
            posts_count: postsCount,
            pix_url: expayPayment.pix_url,
            bacen_url: expayPayment.bacen_url
          })
        }
      });
      
      // Atualizar a solicitação de pagamento para 'processing'
      await db.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'processing' }
      });
      
      // Criar um registro de fila de processamento
      await db.processingQueue.create({
        data: {
          payment_request_id: paymentRequest.id,
          status: 'pending',
          type: 'payment_confirmation',
          priority: 1,
          metadata: JSON.stringify({
            transaction_id: transaction.id,
            external_id: paymentRequest.id
          })
        }
      });
      
      // Salvar resposta para idempotência
      await db.paymentIdempotencyLog.create({
        data: {
          key: idempotencyKey,
          response: JSON.stringify({
            id: transaction.id,
            status: transaction.status,
            method: transaction.method,
            amount: transaction.amount,
            pix_code: transaction.pix_code,
            pix_qrcode: transaction.pix_qrcode,
            created_at: transaction.created_at
          })
        }
      });
      
      // Retornar a resposta completa
      return NextResponse.json({
        id: paymentRequest.id,
        token: paymentRequest.token,
        amount: paymentRequest.amount,
        service_name: paymentRequest.service_name,
        status: 'processing',
        customer_name: paymentRequest.customer_name,
        customer_email: paymentRequest.customer_email,
        customer_phone: paymentRequest.customer_phone,
        created_at: paymentRequest.created_at,
        expires_at: paymentRequest.expires_at,
        payment_url: paymentUrl,
        payment: {
          id: transaction.id,
          status: transaction.status,
          method: transaction.method,
          pix_code: transaction.pix_code,
          pix_qrcode: transaction.pix_qrcode,
          amount: transaction.amount
        }
      });
      
    } catch (error) {
      console.error('[SOLUÇÃO INTEGRADA] Erro ao criar pagamento:', error);
      
      // Criar transação com erro
      const failedTransaction = await db.transaction.create({
        data: {
          payment_request_id: paymentRequest.id,
          external_id: `failed_${Date.now()}`,
          status: 'failed',
          method: 'pix',
          amount: paymentRequest.amount,
          provider: 'expay',
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            idempotencyKey
          })
        }
      });

      // Registrar falha de processamento
      await db.paymentProcessingFailure.create({
        data: {
          transaction_id: failedTransaction.id,
          error_code: 'EXPAY_PAYMENT_CREATION_ERROR',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack_trace: error instanceof Error ? error.stack : undefined,
          metadata: JSON.stringify({
            payment_request_id: paymentRequest.id,
            idempotencyKey
          })
        }
      });

      // Atualizar status da solicitação para failed
      await db.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'failed' }
      });

      throw error;
    }
  } catch (error) {
    console.error('[SOLUÇÃO INTEGRADA] Erro ao processar solicitação:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao processar a solicitação de pagamento',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 