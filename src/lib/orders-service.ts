import { db } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';
import { ORDERS_WEBHOOK_URL } from '@/lib/constants';

/**
 * Notifica o serviço de orders sobre a aprovação de um pagamento
 * Esta função deve ser chamada após a confirmação de pagamento pelo provedor
 */
export async function notifyOrdersService(transactionId: string): Promise<boolean> {
  console.log(`[OrdersService] Iniciando notificação da transação ${transactionId} para o serviço de orders`);
  
  try {
    // Buscar a transação completa com os dados do pagamento
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        payment_request: true
      }
    });

    if (!transaction) {
      console.error(`[OrdersService] Transação ${transactionId} não encontrada ao notificar orders`);
      return false;
    }

    // Verificar se o pagamento foi de fato aprovado
    if (transaction.status !== 'approved') {
      console.log(`[OrdersService] Transação ${transactionId} não está aprovada (status: ${transaction.status}), ignorando notificação`);
      return false;
    }

    console.log(`[OrdersService] Transação ${transactionId} está aprovada, preparando dados para notificação`);

    // Buscar informações do serviço para obter o provider_id
    let providerId = '';
    try {
      // Tentar obter o provider_id do metadata da transação
      if (transaction.metadata) {
        try {
          const metadataObj = JSON.parse(transaction.metadata);
          if (metadataObj.provider_id) {
            providerId = metadataObj.provider_id;
            console.log(`[OrdersService] Provider ID encontrado no metadata: ${providerId}`);
          }
        } catch (parseError) {
          console.error('[OrdersService] Erro ao parsear metadata da transação:', parseError);
        }
      }
      
      // Se não encontrou no metadata, tentar buscar de outras fontes
      if (!providerId && transaction.payment_request.service_id) {
        console.log(`[OrdersService] Buscando provider_id para o serviço: ${transaction.payment_request.service_id}`);
        
        try {
          // Buscar o serviço no banco de dados para obter o provider_id
          const service = await db.service.findUnique({
            where: { id: transaction.payment_request.service_id }
          });
          
          if (service && service.provider_id) {
            providerId = service.provider_id;
            console.log(`[OrdersService] Provider ID encontrado no banco de dados: ${providerId}`);
          } else {
            console.log(`[OrdersService] Serviço encontrado, mas sem provider_id definido`);
          }
        } catch (error) {
          console.error('[OrdersService] Erro ao buscar serviço no banco de dados:', error);
        }
        
        // Se ainda não encontrou, usar um valor padrão
        if (!providerId) {
          // Usar um provider_id padrão para evitar erro de constraint
          providerId = process.env.DEFAULT_PROVIDER_ID || '5c6c7b9c-0a1d-4d0e-8b1f-9c9c9c9c9c9c';
          console.log(`[OrdersService] Usando provider_id padrão: ${providerId}`);
        }
      }
    } catch (error) {
      console.error('[OrdersService] Erro ao buscar informações do serviço:', error);
    }

    // Extrair dados adicionais do payment_request
    let metadata: any = {};
    let posts: any[] = [];
    try {
      if (transaction.metadata) {
        metadata = JSON.parse(transaction.metadata);
        console.log(`[OrdersService] Metadata da transação:`, metadata);
      }
      
      if (transaction.payment_request.additional_data) {
        const additionalData = JSON.parse(transaction.payment_request.additional_data);
        posts = additionalData.posts || [];
        console.log(`[OrdersService] Posts encontrados: ${posts.length}`);
      }
    } catch (error) {
      console.error('[OrdersService] Erro ao extrair dados adicionais:', error);
    }

    // Determinar tipo de serviço e outras informações
    const serviceType = metadata.service_type || 'instagram_likes';
    
    // Se o tipo de serviço for "seguidores", garantir que is_followers_service seja true
    const isFollowersService = serviceType === 'seguidores' ? true : !!metadata.is_followers_service;
    
    // Definir quantidade padrão baseada no tipo de serviço
    const defaultQuantity = isFollowersService ? 100 : 10;
    const totalQuantity = metadata.total_quantity > 0 ? metadata.total_quantity : defaultQuantity;

    console.log(`[OrdersService] Tipo de serviço: ${serviceType}`);
    console.log(`[OrdersService] É serviço de seguidores: ${isFollowersService}`);
    console.log(`[OrdersService] Quantidade total (original): ${metadata.total_quantity}`);
    console.log(`[OrdersService] Quantidade total (corrigida): ${totalQuantity}`);

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
        is_followers_service: isFollowersService,
        provider_id: providerId // Adicionar provider_id
      }
    };

    console.log(`[OrdersService] Enviando notificação com external_service_id: ${transaction.payment_request.external_service_id || 'não definido'}`);
    console.log(`[OrdersService] Profile username: ${transaction.payment_request.profile_username}`);

    // Gerar token JWT para autenticação
    const token = sign(
      { transaction_id: transaction.id }, 
      process.env.JWT_SECRET || 'payment_service_secret',
      { expiresIn: '1h' }
    );

    console.log(`[OrdersService] Notificando serviço de orders em ${ORDERS_WEBHOOK_URL}`);
    console.log(`[OrdersService] Payload:`, JSON.stringify(payload, null, 2));

    // Enviar notificação para o serviço de orders
    const response = await fetch(ORDERS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Verificar resposta do serviço de orders
    const responseText = await response.text();
    console.log(`[OrdersService] Resposta do serviço de orders (status ${response.status}):`, responseText);

    if (!response.ok) {
      throw new Error(`Falha ao notificar orders: ${response.status} - ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.warn(`[OrdersService] Resposta não é um JSON válido:`, responseText);
      result = { text: responseText };
    }

    console.log('[OrdersService] Notificação para orders enviada com sucesso:', result);

    // Registrar que a notificação foi enviada
    await db.paymentNotificationLog.create({
      data: {
        transaction_id: transaction.id,
        type: 'orders_service',
        target_url: ORDERS_WEBHOOK_URL,
        status: 'success',
        payload: JSON.stringify(payload),
        response: JSON.stringify(result)
      }
    });

    return true;
  } catch (error) {
    console.error('[OrdersService] Erro ao notificar serviço de orders:', error);
    
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
      console.error('[OrdersService] Erro ao registrar falha de notificação:', logError);
    }
    
    return false;
  }
}