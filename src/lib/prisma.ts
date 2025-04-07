import { PrismaClient } from '@prisma/client';

// Logs para diagnóstico
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Função para criar uma instância do cliente Prisma com retry
function createPrismaClient() {
  const client = new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Adicionar middleware para logging e retry
  client.$use(async (params, next) => {
    const before = Date.now();
    let retries = 3;

    while (retries > 0) {
      try {
        const result = await next(params);
        const after = Date.now();
        console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
        return result;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw error;
        
        console.error(`Error in Prisma query (${retries} retries left):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1s antes de tentar novamente
      }
    }
  });

  return client;
}

// Verificar conexão com o banco
async function testConnection(client: PrismaClient) {
  try {
    await client.$connect();
    console.log('Successfully connected to the database');
    
    // Testar uma query simples
    const count = await client.paymentRequest.count();
    console.log(`Database has ${count} payment requests`);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    return false;
  }
}

// Criar e exportar o cliente
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Testar conexão ao inicializar
testConnection(db).catch(console.error);

export default db; 