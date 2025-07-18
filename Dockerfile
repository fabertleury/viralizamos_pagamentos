# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variable for Prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_ENV=production

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

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN npm install --production --frozen-lockfile

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 