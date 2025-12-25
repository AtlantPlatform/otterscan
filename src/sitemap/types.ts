/**
 * Sitemap generation types
 */

export interface BlockInfo {
  number: number;
  timestamp: number;
}

export interface TransactionInfo {
  hash: string;
  timestamp: number;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export interface SitemapConfig {
  baseUrl: string;
  blocksCount: number;
  txCount: number;
  txMaxDays: number;
  cronInterval: number;
  erigonRpcUrl: string;
  outputDir: string;
}
