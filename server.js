import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;
const base = process.env.BASE || '/';

// Cached production assets
const templateHtml = isProduction
  ? fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
  : '';

const ssrManifest = isProduction
  ? fs.readFileSync(path.resolve(__dirname, 'dist/client/.vite/ssr-manifest.json'), 'utf-8')
  : undefined;

const app = express();

// Vite dev server (development only)
let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  });
  app.use(vite.middlewares);
} else {
  app.use(compression());
  app.use(base, express.static(path.resolve(__dirname, 'dist/client'), { index: false }));
}

// Proxy API requests to API server (must be before SSR catch-all)
const apiTarget = process.env.API_URL || 'http://localhost:3001';
app.use('/api', createProxyMiddleware({
  target: `${apiTarget}/api`,  // Include /api since mount path is stripped
  changeOrigin: true,
}));

// Serve sitemaps from the appropriate directory
const sitemapsDir = isProduction
  ? path.resolve(__dirname, 'dist/client/sitemaps')
  : path.resolve(__dirname, 'public/sitemaps');
app.use('/sitemaps', express.static(sitemapsDir));

// Serve root sitemap directly at /sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = path.join(sitemapsDir, 'sitemap.xml');
  res.sendFile(sitemapPath);
});

// Serve HTML for all routes (catch-all handler)
app.use(async (req, res, next) => {
  // Skip if not a GET request or if it's a static asset request
  if (req.method !== 'GET') {
    return next();
  }
  try {
    // Keep leading slash - React Router needs it for route matching
    // Only strip base if it's a custom base path (not just '/')
    const url = base === '/' ? req.originalUrl : req.originalUrl.replace(base, '');

    let template;
    let render;

    if (!isProduction) {
      // Always read fresh template in development
      template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
    } else {
      template = templateHtml;
      render = (await import('./dist/server/entry-server.js')).render;
    }

    const rendered = await render(url, ssrManifest);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '');

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.error(e.stack);
    res.status(500).end(e.stack);
  }
});

// Initialize sitemap generation (runs in background, doesn't block startup)
(async () => {
  try {
    let initializeSitemaps;
    if (!isProduction) {
      // In development, use Vite to load TypeScript module
      const sitemapModule = await vite.ssrLoadModule('/src/sitemap/index.ts');
      initializeSitemaps = sitemapModule.initializeSitemaps;
    } else {
      // In production, import the compiled JavaScript
      const sitemapModule = await import('./dist/server/sitemap/index.js');
      initializeSitemaps = sitemapModule.initializeSitemaps;
    }
    await initializeSitemaps();
  } catch (error) {
    console.error('[Sitemap] Initialization failed:', error);
  }
})();

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
