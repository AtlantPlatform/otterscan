# Local Debugging Guide

Quick guide to run Otterscan locally for debugging and development.

## Option 1: Docker Compose (Recommended for Testing)

This runs both frontend and API in containers with automatic proxy configuration.

```bash
# 1. Edit docker-compose.yml to set your Erigon URL
vim docker-compose.yml
# Change: ERIGON_URL=https://ethscan.org/erigon

# 2. Start everything
docker-compose up

# 3. Access the app
# Frontend: http://localhost:5173
# API health: http://localhost:3001/health
```

**How it works:**
- Frontend container automatically proxies `/api/*` to the API container
- No additional proxy configuration needed
- Perfect for testing the full Docker setup

## Option 2: Local Development (Hot Reload)

This runs both services locally without Docker for faster development.

```bash
# Terminal 1: Start API server
cd api
npm install
export ERIGON_URL=http://localhost:8545  # Or your Erigon URL
npm start
# API runs on http://localhost:3001

# Terminal 2: Start frontend dev server
npm install
npm run dev
# Frontend runs on http://localhost:5174 (Vite default)
```

**How it works:**
- Vite dev server automatically proxies `/api/*` to `http://localhost:3001`
- Hot reload for frontend changes
- No Docker overhead

## Option 3: Hybrid (API in Docker, Frontend Local)

Useful when you want to develop frontend but don't want to run Erigon locally.

```bash
# Terminal 1: Start just the API container
cd api
docker build -t otterscan-api .
docker run -p 3001:3001 \
  -e ERIGON_URL=https://ethscan.org/erigon \
  otterscan-api

# Terminal 2: Start frontend dev server
npm run dev
# Frontend runs on http://localhost:5174
```

**How it works:**
- API runs in Docker (can connect to remote Erigon)
- Frontend runs locally with Vite
- Vite proxies `/api/*` to `http://localhost:3001`

## Testing the Setup

### Test API Directly

```bash
# Health check
curl http://localhost:3001/health

# Get latest block
curl http://localhost:3001/api/blocks/latest

# Get specific block
curl http://localhost:3001/api/blocks/18500000
```

### Test Through Frontend Proxy

```bash
# If using Docker Compose (port 5173)
curl http://localhost:5173/api/blocks/latest

# If using Vite dev server (port 5174)
curl http://localhost:5174/api/blocks/latest
```

### Test in Browser

1. Open http://localhost:5173 (Docker) or http://localhost:5174 (Vite)
2. Open browser DevTools → Network tab
3. Browse blocks/transactions
4. Check that requests go to `/api/*` (not directly to Erigon)

## Common Issues

### API returns 404

**Problem:** Frontend can't reach API.

**Solution:**
```bash
# Check API is running
curl http://localhost:3001/health

# Check proxy is working (Docker)
docker-compose exec otterscan-frontend wget -O- http://otterscan-api:3001/health
```

### Cannot connect to Erigon

**Problem:** API can't reach Erigon node.

**Solution:**
```bash
# Test Erigon directly
curl -X POST http://your-erigon:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# If Erigon is on host machine, use host.docker.internal
export ERIGON_URL=http://host.docker.internal:8545
```

### CORS errors

**Problem:** Browser blocks API requests.

**Note:** The API server has CORS enabled by default. If you see CORS errors:
1. Check that requests go to `/api/*` (proxied), not directly to API port
2. Check browser console for exact error
3. API should return `Access-Control-Allow-Origin: *` header

## Debugging Tips

### View API Logs

```bash
# Docker Compose
docker-compose logs -f otterscan-api

# Standalone Docker
docker logs -f otterscan-api

# Local
# Logs appear in the terminal where you ran `npm start`
```

### View Frontend Logs

```bash
# Docker Compose
docker-compose logs -f otterscan-frontend

# Vite dev server
# Logs appear in the terminal where you ran `npm run dev`
```

### Inspect Network Traffic

```bash
# See all requests going through nginx proxy
docker-compose exec otterscan-frontend tail -f /var/log/nginx/access.log

# Monitor API requests
# Just watch the API terminal/logs
```

### Test API Endpoints

```bash
# Use the test script
./test-api.sh http://localhost:3001

# Or test individual endpoints
curl http://localhost:3001/api/blocks/latest | jq
curl http://localhost:3001/api/transactions/0x... | jq
curl http://localhost:3001/api/addresses/0x... | jq
```

## Quick Reference

| Setup | Frontend URL | API URL | Best For |
|-------|-------------|---------|----------|
| Docker Compose | http://localhost:5173 | http://localhost:3001 | Testing full setup |
| Vite Dev | http://localhost:5174 | http://localhost:3001 | Frontend development |
| Hybrid | http://localhost:5174 | http://localhost:3001 (Docker) | Frontend dev without Erigon |

## Next Steps

- **Production deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Proxy configuration**: See [PROXY-SETUP.md](PROXY-SETUP.md)
- **API documentation**: See [api/README.md](api/README.md)
- **REST API migration**: See [REST-API-MIGRATION.md](REST-API-MIGRATION.md)
