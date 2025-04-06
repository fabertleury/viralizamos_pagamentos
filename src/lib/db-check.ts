import { db } from './prisma';

// Função para verificar a conexão com o banco de dados
export async function checkDatabaseConnection() {
  try {
    // Tentar uma operação simples no banco de dados
    console.log('Verificando conexão com o banco de dados...');
    
    // Prisma executa um ping no banco de dados
    const result = await db.$queryRaw`SELECT 1 as result`;
    
    console.log('Conexão com o banco de dados estabelecida com sucesso!', result);
    return true;
  } catch (error) {
    console.error('ERRO: Falha ao conectar com o banco de dados:', error);
    
    // Extrair informações sobre a URL do banco de dados para diagnóstico
    // (sem mostrar a senha)
    const dbUrl = process.env.DATABASE_URL || 'não definido';
    let dbInfo = 'não disponível';
    
    if (dbUrl && dbUrl !== 'não definido') {
      try {
        // Parse seguro da URL (sem mostrar credenciais)
        const urlParts = dbUrl.split('://');
        if (urlParts.length >= 2) {
          const protocol = urlParts[0];
          const restParts = urlParts[1].split('@');
          
          if (restParts.length >= 2) {
            const username = restParts[0].split(':')[0];
            const hostAndDbParts = restParts[1].split('/');
            
            if (hostAndDbParts.length >= 2) {
              const host = hostAndDbParts[0];
              const database = hostAndDbParts[1].split('?')[0];
              
              dbInfo = `protocol=${protocol}, user=${username}, host=${host}, database=${database}`;
            } else {
              dbInfo = `protocol=${protocol}, user=${username}, host=${restParts[1]}`;
            }
          } else {
            dbInfo = `protocol=${protocol}, formato inválido após protocolo`;
          }
        } else {
          dbInfo = 'formato de URL inválido (sem protocolo)';
        }
      } catch (e) {
        console.error('Erro ao parsear URL do banco de dados:', e);
        dbInfo = 'erro ao parsear URL: ' + (e instanceof Error ? e.message : String(e));
      }
    }
    
    console.error('Informações de conexão ao banco de dados:', dbInfo);
    
    // Ver se temos variáveis da Railway configuradas
    const hasRailwayEnv = !!process.env.RAILWAY_STATIC_URL;
    console.log('Ambiente Railway detectado:', hasRailwayEnv ? 'SIM' : 'NÃO');
    
    if (hasRailwayEnv) {
      console.log('Railway public domain:', process.env.RAILWAY_PUBLIC_DOMAIN);
      console.log('Railway static URL:', process.env.RAILWAY_STATIC_URL);
    }
    
    return false;
  }
}

// Verificar a conexão com o banco de dados periodicamente
let dbConnectionStatus = false;

// Verificação inicial, se não estiver em teste
if (process.env.NODE_ENV !== 'test') {
  console.log('Iniciando verificação de conexão com o banco de dados...');
  
  checkDatabaseConnection()
    .then(connected => {
      dbConnectionStatus = connected;
      if (!connected && process.env.NODE_ENV === 'production') {
        console.error('ALERTA: Aplicação iniciada sem conexão com o banco de dados em ambiente de produção!');
      }
    })
    .catch(err => {
      console.error('Erro não tratado ao verificar conexão com o banco de dados:', err);
    });
  
  // Verificar a cada 30 segundos em produção
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        const connected = await checkDatabaseConnection();
        
        // Apenas logar se o status mudou
        if (connected !== dbConnectionStatus) {
          if (connected) {
            console.log('Reconexão bem-sucedida com o banco de dados!');
          } else {
            console.error('Conexão com o banco de dados foi perdida!');
          }
          dbConnectionStatus = connected;
        }
      } catch (error) {
        console.error('Erro durante verificação periódica da conexão:', error);
      }
    }, 30 * 1000);
  }
}

// Exportar o status atual da conexão
export function getDatabaseStatus() {
  return dbConnectionStatus;
} 