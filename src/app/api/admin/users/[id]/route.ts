import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyApiKey } from '@/lib/auth';

const prisma = new PrismaClient();

interface Params {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/users/[id]
 * Obter detalhes de um usuário específico
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Verificar autenticação via API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'API Key não fornecida' },
        { status: 401 }
      );
    }

    // Extrair e validar a API Key
    const apiKey = authHeader.replace('ApiKey ', '');
    if (!await verifyApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // Buscar usuário pelo ID
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(`Erro ao buscar usuário ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Atualizar dados de um usuário
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Verificar autenticação via API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'API Key não fornecida' },
        { status: 401 }
      );
    }

    // Extrair e validar a API Key
    const apiKey = authHeader.replace('ApiKey ', '');
    if (!await verifyApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Obter dados do corpo da requisição
    const data = await request.json();
    const { name, role } = data;

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(`Erro ao atualizar usuário ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Excluir um usuário
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // Verificar autenticação via API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'API Key não fornecida' },
        { status: 401 }
      );
    }

    // Extrair e validar a API Key
    const apiKey = authHeader.replace('ApiKey ', '');
    if (!await verifyApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Excluir usuário
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Usuário excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Erro ao excluir usuário ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
} 