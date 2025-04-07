import Redis from 'ioredis';

// Conexão com Redis usando a string de conexão do ambiente
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configuração do cliente Redis
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Registro de logs
redis.on('connect', () => {
  console.log('Redis conectado com sucesso');
});

redis.on('error', (err) => {
  console.error('Erro na conexão com Redis:', err);
});

redis.on('reconnecting', () => {
  console.log('Reconectando ao Redis...');
});

// Exportação do cliente Redis
export default redis;

// Função para verificar se o Redis está conectado
export const isRedisConnected = (): boolean => {
  return redis.status === 'ready';
};

// Função para fechar a conexão com o Redis
export const closeRedisConnection = async (): Promise<void> => {
  await redis.quit();
  console.log('Conexão com Redis encerrada');
}; 