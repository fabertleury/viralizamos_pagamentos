import { PrismaClient } from '@prisma/client';

// Logs para diagnóstico
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Verificar se a DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error('ERRO CRÍTICO: DATABASE_URL não está definida no ambiente!');
  // Não lançamos erro para evitar falha na inicialização, mas logamos o problema
}

// Configuração do cliente Prisma
const prismaClientSingleton = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error']
    });
  } catch (error) {
    console.error('Erro ao criar cliente Prisma:', error);
    throw error;
  }
};

// Tipo do cliente Prisma
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Gestão do cliente no contexto global
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Cliente Prisma (reutilizando se já existir no contexto global)
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

// Em ambiente de desenvolvimento, criamos um novo cliente a cada requisição
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
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

// Testar conexão ao inicializar
testConnection(db).catch(console.error);

export default db; 