import Redis from 'ioredis';

// Conexão com Redis usando variáveis de ambiente
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';
const redisUrl = process.env.REDIS_URL || '';

// Configuração do cliente Redis
let redis: Redis;

// Priorizar a conexão por URL, que inclui todas as informações necessárias
if (redisUrl && redisUrl.trim() !== '') {
  console.log(`[REDIS] Conectando com URL: ${redisUrl.replace(/\/\/.*?:.*?@/, '//***:***@')}`); // Ocultando credenciais no log
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(`[REDIS] Tentativa de reconexão ${times}, próxima tentativa em ${delay}ms`);
      return delay;
    }
  });
} 
// Se não tiver URL, mas tiver host e porta configurados
else if (redisHost && redisHost !== 'localhost' && redisPort && redisPort !== 6379) {
  console.log(`[REDIS] Conectando com host: ${redisHost}, porta: ${redisPort}`);
  redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(`[REDIS] Tentativa de reconexão ${times}, próxima tentativa em ${delay}ms`);
      return delay;
    }
  });
} 
// Fallback para conexão local apenas em desenvolvimento
else {
  console.log('[REDIS] Conectando com configuração local (fallback)');
  redis = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      console.log(`[REDIS] Tentativa de reconexão ${times}, próxima tentativa em ${delay}ms`);
      return delay;
    }
  });
}

// Registro de logs
redis.on('connect', () => {
  console.log('[REDIS] Conexão estabelecida com sucesso');
});

redis.on('error', (err) => {
  console.error('[REDIS] Erro na conexão:', err);
  console.error('[REDIS] Detalhes da configuração:');
  console.error(`[REDIS] URL definida: ${redisUrl ? 'Sim' : 'Não'}`);
  console.error(`[REDIS] Host definido: ${redisHost !== 'localhost' ? 'Sim' : 'Não'}`);
  console.error(`[REDIS] Porta definida: ${redisPort !== 6379 ? 'Sim' : 'Não'}`);
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