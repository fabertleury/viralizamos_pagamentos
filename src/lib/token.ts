import { randomBytes } from 'crypto';

/**
 * Gera um token único para identificar uma solicitação de pagamento
 * @returns string Token único
 */
export function generateToken(): string {
  // Gerar 20 bytes aleatórios e convertê-los para string hexadecimal
  return randomBytes(16).toString('hex');
}

/**
 * Verifica se um token é válido
 * @param token Token a ser verificado
 * @returns boolean Indica se o token é válido
 */
export function isValidToken(token: string): boolean {
  // Um token válido deve ter 32 caracteres hexadecimais
  return /^[0-9a-f]{32}$/.test(token);
} 