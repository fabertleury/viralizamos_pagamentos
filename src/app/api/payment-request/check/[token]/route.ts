import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PaymentResponse } from '@/types/payment';

// Endpoint para verificar status do pagamento por token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      );
    }
    
    console.log(`Verificando status do pagamento com token: ${token}`);
    
    // Buscar a solicitação de pagamento com a última transação
    const paymentRequest = await db.paymentRequest.findUnique({
      where: {
        token
      },
      include: {
        transactions: {
          orderBy: [
            { status: 'asc' }, // 'pending' vem antes de 'completed'
            { created_at: 'desc' }
          ],
          take: 1
        }
      }
    } satisfies Prisma.PaymentRequestFindUniqueArgs);
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se o pagamento foi aprovado
    const isApproved = Boolean(paymentRequest.transactions.length > 0 && 
                        paymentRequest.transactions[0].status === 'approved');
    
    // Verificar se a solicitação expirou
    const isExpired = Boolean(paymentRequest.expires_at && new Date(paymentRequest.expires_at) < new Date());
    
    // Analisar dados adicionais
    let posts = [];
    let quantity = 0;
    if (paymentRequest.additional_data) {
      try {
        const additionalData = JSON.parse(paymentRequest.additional_data);
        posts = additionalData.posts || [];
        
        // Extrair a quantidade total de curtidas/visualizações
        quantity = additionalData.quantity || additionalData.total_quantity || 0;
        
        // Se tiver metadata na transação, tentar extrair de lá também
        if (paymentRequest.transactions[0]?.metadata) {
          try {
            const transactionMetadata = JSON.parse(paymentRequest.transactions[0].metadata);
            if (!quantity && transactionMetadata.total_quantity) {
              quantity = transactionMetadata.total_quantity;
            }
          } catch (metaErr) {
            console.error('Erro ao analisar metadata da transação:', metaErr);
          }
        }
      } catch (e) {
        console.error('Erro ao analisar additional_data:', e);
      }
    }
    
    // Extrair os campos do paymentRequest diretamente, garantindo que tenham tipos corretos
    const {
      id, token: tokenValue, amount, customer_name, customer_email, customer_phone,
      profile_username, service_name, status, expires_at, created_at, service_id, 
      return_url
    } = paymentRequest;

    // Usando uma sintaxe mais segura para acessar uma propriedade que pode não existir no tipo
    const external_service_id = (paymentRequest as any).external_service_id;
    
    // Formatar resposta
    const response: PaymentResponse = {
      id,
      token: tokenValue,
      amount,
      customer_name,
      customer_email,
      customer_phone,
      instagram_username: profile_username || '',
      service_name: service_name || 'Serviço Instagram',
      service_id: service_id || undefined,
      external_service_id: external_service_id || undefined,
      description: service_name,
      status,
      expires_at,
      created_at,
      posts,
      quantity,
      return_url: return_url || undefined,
      pix_code: paymentRequest.transactions[0]?.pix_code || '',
      qr_code_image: paymentRequest.transactions[0]?.pix_qrcode || '',
      pix_key: '',
      payment: paymentRequest.transactions[0] ? {
        id: paymentRequest.transactions[0].id,
        status: paymentRequest.transactions[0].status,
        method: paymentRequest.transactions[0].method,
        pix_code: paymentRequest.transactions[0].pix_code,
        pix_qrcode: paymentRequest.transactions[0].pix_qrcode,
        amount: paymentRequest.transactions[0].amount
      } : undefined,
      is_approved: isApproved,
      is_expired: isExpired
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao verificar status do pagamento',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
