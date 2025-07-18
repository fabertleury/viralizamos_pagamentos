export type ExpayPaymentRequest = {
  merchant_key: string;
  merchant_id?: string;
  currency_code: string;
  invoice?: string;
  invoice_id: string;
  invoice_description: string;
  total: number;
  devedor: string;
  email: string;
  cpf_cnpj: string;
  notification_url: string;
  telefone: string;
  items: ExpayItem[];
};

export type ExpayItem = {
  name: string;
  price: number;
  description: string;
  qty: number;
};

// Tipo para o objeto de invoice no formato JSON
export type ExpayInvoiceData = {
  invoice_id: string;
  invoice_description: string;
  total: string;
  devedor: string;
  email: string;
  cpf_cnpj: string;
  notification_url: string;
  telefone: string;
  items: Array<{
    name: string;
    price: string;
    description: string;
    qty: string;
  }>;
};

export type ExpayPaymentResponse = {
  pix_request: {
    result: boolean;
    success_message: string;
    transaction_id: number;
    date: string;
    expire_date: string;
    status: string;
    value: string;
    order_id: string;
    pix_code: {
      qrcode_base64: string;
      emv: string;
      bacen_url: string;
      pix_url: string;
    }
  }
};

// Tipo legado para compatibilidade com código existente
export type LegacyExpayPaymentResponse = {
  result: boolean;
  success_message: string;
  qrcode_base64: string;
  emv: string;
  pix_url: string;
  bacen_url: string;
  // Campos adicionais conforme a documentação
  transaction_id?: string;
  date?: string;
  expire_date?: string;
  status?: string;
  value?: string;
  order_id?: string;
};

export type ExpayWebhookNotification = {
  date_notification: string;
  invoice_id: string;
  token: string;
};

export type ExpayWebhookResponse = {
  result: boolean;
  success_message: string;
  transaction_request: {
    items: ExpayItem[];
    invoice_id: string;
    invoice_description: string;
    total: number;
    devedor: string;
    email: string;
    cpf_cnpj: string;
    notification_url: string;
    telefone: string;
    status: 'pending' | 'canceled' | 'paid' | 'refunded';
    pix_code: string | null;
  };
};

// Mapeamento de status da Expay para nosso sistema
export const mapExpayStatus = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'canceled':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}; 