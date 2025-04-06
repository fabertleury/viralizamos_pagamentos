import { db } from './prisma';

// Função para verificar a conexão com o banco de dados
export async function checkDatabaseConnection() {
  try {
    // Tentar uma operação simples no banco de dados
    console.log('Verificando conexão com o banco de dados...');
    
    // Prisma executa um ping no banco de dados
    await db.$queryRaw`SELECT 1 as result`;
    
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    
    // Extrair informações sobre a URL do banco de dados para diagnóstico
    // (sem mostrar a senha)
    const dbUrl = process.env.DATABASE_URL || 'não definido';
    let dbInfo = 'não disponível';
    
    if (dbUrl && dbUrl !== 'não definido') {
      try {
        const urlParts = dbUrl.split('://')[1].split('@');
        const credentialPart = urlParts[0].split(':');
        const username = credentialPart[0];
        const hostPart = urlParts[1].split('/');
        const host = hostPart[0];
        const database = hostPart[1].split('?')[0];
        
        dbInfo = `user=${username}, host=${host}, database=${database}`;
      } catch (e) {
        dbInfo = 'erro ao parsear URL';
      }
    }
    
    console.error('Informações do banco de dados:', dbInfo);
    return false;
  }
}

// Verificar a conexão com o banco de dados na inicialização, se não estiver em teste
if (process.env.NODE_ENV !== 'test') {
  checkDatabaseConnection()
    .then(connected => {
      if (!connected && process.env.NODE_ENV === 'production') {
        console.error('ALERTA: Aplicação iniciada sem conexão com o banco de dados em ambiente de produção!');
      }
    })
    .catch(err => {
      console.error('Erro ao verificar conexão com o banco de dados:', err);
    });
} 