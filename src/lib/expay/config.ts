/**
 * Configuração do Expay
 */

// URL base da API do Expay
export const EXPAY_BASE_URL = 'http://expaybrasil.com';

// Chave do comerciante hardcoded
export const EXPAY_MERCHANT_KEY = '$2y$12$oxjI0EfQJ/0RQgNbHVV4rePuYVWA7XXPLnmFZqRsIqgXE/FTjc2cO';

// ID do comerciante hardcoded
export const EXPAY_MERCHANT_ID = '909';

// Nome do comerciante hardcoded
export const EXPAY_MERCHANT_NAME = 'viralizamos';

// URL do comerciante hardcoded
export const EXPAY_MERCHANT_URL = 'https://viralizamos.com';

// Código da moeda hardcoded
export const EXPAY_CURRENCY_CODE = 'BRL';

// Símbolo da moeda hardcoded
export const EXPAY_CURRENCY_SYMBOL = 'R$';

// Endpoints da API
export const ENDPOINTS = {
  CREATE_PAYMENT: '/en/purchase/link',
  CHECK_STATUS: '/en/request/status'
};

// Função para obter a URL base do Expay
export const getExpayBaseUrl = (): string => {
  // Retornar a URL hardcoded
  return EXPAY_BASE_URL;
};

// Função para obter a URL completa de um endpoint
export const getExpayEndpointUrl = (endpoint: keyof typeof ENDPOINTS): string => {
  return `${getExpayBaseUrl()}${ENDPOINTS[endpoint]}`;
};

// Função para obter a chave do comerciante
export const getExpayMerchantKey = (): string => {
  // Retornar a chave hardcoded
  return EXPAY_MERCHANT_KEY;
};

// Função para obter o ID do comerciante
export const getExpayMerchantId = (): string => {
  // Retornar o ID hardcoded
  return EXPAY_MERCHANT_ID;
}; 