# Multi-Stage Dockerfile für NestJS Backend

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN npm ci

# Copy source code
COPY backend ./backend
COPY eslint.config.mjs ./
COPY jest.config.ts ./
COPY jest.preset.js ./

# Build the backend application
RUN npm run build:backend

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json for scripts
COPY --chown=nestjs:nodejs package*.json ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/data/images /app/data/config /app/logs && \
    chown -R nestjs:nodejs /app/data /app/logs

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/backend/src/main.js"]