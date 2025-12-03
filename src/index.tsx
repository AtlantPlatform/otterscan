// Using system fonts for instant loading - no custom font imports needed
import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./queryClient";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root")!;

// Check if we have SSR content to hydrate
const hasSSRContent = container.innerHTML.trim().length > 0;

// Get dehydrated state from SSR if available
const dehydratedState = (window as any).__REACT_QUERY_STATE__;

const AppWithProviders = () => (
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <App />
        </HydrationBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);

if (hasSSRContent) {
  // Hydrate SSR content
  hydrateRoot(container, <AppWithProviders />);
} else {
  // CSR fallback (development without SSR server)
  const root = createRoot(container);
  root.render(<AppWithProviders />);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
