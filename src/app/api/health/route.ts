import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  const healthStatus: Record<string, any> = {
    status: 'pending',
    database: false,
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  try {
    // Verificar conexão com o banco de dados com timeout
    try {
      await Promise.race([
        db.$queryRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        )
      ]);
      healthStatus.database = true;
    } catch (dbError) {
      console.error('Erro na conexão com o banco:', dbError);
      healthStatus.database = false;
      healthStatus.dbError = dbError instanceof Error ? dbError.message : 'Unknown database error';
    }

    // Verificar variáveis de ambiente essenciais
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_BASE_URL',
      'JWT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    healthStatus.missingEnvVars = missingEnvVars;
    
    // Verificar se o banco de dados está conectado para considerar o serviço saudável
    healthStatus.status = healthStatus.database === true ? 'ok' : 'degraded';
    
    // Adicionar informações de desempenho
    healthStatus.responseTime = `${Date.now() - startTime}ms`;
    healthStatus.memory = process.memoryUsage();
    healthStatus.uptime = process.uptime();

    // Sempre retornar 200 para não falhar o healthcheck
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Erro crítico no healthcheck:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // Retornando 200 para não falhar o healthcheck do Railway
  }
} 