import Redis from 'ioredis';

// Adicionar valores diretamente como fallback, pois parece que as variáveis de ambiente não estão sendo carregadas
const RAILWAY_REDIS_URL = "redis://default:qhIPmzikZsKVuMMEhDIELyzhCfigYRap@shortline.proxy.rlwy.net:24821";
const RAILWAY_REDIS_HOST = "shortline.proxy.rlwy.net";
const RAILWAY_REDIS_PORT = 24821;
const RAILWAY_REDIS_PASSWORD = "qhIPmzikZsKVuMMEhDIELyzhCfigYRap";

// Conexão com Redis usando variáveis de ambiente com fallback para valores fixos
const redisHost = process.env.REDIS_HOST || RAILWAY_REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || RAILWAY_REDIS_PORT.toString(), 10);
const redisPassword = process.env.REDIS_PASSWORD || RAILWAY_REDIS_PASSWORD;
const redisUrl = process.env.REDIS_URL || RAILWAY_REDIS_URL;

console.log('[REDIS] Informações de configuração:');
console.log(`[REDIS] URL: ${redisUrl.replace(/\/\/.*?:.*?@/, '//***:***@')}`);
console.log(`[REDIS] Host: ${redisHost}`);
console.log(`[REDIS] Porta: ${redisPort}`);
console.log(`[REDIS] Senha configurada: ${redisPassword ? 'Sim' : 'Não'}`);

// Configuração do cliente Redis
let redis: Redis;

// Sempre tentar primeiro a conexão com URL de produção do Railway
try {
  console.log(`[REDIS] Conectando com URL: ${redisUrl.replace(/\/\/.*?:.*?@/, '//***:***@')}`);
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 5,
    connectTimeout: 15000,
    retryStrategy(times) {
      const delay = Math.min(times * 300, 5000);
      console.log(`[REDIS] Tentativa de reconexão ${times}, próxima tentativa em ${delay}ms`);
      return delay;
    }
  });
  console.log('[REDIS] Cliente Redis inicializado com URL');
} catch (error) {
  console.error('[REDIS] Erro ao conectar com URL, tentando com host/port:', error);
  
  // Se falhar com URL, tentar com host/port explícitos
  redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: 5,
    connectTimeout: 15000,
    retryStrategy(times) {
      const delay = Math.min(times * 300, 5000);
      console.log(`[REDIS] Tentativa de reconexão ${times}, próxima tentativa em ${delay}ms`);
      return delay;
    }
  });
  console.log('[REDIS] Cliente Redis inicializado com host/port');
}

// Registro de logs
redis.on('connect', () => {
  console.log('[REDIS] Conexão estabelecida com sucesso');
});

redis.on('error', (err) => {
  console.error('[REDIS] Erro na conexão:', err);
  console.error('[REDIS] Detalhes da configuração:');
  console.error(`[REDIS] URL: ${redisUrl.replace(/\/\/.*?:.*?@/, '//***:***@')}`);
  console.error(`[REDIS] Host: ${redisHost}`);
  console.error(`[REDIS] Porta: ${redisPort}`);
});

redis.on('reconnecting', () => {
  console.log('[REDIS] Tentando reconexão...');
});

// Tenta executar um PING para verificar a conexão
redis.ping().then(() => {
  console.log('[REDIS] Ping bem-sucedido, conexão operacional');
}).catch(err => {
  console.error('[REDIS] Falha no ping, conexão pode estar com problemas:', err);
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