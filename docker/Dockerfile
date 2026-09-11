# Multi-stage Dockerfile for RezeBot
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source code
COPY tsconfig.json tsconfig.web.json ./
COPY src/ ./src/
COPY locales/ ./locales/

# Build
RUN npm run build
RUN npm run build:web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S reze && \
    adduser -S reze -u 1001 -G reze

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-web ./dist-web
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/locales ./locales
COPY --from=builder /app/docker/entrypoint.sh ./

EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node dist/web/health-check.js || exit 1

# Switch to non-root user
USER reze

ENTRYPOINT ["./entrypoint.sh"]
