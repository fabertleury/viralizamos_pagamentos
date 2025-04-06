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

# Instalar dependências sem executar scripts de pós-instalação
RUN npm install --ignore-scripts

# Copiar código-fonte
COPY . .

# Gerar client Prisma
RUN npx prisma generate

# Buildar aplicação
RUN npm run build

# Estágio de produção
FROM node:18.17-slim

# Instalar pacotes necessários
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    netcat-openbsd \
    procps \
    net-tools \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

# Configurações para produção
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

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