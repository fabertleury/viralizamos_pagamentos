import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, transaction_id, external_id } = body;
    
    if (!token && !transaction_id && !external_id) {
      return NextResponse.json(
        { error: 'É necessário fornecer token, transaction_id ou external_id' },
        { status: 400 }
      );
    }
    
    let transaction;
    let paymentRequest;
    
    // Buscar transação por ID
    if (transaction_id) {
      transaction = await db.transaction.findUnique({
        where: { id: transaction_id },
        include: { payment_request: true }
      });
      
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transação não encontrada' },
          { status: 404 }
        );
      }
      
      paymentRequest = transaction.payment_request;
    }
    // Buscar por token
    else if (token) {
      paymentRequest = await db.paymentRequest.findUnique({
        where: { token },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });
      
      if (!paymentRequest || !paymentRequest.transactions.length) {
        return NextResponse.json(
          { error: 'Pagamento não encontrado ou sem transações' },
          { status: 404 }
        );
      }
      
      transaction = paymentRequest.transactions[0];
    }
    // Buscar por external_id
    else if (external_id) {
      transaction = await db.transaction.findFirst({
        where: { external_id },
        include: { payment_request: true },
        orderBy: { created_at: 'desc' }
      });
      
      if (!transaction) {
        return NextResponse.json(
          { error: 'Transação não encontrada' },
          { status: 404 }
        );
      }
      
      paymentRequest = transaction.payment_request;
    }
    
    // Verificar se a transação já foi processada
    if (transaction.processed_at) {
      return NextResponse.json({
        warning: 'Transação já processada anteriormente',
        processed_at: transaction.processed_at,
        transaction_id: transaction.id
      });
    }
    
    // Verificar se o status é 'approved'
    if (transaction.status !== 'approved') {
      // Podemos permitir forçar o reprocessamento mesmo sem estar aprovado
      const force = body.force === true;
      
      if (!force) {
        return NextResponse.json({
          error: `Transação não está aprovada (status: ${transaction.status})`,
          message: 'Use o parâmetro "force: true" para processar mesmo assim'
        }, { status: 400 });
      }
      
      console.log(`⚠️ [Reprocess] Forçando processamento de transação com status ${transaction.status}`);
    }
    
    // Reprocessar a transação
    const queue = getQueue('payment-processing');
    
    if (!queue) {
      return NextResponse.json(
        { error: 'Fila de processamento não disponível' },
        { status: 500 }
      );
    }
    
    // Garantir que temos todos IDs necessários
    if (!transaction.id || !paymentRequest.id) {
      return NextResponse.json(
        { error: 'Dados incompletos para reprocessamento' },
        { status: 400 }
      );
    }
    
    // Gerar um jobId único para este reprocessamento (incluindo timestamp)
    const timestamp = new Date().getTime();
    const jobId = `reprocess_${transaction.id}_${timestamp}`;
    
    // Adicionar à fila de processamento
    const job = await queue.add(
      'process-payment',
      {
        transaction_id: transaction.id,
        payment_request_id: paymentRequest.id,
        external_id: transaction.external_id,
        reprocessed: true,
        reprocessed_at: new Date().toISOString()
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      }
    );
    
    console.log(`🔄 [Reprocess] Transação ${transaction.id} adicionada para reprocessamento com jobId ${jobId}`);
    
    // Registrar o reprocessamento
    await db.webhookLog.create({
      data: {
        transaction_id: transaction.id,
        type: 'manual-reprocess',
        event: 'payment.reprocess',
        data: JSON.stringify({
          jobId,
          reprocessed_at: new Date().toISOString(),
          reprocessed_by: body.user || 'admin'
        }),
        processed: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Transação adicionada para reprocessamento',
      job_id: jobId,
      transaction_id: transaction.id,
      payment_request_id: paymentRequest.id
    });
  } catch (error) {
    console.error('Erro ao reprocessar pagamento:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
} 