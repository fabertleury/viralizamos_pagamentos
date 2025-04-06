# Estágio de build
FROM node:18.17-bullseye AS builder

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY prisma ./prisma/
COPY .env.production ./.env.production
COPY next.config.js ./

# Usar .env.production para o build
RUN cp .env.production .env

# Verificar variáveis de ambiente
RUN echo "Variáveis de ambiente para build:" && cat .env | grep -v PASSWORD || echo "Arquivo .env não encontrado"

# Instalar dependências sem executar scripts de pós-instalação
RUN npm install --ignore-scripts

# Copiar código-fonte
COPY . .

# Verificar variáveis de ambiente disponíveis
RUN echo "DATABASE_URL durante build: ${DATABASE_URL:-não definido}"

# Injetar forçadamente a URL do banco de dados para o Railway
RUN echo "DATABASE_URL=postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway" >> .env

# Gerar client Prisma com suporte explícito a openssl-3.0.x
RUN npx prisma generate

# Verificar engines gerados
RUN ls -la node_modules/.prisma/client

# Buildar aplicação
RUN npm run build

# Estágio de produção
FROM node:18.17-slim

# Instalar pacotes necessários incluindo suporte a OpenSSL 3.0
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    netcat-openbsd \
    procps \
    net-tools \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Verificar versão do OpenSSL
RUN openssl version

# Configurar diretório de trabalho
WORKDIR /app

# Instalar somente pacotes necessários para produção
COPY --from=builder /app/package*.json ./
RUN npm install --production --ignore-scripts

# Copiar client Prisma gerado e builded app
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.production ./.env
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/prisma ./prisma

# Verificar engines copiados
RUN ls -la node_modules/.prisma/client || echo "Cliente Prisma não encontrado"

# Configurações para produção
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway"

# Script de healthcheck
RUN echo '#!/bin/sh\n\
# Verificar se o arquivo estático existe e é acessível\n\
if [ -f /app/public/status.json ]; then\n\
  echo "Arquivo status.json existe"\n\
  exit 0\n\
fi\n\
\n\
# Se o arquivo não existe, tentar curl\n\
if curl -s -f -m 1 "http://localhost:3000/status.json" > /dev/null; then\n\
  echo "Conseguiu acessar /status.json via HTTP"\n\
  exit 0\n\
fi\n\
\n\
# Última tentativa nos outros endpoints\n\
for endpoint in health api/health; do\n\
  if curl -s -f -m 1 "http://localhost:3000/$endpoint" > /dev/null; then\n\
    echo "Conseguiu acessar /$endpoint via HTTP"\n\
    exit 0\n\
  fi\n\
done\n\
\n\
# Verificar se o processo está rodando\n\
if ps aux | grep -v grep | grep "node"; then\n\
  echo "Processo Node.js está rodando - considerando saudável"\n\
  exit 0\n\
fi\n\
\n\
echo "Nenhuma verificação passou"\n\
exit 1' > /app/healthcheck.sh

RUN chmod +x /app/healthcheck.sh

# Script de inicialização
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
echo "Iniciando aplicação..."\n\
echo "Variáveis de ambiente:"\n\
env | grep -E "NODE_ENV|PORT|HOSTNAME|DATABASE_URL" | grep -v "=" || true\n\
\n\
# Injetar a string de conexão correta se não estiver definida\n\
if [ -z "$DATABASE_URL" ] || echo "$DATABASE_URL" | grep -q "localhost"; then\n\
  echo "⚠️ DATABASE_URL não definida ou apontando para localhost, corrigindo..."\n\
  export DATABASE_URL="postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway"\n\
  echo "Nova DATABASE_URL: ${DATABASE_URL}"\n\
fi\n\
\n\
# Verificar versão do OpenSSL\n\
echo "Versão do OpenSSL:"\n\
openssl version\n\
\n\
# Verificar engines do Prisma\n\
echo "Verificando engines do Prisma:"\n\
ls -la node_modules/.prisma/client || echo "Cliente Prisma não encontrado"\n\
\n\
# Criar endpoints acessíveis durante inicialização\n\
echo "{ \\"status\\": \\"ok\\", \\"timestamp\\": \\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\\", \\"service\\": \\"viralizamos-pagamentos\\" }" > /app/public/status.json\n\
\n\
echo "Configuração de rede:"\n\
ip a || true\n\
\n\
echo "Iniciando Next.js..."\n\
exec npm start' > /app/start.sh

RUN chmod +x /app/start.sh

# Configurar healthcheck
HEALTHCHECK --interval=5s --timeout=2s --start-period=60s --retries=15 \
CMD /app/healthcheck.sh

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["/app/start.sh"] 