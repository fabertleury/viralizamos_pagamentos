import { NextResponse } from 'next/server';

// Make endpoint dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('[API] Tentativa de uso da API de process-queue, que está desativada');
  
  return NextResponse.json({
    success: false,
    message: 'Este endpoint está desativado',
    details: 'O processamento de fila via API foi substituído pelo processamento direto via Redis através do webhook do Mercado Pago. Esta API não é mais necessária e foi desativada para evitar processamentos duplicados.',
    timestamp: new Date().toISOString()
  }, { status: 410 }); // 410 Gone - Recurso permanentemente indisponível
} 