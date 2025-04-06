import { PrismaClient } from '@prisma/client';

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

// Configurações do Prisma
const prismaClientSingleton = () => {
  try {
    // Em ambiente de desenvolvimento, pode usar um fallback
    if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
      console.log('⚠️ DATABASE_URL não definida em desenvolvimento, usando fallback');
      process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/viralizamos_pagamentos";
    }
    
    // Em produção, DATABASE_URL deve estar definida corretamente
    if (!process.env.DATABASE_URL) {
      throw new Error(`DATABASE_URL não está definida no ambiente ${process.env.NODE_ENV}`);
    }
    
    // Validação adicional para produção
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL.includes('localhost')) {
      throw new Error('DATABASE_URL está apontando para localhost em ambiente de produção');
    }
    
    console.log('🔌 Inicializando conexão com o banco de dados...');
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
  } catch (error) {
    console.error('❌ ERRO FATAL ao inicializar Prisma Client:', error);
    throw error;
  }
};

// Tipo global para o Prisma
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Variável global para evitar múltiplas instâncias em desenvolvimento
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Exportar o cliente do Prisma
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

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