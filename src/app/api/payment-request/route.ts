import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

/**
 * Endpoint de compatibilidade para manter compatibilidade com o site principal
 * que ainda usa /api/payment-request (singular) em vez de /api/payment-requests (plural)
 * Implementação que redireciona para o endpoint correto.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[payment-request/route.ts] Recebida solicitação de pagamento (endpoint de compatibilidade)');
    
    // Extrair o corpo da requisição
    const body = await request.json();
    console.log('[payment-request/route.ts] Dados recebidos:', JSON.stringify(body).substring(0, 200) + '...');
    
    // Fazer requisição para o endpoint correto no formato plural
    const response = await fetch(new URL('/api/payment-requests', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Incluir outros headers importantes
        'x-forwarded-proto': request.headers.get('x-forwarded-proto') || 'https',
        'host': request.headers.get('host') || '',
        'x-real-ip': request.headers.get('x-real-ip') || '',
        'x-redirected-from': 'payment-request-singular'
      },
      body: JSON.stringify(body)
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[payment-request/route.ts] Erro ao redirecionar para /api/payment-requests:', response.status, errorText);
      return NextResponse.json(
        { error: 'Erro ao processar solicitação de pagamento' },
        { status: response.status }
      );
    }
    
    // Retornar a resposta do endpoint correto
    const responseData = await response.json();
    console.log('[payment-request/route.ts] Resposta do endpoint payment-requests:', JSON.stringify(responseData).substring(0, 200) + '...');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[payment-request/route.ts] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar solicitação de pagamento' },
      { status: 500 }
    );
  }
} 