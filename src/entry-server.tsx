import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { HelmetProvider, HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import AppSSR from './AppSSR';
import { recentBlocksQueryOptions, paginatedBlocksQueryOptions } from './api/useRestBlocks';
import { recentTransactionsQueryOptions, paginatedTransactionsQueryOptions } from './api/useRestTransactions';

interface RenderResult {
  html: string;
  head: string;
}

// Parse page number from URL query string
function getPageFromUrl(url: string): number {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const p = urlObj.searchParams.get('p');
    return p ? parseInt(p, 10) || 1 : 1;
  } catch {
    return 1;
  }
}

// Get URL path without query string
function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.pathname;
  } catch {
    return url.split('?')[0] || url;
  }
}

export async function render(url: string, _ssrManifest?: string): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15000,
        retry: false,
      },
    },
  });

  const helmetContext: { helmet?: HelmetServerState } = {};
  const urlPath = getUrlPath(url);
  const pageNumber = getPageFromUrl(url);

  // Prefetch data based on route
  try {
    console.log(`[SSR] Prefetching data for URL: ${url}, path: ${urlPath}`);

    if (url === '/' || url === '' || urlPath === '/') {
      // Homepage - prefetch recent blocks and transactions (5 items each)
      console.log('[SSR] Prefetching homepage data...');
      const results = await Promise.allSettled([
        queryClient.prefetchQuery(recentBlocksQueryOptions(5)),
        queryClient.prefetchQuery(recentTransactionsQueryOptions(5)),
      ]);
      console.log('[SSR] Prefetch results:', results.map(r => r.status));
    } else if (urlPath === '/blocks/recent' || url.startsWith('/blocks/recent')) {
      // Recent blocks page - prefetch paginated blocks (30 items)
      console.log('[SSR] Prefetching blocks page data...');
      await queryClient.prefetchQuery(paginatedBlocksQueryOptions(pageNumber, 30));
    } else if (urlPath === '/tx/recent' || url.startsWith('/tx/recent')) {
      // Recent transactions page - prefetch paginated transactions (30 items)
      console.log('[SSR] Prefetching transactions page data...');
      await queryClient.prefetchQuery(paginatedTransactionsQueryOptions(pageNumber, 30));
    }
  } catch (error) {
    // Log but don't fail SSR if prefetch fails - client can refetch
    console.error('[SSR] Prefetch error:', error);
  }

  // Debug: Log cache state before rendering
  const cacheData = queryClient.getQueryData(['paginatedBlocks', pageNumber, 30]);
  console.log('[SSR] Cache state before render:', {
    url,
    urlPath,
    pageNumber,
    hasData: !!cacheData,
    dataLength: cacheData ? (cacheData as any).blocks?.length : 0,
  });

  const html = renderToString(
    <React.StrictMode>
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location={url}>
            <AppSSR />
          </StaticRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>
  );

  console.log('[SSR] Rendered HTML length:', html.length);

  const { helmet } = helmetContext;
  const dehydratedState = dehydrate(queryClient);

  const head = `
    ${helmet?.title?.toString() ?? ''}
    ${helmet?.meta?.toString() ?? ''}
    ${helmet?.link?.toString() ?? ''}
    ${helmet?.script?.toString() ?? ''}
    <script>
      window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};
    </script>
  `;

  return { html, head };
}
