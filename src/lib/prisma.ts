import { PrismaClient } from '@prisma/client';

// Evitar múltiplas instâncias do Prisma durante hot reloading no desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db; 