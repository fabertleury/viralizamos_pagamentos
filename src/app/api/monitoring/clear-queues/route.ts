import { NextRequest, NextResponse } from 'next/server';
import { clearQueues } from '@/lib/queue';
import { checkApiKey } from '@/lib/auth';

/**
 * Endpoint para limpar todas as filas de processamento
 */
export async function POST(request: NextRequest) {
  // Verificar autenticação
  const isAuthorized = checkApiKey(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Acesso não autorizado' },
      { status: 401 }
    );
  }

  try {
    await clearQueues();
    
    return NextResponse.json({
      success: true,
      message: 'Filas limpas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar filas:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao limpar filas' 
      }, 
      { status: 500 }
    );
  }
} 