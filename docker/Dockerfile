# =============================================================================
# Local Lead AI — Multi-stage Production Dockerfile
# Base: node:20-alpine
# =============================================================================

# Stage 1: Install dependencies
# We install deps in a separate stage to cache them independently from source.
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only lockfile + package.json first (Docker cache layer)
COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps needed for build)
RUN npm ci --legacy-peer-deps

# =============================================================================

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Environment variables needed at build time (non-secret, public vars only)
# These will be baked into the client bundle.
# Secret vars (API keys) are passed at runtime via env_file / environment.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
RUN npm run build

# =============================================================================

# Stage 3: Production runner — minimal image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone Next.js server output.
# next.config must have output: 'standalone' OR we copy the full .next build.
# Since we don't force standalone (to keep compatibility), copy full build:
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Expose the port Next.js listens on
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Switch to non-root user
USER nextjs

# Health check — verifies the app is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the Next.js server
CMD ["node", "server.js"]
