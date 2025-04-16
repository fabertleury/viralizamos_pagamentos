import Redis from 'ioredis';

// Conexão com Redis usando variáveis de ambiente individuais para maior flexibilidade
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';
const redisUrl = process.env.REDIS_URL;

// Configuração do cliente Redis
let redis: Redis;

// Priorizar a conexão por host/port/password, mas usar URL como fallback
if (redisHost && redisPort) {
  redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });
  console.log(`[REDIS] Conectando com host: ${redisHost}, porta: ${redisPort}`);
} else if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });
  console.log(`[REDIS] Conectando com URL: ${redisUrl}`);
} else {
  // Fallback para conexão local
  redis = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });
  console.log('[REDIS] Conectando com configuração local (fallback)');
}

// Registro de logs
redis.on('connect', () => {
  console.log('[REDIS] Conexão estabelecida com sucesso');
});

redis.on('error', (err) => {
  console.error('[REDIS] Erro na conexão:', err);
});

redis.on('reconnecting', () => {
  console.log('[REDIS] Tentando reconexão...');
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
  console.log('[REDIS] Conexão encerrada');
}; 