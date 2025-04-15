import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

/**
 * Endpoint para solicitar reprocessamento/reposição de um pedido
 * Este endpoint cria uma entrada na fila de processamento para ser tratada posteriormente
 */
export async function POST(request: NextRequest) {
  try {
    // Obter dados da requisição
    const { paymentRequestId, reason } = await request.json();
    
    if (!paymentRequestId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Recebida solicitação de reposição para o pedido: ${paymentRequestId}`);
    
    // Verificar se o pedido existe
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: paymentRequestId }
    });
    
    if (!paymentRequest) {
      console.error(`[API] Pedido não encontrado: ${paymentRequestId}`);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe uma solicitação de reprocessamento pendente
    const existingQueue = await db.processingQueue.findFirst({
      where: {
        payment_request_id: paymentRequestId,
        type: 'reprocess',
        status: 'pending'
      }
    });
    
    if (existingQueue) {
      console.log(`[API] Já existe uma solicitação de reposição pendente para o pedido: ${paymentRequestId}`);
      return NextResponse.json({
        success: true,
        message: 'Já existe uma solicitação de reposição pendente para este pedido',
        reprocessRequestId: existingQueue.id
      });
    }
    
    // Criar entrada na fila de processamento
    const processingQueue = await db.processingQueue.create({
      data: {
        payment_request_id: paymentRequestId,
        type: 'reprocess',
        status: 'pending',
        priority: 1, // Alta prioridade para solicitações de reposição
        metadata: JSON.stringify({
          reason: reason || 'Solicitação manual do cliente',
          requested_at: new Date().toISOString()
        })
      }
    });
    
    console.log(`[API] Solicitação de reposição criada com sucesso: ${processingQueue.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Solicitação de reposição criada com sucesso',
      reprocessRequestId: processingQueue.id
    });
    
  } catch (error) {
    console.error('[API] Erro ao processar solicitação de reposição:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: 'Não foi possível processar a solicitação de reposição'
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para verificar status das reposições de um pedido
 */
export async function GET(request: NextRequest) {
  try {
    // Obter o ID do pedido da query string
    const { searchParams } = new URL(request.url);
    const paymentRequestId = searchParams.get('paymentRequestId');
    
    if (!paymentRequestId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Verificando status de reposições para o pedido: ${paymentRequestId}`);
    
    // Buscar todas as solicitações de reposição para o pedido
    const reprocessRequests = await db.processingQueue.findMany({
      where: {
        payment_request_id: paymentRequestId,
        type: 'reprocess'
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Transformar os dados para um formato mais amigável
    const formattedRequests = reprocessRequests.map(request => ({
      id: request.id,
      status: request.status,
      created_at: request.created_at,
      processed_at: request.processed_at,
      attempts: request.attempts,
      metadata: request.metadata ? JSON.parse(request.metadata) : {}
    }));
    
    return NextResponse.json({
      success: true,
      reprocessRequests: formattedRequests,
      total: formattedRequests.length,
      hasActive: formattedRequests.some(r => r.status === 'pending' || r.status === 'processing')
    });
    
  } catch (error) {
    console.error('[API] Erro ao verificar status das reposições:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: 'Não foi possível verificar o status das reposições'
      },
      { status: 500 }
    );
  }
} 