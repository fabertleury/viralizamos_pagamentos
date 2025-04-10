import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token não fornecido' },
      { status: 400 }
    );
  }

  try {
    // Obter os dados do request
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status não fornecido' },
        { status: 400 }
      );
    }

    console.log(`[API] Atualizando status do pedido ${token} para ${status}`);

    // Verificar se o pedido existe
    const existingPaymentRequest = await db.paymentRequest.findUnique({
      where: { token },
    });

    if (!existingPaymentRequest) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Validar o status
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Atualizar o status do pedido
    const updatedPaymentRequest = await db.paymentRequest.update({
      where: { token },
      data: { 
        status,
        updated_at: new Date()
      },
    });

    // Revalidar a página de detalhes do pedido
    revalidatePath(`/acompanhar/${token}`);
    revalidatePath('/acompanhar');

    console.log(`[API] Pedido ${token} atualizado com sucesso para ${status}`);

    return NextResponse.json({
      success: true,
      paymentRequest: updatedPaymentRequest
    });
  } catch (error) {
    console.error('[API] Erro ao atualizar status do pedido:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 