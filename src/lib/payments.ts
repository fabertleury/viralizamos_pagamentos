import { db } from '@/lib/prisma';
import { createPixPayment } from '@/lib/expay';
import { mapExpayStatus } from '@/lib/expay/types';

// Cria um pagamento PIX a partir de uma solicitação de pagamento
export async function createPix({
  paymentRequestId,
  webhookUrl
}: {
  paymentRequestId: string;
  webhookUrl?: string;
}) {
  try {
    // Buscar dados da solicitação de pagamento
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: paymentRequestId },
    });
    
    if (!paymentRequest) {
      throw new Error(`Solicitação de pagamento ${paymentRequestId} não encontrada`);
    }
    
    // Verificar se o pagamento já foi processado ou está expirado
    if (paymentRequest.status === 'completed' || paymentRequest.status === 'expired') {
      throw new Error(`Solicitação de pagamento ${paymentRequestId} não pode ser processada (status: ${paymentRequest.status})`);
    }
    
    // Verificar se já existe uma transação pendente
    const existingTransaction = await db.transaction.findFirst({
      where: {
        payment_request_id: paymentRequestId,
        status: 'pending'
      }
    });
    
    if (existingTransaction) {
      // Se já existe uma transação pendente, retornar os dados da transação existente
      return existingTransaction;
    }

    // Preparar nome do produto com quantidade para eXPay
    let productName = paymentRequest.service_name || 'Serviço Viralizamos';
    let serviceQuantity = 1;
    
    if (paymentRequest.additional_data) {
      try {
        const additionalData = JSON.parse(paymentRequest.additional_data);
        serviceQuantity = additionalData.total_quantity || additionalData.quantity || additionalData.quantidade || 1;
        
        // Para serviços quantificáveis, incluir quantidade no nome
        if (serviceQuantity && serviceQuantity > 1) {
          const serviceName = productName.toLowerCase();
          if (serviceName.includes('seguidores') || serviceName.includes('curtidas') || 
              serviceName.includes('views') || serviceName.includes('visualizacoes')) {
            productName = `${serviceQuantity.toLocaleString()} ${paymentRequest.service_name}`;
          }
        }
      } catch (e) {
        console.error('Erro ao extrair quantidade dos dados adicionais:', e);
      }
    }
    
    const items = [{
      name: productName,
      price: paymentRequest.amount,
      description: productName,
      qty: 1 // 1 produto (que contém a quantidade escolhida pelo cliente)
    }];

    // Criar pagamento na Expay
    const expayPayment = await createPixPayment({
      invoice_id: paymentRequestId,
      invoice_description: paymentRequest.service_name || 'Pagamento Viralizamos',
      total: paymentRequest.amount,
      devedor: paymentRequest.customer_name,
      email: paymentRequest.customer_email,
      cpf_cnpj: '00000000000', // TODO: Implementar campo de CPF/CNPJ
      notification_url: webhookUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/expay`,
      telefone: paymentRequest.customer_phone || '0000000000',
      items
    });
    
    // Salvar dados da transação no banco de dados
    const transaction = await db.transaction.create({
      data: {
        payment_request_id: paymentRequestId,
        provider: 'expay',
        external_id: paymentRequestId, // Usando o mesmo ID da invoice
        status: 'pending',
        method: 'pix',
        amount: paymentRequest.amount,
        pix_code: expayPayment.emv,
        pix_qrcode: expayPayment.qrcode_base64,
        metadata: JSON.stringify({
          expay_response: expayPayment,
          pix_url: expayPayment.pix_url,
          bacen_url: expayPayment.bacen_url
        })
      }
    });
    
    // Atualizar status da solicitação de pagamento
    await db.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: 'processing' }
    });
    
    return transaction;
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
}

// Verifica e atualiza o status de uma transação
export async function updatePaymentStatus(transactionId: string) {
  try {
    // Buscar transação no banco de dados
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { payment_request: true }
    });
    
    if (!transaction) {
      throw new Error(`Transação ${transactionId} não encontrada`);
    }
    
    // Se a transação não é da Expay, não podemos atualizar
    if (transaction.provider !== 'expay' || !transaction.external_id) {
      throw new Error(`Transação ${transactionId} não é da Expay ou não possui ID externo`);
    }
    
    // Retornar a transação sem alterações por enquanto
    // TODO: Implementar verificação de status na Expay quando necessário
    return transaction;
    
  } catch (error) {
    console.error('Erro ao atualizar status da transação:', error);
    throw error;
  }
} 