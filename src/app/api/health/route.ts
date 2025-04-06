import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verificar status da aplicação
    const appStatus = {
      status: 'online',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    };

    // Verificar conexão com o banco de dados
    const dbConnected = await checkDatabaseConnection();

    return NextResponse.json({
      ...appStatus,
      database: {
        connected: dbConnected,
        status: dbConnected ? 'online' : 'offline',
      }
    }, { status: dbConnected ? 200 : 503 });
  } catch (error) {
    console.error('Erro no health check:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error during health check',
        timestamp: new Date().toISOString() 
      }, 
      { status: 500 }
    );
  }
} 