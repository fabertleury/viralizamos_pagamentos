/**
 * Configuração do Expay
 */

// URL base da API do Expay
export const EXPAY_BASE_URL = 'https://expaybrasil.com';

// Endpoints da API
export const ENDPOINTS = {
  CREATE_PAYMENT: '/en/purchase/link',
  CHECK_STATUS: '/en/request/status'
};

// Função para obter a URL base do Expay
export const getExpayBaseUrl = (): string => {
  return process.env.EXPAY_BASE_URL || EXPAY_BASE_URL;
};

// Função para obter a URL completa de um endpoint
export const getExpayEndpointUrl = (endpoint: keyof typeof ENDPOINTS): string => {
  return `${getExpayBaseUrl()}${ENDPOINTS[endpoint]}`;
};

// Função para obter a chave do comerciante
export const getExpayMerchantKey = (): string => {
  const key = process.env.EXPAY_MERCHANT_KEY;
  if (!key) {
    throw new Error('EXPAY_MERCHANT_KEY não configurado no ambiente');
  }
  return key;
};

// Função para obter o ID do comerciante
export const getExpayMerchantId = (): string => {
  return process.env.EXPAY_MERCHANT_ID || '909';
}; 