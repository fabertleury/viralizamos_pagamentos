import crypto from 'crypto';

/**
 * Gera uma chave de idempotência única para uma solicitação de pagamento
 * @param paymentRequestId ID da solicitação de pagamento
 * @returns Chave de idempotência
 */
export function generateIdempotencyKey(paymentRequestId: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${paymentRequestId}_${timestamp}_${randomString}`;
} 