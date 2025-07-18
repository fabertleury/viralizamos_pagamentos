import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET() {
  try {
    // Verificar conexão com o banco de dados
    await db.$queryRaw`SELECT 1`;

    // Verificar variáveis de ambiente essenciais
    const requiredEnvVars = [
      'DATABASE_URL',
      'EXPAY_MERCHANT_KEY',
      'NEXT_PUBLIC_BASE_URL',
      'JWT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      console.warn('Variáveis de ambiente faltando:', missingEnvVars);
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV,
      missing_env_vars: missingEnvVars,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Erro no healthcheck:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 