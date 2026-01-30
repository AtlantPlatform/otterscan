import { getSitemapConfig } from './config.js';
import { SitemapGenerator } from './generator.js';

let generator: SitemapGenerator | null = null;

/**
 * Initialize the sitemap system
 * Checks existing sitemaps and truncates to 100 URLs if needed
 */
export async function initializeSitemaps(): Promise<void> {
  const config = getSitemapConfig();

  console.log('[Sitemap] Initializing sitemap system...');
  console.log(`[Sitemap] Output directory: ${config.outputDir}`);

  generator = new SitemapGenerator(config);

  // Check and truncate existing sitemaps to 100 URLs each
  await generator.checkAndTruncateAllSitemaps();

  console.log('[Sitemap] Sitemap system initialized');
}

/**
 * Get the sitemap generator instance (for testing or manual triggering)
 */
export function getSitemapGenerator(): SitemapGenerator | null {
  return generator;
}

// Re-export types for convenience
export type { SitemapConfig, BlockInfo, TransactionInfo, AddressInfo } from './types.js';
