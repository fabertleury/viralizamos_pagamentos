/**
 * Constantes de URLs e configurações para serviços externos
 * Este arquivo centraliza todas as URLs e chaves de API para os diferentes serviços
 */

// Função para limpar URLs de caracteres extras
export function cleanUrl(url: string | null): string {
  if (!url) return '';
  return url.replace(/["';]+/g, '');
}

// URL do serviço de Orders
const ORDERS_SERVICE_URL = cleanUrl(process.env.ORDERS_SERVICE_URL || 'https://orders.viralizamos.com');

// URL da API de Orders (com endpoint base)
export const ORDERS_API_URL = cleanUrl(
  process.env.ORDERS_API_URL || 'https://orders.viralizamos.com/api/orders/create'
);

// Chave de API para o serviço de Orders
export const ORDERS_API_KEY = process.env.ORDERS_API_KEY || '';

// URL para reposições
export const REPOSICAO_API_URL = cleanUrl(
  process.env.REPOSICAO_API_URL || 'https://orders.viralizamos.com/api/reposicoes'
);

// Chave de API para reposições
export const REPOSICAO_API_KEY = process.env.REPOSICAO_API_KEY || '';

// URL do endpoint batch
export const ORDERS_BATCH_API_URL = ORDERS_API_URL.replace(/\/create$/, '/batch');

// Webhook URL para orders
export const ORDERS_WEBHOOK_URL = `${ORDERS_SERVICE_URL}/api/orders/webhook/payment`;

// URLs de fallback para desenvolvimento local
export const LOCAL_ORDERS_API_URL = 'http://localhost:3001/api/orders/create';
export const LOCAL_ORDERS_BATCH_API_URL = 'http://localhost:3001/api/orders/batch';

// Função para determinar se estamos em ambiente de produção
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Função para determinar se estamos em ambiente de desenvolvimento
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Função para verificar se uma URL tem o formato correto e contém os elementos necessários
export function validateApiUrl(url: string): boolean {
  // Deve ser uma URL válida e conter 'api/orders'
  const isValid = url.includes('api/orders') && 
                 (url.includes('create') || url.includes('batch'));
  
  if (!isValid) {
    console.warn(`[CONFIG] URL inválida: ${url}`);
    console.warn('[CONFIG] URLs devem incluir "api/orders" e "create" ou "batch"');
  }
  
  return isValid;
}

// Logs para debugging
if (typeof process !== 'undefined') {
  console.log('[CONFIG] Ambiente:', process.env.NODE_ENV);
  console.log('[CONFIG] ORDERS_API_URL:', ORDERS_API_URL);
  console.log('[CONFIG] ORDERS_BATCH_API_URL:', ORDERS_BATCH_API_URL); 
  console.log('[CONFIG] ORDERS_SERVICE_URL:', ORDERS_SERVICE_URL);
  console.log('[CONFIG] Validação das URLs:');
  console.log('[CONFIG] ORDERS_API_URL válida:', validateApiUrl(ORDERS_API_URL));
  console.log('[CONFIG] ORDERS_BATCH_API_URL válida:', validateApiUrl(ORDERS_BATCH_API_URL));
} 