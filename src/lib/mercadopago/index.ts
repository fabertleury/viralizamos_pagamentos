import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// Instância única do cliente Mercado Pago
let mpClient: MercadoPagoConfig | null = null;

// Inicializar o cliente do Mercado Pago
export const getMercadoPagoClient = () => {
  if (!mpClient) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado no ambiente');
    }
    
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  
  return mpClient;
};

// Criar nova preferência de pagamento (para gerar link de pagamento)
export const createPaymentPreference = async (data: {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  payerEmail: string;
  payerName?: string;
  payerPhone?: string;
  externalReference?: string;
  notificationUrl?: string;
  backUrls?: {
    success?: string;
    pending?: string;
    failure?: string;
  };
}) => {
  const client = getMercadoPagoClient();
  const preference = new Preference(client);
  
  const preferenceData = {
    items: [
      {
        id: Math.random().toString(36).substr(2, 9),
        title: data.title,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        currency_id: 'BRL',
      },
    ],
    payer: {
      email: data.payerEmail,
      name: data.payerName,
      phone: data.payerPhone ? {
        number: data.payerPhone
      } : undefined
    },
    payment_methods: {
      excluded_payment_types: [
        { id: 'credit_card' },
        { id: 'debit_card' },
        { id: 'bank_transfer' },
        { id: 'ticket' },
      ],
    },
    external_reference: data.externalReference,
    notification_url: data.notificationUrl,
    back_urls: data.backUrls,
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
    auto_return: 'approved',
  };
  
  const result = await preference.create({ body: preferenceData });
  return result;
};

// Criar um pagamento PIX direto
export const createPixPayment = async (data: {
  transactionAmount: number;
  description: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerIdentification?: {
    type: string;
    number: string;
  };
  externalReference?: string;
  notificationUrl?: string;
}) => {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  
  const paymentData = {
    transaction_amount: data.transactionAmount,
    description: data.description,
    payment_method_id: 'pix',
    payer: {
      email: data.payerEmail,
      first_name: data.payerFirstName,
      last_name: data.payerLastName,
      identification: data.payerIdentification
    },
    external_reference: data.externalReference,
    notification_url: data.notificationUrl,
  };
  
  const result = await payment.create({ body: paymentData });
  return result;
};

// Verificar o status de um pagamento
export const getPaymentStatus = async (paymentId: string) => {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  
  try {
    const result = await payment.get({ id: paymentId });
    return result;
  } catch (error) {
    console.error('Erro ao buscar status do pagamento:', error);
    throw error;
  }
}; 