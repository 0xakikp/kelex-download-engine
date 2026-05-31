# ============================================================
# Kelex Downloader - Docker Container
# 
# Build:
#   docker build -t kelex-downloader .
#
# Run:
#   docker run -p 3000:80 kelex-downloader
#
# Or use docker-compose:
#   docker-compose up -d
# ============================================================

# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install Node.js for backend API (optional - if you add a backend later)
# RUN apk add --no-cache nodejs npm

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Labels
LABEL org.opencontainers.image.title="Kelex Downloader"
LABEL org.opencontainers.image.description="Universal Download Manager"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.licenses="MIT"

CMD ["nginx", "-g", "daemon off;"]
