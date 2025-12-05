// Using system fonts for instant loading - no custom font imports needed
import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import App from "./App";
import AppSSR from "./AppSSR";
import { queryClient } from "./queryClient";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root")!;

// Check if we have SSR content to hydrate
const hasSSRContent = container.innerHTML.trim().length > 0;

// Get dehydrated state from SSR if available
const dehydratedState = (window as any).__REACT_QUERY_STATE__;

// Prime SearchController cache from REST API data at hydration time
// This runs BEFORE any components render, ensuring SearchController finds cached data
if (dehydratedState?.queries) {
  // Extract address from URL to get the original case (SearchController uses original case)
  const urlAddressMatch = window.location.pathname.match(/^\/address\/([^/]+)/);
  const urlAddress = urlAddressMatch ? urlAddressMatch[1] : null;

  for (const query of dehydratedState.queries) {
    // Look for REST API address transactions data
    if (query.queryKey?.[0] === 'addressTransactions' && query.state?.data?.transactions) {
      const normalizedAddress = query.queryKey[1]; // lowercase from REST API
      const restData = query.state.data;

      // Convert REST transactions to ProcessedTransaction format
      const processedTxs = restData.transactions.map((tx: any) => {
        const value = BigInt(tx.value);
        const fee = BigInt(tx.fee);
        const gasUsed = BigInt(tx.gasUsed || 1);
        const gasPrice = gasUsed > 0n ? fee / gasUsed : 0n;
        return {
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          idx: tx.index,
          hash: tx.hash,
          from: tx.from,
          to: tx.to || null,
          value,
          type: tx.type,
          fee,
          gasPrice,
          data: tx.data,
          status: tx.status ?? 1,
        };
      });

      // Create TransactionChunk format
      const chunk = {
        txs: processedTxs,
        firstPage: true,
        lastPage: !restData.hasMore,
      };

      // Prime with BOTH: URL case (what SearchController uses) AND lowercase
      // SearchController passes address from outlet context which preserves URL case
      const addressesToPrime = [normalizedAddress];
      if (urlAddress && urlAddress.toLowerCase() === normalizedAddress) {
        addressesToPrime.push(urlAddress); // Add original URL case
      }

      for (const addr of addressesToPrime) {
        const cacheKey = ['ots_searchTransactionsBefore', addr, 0];
        queryClient.setQueryData(cacheKey, chunk);
      }
    }
  }
}

// SSR hydration uses AppSSR (same component tree as server)
const AppSSRWithProviders = () => (
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <BrowserRouter>
            <AppSSR />
          </BrowserRouter>
        </HydrationBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);

// CSR fallback uses App (with createBrowserRouter)
const AppCSRWithProviders = () => (
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);

if (hasSSRContent) {
  // Hydrate SSR content - must use same component tree as server (AppSSR)
  hydrateRoot(container, <AppSSRWithProviders />);
} else {
  // CSR fallback (development without SSR server)
  const root = createRoot(container);
  root.render(<AppCSRWithProviders />);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
