import { PrismaClient } from '@prisma/client';

// Configuração global para mostrar logs em desenvolvimento
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Variável para armazenar a instância do Prisma
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Objeto global para o cliente Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Exportar o cliente Prisma como um singleton
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db; 