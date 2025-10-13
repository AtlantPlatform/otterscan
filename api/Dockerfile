FROM node:20.10.0-alpine3.17

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY server.js ./

# Environment variables with defaults
ENV ERIGON_URL=http://127.0.0.1:8545
ENV PORT=3001

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the API server
CMD ["node", "server.js"]
