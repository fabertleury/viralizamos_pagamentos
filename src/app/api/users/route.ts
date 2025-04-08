import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

/**
 * Endpoint para listar todos os usuários
 */
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    
    // Paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    
    // Busca por email
    const email = searchParams.get('email');
    
    // Filtro por papel/função
    const role = searchParams.get('role');
    
    // Construir where clause
    const where: Record<string, any> = {};
    
    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive'
      };
    }
    
    if (role) {
      where.role = role;
    }
    
    // Contar total de registros (para paginação)
    const total = await db.user.count({ where });
    
    // Buscar registros com paginação
    const users = await db.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Retornar resultado com metadados de paginação
    return NextResponse.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para criar um novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: email, name' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário já existe
    const existingUser = await db.user.findUnique({
      where: { email: body.email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário com este email já existe' },
        { status: 409 }
      );
    }
    
    // Criar o novo usuário
    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role || 'customer'
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para atualizar um usuário existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.email) {
      return NextResponse.json(
        { error: 'Campo obrigatório: email' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário existe
    const existingUser = await db.user.findUnique({
      where: { email: body.email }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Preparar dados para atualização
    const updateData: Record<string, any> = {};
    
    if (body.name) updateData.name = body.name;
    if (body.role) updateData.role = body.role;
    
    // Atualizar o usuário
    const updatedUser = await db.user.update({
      where: { email: body.email },
      data: updateData
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para excluir um usuário
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Parâmetro obrigatório: email' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário existe
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Excluir o usuário
    await db.user.delete({
      where: { email }
    });
    
    return NextResponse.json({
      success: true,
      message: `Usuário ${email} excluído com sucesso`
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
} 