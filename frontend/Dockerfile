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
COPY frontend ./frontend
COPY libs ./libs

# Build the frontend
RUN npx nx build frontend --configuration=production

# Production stage - nginx
FROM nginx:alpine AS production

# Install dependencies for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx configuration
COPY --from=builder /app/frontend/nginx.conf /etc/nginx/conf.d/

# Copy built application
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx-user:nginx-user /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]