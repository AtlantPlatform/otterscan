# API Architecture Implementation - Summary of Changes

## Overview

Implemented a new architecture with separate containers for frontend and API. Browser requests to `/api` are routed to a Node.js API proxy (configured at your infrastructure layer) instead of directly to Erigon. This reduces data transfer and provides better control over API responses.

## Architecture Changes

### Before
```
Browser (Frontend) ---> Erigon RPC (directly)
```

### After
```
Browser --> [Your Proxy/LB]
                |
                +--> Frontend Container (nginx) --> Static Files
                |
                +--> API Container (Node.js) --> Erigon RPC
```

## Files Created

### API Server (Separate Container)
- `api/Dockerfile` - Standalone API container image
- `api/server.js` - Express server that proxies JSON-RPC requests to Erigon
- `api/package.json` - API server dependencies (express, cors, node-fetch)
- `api/.env.example` - Environment variable template for API server
- `api/.dockerignore` - Docker build context exclusions
- `api/README.md` - API server documentation

### Docker Configuration
- `docker-compose.yml` - Runs both API and Frontend as separate services
- `.env.docker.example` - Docker environment variables example

### Documentation
- `DEPLOYMENT.md` - Complete deployment guide with Kubernetes examples
- `test-api.sh` - API testing script
- `CHANGES.md` - This file

## Files Modified

### Configuration
- `Dockerfile` - **Restored to nginx-only** (frontend container)
  - Serves static files only
  - No API server included
  - Original brotli compression support maintained

- `.dockerignore` - Added more patterns to reduce build context

- `vite.config.ts` - Updated proxy configuration
  - Dev mode proxies to local API server at `http://localhost:3001`
  - Proxy target configurable via `VITE_API_URL` env var

- `public/config.json` - Updated rpcURL
  - Set to relative path `/api`
  - Works with external proxy configuration

- `docker-compose.yml` - **Completely rewritten**
  - Now defines two separate services: `otterscan-api` and `otterscan-frontend`
  - API service builds from `./api/Dockerfile`
  - Frontend service builds from `./Dockerfile`
  - Includes health checks and service dependencies

### Files Removed
- `docker/supervisord.conf` - No longer needed (separate containers)
- `docker/entrypoint.sh` - No longer needed (separate containers)
- `nginx/conf.d/api.conf` - Removed nginx API proxying (done externally)

### Backup
- `Dockerfile.old` - Backup of temporary combined nginx+API+supervisor version

## Environment Variables

### API Container - Required
- `ERIGON_URL` - URL of your Erigon node (e.g., `http://127.0.0.1:8545`)

### API Container - Optional
- `PORT` - API server port (default: 3001)

### Frontend Container - Optional
- `BEACON_API_URL` - Beacon chain API
- `ASSETS_URL_PREFIX` - Custom assets URL
- `OTS2` - Enable experimental features
- `DISABLE_CONFIG_OVERWRITE` - Don't overwrite config.json

## How to Use

### Development

1. Start API server:
```bash
cd api
cp .env.example .env
# Edit .env to set ERIGON_URL
npm install
npm start
```

2. Start frontend (in another terminal):
```bash
npm start
```

### Docker Compose (Recommended)

```bash
# Edit docker-compose.yml to set ERIGON_URL
docker-compose up -d
```

### Separate Containers

```bash
# Build images
cd api && docker build -t otterscan-api .
cd .. && docker build -t otterscan-frontend .

# Run API
docker run -d -p 3001:3001 -e ERIGON_URL=http://your-erigon:8545 otterscan-api

# Run Frontend
docker run -d -p 5173:80 otterscan-frontend

# Configure your proxy/load balancer to route:
# /api/* -> localhost:3001
# /*     -> localhost:5173
```

## Testing

Run the test script:
```bash
./test-api.sh
```

Or manually:
```bash
# Health check
curl http://localhost:3001/health

# Test JSON-RPC
curl -X POST http://localhost:3001/api \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Benefits

1. **Separate Scaling**: Scale frontend and API independently
2. **Reduced Data Transfer**: API server can filter responses before sending to browser
3. **Better Error Handling**: Centralized error handling and logging
4. **Easier to Extend**: Add caching, rate limiting, or custom endpoints
5. **Security**: Hide Erigon URL from browser
6. **Flexibility**: Can connect to WebSocket or HTTP Erigon endpoints
7. **Simpler Architecture**: Each container has a single focused purpose

## Important Notes

### External Routing Required

This architecture requires you to configure routing at your infrastructure layer:

- **Option 1**: Use `docker-compose.yml` (includes basic routing)
- **Option 2**: Configure your own nginx/traefik/k8s ingress to route:
  - `/api/*` → API container (port 3001)
  - `/*` → Frontend container (port 80)

### No Built-in Proxy

Unlike the previous version, the frontend container does NOT include nginx proxying to the API. This separation allows for:
- Better scalability
- Load balancer/CDN integration
- Independent container updates

## Migration Notes

- The frontend code remains unchanged - it still uses ethers.js
- All requests go through `/api` endpoint
- No changes needed to existing Erigon configuration
- Two separate containers instead of one combined container
- **You must configure external routing** (or use docker-compose)

## Troubleshooting

See `DEPLOYMENT.md` for detailed troubleshooting guide.

Common issues:
- Ensure ERIGON_URL is set correctly in the API container
- Check API server logs: `docker-compose logs otterscan-api`
- Verify API health: `curl http://localhost:3001/health`
- Verify routing: Ensure `/api` requests reach the API container
