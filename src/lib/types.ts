/**
 * Tipos e interfaces para o projeto de pagamentos
 */

/**
 * Interface para busca de transações
 */
export interface TransactionSearchParams {
  id?: string | string[];
  externalId?: string | string[];
  token?: string | string[];
}

/**
 * Interface para resposta da busca de transações
 */
export interface TransactionResponse {
  id: string;
  external_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  payment_id: string | null;
  provider: string | null;
  method: string | null;
  metadata: any | null;
  status_provider: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer?: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

/**
 * Interface para PaymentRequest
 */
export interface PaymentRequest {
  id: string;
  token: string;
  status: string;
  amount: number;
  service_id: string;
  service_name: string;
  external_service_id: string | null;
  profile_username: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  callback_url: string | null;
  additional_data: string | null;
  created_at: Date;
  updated_at: Date;
  processed_payment_id: string | null;
  transactions?: Transaction[];
}

/**
 * Interface para Transaction
 */
export interface Transaction {
  id: string;
  payment_request_id: string;
  status: string;
  external_id: string | null;
  method: string;
  amount: number;
  provider: string;
  pix_code: string | null;
  pix_qrcode: string | null;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  processed_at: Date | null;
  payment_request?: PaymentRequest;
} 