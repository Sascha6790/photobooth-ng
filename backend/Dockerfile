# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY backend ./backend
COPY libs ./libs

# Build the backend
RUN npx nx build backend --configuration=production

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    vips \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application
COPY --chown=nodejs:nodejs --from=builder /app/dist/backend ./dist
COPY --chown=nodejs:nodejs --from=builder /app/backend/src/assets ./assets

# Create necessary directories
RUN mkdir -p uploads backups logs && \
    chown -R nodejs:nodejs uploads backups logs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]