# Proxy Setup Guide

This document explains how API requests are routed in different environments.

## Architecture

```
Browser → Frontend (nginx:80) → API Server (node:3001) → Erigon
```

The frontend makes requests to `/api/*` which need to be proxied to the API server.

## Local Development with Docker Compose

When running `docker-compose up`, the frontend container automatically proxies API requests:

```yaml
# docker-compose.yml
services:
  otterscan-api:
    ports:
      - "3001:3001"  # API server

  otterscan-frontend:
    ports:
      - "5173:80"    # Frontend nginx
```

**How it works:**

1. Browser loads frontend from `http://localhost:5173`
2. Browser makes API call to `http://localhost:5173/api/blocks/latest`
3. Frontend nginx proxies to `http://otterscan-api:3001/api/blocks/latest`
4. API server responds

**Configuration:**

The nginx config in `nginx/conf.d/default.conf` includes:

```nginx
location /api/ {
    proxy_pass http://otterscan-api:3001;
    proxy_http_version 1.1;
    # ... headers and timeouts
}
```

**Testing:**

```bash
# Start services
docker-compose up

# Test API directly
curl http://localhost:3001/api/blocks/latest

# Test through frontend proxy
curl http://localhost:5173/api/blocks/latest

# Both should return the same result
```

## Local Development with Vite Dev Server

When running the frontend with `npm run dev` (outside Docker):

```bash
# Terminal 1: Start API server
cd api
npm install
export ERIGON_URL=http://localhost:8545
npm start

# Terminal 2: Start frontend dev server
npm run dev
```

**How it works:**

1. Frontend runs on `http://localhost:5174` (Vite default)
2. API runs on `http://localhost:3001`
3. Vite dev server proxies `/api/*` to the API server

**Configuration:**

The `vite.config.ts` includes:

```typescript
server: {
  proxy: {
    '^/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## Production Deployment

In production, you should use an **external proxy** (nginx, Traefik, or Kubernetes Ingress) to route requests.

### Option 1: External Nginx Proxy

```nginx
# /etc/nginx/sites-available/otterscan
upstream frontend {
    server localhost:5173;
}

upstream api {
    server localhost:3001;
}

server {
    listen 80;
    server_name otterscan.example.com;

    # API requests
    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (optional)
    location /health {
        proxy_pass http://api;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Docker Compose with External Proxy

Disable the built-in nginx proxy by commenting it out:

```nginx
# In nginx/conf.d/default.conf
# Comment out the location /api/ block
#
# location /api/ {
#     proxy_pass http://otterscan-api:3001;
#     ...
# }
```

Or override with a custom nginx config:

```yaml
# docker-compose.prod.yml
services:
  otterscan-frontend:
    volumes:
      - ./nginx-prod/default.conf:/etc/nginx/conf.d/default.conf
```

### Option 3: Kubernetes Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: otterscan
spec:
  rules:
  - host: otterscan.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: otterscan-api
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: otterscan-frontend
            port:
              number: 80
```

## Environment-Specific Configuration

### Local (Docker Compose)
- ✅ Frontend nginx proxies to API
- ✅ Both services in same Docker network
- ✅ Use service name: `otterscan-api:3001`

### Local (Vite Dev Server)
- ✅ Vite dev server proxies to API
- ✅ Both on localhost
- ✅ Use localhost: `http://localhost:3001`

### Production
- ❌ Disable frontend nginx API proxy (optional)
- ✅ Use external proxy (nginx/traefik/k8s)
- ✅ Route `/api/*` to API service
- ✅ Route `/` to frontend service

## Troubleshooting

### API requests return 404

**Check 1:** Is the API server running?
```bash
curl http://localhost:3001/health
```

**Check 2:** Is the proxy configured?
```bash
# Check nginx config
docker-compose exec otterscan-frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api"
```

**Check 3:** Can frontend reach API?
```bash
# Test from inside frontend container
docker-compose exec otterscan-frontend wget -O- http://otterscan-api:3001/health
```

### Connection refused errors

**Problem:** Frontend container can't reach API container.

**Solution:** Check Docker network:
```bash
docker-compose ps  # Both should be "Up"
docker network ls  # Find the network
docker network inspect <network-name>  # Check both containers are connected
```

### CORS errors

**Problem:** Browser blocks requests due to CORS policy.

**Solution:** The API has CORS enabled by default. If using external proxy, ensure it doesn't strip CORS headers:
```nginx
# Don't add if API already sends them
# proxy_hide_header Access-Control-Allow-Origin;
```

## Summary

| Environment | Proxy Location | Configuration File |
|-------------|----------------|-------------------|
| Local (Docker) | Frontend nginx | `nginx/conf.d/default.conf` |
| Local (Dev) | Vite dev server | `vite.config.ts` |
| Production | External proxy | Your infrastructure |

For local debugging with docker-compose, everything is configured and ready to use. For production, disable the frontend nginx proxy and configure your external proxy to route requests.
