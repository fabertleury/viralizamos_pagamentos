# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variable for Prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_ENV=production

# Install dependencies required for Prisma
RUN apk add --no-cache openssl1.1-compat libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Clean install dependencies
RUN npm install --production=false --frozen-lockfile

# Generate Prisma Client
RUN npx prisma generate

# Copy rest of the application
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables for production
ENV NODE_ENV=production
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_BINARY_TARGET="linux-musl"

# Install dependencies required for Prisma in production
RUN apk add --no-cache openssl1.1-compat libc6-compat

# Copy necessary files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Regenerate Prisma Client for the current environment
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 