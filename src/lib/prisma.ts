import { PrismaClient } from '@prisma/client';

// Logs para diagnósticos
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PGHOST:', process.env.PGHOST);
console.log('DATABASE_CONFIG:', JSON.stringify({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE
}));

// ===== CONFIGURAÇÃO DE CONEXÃO FORÇADA =====
// Em produção na Railway, verificamos se estamos com a URL correta
// ou forçamos a URL correta para a instância PostgreSQL da Railway
if (process.env.NODE_ENV === 'production') {
  const railwayDbUrl = "postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway";
  
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    console.log('⚠️ ATENÇÃO: DATABASE_URL incorreta ou não definida em produção, corrigindo...');
    process.env.DATABASE_URL = railwayDbUrl;
  }
  
  // Log seguro (sem mostrar a senha completa)
  const currentUrl = process.env.DATABASE_URL;
  const maskedUrl = currentUrl.replace(/\/\/([^:]+:)([^@]+)@/, '//***:***@');
  console.log(`ℹ️ [${process.env.NODE_ENV}] Usando DATABASE_URL: ${maskedUrl}`);
} else {
  console.log(`ℹ️ [${process.env.NODE_ENV}] Ambiente de desenvolvimento`);
}

// Função para inicializar o cliente Prisma com tratamento de erros
function prismaClientSingleton() {
  try {
    // Verifica se temos as configurações corretas do banco de dados
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL não definida. Usando conexão padrão para desenvolvimento.');
    }
    
    // Inicializa o cliente Prisma com log em desenvolvimento
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('Erro ao inicializar o cliente Prisma:', error);
    throw error;
  }
}

// Tipo global para o cliente Prisma
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Exporta o cliente Prisma (singleton)
export const db = globalThis.prisma ?? prismaClientSingleton();

// Atribui à variável global em desenvolvimento para evitar múltiplas instâncias
if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;

// Validar a conexão imediatamente
db.$connect()
  .then(() => console.log('✅ Conexão com o banco de dados estabelecida!'))
  .catch(err => {
    console.error('❌ ERRO ao conectar com o banco de dados:', err);
    
    // Em produção, tentar reiniciar com a URL correta
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Tentando reconectar com a URL correta da Railway...');
      process.env.DATABASE_URL = "postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway";
    }
  }); 