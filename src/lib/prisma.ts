import { PrismaClient } from '@prisma/client';

// Log simples para diagnóstico
console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);

// Prisma Client Singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Função simplificada de inicialização
function createPrismaClient() {
  // Usa diretamente a URL fornecida no .env
  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

// Exporta a instância do Prisma
export const db = globalForPrisma.prisma || createPrismaClient();

// Mantém a mesma instância durante hot-reloading em desenvolvimento
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Tenta conectar ao iniciar e mostra erro explícito se falhar
db.$connect()
  .then(() => console.log('✅ Conexão com o banco de dados estabelecida com sucesso!'))
  .catch((error) => {
    console.error('❌ ERRO ao conectar com o banco de dados:', error);
    console.error('Detalhes do ambiente:');
    console.error('NODE_ENV:', process.env.NODE_ENV);
    console.error('DATABASE_URL (parcial):', process.env.DATABASE_URL ? 
      `${process.env.DATABASE_URL.split('://')[0]}://${process.env.DATABASE_URL.split(':')[1]}:****@${process.env.DATABASE_URL.split('@')[1]}` : 
      'não definida');
  }); 