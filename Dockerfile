# SSR Dockerfile - Uses Node.js Express server for server-side rendering
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY tsconfig.json tsconfig.node.json postcss.config.js tailwind.config.js vite.config.ts index.html ./
COPY public ./public/
COPY src ./src/
COPY server.js ./

# Build client and server bundles
RUN npm run build

# Production image
FROM --platform=linux/amd64 node:20-alpine AS production

WORKDIR /app

# Copy package files for production dependencies
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

# Copy static assets from otterscan-assets image
COPY --from=otterscan/otterscan-assets:v1.1.1 /usr/share/nginx/html/chains ./dist/client/chains/
COPY --from=otterscan/otterscan-assets:v1.1.1 /usr/share/nginx/html/topic0 ./dist/client/topic0/
COPY --from=otterscan/otterscan-assets:v1.1.1 /usr/share/nginx/html/assets ./dist/client/assets/
COPY --from=otterscan/otterscan-assets:v1.1.1 /usr/share/nginx/html/signatures ./dist/client/signatures/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the SSR server
CMD ["node", "server.js"]
