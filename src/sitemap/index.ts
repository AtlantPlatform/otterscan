import { getSitemapConfig } from './config.js';
import { SitemapGenerator } from './generator.js';
import { startSitemapScheduler } from './scheduler.js';

let generator: SitemapGenerator | null = null;

/**
 * Initialize the sitemap generation system
 * Generates all sitemaps on startup and schedules periodic updates
 */
export async function initializeSitemaps(): Promise<void> {
  const config = getSitemapConfig();

  console.log('[Sitemap] Initializing sitemap generation system...');
  console.log(`[Sitemap] Base URL: ${config.baseUrl}`);
  console.log(`[Sitemap] Output directory: ${config.outputDir}`);
  console.log(`[Sitemap] Erigon RPC: ${config.erigonRpcUrl}`);

  generator = new SitemapGenerator(config);

  // Check RPC connection
  const connected = await generator.checkConnection();
  if (!connected) {
    console.warn('[Sitemap] WARNING: Cannot connect to Erigon RPC. Sitemaps will not be generated.');
    console.warn('[Sitemap] Set ERIGON_RPC_URL environment variable to enable sitemap generation.');
    return;
  }

  // Generate all sitemaps on startup
  console.log('[Sitemap] Generating initial sitemaps...');
  await generator.runFullGeneration();

  // Start the scheduler
  startSitemapScheduler(generator, config.cronInterval);

  console.log('[Sitemap] Sitemap generation system initialized successfully');
}

/**
 * Get the sitemap generator instance (for testing or manual triggering)
 */
export function getSitemapGenerator(): SitemapGenerator | null {
  return generator;
}

// Re-export types for convenience
export type { SitemapConfig, BlockInfo, TransactionInfo } from './types.js';
