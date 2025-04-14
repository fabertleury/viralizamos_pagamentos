import { NextRequest } from 'next/server';
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { compare } from "bcrypt";

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
  if (!authHeader) {
    return false;
  }

  // Extrair a API key do cabeçalho
  const apiKey = extractApiKey(authHeader);
  
  // Verificar com a API key esperada no .env
  const expectedApiKey = process.env.PAYMENTS_API_KEY || '';
  
  if (!expectedApiKey) {
    console.error('PAYMENTS_API_KEY não está configurada no .env');
    return false;
  }
  
  return apiKey === expectedApiKey;
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