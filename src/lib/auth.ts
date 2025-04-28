import { NextRequest } from 'next/server';
import { db } from "@/lib/db";

// Função para verificar a API Key
export async function checkApiKey(request: NextRequest): Promise<boolean> {
  try {
    // Obter o Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    // Extrair a API key
    const apiKey = authHeader.substring(7); // Remover 'Bearer '
    
    // Verificar a API key
    const validApiKey = process.env.MONITORING_API_KEY;
    
    // Se não houver API key configurada, negar acesso
    if (!validApiKey) {
      console.warn('MONITORING_API_KEY não configurada no .env');
      return false;
    }
    
    return apiKey === validApiKey;
  } catch (error) {
    console.error('Erro ao verificar API Key:', error);
    return false;
  }
}

/**
 * Verifica se a chave de API fornecida no cabeçalho de autorização é válida
 * @param authHeader Cabeçalho de autorização (Bearer ou ApiKey)
 * @returns true se a chave for válida, false caso contrário
 */
export function verifyApiKeyAuth(authHeader: string | null): boolean {
  // Adicionar logs para depuração
  console.log('[Auth:Debug] Verificando autenticação com header:', authHeader ? `${authHeader.substring(0, 10)}...` : 'null');
  
  if (!authHeader) {
    console.log('[Auth:Debug] Header de autorização ausente');
    return false;
  }
  
  const apiKey = process.env.API_KEY || '6bVERz8A5P4drqmYjN2ZxK$Fw9sXhC7uJtH3GeQpT!vLWkS#D@_payments';
  console.log('[Auth:Debug] API Key configurada:', apiKey.substring(0, 10) + '...');
  
  // Verificar se o header começa com 'ApiKey ' e se a chave corresponde
  const isApiKeyFormat = authHeader.startsWith('ApiKey ');
  const extractedKey = isApiKeyFormat ? authHeader.replace('ApiKey ', '') : '';
  const isValidKey = extractedKey === apiKey;
  
  console.log('[Auth:Debug] Header no formato ApiKey?', isApiKeyFormat);
  console.log('[Auth:Debug] Chave extraída válida?', isValidKey);
  
  // Suporte adicional para o formato Bearer (temporário para compatibilidade)
  if (!isApiKeyFormat && authHeader.startsWith('Bearer ')) {
    const bearerKey = authHeader.replace('Bearer ', '');
    const isBearerValid = bearerKey === apiKey;
    console.log('[Auth:Debug] Tentando formato Bearer como fallback');
    console.log('[Auth:Debug] Chave Bearer válida?', isBearerValid);
    return isBearerValid;
  }
  
  return isApiKeyFormat && isValidKey;
}

/**
 * Extrai a chave de API do cabeçalho de autorização
 * @param authHeader Cabeçalho de autorização 
 * @returns A chave de API extraída
 */
function extractApiKey(authHeader: string): string {
  // Formatos esperados: "Bearer API_KEY" ou "ApiKey API_KEY"
  const parts = authHeader.split(' ');
  
  if (parts.length === 2) {
    const [scheme, key] = parts;
    
    if (scheme === 'Bearer' || scheme === 'ApiKey') {
      return key;
    }
  }
  
  // Se não estiver no formato esperado, considere o cabeçalho inteiro como a chave
  return authHeader;
}

/**
 * Verifica se a chave de API fornecida é válida
 * @param apiKey Chave de API para verificação
 * @returns Uma Promise que resolve para true se a chave for válida, false caso contrário
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  // Verificar com a API key esperada no .env
  const expectedApiKey = process.env.PAYMENTS_API_KEY || '';
  
  if (!expectedApiKey) {
    console.error('PAYMENTS_API_KEY não está configurada no .env');
    return false;
  }
  
  return apiKey === expectedApiKey;
}

// Função para verificar autenticação em uma requisição
export function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return verifyApiKeyAuth(authHeader);
} 