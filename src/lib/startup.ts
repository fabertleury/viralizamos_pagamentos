import fs from 'fs';
import path from 'path';
import { initializeQueues } from './queue';

// Função para atualizar o timestamp no arquivo status.json
export function startStatusUpdater() {
  const statusPath = path.join(process.cwd(), 'status.json');
  
  // Função para atualizar o arquivo status.json
  const updateStatusFile = () => {
    const status = {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    console.log(`[Status] Arquivo de status atualizado: ${status.timestamp}`);
  };
  
  // Atualizar o arquivo imediatamente
  updateStatusFile();
  
  // Atualizar o arquivo a cada 5 minutos
  setInterval(updateStatusFile, 5 * 60 * 1000);
}

// Função para inicializar componentes quando o servidor iniciar
export async function initializeServer() {
  console.log('[Startup] Inicializando servidor...');
  
  // Iniciar o sistema de filas
  initializeQueues();
  
  // Iniciar o atualizador de status
  startStatusUpdater();
  
  console.log('[Startup] Inicialização concluída');
} 