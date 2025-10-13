# Otterscan Architecture - Separate Containers

## Overview

Otterscan is deployed as **two separate containers** with external routing configured at your infrastructure layer.

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│         Your Proxy / Load Balancer / Ingress         │
│              (nginx, traefik, k8s, etc.)             │
└───────────────┬──────────────────────┬───────────────┘
                │                      │
     ┌──────────▼─────────┐  ┌────────▼──────────┐
     │   /api/* requests  │  │   /* requests     │
     │                    │  │                   │
     │  API Container     │  │  Frontend         │
     │  (Node.js)         │  │  Container        │
     │  Port 3001         │  │  (nginx)          │
     │                    │  │  Port 80          │
     └─────────┬──────────┘  └───────────────────┘
               │
               │ JSON-RPC
               ▼
     ┌─────────────────────┐
     │   Erigon Node       │
     │   (with Otterscan   │
     │    patches)         │
     └─────────────────────┘
```

## Container Details

### Frontend Container

**Purpose**: Serves static web application files

**Technology**:
- nginx (with brotli compression)
- Built from React/TypeScript SPA

**Ports**:
- 80 (HTTP)

**Configuration**:
- `config.json` sets `erigonURL: "/api"`
- No application logic, just static file serving
- Environment variables for beacon API, assets, etc.

**Image**: `otterscan-frontend`

**Build**: `docker build -t otterscan-frontend .`

### API Container

**Purpose**: Proxies JSON-RPC requests to Erigon, filters responses

**Technology**:
- Node.js + Express
- Lightweight proxy server

**Ports**:
- 3001 (HTTP)

**Configuration**:
- `ERIGON_URL` environment variable (required)
- Health check endpoint at `/health`

**Endpoints**:
- `POST /api` - Single JSON-RPC request
- `POST /api/batch` - Batch JSON-RPC requests
- `GET /health` - Health check

**Image**: `otterscan-api`

**Build**: `cd api && docker build -t otterscan-api .`

## Routing Requirements

You **must** configure external routing to direct:

### Path-based Routing

| Path Pattern | Target | Port | Purpose |
|-------------|--------|------|---------|
| `/api/*` | API Container | 3001 | JSON-RPC proxy |
| `/*` | Frontend Container | 80 | Static files |

### Example Configurations

#### Docker Compose (Built-in)

The `docker-compose.yml` file is pre-configured for local development:

```bash
docker-compose up -d
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

Note: For production, you still need external routing!

#### Nginx

```nginx
upstream otterscan_api {
    server api-host:3001;
}

upstream otterscan_frontend {
    server frontend-host:80;
}

server {
    listen 80;
    server_name otterscan.example.com;

    location /api {
        proxy_pass http://otterscan_api;
        proxy_http_version 1.1;
    }

    location / {
        proxy_pass http://otterscan_frontend;
        proxy_http_version 1.1;
    }
}
```

#### Kubernetes Ingress

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

#### Traefik (Docker Labels)

```yaml
services:
  otterscan-api:
    labels:
      - "traefik.http.routers.api.rule=Host(`otterscan.example.com`) && PathPrefix(`/api`)"

  otterscan-frontend:
    labels:
      - "traefik.http.routers.frontend.rule=Host(`otterscan.example.com`)"
```

## Deployment Patterns

### Pattern 1: Docker Compose (Development/Simple)

**Use Case**: Local development, simple deployments

```bash
docker-compose up -d
```

**Pros**:
- Easy setup
- Built-in routing
- Good for testing

**Cons**:
- Not suitable for production scale
- Limited load balancing

### Pattern 2: Separate Containers + External Proxy (Recommended)

**Use Case**: Production deployments, existing infrastructure

```bash
# Build and push images
docker build -t registry.example.com/otterscan-api ./api
docker build -t registry.example.com/otterscan-frontend .

# Deploy to your infrastructure
# Configure nginx/traefik/ALB to route traffic
```

**Pros**:
- Production-ready
- Scales independently
- Works with existing infrastructure

**Cons**:
- Requires proxy configuration
- More setup steps

### Pattern 3: Kubernetes (Enterprise)

**Use Case**: Large deployments, high availability

See `DEPLOYMENT.md` for full Kubernetes manifests.

**Pros**:
- Auto-scaling
- Rolling updates
- Health checks
- Service mesh integration

**Cons**:
- Complex setup
- K8s expertise required

## Scaling Considerations

### Frontend Scaling

- Stateless, scales horizontally easily
- Can be cached by CDN
- Low resource requirements (CPU/memory)
- Recommended replicas: 2-3 for HA

### API Scaling

- Stateless, scales horizontally
- CPU-bound (JSON parsing/transformation)
- Consider connection pooling to Erigon
- Recommended replicas: 3-5 for production

### Load Balancing

- Use round-robin for frontend
- Use least-connections for API
- Enable session affinity if needed (usually not required)

## Security Considerations

1. **Erigon URL Hidden**: Browser never sees Erigon endpoint
2. **Rate Limiting**: Apply at proxy/ingress level
3. **CORS**: API enables CORS for frontend access
4. **TLS**: Terminate SSL at proxy/load balancer
5. **Network Policies**: In K8s, restrict API → Erigon access

## Monitoring

### Health Checks

- **API**: `GET /health` returns `{"status":"ok","erigonUrl":"..."}`
- **Frontend**: HTTP 200 on `/` or any static path

### Metrics to Monitor

- API response times
- Erigon connection status
- Error rates (4xx, 5xx)
- Container resource usage
- Request throughput

### Logging

- **API**: Logs all RPC method calls with timestamps
- **Frontend**: nginx access logs
- **Centralize**: Use ELK, Loki, or CloudWatch

## Troubleshooting

### "Cannot connect to API"

1. Check routing configuration
2. Verify API container is running: `docker ps`
3. Check API logs: `docker logs otterscan-api`
4. Test directly: `curl http://api-host:3001/health`

### "No data from Erigon"

1. Check ERIGON_URL in API container
2. Test connectivity from API container: `docker exec otterscan-api wget -O- $ERIGON_URL`
3. Verify Erigon has Otterscan patches: Should return API level from `ots_getApiLevel`

### Performance Issues

1. Check API container resources
2. Monitor Erigon response times
3. Consider caching layer (Redis)
4. Scale API replicas

## Development Workflow

1. **Start API**: `cd api && npm start` (port 3001)
2. **Start Frontend**: `npm start` (port 5173, proxies /api to 3001)
3. **Make changes**: Frontend hot-reloads, API requires restart
4. **Test**: `./test-api.sh` for API tests

## Production Checklist

- [ ] Built and pushed both container images
- [ ] Configured external routing (nginx/traefik/ingress)
- [ ] Set ERIGON_URL environment variable
- [ ] Configured health checks
- [ ] Set up monitoring/alerting
- [ ] Configured TLS certificates
- [ ] Set resource limits (CPU/memory)
- [ ] Tested failover scenarios
- [ ] Documented runbook procedures
