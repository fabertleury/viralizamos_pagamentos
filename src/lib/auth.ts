import { NextRequest } from 'next/server';

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