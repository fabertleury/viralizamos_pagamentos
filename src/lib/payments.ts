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
    
    // Verificar se já existe um pagamento pendente
    const existingPayment = await db.payment.findFirst({
      where: {
        payment_request_id: paymentRequestId,
        status: 'pending'
      }
    });
    
    if (existingPayment) {
      // Se já existe um pagamento pendente, retornar os dados do pagamento existente
      return existingPayment;
    }
    
    // Criar pagamento no Mercado Pago
    const mpPayment = await createPixPayment({
      transactionAmount: paymentRequest.amount,
      description: paymentRequest.description,
      payerEmail: paymentRequest.payer_email,
      payerName: paymentRequest.payer_name,
      externalReference: paymentRequestId,
      notificationUrl: webhookUrl
    });
    
    // Extrair QR Code e código PIX da resposta
    const pixCode = mpPayment.point_of_interaction?.transaction_data?.qr_code || '';
    const pixQrCode = mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || '';
    
    // Salvar dados do pagamento no banco de dados
    const payment = await db.payment.create({
      data: {
        payment_request_id: paymentRequestId,
        provider: 'mercadopago',
        provider_payment_id: mpPayment.id,
        status: mapPaymentStatus(mpPayment.status),
        method: 'pix',
        amount: mpPayment.transaction_amount,
        pix_code: pixCode,
        pix_qrcode: pixQrCode ? `data:image/png;base64,${pixQrCode}` : null,
        extra_data: JSON.stringify(mpPayment)
      }
    });
    
    // Atualizar status da solicitação de pagamento
    await db.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: 'processing' }
    });
    
    return payment;
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
}

// Verifica e atualiza o status de um pagamento
export async function updatePaymentStatus(paymentId: string) {
  try {
    // Buscar pagamento no banco de dados
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { payment_request: true }
    });
    
    if (!payment) {
      throw new Error(`Pagamento ${paymentId} não encontrado`);
    }
    
    // Se o pagamento não é do Mercado Pago, não podemos atualizar
    if (payment.provider !== 'mercadopago' || !payment.provider_payment_id) {
      throw new Error(`Pagamento ${paymentId} não é do Mercado Pago ou não possui ID do provedor`);
    }
    
    // Buscar status atual no Mercado Pago
    const mpPayment = await getPaymentStatus(payment.provider_payment_id);
    const newStatus = mapPaymentStatus(mpPayment.status);
    
    // Se o status não mudou, não precisamos atualizar
    if (payment.status === newStatus) {
      return payment;
    }
    
    // Atualizar status do pagamento
    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: { 
        status: newStatus,
        extra_data: JSON.stringify(mpPayment)
      },
      include: { payment_request: true }
    });
    
    // Atualizar status da solicitação de pagamento, se necessário
    if (newStatus === 'completed' && payment.payment_request.status !== 'completed') {
      await db.paymentRequest.update({
        where: { id: payment.payment_request_id },
        data: { status: 'completed' }
      });
    } else if (['failed', 'cancelled', 'refunded'].includes(newStatus) && 
               payment.payment_request.status === 'processing') {
      await db.paymentRequest.update({
        where: { id: payment.payment_request_id },
        data: { status: 'pending' }
      });
    }
    
    return updatedPayment;
  } catch (error) {
    console.error(`Erro ao atualizar status do pagamento ${paymentId}:`, error);
    throw error;
  }
} 