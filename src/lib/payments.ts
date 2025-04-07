import { db } from '@/lib/prisma';
import { createPixPayment, getPaymentStatus, MercadoPagoPayment } from '@/lib/mercadopago';

// Mapeia os status do Mercado Pago para status internos
export function mapPaymentStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'approved': 'completed',
    'authorized': 'processing',
    'in_process': 'processing',
    'in_mediation': 'processing',
    'rejected': 'failed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'disputed'
  };
  
  return statusMap[mpStatus] || 'pending';
}

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
    
    // Criar pagamento no Mercado Pago
    const mpPayment = await createPixPayment({
      transactionAmount: paymentRequest.amount,
      description: paymentRequest.service_name || 'Pagamento Viralizamos',
      payerEmail: paymentRequest.customer_email,
      payerName: paymentRequest.customer_name,
      externalReference: paymentRequestId,
      notificationUrl: webhookUrl
    });
    
    // Extrair QR Code e código PIX da resposta
    const pixCode = mpPayment.point_of_interaction?.transaction_data?.qr_code || '';
    const pixQrCode = mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || '';
    
    // Salvar dados da transação no banco de dados
    const transaction = await db.transaction.create({
      data: {
        payment_request_id: paymentRequestId,
        provider: 'mercadopago',
        external_id: mpPayment.id.toString(),
        status: mapPaymentStatus(mpPayment.status),
        method: 'pix',
        amount: mpPayment.transaction_amount,
        pix_code: pixCode,
        pix_qrcode: pixQrCode ? `data:image/png;base64,${pixQrCode}` : null,
        metadata: JSON.stringify(mpPayment)
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
    
    // Se a transação não é do Mercado Pago, não podemos atualizar
    if (transaction.provider !== 'mercadopago' || !transaction.external_id) {
      throw new Error(`Transação ${transactionId} não é do Mercado Pago ou não possui ID externo`);
    }
    
    // Buscar status atual no Mercado Pago
    const mpPayment = await getPaymentStatus(transaction.external_id);
    const newStatus = mapPaymentStatus(mpPayment.status);
    
    // Se o status não mudou, não precisamos atualizar
    if (transaction.status === newStatus) {
      return transaction;
    }
    
    // Atualizar status da transação
    const updatedTransaction = await db.transaction.update({
      where: { id: transactionId },
      data: { 
        status: newStatus,
        metadata: JSON.stringify({
          ...JSON.parse(transaction.metadata || '{}'),
          mercadopago_data: mpPayment
        })
      },
      include: { payment_request: true }
    });
    
    // Atualizar status da solicitação de pagamento, se necessário
    if (newStatus === 'completed' && transaction.payment_request.status !== 'completed') {
      await db.paymentRequest.update({
        where: { id: transaction.payment_request_id },
        data: { 
          status: 'completed',
          processed_payment_id: transaction.id
        }
      });
    } else if (['failed', 'cancelled', 'refunded'].includes(newStatus) && 
               transaction.payment_request.status === 'processing') {
      await db.paymentRequest.update({
        where: { id: transaction.payment_request_id },
        data: { status: 'pending' }
      });
    }
    
    return updatedTransaction;
  } catch (error) {
    console.error(`Erro ao atualizar status da transação ${transactionId}:`, error);
    throw error;
  }
} 