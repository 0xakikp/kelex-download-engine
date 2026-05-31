# ============================================================
# Kelex Backend Dockerfile
# Node.js 22 + yt-dlp + aria2 + ffmpeg
# ============================================================

FROM node:22-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    aria2 \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    wget \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip (latest)
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp && \
    ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies (including dev deps for build)
RUN npm ci

# Copy backend source
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Build TypeScript
RUN ./node_modules/.bin/tsc

# Create download directory
RUN mkdir -p /opt/kelex-downloads

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DOWNLOAD_DIR=/opt/kelex-downloads
ENV MAX_CONCURRENT=5
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start
CMD ["node", "dist/index.js"]
