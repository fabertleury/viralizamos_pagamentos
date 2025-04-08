import { db } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

/**
 * Notifica o serviço de orders sobre a aprovação de um pagamento
 * Esta função deve ser chamada após a confirmação de pagamento pelo provedor
 */
export async function notifyOrdersService(transactionId: string): Promise<boolean> {
  try {
    // Buscar a transação completa com os dados do pagamento
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        payment_request: true
      }
    });

    if (!transaction) {
      console.error(`Transação ${transactionId} não encontrada ao notificar orders`);
      return false;
    }

    // Verificar se o pagamento foi de fato aprovado
    if (transaction.status !== 'approved') {
      console.log(`Transação ${transactionId} não está aprovada (status: ${transaction.status}), ignorando notificação`);
      return false;
    }

    // Extrair dados adicionais do payment_request
    let metadata: any = {};
    let posts: any[] = [];
    try {
      if (transaction.metadata) {
        metadata = JSON.parse(transaction.metadata);
      }
      
      if (transaction.payment_request.additional_data) {
        const additionalData = JSON.parse(transaction.payment_request.additional_data);
        posts = additionalData.posts || [];
      }
    } catch (error) {
      console.error('Erro ao extrair dados adicionais:', error);
    }

    // Determinar tipo de serviço e outras informações
    const isFollowersService = !!metadata.is_followers_service;
    const serviceType = metadata.service_type || 'instagram_likes';
    const totalQuantity = metadata.total_quantity || 0;

    // Construir o payload para o serviço de orders
    const payload = {
      type: 'payment_approved',
      transaction_id: transaction.id,
      payment_id: transaction.payment_request_id,
      status: 'approved',
      amount: transaction.amount,
      metadata: {
        service: transaction.payment_request.service_id,
        external_service_id: transaction.payment_request.external_service_id || '',
        profile: transaction.payment_request.profile_username,
        service_type: serviceType,
        posts: posts.map(post => ({
          id: post.id,
          code: post.code,
          url: post.url,
          caption: post.caption,
          quantity: post.quantity
        })),
        customer: {
          name: transaction.payment_request.customer_name,
          email: transaction.payment_request.customer_email,
          phone: transaction.payment_request.customer_phone
        },
        total_quantity: totalQuantity,
        is_followers_service: isFollowersService
      }
    };

    console.log(`Enviando notificação com external_service_id: ${transaction.payment_request.external_service_id || 'não definido'}`);

    // Gerar token JWT para autenticação
    const token = sign(
      { transaction_id: transaction.id }, 
      process.env.JWT_SECRET || 'payment_service_secret',
      { expiresIn: '1h' }
    );

    // Determinar URL do serviço de orders
    const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com';
    const webhookUrl = `${ordersServiceUrl}/api/orders/webhook/payment`;

    console.log(`Notificando serviço de orders em ${webhookUrl}`);

    // Enviar notificação para o serviço de orders
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Falha ao notificar orders: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    console.log('Notificação para orders enviada com sucesso:', result);

    // Registrar que a notificação foi enviada
    await db.paymentNotificationLog.create({
      data: {
        transaction_id: transaction.id,
        type: 'orders_service',
        target_url: webhookUrl,
        status: 'success',
        payload: JSON.stringify(payload),
        response: JSON.stringify(result)
      }
    });

    return true;
  } catch (error) {
    console.error('Erro ao notificar serviço de orders:', error);
    
    // Registrar falha de notificação
    try {
      await db.paymentNotificationLog.create({
        data: {
          transaction_id: transactionId,
          type: 'orders_service',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          error_stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (logError) {
      console.error('Erro ao registrar falha de notificação:', logError);
    }
    
    return false;
  }
} 