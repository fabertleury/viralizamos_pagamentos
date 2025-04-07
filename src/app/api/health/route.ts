import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db-check';
import { isRedisConnected } from '@/lib/redis';

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
    
    // Verificar conexão com o Redis
    const redisConnected = isRedisConnected();

    // Informações da DATABASE_URL para diagnóstico (sem mostrar a senha)
    const dbUrl = process.env.DATABASE_URL || 'não definido';
    let dbInfo = null;
    
    if (dbUrl && dbUrl !== 'não definido') {
      try {
        const urlParts = dbUrl.split('://');
        if (urlParts.length >= 2) {
          const protocol = urlParts[0];
          const restParts = urlParts[1].split('@');
          
          if (restParts.length >= 2) {
            const userPart = restParts[0].split(':')[0]; // só usuário, sem senha
            const hostPart = restParts[1].split('/')[0];
            
            dbInfo = `${protocol}://${userPart}:****@${hostPart}/***`;
          }
        }
      } catch (e) {
        dbInfo = 'erro ao processar URL';
      }
    }

    // Status geral de acordo com as conexões
    const allConnected = dbConnected && redisConnected;
    const statusCode = allConnected ? 200 : 503;

    return NextResponse.json({
      ...appStatus,
      database: {
        connected: dbConnected,
        status: dbConnected ? 'online' : 'offline',
        url_info: dbInfo
      },
      redis: {
        connected: redisConnected,
        status: redisConnected ? 'online' : 'offline'
      },
      connections_ok: allConnected
    }, { status: statusCode });
  } catch (error) {
    console.error('Erro no health check:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error during health check',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error)) 
          : undefined
      }, 
      { status: 500 }
    );
  }
} 