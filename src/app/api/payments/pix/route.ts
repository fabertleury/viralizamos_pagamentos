import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const payment = new Payment(client);

// Função para gerar chave de idempotência
function generateIdempotencyKey(paymentRequestId: string): string {
  return `pix_${paymentRequestId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function POST(request: NextRequest) {
  try {
    // Extrair o ID da solicitação de pagamento
    const body = await request.json();
    const { payment_request_id } = body;
    
    if (!payment_request_id) {
      return NextResponse.json(
        { error: 'ID da solicitação de pagamento é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log(`Criando pagamento PIX para solicitação: ${payment_request_id}`);
    
    // Buscar a solicitação de pagamento
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: payment_request_id }
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe uma transação pendente
    const existingTransaction = await db.transaction.findFirst({
      where: {
        payment_request_id,
        status: 'pending',
        method: 'pix'
      }
    });
    
    if (existingTransaction) {
      return NextResponse.json({
        id: existingTransaction.id,
        status: existingTransaction.status,
        method: existingTransaction.method,
        amount: existingTransaction.amount,
        pix_code: existingTransaction.pix_code,
        pix_qrcode: existingTransaction.pix_qrcode,
        created_at: existingTransaction.created_at
      });
    }
    
    // Gerar chave de idempotência
    const idempotencyKey = generateIdempotencyKey(payment_request_id);
    
    // Verificar se já temos uma resposta em cache para esta chave
    const cachedResponse = await db.paymentIdempotencyLog.findUnique({
      where: { key: idempotencyKey }
    });
    
    if (cachedResponse) {
      const responseData = JSON.parse(cachedResponse.response);
      return NextResponse.json(responseData);
    }
    
    // Criar pagamento no Mercado Pago
    const paymentData = {
      transaction_amount: paymentRequest.amount,
      description: paymentRequest.service_name || 'Pagamento Viralizamos',
      payment_method_id: 'pix',
      payer: {
        email: paymentRequest.customer_email,
        first_name: paymentRequest.customer_name.split(' ')[0],
        last_name: paymentRequest.customer_name.split(' ').slice(1).join(' ') || 'Sobrenome',
        identification: {
          type: 'CPF',
          number: '00000000000'
        }
      },
      notification_url: `${process.env.WEBHOOK_URL}/api/webhooks/mercadopago`
    };
    
    console.log('Criando pagamento no Mercado Pago:', paymentData);
    
    try {
      const mpResponse = await payment.create({ body: paymentData });
      
      if (!mpResponse || !mpResponse.id) {
        throw new Error('Resposta inválida do Mercado Pago');
      }
      
      console.log('Resposta do Mercado Pago:', mpResponse);
      
      // Criar transação no banco
      const transaction = await db.transaction.create({
        data: {
          payment_request_id,
          external_id: mpResponse.id.toString(),
          status: 'pending',
          method: 'pix',
          amount: paymentRequest.amount,
          provider: 'mercadopago',
          pix_code: mpResponse.point_of_interaction?.transaction_data?.qr_code,
          pix_qrcode: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
          metadata: JSON.stringify({
            mercadopago_response: mpResponse,
            idempotency_key: idempotencyKey
          })
        }
      });
      
      // Registrar na fila de processamento
      await db.processingQueue.create({
        data: {
          payment_request_id,
          status: 'pending',
          type: 'payment_confirmation',
          priority: 1,
          metadata: JSON.stringify({
            transaction_id: transaction.id,
            external_id: mpResponse.id.toString()
          })
        }
      });
      
      // Atualizar status da solicitação de pagamento
      await db.paymentRequest.update({
        where: { id: payment_request_id },
        data: { status: 'processing' }
      });
      
      // Salvar resposta no cache de idempotência
      const responseData = {
        id: transaction.id,
        status: transaction.status,
        method: transaction.method,
        amount: transaction.amount,
        pix_code: transaction.pix_code,
        pix_qrcode: transaction.pix_qrcode,
        created_at: transaction.created_at
      };
      
      await db.paymentIdempotencyLog.create({
        data: {
          key: idempotencyKey,
          response: JSON.stringify(responseData)
        }
      });
      
      return NextResponse.json(responseData);
      
    } catch (error) {
      // Registrar falha de processamento
      await db.paymentProcessingFailure.create({
        data: {
          transaction_id: 'error', // Placeholder pois não temos transaction_id
          error_code: 'MERCADOPAGO_ERROR',
          error_message: (error as Error).message,
          stack_trace: (error as Error).stack,
          metadata: JSON.stringify({
            payment_request_id,
            idempotency_key: idempotencyKey,
            error: error
          })
        }
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao criar pagamento PIX',
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 