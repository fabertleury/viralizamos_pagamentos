import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { queuePaymentProcessing } from '@/lib/queue';

const prisma = new PrismaClient();

// Make endpoint dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * Endpoint para receber notificações de pagamento aprovado
 * e adicioná-las diretamente à fila Redis para processamento
 */
export async function POST(request: Request) {
  try {
    // Obter dados do webhook
    const body = await request.json();
    console.log('[Webhook] Recebido webhook de pagamento aprovado:', body.transaction_id);
    
    // Validar dados necessários
    if (!body.transaction_id || !body.payment_request_id) {
      return NextResponse.json({
        success: false,
        message: 'Dados incompletos: transaction_id e payment_request_id são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar se a transação existe
    const transaction = await prisma.transaction.findUnique({
      where: { id: body.transaction_id }
    });
    
    if (!transaction) {
      return NextResponse.json({
        success: false,
        message: `Transação ${body.transaction_id} não encontrada`
      }, { status: 404 });
    }
    
    // Verificar se o payment request existe
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: body.payment_request_id }
    });
    
    if (!paymentRequest) {
      return NextResponse.json({
        success: false,
        message: `Payment Request ${body.payment_request_id} não encontrado`
      }, { status: 404 });
    }
    
    // Adicionar à fila Redis
    const externalId = body.external_id || 'unknown';
    const jobId = await queuePaymentProcessing(
      body.transaction_id,
      body.payment_request_id,
      externalId
    );
    
    console.log(`[Webhook] Pagamento adicionado à fila Redis (Job: ${jobId})`);
    
    // Registrar no log de processamento
    await prisma.processingQueue.create({
      data: {
        type: 'payment_confirmation',
        status: 'direct_to_redis',
        payment_request_id: body.payment_request_id,
        priority: 10,
        metadata: JSON.stringify({
          transaction_id: body.transaction_id,
          external_id: externalId,
          redis_job_id: jobId,
          created_at: new Date().toISOString()
        })
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Pagamento adicionado à fila de processamento',
      job_id: jobId
    });
  } catch (error) {
    console.error('[Webhook] Erro ao processar webhook de pagamento:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar notificação de pagamento',
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error)) 
        : 'Internal server error'
    }, { status: 500 });
  }
} 