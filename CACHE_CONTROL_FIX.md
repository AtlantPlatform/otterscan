# Cache Control Fix for Real-Time Blockchain Data

## Problem
The API endpoints `/api/blocks/recent` and `/api/blocks/:number/transactions` were being cached by browsers/proxies, causing users to see stale data even though new blocks appear every 10-30 seconds on Ethereum.

## Solution
Added smart cache-control middleware to the API server (api/server.js:27-47) that sets appropriate cache headers based on endpoint type:

### 1. **Real-Time Endpoints** (No Caching)
Endpoints that should always return fresh data:
- `/api/blocks/recent`
- `/api/blocks/latest`  
- `/api/transactions/recent`

**Headers:**
```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

### 2. **Historical Data** (Long-Term Caching)
Immutable blockchain data (specific blocks/transactions):
- `/api/blocks/23574581`
- `/api/transactions/0xabc...`

**Headers:**
```
Cache-Control: public, max-age=31536000, immutable
```
(1 year cache - these never change)

### 3. **Default** (Short Cache)
Other endpoints:
```
Cache-Control: public, max-age=10
```
(10 seconds)

## Impact
- ✅ Users now see new blocks/transactions within 10-30s (real-time)
- ✅ Historical data is still cached efficiently
- ✅ Reduces unnecessary API calls for unchanging data
- ✅ Better UX for live blockchain monitoring

## Testing
After deploying, verify with:
```bash
# Should return no-cache headers
curl -I https://ethscan.org/api/blocks/recent

# Should return max-age=31536000
curl -I https://ethscan.org/api/blocks/23574581
```

## Restart Required
The API server needs to be restarted for these changes to take effect:
```bash
cd api
pm2 restart otterscan-api
# or
npm restart
```
