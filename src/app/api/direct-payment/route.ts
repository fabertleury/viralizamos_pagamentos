import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { generateToken } from '@/lib/token';

/**
 * API para processar solicitação de pagamento direto vinda do site principal
 * Esta rota é projetada para ser chamada diretamente, contornando possíveis problemas de CORS
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Dados recebidos na API de direct-payment:', data);
    
    // Extrair dados necessários para criar a solicitação de pagamento
    const { 
      amount,
      service_id,
      external_service_id,
      profile_username,
      customer_email,
      customer_name,
      customer_phone,
      service_name,
      additional_data
    } = data;
    
    // Validar dados mínimos necessários
    if (!amount || !customer_email || !customer_name) {
      return NextResponse.json({ 
        error: 'Dados insuficientes para criar solicitação de pagamento' 
      }, { status: 400 });
    }
    
    // Gerar token único para esta solicitação
    const token = generateToken();
    
    // Criar solicitação de pagamento no banco de dados
    const paymentRequest = await db.paymentRequest.create({
      data: {
        token,
        amount: parseFloat(amount),
        service_id: service_id || null,
        external_service_id: external_service_id || null,
        profile_username: profile_username || null,
        customer_email,
        customer_name,
        customer_phone: customer_phone || null,
        service_name: service_name || 'Serviço Viralizamos',
        status: 'pending',
        additional_data: additional_data ? JSON.stringify(additional_data) : null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas para expirar
      }
    });
    
    console.log('Solicitação de pagamento criada com sucesso:', {
      id: paymentRequest.id,
      token: paymentRequest.token
    });
    
    // Gerar URL de pagamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pagamentos.viralizamos.com';
    const paymentUrl = `${baseUrl}/pagamento/${token}`;
    
    return NextResponse.json({
      success: true,
      payment_request_id: paymentRequest.id,
      token: paymentRequest.token,
      payment_url: paymentUrl,
      expires_at: paymentRequest.expires_at
    });
  } catch (error) {
    console.error('Erro ao processar direct-payment:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao processar a solicitação de pagamento' 
    }, { status: 500 });
  }
}

/**
 * Endpoint para validar se o serviço está operando corretamente
 */
export async function GET() {
  return NextResponse.json({
    status: 'Serviço operacional',
    timestamp: new Date().toISOString()
  });
} 