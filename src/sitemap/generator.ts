import fs from 'node:fs/promises';
import path from 'node:path';
import { ErigonClient } from './erigon-client.js';
import {
  buildSitemapIndex,
  buildUrlset,
  buildSimpleUrlset,
  formatTimestamp,
  getTodayDate,
} from './xml-builder.js';
import type { SitemapConfig } from './types.js';

/**
 * Ensure the output directory exists
 */
async function ensureOutputDir(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

/**
 * Write content to a file atomically (write to temp, then rename)
 */
async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, filePath);
}

/**
 * Sitemap generator orchestrator
 */
export class SitemapGenerator {
  private config: SitemapConfig;
  private client: ErigonClient;
  private isGenerating = false;

  constructor(config: SitemapConfig) {
    this.config = config;
    this.client = new ErigonClient(config.erigonRpcUrl);
  }

  /**
   * Generate the static core sitemap (homepage, recent pages, etc.)
   */
  async generateCoreSitemap(): Promise<void> {
    const { baseUrl, outputDir } = this.config;

    const urls = [
      {
        loc: `${baseUrl}/`,
        changefreq: 'daily' as const,
        priority: 1.0,
      },
      {
        loc: `${baseUrl}/blocks/recent`,
        changefreq: 'always' as const,
        priority: 0.9,
      },
      {
        loc: `${baseUrl}/tx/recent`,
        changefreq: 'always' as const,
        priority: 0.9,
      },
      {
        loc: `${baseUrl}/broadcastTx`,
        changefreq: 'monthly' as const,
        priority: 0.5,
      },
    ];

    const xml = buildUrlset(urls);
    await ensureOutputDir(outputDir);
    await writeFileAtomic(path.join(outputDir, 'sitemap-core.xml'), xml);
    console.log('[Sitemap] Generated sitemap-core.xml');
  }

  /**
   * Generate the rolling blocks sitemap (20k most recent blocks)
   */
  async generateBlocksSitemap(): Promise<void> {
    const { baseUrl, blocksCount, outputDir } = this.config;

    try {
      const latestBlock = await this.client.getLatestBlockNumber();
      const startBlock = Math.max(latestBlock - blocksCount + 1, 0);

      console.log(`[Sitemap] Fetching blocks ${startBlock} to ${latestBlock}...`);
      const blocks = await this.client.getBlocksInRange(startBlock, latestBlock);

      const entries = blocks.map((block) => ({
        loc: `${baseUrl}/block/${block.number}`,
        lastmod: formatTimestamp(block.timestamp),
      }));

      const xml = buildSimpleUrlset(entries);
      await ensureOutputDir(outputDir);
      await writeFileAtomic(path.join(outputDir, 'sitemap-blocks-recent.xml'), xml);
      console.log(`[Sitemap] Generated sitemap-blocks-recent.xml with ${entries.length} blocks`);
    } catch (error) {
      console.error('[Sitemap] Failed to generate blocks sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate the rolling transactions sitemap (20k most recent txs)
   */
  async generateTxSitemap(): Promise<void> {
    const { baseUrl, txCount, txMaxDays, outputDir } = this.config;

    try {
      console.log(`[Sitemap] Fetching up to ${txCount} transactions from last ${txMaxDays} days...`);
      const transactions = await this.client.getRecentTransactions(txCount, txMaxDays);

      const entries = transactions.map((tx) => ({
        loc: `${baseUrl}/tx/${tx.hash}`,
        lastmod: formatTimestamp(tx.timestamp),
      }));

      const xml = buildSimpleUrlset(entries);
      await ensureOutputDir(outputDir);
      await writeFileAtomic(path.join(outputDir, 'sitemap-tx-recent.xml'), xml);
      console.log(`[Sitemap] Generated sitemap-tx-recent.xml with ${entries.length} transactions`);
    } catch (error) {
      console.error('[Sitemap] Failed to generate transactions sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate the sampled addresses sitemap (coinbase/validator addresses)
   */
  async generateAddressesSitemap(): Promise<void> {
    const { baseUrl, addressCount, outputDir } = this.config;

    try {
      console.log(`[Sitemap] Fetching up to ${addressCount} unique coinbase addresses...`);
      const addresses = await this.client.getCoinbaseAddresses(addressCount);

      const entries = addresses.map((addr) => ({
        loc: `${baseUrl}/address/${addr.address}`,
        lastmod: formatTimestamp(addr.lastSeen),
      }));

      const xml = buildSimpleUrlset(entries);
      await ensureOutputDir(outputDir);
      await writeFileAtomic(path.join(outputDir, 'sitemap-addresses-sampled.xml'), xml);
      console.log(`[Sitemap] Generated sitemap-addresses-sampled.xml with ${entries.length} addresses`);
    } catch (error) {
      console.error('[Sitemap] Failed to generate addresses sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate the sitemap index file
   */
  async generateSitemapIndex(): Promise<void> {
    const { baseUrl, outputDir } = this.config;
    const now = new Date().toISOString();
    const today = getTodayDate();

    const sitemaps = [
      {
        loc: `${baseUrl}/sitemaps/sitemap-core.xml`,
        lastmod: today,
      },
      {
        loc: `${baseUrl}/sitemaps/sitemap-blocks-recent.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemaps/sitemap-tx-recent.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemaps/sitemap-addresses-sampled.xml`,
        lastmod: today,
      },
    ];

    const xml = buildSitemapIndex(sitemaps);
    await ensureOutputDir(outputDir);
    await writeFileAtomic(path.join(outputDir, 'sitemap.xml'), xml);
    console.log('[Sitemap] Generated sitemap.xml (index)');
  }

  /**
   * Update just the lastmod timestamps in the sitemap index
   */
  async updateIndexLastmod(): Promise<void> {
    await this.generateSitemapIndex();
  }

  /**
   * Run the periodic sitemap generation (blocks and txs)
   * Protected by a lock to prevent overlapping runs
   */
  async runPeriodicGeneration(): Promise<void> {
    if (this.isGenerating) {
      console.log('[Sitemap] Skipping generation - previous run still in progress');
      return;
    }

    this.isGenerating = true;
    try {
      await this.generateBlocksSitemap();
      await this.generateTxSitemap();
      await this.updateIndexLastmod();
    } catch (error) {
      console.error('[Sitemap] Periodic generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Run full sitemap generation (all files)
   */
  async runFullGeneration(): Promise<void> {
    if (this.isGenerating) {
      console.log('[Sitemap] Skipping generation - previous run still in progress');
      return;
    }

    this.isGenerating = true;
    try {
      await this.generateCoreSitemap();
      await this.generateBlocksSitemap();
      await this.generateTxSitemap();
      await this.generateAddressesSitemap();
      await this.generateSitemapIndex();
    } catch (error) {
      console.error('[Sitemap] Full generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Run weekly address sitemap regeneration
   */
  async runWeeklyAddressGeneration(): Promise<void> {
    if (this.isGenerating) {
      console.log('[Sitemap] Skipping address generation - another run in progress');
      return;
    }

    this.isGenerating = true;
    try {
      await this.generateAddressesSitemap();
      await this.updateIndexLastmod();
    } catch (error) {
      console.error('[Sitemap] Weekly address generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Check if the Erigon RPC connection is working
   */
  async checkConnection(): Promise<boolean> {
    return this.client.checkConnection();
  }
}
