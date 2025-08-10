# Development Dockerfile für Angular Frontend mit Hot Reload

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
COPY frontend ./frontend
COPY eslint.config.mjs ./

# Expose ports
EXPOSE 4200 49153

# Default command (can be overridden)
CMD ["npm", "run", "start:frontend"]