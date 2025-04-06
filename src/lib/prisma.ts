import { PrismaClient } from '@prisma/client';

// Log de diagnóstico para ambiente
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL disponível:', !!process.env.DATABASE_URL);
console.log('Variáveis Railway disponíveis:', {
  PGHOST: !!process.env.PGHOST,
  PGPORT: !!process.env.PGPORT,
  PGDATABASE: !!process.env.PGDATABASE,
  PGUSER: !!process.env.PGUSER,
  // Não logamos a senha por segurança
});

// Função para obter URL do banco de dados de forma robusta
function getDatabaseUrl() {
  // 1. Usar DATABASE_URL se estiver disponível
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // 2. Construir a partir das variáveis do Railway
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGPORT && process.env.PGDATABASE) {
    const url = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log('Construindo DATABASE_URL a partir de variáveis do Railway');
    return url;
  }
  
  // 3. Fallback para desenvolvimento local
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Usando URL de banco de dados local para desenvolvimento');
    return 'postgresql://postgres:postgres@localhost:5432/viralizamos_pagamentos';
  }
  
  // 4. Em último caso, tentar a URL hardcoded (não recomendado)
  console.warn('⚠️ ALERTA: Usando URL hardcoded para banco de dados. Isso NÃO é recomendado para produção!');
  return 'postgresql://postgres:postgres@localhost:5432/viralizamos_pagamentos';
}

// Função para inicializar o cliente Prisma com tratamento de erros
function prismaClientSingleton() {
  try {
    const dbUrl = getDatabaseUrl();
    console.log(`Conectando ao banco em: ${dbUrl.split('@')[1] || '[URL mascarada]'}`);
    
    // Inicializa o cliente Prisma com log adequado para o ambiente
    return new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('Erro ao inicializar o cliente Prisma:', error);
    throw error;
  }
}

// Tipos globais para o Prisma
type GlobalWithPrisma = typeof globalThis & {
  prisma?: ReturnType<typeof prismaClientSingleton>;
};

// Evita múltiplas instâncias durante hot-reloading
const globalForPrisma: GlobalWithPrisma = globalThis;

// Exporta a instância do Prisma
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

// Atribui à variável global em desenvolvimento para evitar múltiplas instâncias
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Tenta estabelecer a conexão com o banco imediatamente
db.$connect()
  .then(() => console.log('✅ Conexão com o banco de dados estabelecida com sucesso!'))
  .catch(err => {
    console.error('❌ ERRO ao conectar com o banco de dados:', err);
    console.error('Detalhes da conexão (sem senha):', {
      url: process.env.DATABASE_URL?.split(':').slice(0, 2).join(':') + ':*****@' + process.env.DATABASE_URL?.split('@')[1],
      pgHost: process.env.PGHOST,
      pgPort: process.env.PGPORT,
      pgDatabase: process.env.PGDATABASE,
      pgUser: process.env.PGUSER
    });
  }); 