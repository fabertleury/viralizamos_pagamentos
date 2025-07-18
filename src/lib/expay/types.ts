export type ExpayPaymentRequest = {
  merchant_key: string;
  currency_code: string;
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

export type ExpayPaymentResponse = {
  result: boolean;
  success_message: string;
  qrcode_base64: string;
  emv: string;
  pix_url: string;
  bacen_url: string;
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