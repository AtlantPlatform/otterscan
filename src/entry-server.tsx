import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { HelmetProvider, HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import AppSSR from './AppSSR';

interface RenderResult {
  html: string;
  head: string;
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
