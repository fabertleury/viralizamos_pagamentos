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

# URL do banco de dados explícita para garantir que estará disponível durante o build
ENV DATABASE_URL="postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway"

# Instalar dependências sem executar scripts de pós-instalação
RUN npm install --ignore-scripts

# Copiar código-fonte
COPY . .

# Injetar URL do banco de dados no arquivo .env
RUN echo "DATABASE_URL=\"postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway\"" > .env

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
    openssl \
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
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/prisma ./prisma

# Criar arquivo .env com configurações de produção
RUN echo "NODE_ENV=production" > .env && \
    echo "DATABASE_URL=\"postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway\"" >> .env && \
    echo "PORT=3000" >> .env && \
    echo "HOSTNAME=\"0.0.0.0\"" >> .env

# Configurações para produção como variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway"

# Criar arquivo de status para healthcheck
RUN mkdir -p /app/public && \
    echo '{"status":"ok","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > /app/public/status.json

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"] 