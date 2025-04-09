import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/prisma';

/**
 * Endpoint para gerar tokens JWT temporários para pagamentos.
 * Este token só será válido para um pagamento específico.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.payment_request_id) {
      return NextResponse.json(
        { error: 'ID da solicitação de pagamento não fornecido' },
        { status: 400 }
      );
    }
    
    // Verificar se a solicitação de pagamento existe
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { id: body.payment_request_id }
    });
    
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Solicitação de pagamento não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se a solicitação já está em um estado final
    if (['completed', 'failed', 'cancelled', 'expired'].includes(paymentRequest.status)) {
      return NextResponse.json(
        { error: `Esta solicitação de pagamento já está ${paymentRequest.status}` },
        { status: 400 }
      );
    }
    
    // Verificar se existe uma transação para este pagamento
    const existingTransaction = await db.transaction.findFirst({
      where: { payment_request_id: body.payment_request_id }
    });
    
    if (existingTransaction) {
      // Se já existe uma transação, retornar um token que só permite consulta
      const token = jwt.sign(
        { 
          payment_request_id: body.payment_request_id,
          scope: 'read',
          exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutos
        },
        process.env.JWT_SECRET || 'jwt_fallback_secret_key'
      );
      
      return NextResponse.json({ token });
    }
    
    // Gerar um token JWT válido por 15 minutos
    const token = jwt.sign(
      { 
        payment_request_id: body.payment_request_id,
        scope: 'write',
        exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutos
      },
      process.env.JWT_SECRET || 'jwt_fallback_secret_key'
    );
    
    return NextResponse.json({ token });
    
  } catch (error) {
    console.error('Erro ao gerar token de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar token de pagamento' },
      { status: 500 }
    );
  }
} 