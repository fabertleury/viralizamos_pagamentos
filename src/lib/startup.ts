import fs from 'fs';
import path from 'path';

// Função para atualizar o timestamp no arquivo status.json
export function updateStatusFile() {
  try {
    const statusFilePath = path.join(process.cwd(), 'public', 'status.json');
    
    // Verificar se o arquivo existe
    if (fs.existsSync(statusFilePath)) {
      // Ler o conteúdo atual
      const statusContent = fs.readFileSync(statusFilePath, 'utf8');
      const statusData = JSON.parse(statusContent);
      
      // Atualizar o timestamp
      statusData.timestamp = new Date().toISOString();
      
      // Escrever o arquivo atualizado
      fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2));
      console.log('Arquivo status.json atualizado com sucesso');
    } else {
      console.warn('Arquivo status.json não encontrado em', statusFilePath);
    }
  } catch (error) {
    console.error('Erro ao atualizar o arquivo status.json:', error);
  }
}

// Executar na inicialização se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
  updateStatusFile();
  
  // Atualizar o arquivo a cada 5 minutos
  setInterval(updateStatusFile, 5 * 60 * 1000);
} 