import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyApiKey } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/admin/users
 * Lista de usuários para painel administrativo
 */
export async function GET(request: NextRequest) {
  try {
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

    // Parâmetros de paginação e busca
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || undefined;
    
    // Calcular offset para paginação
    const skip = (page - 1) * limit;

    // Preparar filtros
    let whereClause: any = {};

    // Filtrar por tipo de usuário (role)
    if (role) {
      whereClause.role = role;
    }

    // Nota: filtro por status (ativo/inativo) foi removido pois a coluna não existe no banco

    // Filtrar por termo de busca
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Buscar usuários
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    // Contar total para paginação
    const total = await prisma.user.count({
      where: whereClause,
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Criar novo usuário
 */
export async function POST(request: NextRequest) {
  try {
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

    // Obter dados do corpo da requisição
    const data = await request.json();
    const { email, name, role, phone } = data;

    // Validar dados
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe usuário com o mesmo email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 409 }
      );
    }

    // Criar novo usuário
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'user',
        phone,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
} 