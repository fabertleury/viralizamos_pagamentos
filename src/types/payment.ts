import { Prisma } from '@prisma/client';

// Tipo para a resposta da API de pagamento
export interface PaymentResponse {
  id: string;
  token: string;
  amount: number;
  description: string | null;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  instagram_username?: string;
  service_name?: string;
  service_id?: string;
  external_service_id?: string;
  expires_at: Date | null;
  created_at: Date;
  posts: any[];
  quantity?: number; // Quantidade total de curtidas/visualizações
  return_url?: string; // URL de retorno após pagamento
  pix_code?: string;
  qr_code_image?: string;
  pix_key?: string;
  payment?: {
    id: string;
    status: string;
    method: string;
    pix_code?: string | null;
    pix_qrcode?: string | null;
    amount: number;
  };
  is_approved?: boolean; // Indica se o pagamento foi aprovado
  is_expired?: boolean; // Indica se o pagamento expirou
}

// Tipo simplificado para PaymentRequest com transações incluídas
export interface PaymentRequestWithTransactions {
  id: string;
  token: string;
  amount: number;
  service_id?: string | null;
  profile_username?: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone?: string | null;
  service_name?: string | null;
  return_url?: string | null;
  status: string;
  processed_payment_id?: string | null;
  additional_data?: string | null;
  created_at: Date;
  expires_at?: Date | null;
  processed_at?: Date | null;
  transactions: Array<{
    id: string;
    payment_request_id: string;
    external_id?: string | null;
    status: string;
    method: string;
    amount: number;
    provider: string;
    pix_code?: string | null;
    pix_qrcode?: string | null;
    metadata?: string | null;
    created_at: Date;
    updated_at: Date;
    processed_at?: Date | null;
  }>;
}

// Objeto para incluir transações na consulta
export const paymentRequestIncludeTransactions = {
  include: {
    transactions: {
      orderBy: [
        { status: 'asc' },
        { created_at: 'desc' }
      ],
      take: 1
    }
  }
}; 