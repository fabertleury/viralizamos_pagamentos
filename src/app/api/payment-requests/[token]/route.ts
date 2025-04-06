import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Armazenamento de pagamentos simulados em memória (em produção seria um banco)
// Isso é apenas para teste e vai resetar quando a aplicação reiniciar
const mockPayments = new Map();

// Função para gerar dados simulados de um pagamento
function generateMockPayment(token: string) {
  const paymentId = crypto.randomUUID();
  
  return {
    id: crypto.randomUUID(),
    token: token,
    amount: 99.90,
    description: 'Serviço de Viralizamos',
    status: 'pending',
    payer_name: 'Cliente Teste',
    payer_email: 'cliente@teste.com',
    payer_phone: '+5511999999999',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    console.log(`Buscando pagamento com token: ${token}`);
    
    // Verificar se temos o pagamento em cache
    let paymentRequest = mockPayments.get(token);
    
    // Se não existe, criar um simulado
    if (!paymentRequest) {
      paymentRequest = generateMockPayment(token);
      mockPayments.set(token, paymentRequest);
      console.log(`Gerado pagamento simulado para token: ${token}`);
    }
    
    // Adicionar dados do pagamento se não existir
    if (request.url.includes('?withPayment=true') && !paymentRequest.payment) {
      paymentRequest.payment = {
        id: crypto.randomUUID(),
        status: 'pending',
        method: 'pix',
        pix_code: 'mockpixcode123456789qwertyuiopasd',
        pix_qrcode: 'mockpixqrcode123456789qwertyuiopasd',
        amount: paymentRequest.amount
      };
    }
    
    return NextResponse.json(paymentRequest);
  } catch (error) {
    console.error('Erro ao buscar pagamento por token:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pagamento', message: (error as Error).message },
      { status: 500 }
    );
  }
} 