# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Use --no-cache and clean npm cache to save space
RUN npm ci --no-audit --prefer-offline --no-fund && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/*

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Disable Turbopack to use webpack (required for Bull compatibility)
ENV NEXT_PRIVATE_SKIP_TURBO=1

# Generate Prisma Client (DATABASE_URL not needed for generate, but required by config)
ENV DATABASE_URL="file:./prisma/dev.db"
RUN npx prisma generate && \
    npm cache clean --force

# Build Next.js application
RUN npm run build && \
    rm -rf /tmp/* /var/tmp/* && \
    npm cache clean --force

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for Prisma CLI
COPY --from=builder /app/package.json ./package.json

# Create database directory with proper permissions
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]




