import { MercadoPagoConfig, Payment } from 'mercadopago';

// Tipos para o Mercado Pago
export type MercadoPagoPayment = {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  date_approved?: string;
  payment_method_id: string;
  payment_type_id: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    }
  }
};

let mercadoPagoClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!mercadoPagoClient) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não está definido no ambiente');
    }
    
    mercadoPagoClient = new MercadoPagoConfig({ accessToken });
  }
  
  return mercadoPagoClient;
}

export async function createPixPayment({
  transactionAmount,
  description,
  payerEmail,
  payerName,
  externalReference,
  notificationUrl
}: {
  transactionAmount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  externalReference: string;
  notificationUrl?: string;
}): Promise<MercadoPagoPayment> {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  
  try {
    const paymentData = {
      transaction_amount: transactionAmount,
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        first_name: payerName.split(' ')[0],
        last_name: payerName.split(' ').slice(1).join(' ') || ' '
      },
      external_reference: externalReference
    };
    
    // Adicionar URL de notificação, se fornecida
    if (notificationUrl) {
      Object.assign(paymentData, { notification_url: notificationUrl });
    }
    
    // Criar o pagamento
    const response = await payment.create({ body: paymentData });
    
    return response as unknown as MercadoPagoPayment;
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
}

export async function getPaymentStatus(paymentId: string): Promise<MercadoPagoPayment> {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  
  try {
    const response = await payment.get({ id: paymentId });
    return response as unknown as MercadoPagoPayment;
  } catch (error) {
    console.error(`Erro ao buscar status do pagamento ${paymentId}:`, error);
    throw error;
  }
} 