import path from 'node:path';
import type { SitemapConfig } from './types.js';

export function getSitemapConfig(): SitemapConfig {
  // Use process.cwd() for reliable paths regardless of module location
  const appRoot = process.cwd();

  return {
    baseUrl: process.env.SITEMAP_BASE_URL || 'https://ethscan.org',
    blocksCount: parseInt(process.env.SITEMAP_BLOCKS_COUNT || '20000', 10),
    txCount: parseInt(process.env.SITEMAP_TX_COUNT || '20000', 10),
    txMaxDays: parseInt(process.env.SITEMAP_TX_MAX_DAYS || '7', 10),
    addressCount: parseInt(process.env.SITEMAP_ADDRESS_COUNT || '1000', 10),
    cronInterval: parseInt(process.env.SITEMAP_CRON_INTERVAL || '5', 10),
    erigonRpcUrl: process.env.ERIGON_RPC_URL || 'http://localhost:8545',
    // Output to public/sitemaps in dev, dist/client/sitemaps in production
    outputDir: process.env.NODE_ENV === 'production'
      ? path.resolve(appRoot, 'dist/client/sitemaps')
      : path.resolve(appRoot, 'public/sitemaps'),
  };
}
