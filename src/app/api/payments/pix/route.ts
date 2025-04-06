import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Simulação de resposta Pix
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
    
    // Criar resposta simulada
    const mockPixPayment = {
      id: crypto.randomUUID(),
      payment_request_id,
      status: 'pending',
      method: 'pix',
      amount: 99.90, // Em uma implementação real, isso viria do payment_request
      pix_code: 'SIMULADO00020126580014BR.GOV.BCB.PIX0136a37095-258b-43b9-a4f1-752d552d99010217Pagamento Simulado5204000053039865802BR5913Viralizamos6008Sao Paulo62150511SIMULACAOPIX63046C12',
      pix_qrcode: 'data:image/png;base64,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',
      created_at: new Date().toISOString()
    };
    
    console.log('Pagamento PIX simulado criado com sucesso');
    
    return NextResponse.json(mockPixPayment);
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento PIX', message: (error as Error).message },
      { status: 500 }
    );
  }
} 