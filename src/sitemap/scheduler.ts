import cron from 'node-cron';
import type { SitemapGenerator } from './generator.js';

/**
 * Schedule sitemap generation cron jobs
 */
export function startSitemapScheduler(
  generator: SitemapGenerator,
  intervalMinutes: number
): void {
  // Every N minutes: regenerate rolling sitemaps (blocks and txs)
  const periodicCron = `*/${intervalMinutes} * * * *`;
  cron.schedule(periodicCron, async () => {
    console.log('[Sitemap] Running periodic generation...');
    await generator.runPeriodicGeneration();
  });
  console.log(`[Sitemap] Scheduled periodic generation every ${intervalMinutes} minutes`);

  // Daily at 2 AM: full regeneration
  cron.schedule('0 2 * * *', async () => {
    console.log('[Sitemap] Running daily full generation...');
    await generator.runFullGeneration();
  });
  console.log('[Sitemap] Scheduled daily full generation at 2:00 AM');
}
