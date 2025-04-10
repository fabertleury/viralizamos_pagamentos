import axios from 'axios';
// Removida a importação do node-cron, pois não é mais utilizado

/**
 * AVISO: Este arquivo está completamente depreciado.
 * O processamento da fila agora é feito diretamente via Redis/Bull através dos webhooks.
 * Este arquivo é mantido apenas por referência histórica.
 * 
 * Para verificar a implementação atual, consulte:
 * - /src/lib/queue/index.ts (processamento via Bull/Redis)
 * - /src/app/api/webhooks/payment-approved/route.ts (endpoint que enfileira pagamentos)
 * - /src/app/api/webhooks/mercadopago/route.ts (webhook do Mercado Pago)
 */

// Variável mantida apenas para compatibilidade de tipagem
let queueProcessingTask: any = null;
let isProcessing = false;

/**
 * Processa a fila de pagamentos pendentes (DEPRECIADO)
 * Esta função está mantida apenas por compatibilidade, mas foi substituída pelo
 * processamento direto via Redis através do webhook do Mercado Pago
 */
async function processQueue() {
  console.log('[Scheduler] AVISO: Esta função está depreciada. O processamento agora é feito diretamente via Redis pelo webhook.');
  return;

  // Código removido para evitar problemas de sintaxe
}

/**
 * Inicia o agendador de tarefas (DEPRECIADO)
 * Esta função está mantida apenas por compatibilidade
 */
export function startScheduler() {
  console.log('[Scheduler] AVISO: O processamento periódico da fila foi desativado.');
  console.log('[Scheduler] O processamento agora é feito diretamente pelo webhook do Mercado Pago via Redis.');
  console.log('[Scheduler] Não é mais necessário o uso de tarefas agendadas para processar a fila.');
  
  return; // Retornar imediatamente, não iniciar nenhuma tarefa

  // Código removido para evitar problemas de sintaxe
}

/**
 * Para todas as tarefas agendadas (DEPRECIADO)
 * Esta função está mantida apenas por compatibilidade
 */
export function stopScheduler() {
  console.log('[Scheduler] Não há tarefas agendadas para parar. O processamento periódico foi desativado.');
  
  if (queueProcessingTask) {
    // Não faz nada agora, pois queueProcessingTask não é mais um objeto cron
    queueProcessingTask = null;
  }
} 