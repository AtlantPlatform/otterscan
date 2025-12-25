# Sitemap Generation System Design

## Overview

Dynamic sitemap generation system for ethscan.org that creates rolling sitemaps for recent blocks and transactions, updated every 5 minutes via in-process cron jobs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    server.js (Express SSR)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │   node-cron      │    │   SitemapGenerator          │   │
│  │   scheduler      │───▶│   - generateBlocksSitemap() │   │
│  │                  │    │   - generateTxSitemap()     │   │
│  │  */5 * * * *     │    │   - generateIndex()         │   │
│  │  0 2 * * *       │    │   - generateCore()          │   │
│  └──────────────────┘    └──────────────┬──────────────┘   │
│                                         │                   │
│                                         ▼                   │
│                          ┌─────────────────────────────┐   │
│                          │   Direct Erigon RPC         │   │
│                          │   (ethers.js JsonRpcProvider)│   │
│                          └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    /public/sitemaps/
                    ├── sitemap.xml (index)
                    ├── sitemap-core.xml
                    ├── sitemap-blocks-recent.xml
                    └── sitemap-tx-recent.xml
```

## Sitemap Structure

### Root Sitemap Index (`/sitemaps/sitemap.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://ethscan.org/sitemaps/sitemap-core.xml</loc>
    <lastmod>2025-01-16</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://ethscan.org/sitemaps/sitemap-blocks-recent.xml</loc>
    <lastmod>2025-01-16T10:45:00Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://ethscan.org/sitemaps/sitemap-tx-recent.xml</loc>
    <lastmod>2025-01-16T10:45:00Z</lastmod>
  </sitemap>
</sitemapindex>
```

### Core Sitemap (`/sitemaps/sitemap-core.xml`) - Static

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ethscan.org/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ethscan.org/blocks/recent</loc>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ethscan.org/tx/recent</loc>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ethscan.org/broadcastTx</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### Blocks Sitemap (`/sitemaps/sitemap-blocks-recent.xml`) - Rolling 20k

- Contains 20,000 most recent blocks
- Each entry includes block number URL and timestamp as lastmod
- Updated every 5 minutes
- Old blocks automatically removed as new ones are added

### Transactions Sitemap (`/sitemaps/sitemap-tx-recent.xml`) - Rolling 20k

- Contains 20,000 most recent transactions (up to 7 days old)
- Each entry includes tx hash URL and block timestamp as lastmod
- Updated every 5 minutes
- Collected by iterating through recent blocks

## Data Flow

### Blocks Sitemap Generation

1. Get latest block number via `eth_blockNumber`
2. Calculate range: `[latest - 20000, latest]`
3. Batch fetch blocks (100 per batch = 200 RPC calls)
4. Extract: block number + timestamp for each
5. Build XML with `<loc>` and `<lastmod>`
6. Write to `/public/sitemaps/sitemap-blocks-recent.xml`

### Transactions Sitemap Generation

1. Get latest block number
2. Iterate backwards through blocks in batches of 100
3. For each block, extract transaction hashes
4. Stop when we have 20,000 tx hashes OR reach 7-day cutoff
5. Build XML with tx hash URLs and block timestamps as lastmod
6. Write to `/public/sitemaps/sitemap-tx-recent.xml`

### Batch RPC Strategy

```typescript
// Fetch 100 blocks in one batched RPC call
const blockNumbers = range(start, start + 100);
const blocks = await Promise.all(
  blockNumbers.map(n => provider.getBlock(n))
);
// ethers.js batches these automatically with JsonRpcProvider
```

**Estimated RPC calls per cycle:**
- Blocks: ~200 calls (20k blocks / 100 per batch)
- Transactions: ~200-500 calls depending on tx density
- Total: ~400-700 RPC calls every 5 minutes

## Scheduler

### Cron Schedule

```typescript
// Every 5 minutes: regenerate rolling sitemaps
cron.schedule('*/5 * * * *', async () => {
  await generateBlocksSitemap();
  await generateTxSitemap();
  await updateIndexLastmod();
});

// Daily at 2 AM: full regeneration
cron.schedule('0 2 * * *', async () => {
  await generateCoreSitemap();
  await generateBlocksSitemap();
  await generateTxSitemap();
  await generateSitemapIndex();
});
```

### Startup Behavior

On server start, all sitemaps are generated immediately to handle fresh deploys and restarts.

### Concurrency Protection

A lock prevents overlapping runs if generation takes longer than 5 minutes.

## Error Handling

- Never crash the server on sitemap errors
- Preserve existing sitemaps if generation fails
- Log enough detail to debug issues
- Retry transient Erigon connection failures (3 retries with exponential backoff)

## Configuration

### Environment Variables

```bash
SITEMAP_BASE_URL=https://ethscan.org
SITEMAP_BLOCKS_COUNT=20000
SITEMAP_TX_COUNT=20000
SITEMAP_TX_MAX_DAYS=7
SITEMAP_CRON_INTERVAL=5
ERIGON_RPC_URL=http://localhost:8545
```

## File Structure

```
/src/sitemap/
  ├── index.ts           # Public exports, initialization
  ├── config.ts          # Configuration from env vars
  ├── scheduler.ts       # node-cron setup
  ├── generator.ts       # Main generation orchestrator
  ├── erigon-client.ts   # Direct RPC with batching
  ├── xml-builder.ts     # XML string generation
  └── types.ts           # TypeScript interfaces
```

## Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

## Integration

### server.js Changes

```javascript
import { initializeSitemaps, startSitemapScheduler } from './src/sitemap/index.js';

// After Express app setup, before listen()
await initializeSitemaps();
startSitemapScheduler();
```

### robots.txt Update

```diff
- Sitemap: https://ethscan.org/sitemap.xml
+ Sitemap: https://ethscan.org/sitemaps/sitemap.xml
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Install `node-cron` dependency
2. Create `/src/sitemap/` directory structure
3. Implement `config.ts` with environment variables
4. Implement `types.ts` with interfaces
5. Implement `xml-builder.ts` for XML generation

### Phase 2: Erigon Integration
6. Implement `erigon-client.ts` with batch RPC calls
7. Add retry logic and error handling
8. Test connection to Erigon directly

### Phase 3: Generators
9. Implement `generator.ts` with core sitemap (static)
10. Implement blocks sitemap generator
11. Implement transactions sitemap generator
12. Implement sitemap index generator

### Phase 4: Scheduler & Integration
13. Implement `scheduler.ts` with cron jobs
14. Implement `index.ts` with initialization
15. Integrate into `server.js`
16. Update `robots.txt`

### Phase 5: Testing & Deployment
17. Test locally with Erigon connection
18. Verify XML validity
19. Test cron execution
20. Deploy and monitor logs

## Future Enhancements (Deferred)

- **Address sitemap**: Requires external data source or indexing infrastructure for top addresses by tx count/balance
- **Increase limits**: Can scale to 50k blocks once initial implementation is stable
- **Verified contracts sitemap**: If contract verification data becomes available
