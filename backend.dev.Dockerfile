# Development Dockerfile für NestJS Backend mit Hot Reload

FROM node:20-alpine
WORKDIR /app

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code (will be overridden by volume mount)
COPY backend ./backend
COPY eslint.config.mjs ./
COPY jest.config.ts ./
COPY jest.preset.js ./

# Create necessary directories
RUN mkdir -p /app/data/images /app/data/config /app/logs

# Expose ports
EXPOSE 3000 9229

# Enable Node.js debugging
ENV NODE_OPTIONS="--inspect=0.0.0.0:9229"

# Default command (can be overridden)
CMD ["npm", "run", "start:backend:dev"]