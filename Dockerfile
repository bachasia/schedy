# syntax=docker/dockerfile:1.4
# Multi-stage build optimized for speed with BuildKit cache

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Use BuildKit cache mount for npm cache (faster rebuilds)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --prefer-offline --no-fund --silent

# Stage 2: Prisma Generator (separate stage for better caching)
FROM node:20-alpine AS prisma-gen
WORKDIR /app

# Copy only what's needed for Prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY prisma ./prisma

ENV DATABASE_URL="file:./prisma/dev.db"

# Use cache mount for Prisma generation
RUN --mount=type=cache,target=/root/.npm \
    npx prisma generate

# Stage 3: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies and Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma-gen /app/node_modules/.prisma ./node_modules/.prisma

# Copy source code (this layer changes most often)
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_SKIP_TURBO=1

# Build Next.js with cache mount for faster rebuilds
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Stage 4: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user (combine RUN commands to reduce layers)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/prisma

# Copy necessary files in optimal order
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]




