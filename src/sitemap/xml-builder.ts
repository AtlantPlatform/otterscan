import type { SitemapUrl, SitemapEntry } from './types.js';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * Parse a simple sitemap XML and extract URL entries (loc and lastmod)
 */
export function parseSimpleSitemap(xml: string): Array<{ loc: string; lastmod: string }> {
  const entries: Array<{ loc: string; lastmod: string }> = [];
  const urlRegex = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g;
  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    entries.push({
      loc: match[1],
      lastmod: match[2],
    });
  }
  return entries;
}

/**
 * Count URLs in a sitemap XML
 */
export function countSitemapUrls(xml: string): number {
  const matches = xml.match(/<url>/g);
  return matches ? matches.length : 0;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format a Unix timestamp as ISO 8601 date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Build a sitemap index XML file
 */
export function buildSitemapIndex(sitemaps: SitemapEntry[]): string {
  const entries = sitemaps
    .map(
      (sitemap) => `  <sitemap>
    <loc>${escapeXml(sitemap.loc)}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`
    )
    .join('\n');

  return `${XML_HEADER}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

/**
 * Build a URL set sitemap XML file
 */
export function buildUrlset(urls: SitemapUrl[]): string {
  const entries = urls
    .map((url) => {
      let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
      if (url.lastmod) {
        entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      }
      if (url.changefreq) {
        entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      }
      if (url.priority !== undefined) {
        entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
      }
      entry += '\n  </url>';
      return entry;
    })
    .join('\n');

  return `${XML_HEADER}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

/**
 * Build a simple URL set with just loc and lastmod (for blocks/txs)
 */
export function buildSimpleUrlset(entries: Array<{ loc: string; lastmod: string }>): string {
  const urlEntries = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </url>`
    )
    .join('\n');

  return `${XML_HEADER}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}
