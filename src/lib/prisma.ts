import { PrismaClient } from '@prisma/client';

// Log para diagnóstico
console.log('Ambiente de execução:', process.env.NODE_ENV);
console.log('Tentando conectar ao banco de dados...');

// Verificar variável de conexão
const databaseUrlInfo = process.env.DATABASE_URL 
  ? `Protocolo: ${process.env.DATABASE_URL.split('://')[0]}, Host: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'não identificado'}`
  : 'DATABASE_URL não definida';
console.log('Informações de conexão:', databaseUrlInfo);

// Configurações do Prisma com melhor tratamento de erro
const prismaClientSingleton = () => {
  try {
    // Em produção, a variável DATABASE_URL deve estar configurada pela Railway
    if (!process.env.DATABASE_URL) {
      console.error('ERRO CRÍTICO: DATABASE_URL não está definida no ambiente');
      
      // Em desenvolvimento, podemos usar um fallback
      if (process.env.NODE_ENV === 'development') {
        const fallbackUrl = "postgresql://postgres:postgres@localhost:5432/viralizamos_pagamentos";
        console.log('Ambiente de desenvolvimento detectado, usando URL de fallback:', fallbackUrl);
        process.env.DATABASE_URL = fallbackUrl;
      } else {
        throw new Error('DATABASE_URL não configurada corretamente no ambiente ' + process.env.NODE_ENV);
      }
    }
    
    // Criar cliente com configurações adequadas para o ambiente
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty',
    });
  } catch (error) {
    console.error('Erro fatal ao inicializar o Prisma Client:', error);
    // Em produção, lançamos o erro para o sistema de logs capturar
    throw error;
  }
};

// Tipo global para o Prisma
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Evitar múltiplas instâncias do Prisma durante hot reloading no desenvolvimento
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Exportar o cliente do Prisma
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db; 