import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

// Buscar solicitação de pagamento por token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    // Buscar solicitação de pagamento pelo token
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { token },
      include: {
        // Incluir o último pagamento, prioridade para pagamentos pendentes
        payments: {
          orderBy: [
            { status: 'asc' }, // 'pending' vem antes de 'completed'
            { created_at: 'desc' }
          ],
          take: 1
        }
      }
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se a solicitação está expirada
    if (
      paymentRequest.status === 'pending' &&
      paymentRequest.expires_at && 
      new Date() > new Date(paymentRequest.expires_at)
    ) {
      // Atualizar status para expirado
      await db.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'expired' }
      });
      
      paymentRequest.status = 'expired';
    }
    
    // Preparar resposta com os campos corretos do modelo atual
    const response = {
      id: paymentRequest.id,
      token: paymentRequest.token,
      amount: paymentRequest.amount,
      service_name: paymentRequest.service_name || 'Pagamento Viralizamos',
      service_id: paymentRequest.service_id,
      status: paymentRequest.status,
      customer_name: paymentRequest.customer_name,
      customer_email: paymentRequest.customer_email,
      customer_phone: paymentRequest.customer_phone,
      profile_username: paymentRequest.profile_username,
      return_url: paymentRequest.return_url,
      created_at: paymentRequest.created_at,
      expires_at: paymentRequest.expires_at,
      processed_at: paymentRequest.processed_at,
      payment: paymentRequest.payments[0] ? {
        id: paymentRequest.payments[0].id,
        status: paymentRequest.payments[0].status,
        method: paymentRequest.payments[0].method,
        amount: paymentRequest.payments[0].amount,
        pix_code: paymentRequest.payments[0].pix_code,
        pix_qrcode: paymentRequest.payments[0].pix_qrcode,
        created_at: paymentRequest.payments[0].created_at
      } : null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar solicitação de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar solicitação de pagamento' },
      { status: 500 }
    );
  }
} 