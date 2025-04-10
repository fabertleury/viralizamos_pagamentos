import { NextRequest, NextResponse } from 'next/server';
import { getQueue } from '@/lib/queue';
import { isRedisConnected } from '@/lib/redis';
import { checkApiKey } from '@/lib/auth';

// Interface para jobs
interface JobData {
  id: string;
  data: any;
  finishedOn?: number;
  failedReason?: string;
  attemptsMade: number;
}

// Interface para jobs recentes
interface RecentJob {
  id: string;
  status: string;
  data: any;
  processedAt: string | null;
  attempts: number;
}

// Endpoint para verificar o status das filas (para monitoramento)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const isAuthorized = await checkApiKey(request);
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Acesso não autorizado' 
      }, { status: 401 });
    }

    // Verificar status do Redis
    const redisConnected = isRedisConnected();
    
    // Obter a fila de processamento
    const paymentQueue = getQueue('payment-processing');
    let queueStatus = 'error';
    let stats = {
      waiting: 0,
      active: 0, 
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0
    };
    // Inicializar array vazio com o tipo correto
    const recentJobs: RecentJob[] = [];

    if (paymentQueue) {
      try {
        // Verificar status da fila
        const isPaused = await paymentQueue.isPaused();
        queueStatus = isPaused ? 'paused' : 'active';
        
        // Obter estatísticas da fila
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          paymentQueue.getWaitingCount(),
          paymentQueue.getActiveCount(),
          paymentQueue.getCompletedCount(),
          paymentQueue.getFailedCount(),
          paymentQueue.getDelayedCount()
        ]);
        
        stats = {
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: isPaused ? 1 : 0
        };
        
        // Obter jobs recentes
        const completedJobs = await paymentQueue.getCompleted(0, 5);
        const failedJobs = await paymentQueue.getFailed(0, 3);
        const activeJobs = await paymentQueue.getActive(0, 2);
        
        // Processar todos os jobs e adicionar ao array com tipagem correta
        [...completedJobs, ...failedJobs, ...activeJobs].forEach(job => {
          // Converter o ID para string se for número
          const jobId = typeof job.id === 'number' ? job.id.toString() : job.id;
          
          recentJobs.push({
            id: jobId,
            status: job.finishedOn ? (job.failedReason ? 'failed' : 'completed') : 'active',
            data: job.data,
            processedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
            attempts: job.attemptsMade
          });
        });
      } catch (error) {
        console.error('Erro ao obter estatísticas da fila:', error);
        queueStatus = 'error';
      }
    }
    
    // Retornar resultado
    return NextResponse.json({
      success: true,
      redis: {
        status: redisConnected ? 'online' : 'offline'
      },
      status: queueStatus,
      stats,
      recentJobs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar status das filas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status das filas',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 