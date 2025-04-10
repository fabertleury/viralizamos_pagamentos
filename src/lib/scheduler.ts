import axios from 'axios';
import cron from 'node-cron';

let queueProcessingTask: cron.ScheduledTask | null = null;
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
 * Inicia o agendador de tarefas
 */
export function startScheduler() {
  console.log('[Scheduler] AVISO: O processamento periódico da fila foi desativado.');
  console.log('[Scheduler] O processamento agora é feito diretamente pelo webhook do Mercado Pago via Redis.');
  console.log('[Scheduler] Não é mais necessário o uso de tarefas agendadas para processar a fila.');
  
  return; // Retornar imediatamente, não iniciar nenhuma tarefa

  // Código removido para evitar problemas de sintaxe
}

/**
 * Para todas as tarefas agendadas
 */
export function stopScheduler() {
  console.log('[Scheduler] Não há tarefas agendadas para parar. O processamento periódico foi desativado.');
  
  if (queueProcessingTask) {
    queueProcessingTask.stop();
    queueProcessingTask = null;
  }
} 