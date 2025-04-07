import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de compatibilidade para manter compatibilidade com o site principal
 * que ainda usa /api/payment-request (singular) em vez de /api/payment-requests (plural)
 */
export async function POST(request: NextRequest) {
  try {
    // URL para redirecionar
    const url = new URL('/api/payment-requests', request.url);
    
    // Clone da requisição para redirecionar
    const newRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
    });
    
    // Fazer a chamada para o endpoint correto
    return await fetch(newRequest);
  } catch (error) {
    console.error('Erro ao redirecionar solicitação de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de pagamento' },
      { status: 500 }
    );
  }
} 