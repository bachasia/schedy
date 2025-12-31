# syntax=docker/dockerfile:1.4
# Multi-stage build optimized for speed with BuildKit cache

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Use BuildKit cache mount for npm cache (faster rebuilds)
# Clean npm cache after install to reduce image size
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --prefer-offline --no-fund --silent && \
    npm cache clean --force

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
# NODE_OPTIONS will be set via build arg to allow override
# Reduced to 512MB for VPS with 4GB RAM (can be overridden via build arg)
ARG NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_OPTIONS=${NODE_OPTIONS}
# Additional environment variables to reduce memory usage
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_SKIP_TURBO=1
ENV CI=true
# Reduce webpack memory usage
ENV WEBPACK_MEMORY_LIMIT=256
# Disable source maps to save memory
ENV GENERATE_SOURCEMAP=false
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Stage 4: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add labels for better image management
LABEL maintainer="Schedy Team"
LABEL description="Schedy - Social Media Scheduling Application"
LABEL version="1.0.0"

# Create non-root user (combine RUN commands to reduce layers)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/prisma

# Install curl and su-exec for healthcheck and user switching
RUN apk add --no-cache curl su-exec

# Copy necessary files in optimal order
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install Prisma CLI for migrations (use specific version to avoid Prisma 7)
# Install without npm prefix to ensure it's in PATH
USER root
RUN npm install -g prisma@6.3.1 --force && \
    which prisma && \
    prisma --version

# Copy entrypoint script
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3100

ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3100/api/health || exit 1

# Use entrypoint to fix permissions
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["node", "server.js"]







