# Otterscan Deployment Guide

This document describes how to deploy Otterscan with the new API proxy architecture.

## Architecture Overview

Otterscan uses a two-tier architecture with separate containers:

```
Browser --> [Your Proxy/Load Balancer]
                    |
                    +--> Nginx (Frontend - port 80) --> Static Files
                    |
                    +--> Node.js API (port 3001) --> Erigon RPC
```

**Key Points:**
- **Frontend Container**: Serves static files (HTML/CSS/JS) via nginx
- **API Container**: Node.js server that proxies JSON-RPC requests to Erigon
- **Separate Deployment**: Each service runs in its own container
- **External Routing**: You proxy `/api` requests to the API container at your infrastructure layer

**Benefits:**
- Independent scaling of frontend and API
- Reduced data transfer from Erigon
- API server can filter/transform responses
- Better control over request/response handling
- Easier to add caching and rate limiting in the future

## Quick Start with Docker Compose

The easiest way to run both services:

```bash
# 1. Edit docker-compose.yml to set your ERIGON_URL
# 2. Start both services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access:
- Frontend: http://localhost:5173
- API health: http://localhost:3001/health

**Note for local debugging:** The frontend container includes a built-in nginx proxy to the API container. This allows the services to work together without external proxy configuration. In production, you should disable this and use your own external proxy. See [PROXY-SETUP.md](PROXY-SETUP.md) for details.

## Separate Container Deployment

### Build Images

```bash
# Build API container
cd api
docker build -t otterscan-api:latest .

# Build Frontend container
cd ..
docker build -t otterscan-frontend:latest .
```

### Run Separately

```bash
# 1. Start API server
docker run -d \
  --name otterscan-api \
  -p 3001:3001 \
  -e ERIGON_URL=http://your-erigon-host:8545 \
  otterscan-api:latest

# 2. Start Frontend
docker run -d \
  --name otterscan-frontend \
  -p 5173:80 \
  otterscan-frontend:latest
```

### Important: Configure Your Proxy

**For production deployments**, you need to configure your reverse proxy/load balancer to route requests:
- `/api/*` → API container (port 3001)
- `/*` → Frontend container (port 80)

**For local debugging**, the frontend container has built-in proxy support - see [PROXY-SETUP.md](PROXY-SETUP.md).

Example nginx configuration for production:
```nginx
upstream otterscan_api {
    server otterscan-api:3001;
}

upstream otterscan_frontend {
    server otterscan-frontend:80;
}

server {
    listen 80;
    server_name your-domain.com;

    # Proxy API requests
    location /api {
        proxy_pass http://otterscan_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve frontend
    location / {
        proxy_pass http://otterscan_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

### API Container

**Required:**
- **ERIGON_URL**: URL of your Erigon node with Otterscan patches
  - Example: `http://127.0.0.1:8545`
  - Example (Docker): `http://host.docker.internal:8545`

**Optional:**
- **PORT**: API server port (default: `3001`)

### Frontend Container

**Optional:**
- **BEACON_API_URL**: Beacon chain API for post-merge networks
- **ASSETS_URL_PREFIX**: Custom URL for static assets (chains, signatures, etc.)
- **OTS2**: Enable experimental features (`true`/`false`)
- **DISABLE_CONFIG_OVERWRITE**: Set to `true` to use custom config.json

## Development Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install API server dependencies
cd api
npm install
cd ..
```

### 2. Start the API Server

```bash
cd api
cp .env.example .env
# Edit .env to set your ERIGON_URL
npm start
```

The API server will run on http://localhost:3001

### 3. Start the Frontend

In another terminal:

```bash
npm start
```

The frontend will run on http://localhost:5173 and proxy `/api` requests to the API server.

## Kubernetes Deployment

Example Kubernetes deployment with separate API and Frontend:

```yaml
# API Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otterscan-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otterscan-api
  template:
    metadata:
      labels:
        app: otterscan-api
    spec:
      containers:
      - name: api
        image: otterscan-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: ERIGON_URL
          value: "http://erigon-service:8545"
        - name: PORT
          value: "3001"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
# API Service
apiVersion: v1
kind: Service
metadata:
  name: otterscan-api
spec:
  selector:
    app: otterscan-api
  ports:
  - name: http
    port: 3001
    targetPort: 3001
  type: ClusterIP
---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otterscan-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otterscan-frontend
  template:
    metadata:
      labels:
        app: otterscan-frontend
    spec:
      containers:
      - name: frontend
        image: otterscan-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
# Frontend Service
apiVersion: v1
kind: Service
metadata:
  name: otterscan-frontend
spec:
  selector:
    app: otterscan-frontend
  ports:
  - name: http
    port: 80
    targetPort: 80
  type: ClusterIP
---
# Ingress - routes traffic to appropriate service
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: otterscan
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: otterscan.yourdomain.com
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

## Troubleshooting

### API Not Responding

Check API server logs:
```bash
# Docker Compose
docker-compose logs otterscan-api

# Standalone container
docker logs otterscan-api

# Kubernetes
kubectl logs deployment/otterscan-api
```

### Cannot Connect to Erigon

1. Verify ERIGON_URL is correct
2. Check if Erigon is accessible from the API container:
   ```bash
   docker exec otterscan-api wget -O- $ERIGON_URL
   ```
3. For localhost connections, use `host.docker.internal` on Mac/Windows

### Frontend Cannot Reach API

1. Verify your proxy/ingress is routing `/api/*` to the API service
2. Check API health:
   ```bash
   curl http://localhost:3001/health
   ```
3. Check browser console for CORS or network errors

### Configuration Not Applied

If your config.json changes aren't taking effect:
- Ensure DISABLE_CONFIG_OVERWRITE is not set
- Check the generated config: `docker exec otterscan-frontend cat /usr/share/nginx/html/config.json`

## API Endpoints

The API server exposes these endpoints:

- `POST /api` - Main JSON-RPC proxy endpoint
- `POST /api/batch` - Batch JSON-RPC requests
- `GET /health` - Health check

All standard Ethereum JSON-RPC methods and Otterscan-specific methods (ots_*) are supported.

## Migration Notes

### From Previous Single-Container Setup

If you were using an earlier version with combined nginx+API:

**Old (combined):**
```bash
docker run -p 5173:80 -e ERIGON_URL=http://erigon:8545 otterscan
```

**New (separate containers):**
```bash
# Use docker-compose (recommended)
docker-compose up -d

# Or run separately and configure your own proxy
docker run -p 3001:3001 -e ERIGON_URL=http://erigon:8545 otterscan-api
docker run -p 5173:80 otterscan-frontend
# Configure nginx/traefik/etc to route /api to port 3001
```

### Key Differences

1. **Two containers** instead of one
2. **External routing required**: You must configure your infrastructure to route `/api/*` to the API container
3. **Independent scaling**: Scale frontend and API separately
4. **Simpler configuration**: Each service has a focused purpose
