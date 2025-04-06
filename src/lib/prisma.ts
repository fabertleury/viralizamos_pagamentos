import { PrismaClient } from '@prisma/client';

// Logs para diagnósticos
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL presente:', !!process.env.DATABASE_URL);
console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
console.log('PGUSER:', process.env.PGUSER ? 'Definido' : 'Não definido');
console.log('PGDATABASE:', process.env.PGDATABASE);

// Função para inicializar o cliente Prisma com tratamento de erros
function prismaClientSingleton() {
  try {
    // Verifica se temos as configurações corretas do banco de dados
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL não definida. Configuração incorreta do banco de dados.');
      
      // Em desenvolvimento, use uma URL padrão
      if (process.env.NODE_ENV === 'development') {
        process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/viralizamos_pagamentos";
      }
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
  }); 