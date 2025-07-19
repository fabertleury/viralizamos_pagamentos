import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar transações pelo email
    const transactions = await prisma.transaction.findMany({
      where: {
        customer_email: email
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 50 // Limitar a 50 resultados
    });

    return NextResponse.json({
      success: true,
      email,
      count: transactions.length,
      transactions
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 