# SSR Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Otterscan from pure CSR (client-side rendering) to SSR (server-side rendering) using Vite SSR + Express for improved SEO, faster initial load, and better user experience.

**Architecture:** Use Vite's built-in SSR support with Express server. Split entry points into server and client bundles. Use React Query's dehydration/hydration for data transfer. Wrap browser-only components in `ClientOnly` boundaries.

**Tech Stack:** Vite SSR, Express.js, React 18, React Router 7, React Query 5, react-helmet-async

---

## Progress Tracking

### Phase 1: Infrastructure Setup
- [x] Task 1.1: Install SSR dependencies
- [x] Task 1.2: Create Vite SSR configuration
- [x] Task 1.3: Create Express server entry point
- [x] Task 1.4: Create server-side React entry point
- [x] Task 1.5: Update client entry point for hydration
- [x] Task 1.6: Add SSR build scripts

### Phase 2: Browser API Isolation
- [x] Task 2.1: Create `ClientOnly` wrapper component
- [x] Task 2.2: Create `useIsClient` hook
- [x] Task 2.3: Fix `useProvider.ts` - remove window.location dependency
- [x] Task 2.4: Fix `ThemeToggler.tsx` - isolate browser APIs
- [x] Task 2.5: Fix `useTitle.ts` - make SSR-safe
- [x] Task 2.6: Audit and fix remaining browser API usage

### Phase 3: Routing & Data Hydration
- [x] Task 3.1: Create SSR-compatible router factory
- [x] Task 3.2: Setup React Query dehydration on server
- [x] Task 3.3: Setup React Query hydration on client
- [x] Task 3.4: Update App.tsx for SSR compatibility

### Phase 4: SEO & Meta Tags
- [x] Task 4.1: Setup react-helmet-async for SSR
- [x] Task 4.2: Extract head tags on server render

### Phase 5: Testing & Verification
- [x] Task 5.1: Test SSR build locally
- [ ] Task 5.2: Verify hydration works correctly
- [ ] Task 5.3: Test all routes render on server
- [ ] Task 5.4: Performance comparison

---

## Phase 1: Infrastructure Setup

### Task 1.1: Install SSR Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
npm install express compression serve-static
npm install -D @types/express @types/compression @types/serve-static cross-env
```

**Step 2: Verify installation**

Run: `cat package.json | grep -E "(express|compression|serve-static)"`
Expected: All three packages appear in dependencies/devDependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add SSR dependencies (express, compression)"
```

---

### Task 1.2: Create Vite SSR Configuration

**Files:**
- Modify: `vite.config.ts`

**Step 1: Update vite.config.ts with SSR settings**

Replace the entire `vite.config.ts` with:

```typescript
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";
import viteCompression from "vite-plugin-compression";

// Proxy to local API server during development
const proxyTarget = process.env.VITE_API_URL || 'http://localhost:3001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression(),
    viteCompression({ algorithm: "brotliCompress" }),
    imagetools(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router', 'react-error-boundary'],
          // Separate ethers (large blockchain library)
          'vendor-ethers': ['ethers'],
          // UI libraries
          'vendor-ui': ['@headlessui/react', '@tanstack/react-query', 'swr'],
          // Chart libraries (only needed on specific pages)
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // QR/Camera scanner (large, only needed for specific feature)
          'vendor-scanner': ['@zxing/browser', '@zxing/library'],
          // Code highlighting (large, only needed on contract pages)
          'vendor-shiki': ['shiki'],
          // FontAwesome icons
          'vendor-icons': [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-brands-svg-icons',
            '@fortawesome/free-regular-svg-icons',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/react-fontawesome'
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're splitting properly
    chunkSizeWarningLimit: 600,
    // Enable tree-shaking for better dead code elimination
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
  },
  server: {
    proxy: {
      '^/api': {
        target: proxyTarget,
        ws: false,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  // SSR Configuration
  ssr: {
    // Externalize these packages in SSR build (they're browser-only)
    noExternal: ['react-helmet-async'],
  },
});
```

**Step 2: Verify config is valid**

Run: `npx vite build --ssr src/entry-server.tsx --outDir dist/server 2>&1 || echo "Expected to fail - entry-server.tsx not created yet"`
Expected: Error about missing entry-server.tsx (this is expected)

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat(ssr): add Vite SSR configuration"
```

---

### Task 1.3: Create Express Server Entry Point

**Files:**
- Create: `server.js`

**Step 1: Create server.js in project root**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';

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

// Serve HTML
app.use('*', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '');

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

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
```

**Step 2: Verify file exists**

Run: `ls -la server.js`
Expected: File exists

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat(ssr): add Express server entry point"
```

---

### Task 1.4: Create Server-Side React Entry Point

**Files:**
- Create: `src/entry-server.tsx`

**Step 1: Create entry-server.tsx**

```typescript
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
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
```

**Step 2: Verify file exists**

Run: `ls -la src/entry-server.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add src/entry-server.tsx
git commit -m "feat(ssr): add server-side React entry point"
```

---

### Task 1.5: Update Client Entry Point for Hydration

**Files:**
- Modify: `src/index.tsx`
- Modify: `index.html`

**Step 1: Update src/index.tsx for hydration**

Replace entire file with:

```typescript
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
```

**Step 2: Update index.html with SSR placeholders**

In `index.html`, replace the `<div id="root"></div>` line with:

```html
<!--app-head-->
</head>
<body>
  <div id="root"><!--app-html--></div>
```

Note: Also ensure `<!--app-head-->` is placed just before `</head>`.

**Step 3: Verify changes**

Run: `grep -E "(app-head|app-html)" index.html`
Expected: Both placeholders appear

**Step 4: Commit**

```bash
git add src/index.tsx index.html
git commit -m "feat(ssr): update client entry for hydration"
```

---

### Task 1.6: Add SSR Build Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add SSR scripts to package.json**

Add these scripts to the "scripts" section:

```json
{
  "scripts": {
    "dev": "node server.js",
    "dev:csr": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --ssrManifest --outDir dist/client",
    "build:server": "vite build --ssr src/entry-server.tsx --outDir dist/server",
    "preview": "cross-env NODE_ENV=production node server.js",
    "start": "vite",
    ...existing scripts...
  }
}
```

**Step 2: Verify scripts added**

Run: `cat package.json | grep -E "(dev:|build:client|build:server)"`
Expected: All three scripts appear

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat(ssr): add SSR build scripts"
```

---

## Phase 2: Browser API Isolation

### Task 2.1: Create ClientOnly Wrapper Component

**Files:**
- Create: `src/components/ClientOnly.tsx`

**Step 1: Create ClientOnly component**

```typescript
import { FC, ReactNode, useEffect, useState } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that only renders its children on the client side.
 * Use this for components that access browser-only APIs like:
 * - window
 * - document
 * - localStorage
 * - navigator
 * - matchMedia
 */
const ClientOnly: FC<ClientOnlyProps> = ({ children, fallback = null }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
};

export default ClientOnly;
```

**Step 2: Verify file exists**

Run: `ls -la src/components/ClientOnly.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add src/components/ClientOnly.tsx
git commit -m "feat(ssr): add ClientOnly wrapper component"
```

---

### Task 2.2: Create useIsClient Hook

**Files:**
- Create: `src/hooks/useIsClient.ts`

**Step 1: Create useIsClient hook**

```typescript
import { useEffect, useState } from "react";

/**
 * Hook that returns true only on the client side after hydration.
 * Use this to conditionally access browser APIs.
 *
 * @example
 * const isClient = useIsClient();
 * const theme = isClient ? localStorage.getItem('theme') : 'system';
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Safe wrapper for browser APIs that returns a default value on server.
 */
export function useBrowserAPI<T>(
  browserFn: () => T,
  serverDefault: T
): T {
  const isClient = useIsClient();

  if (!isClient) {
    return serverDefault;
  }

  return browserFn();
}
```

**Step 2: Create hooks directory if needed and verify file**

Run: `mkdir -p src/hooks && ls -la src/hooks/useIsClient.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add src/hooks/useIsClient.ts
git commit -m "feat(ssr): add useIsClient hook for browser API safety"
```

---

### Task 2.3: Fix useProvider.ts - Remove window.location Dependency

**Files:**
- Modify: `src/useProvider.ts`

**Step 1: Update useProvider.ts to accept baseUrl as parameter**

Replace lines 24-30 (the window.location.origin usage):

```typescript
// Convert relative URLs to absolute URLs for ethers.js
// ethers.js doesn't support relative URLs, so we need to prepend the origin
if (rpcURL.startsWith("/")) {
  const absoluteURL = `${window.location.origin}${rpcURL}`;
  console.log(`Converting relative URL to absolute: ${absoluteURL}`);
  rpcURL = absoluteURL;
}
```

With:

```typescript
// Convert relative URLs to absolute URLs for ethers.js
// ethers.js doesn't support relative URLs, so we need to prepend the origin
if (rpcURL.startsWith("/")) {
  // In SSR context, we need a base URL passed in or use a default
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.VITE_BASE_URL || 'http://localhost:3000';
  const absoluteURL = `${baseUrl}${rpcURL}`;
  console.log(`Converting relative URL to absolute: ${absoluteURL}`);
  rpcURL = absoluteURL;
}
```

**Step 2: Verify the change**

Run: `grep -n "typeof window" src/useProvider.ts`
Expected: Line with typeof window check appears

**Step 3: Commit**

```bash
git add src/useProvider.ts
git commit -m "fix(ssr): make useProvider SSR-safe with window check"
```

---

### Task 2.4: Fix ThemeToggler.tsx - Isolate Browser APIs

**Files:**
- Modify: `src/components/ThemeToggler.tsx`

**Step 1: Update ThemeToggler.tsx to be SSR-safe**

Replace the entire file with:

```typescript
import { faMoon, faSun } from "@fortawesome/free-regular-svg-icons";
import { faDisplay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { SourcifyMenuItem, SourcifyMenuTitle } from "../SourcifyMenu";
import { useIsClient } from "../hooks/useIsClient";

type Theme = "light" | "dark" | "system";

function updateTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const isDarkMode =
    theme === "dark" || (theme === "system" && darkModeQuery.matches);
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return "system";
  return (localStorage.getItem("theme") as Theme) ?? "system";
}

const ThemeToggler: React.FC = () => {
  const isClient = useIsClient();
  const [theme, setTheme] = useState<Theme>("system");
  const [updated, setUpdated] = useState<number | null>(null);

  // Initialize theme from localStorage on client
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!isClient) return;

    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const mediaQueryListener = () => {
      if (theme === "system") {
        setUpdated(Date.now());
      }
    };
    darkModeQuery.addEventListener("change", mediaQueryListener);

    return () => {
      darkModeQuery.removeEventListener("change", mediaQueryListener);
    };
  }, [isClient, theme]);

  // Apply theme changes
  useEffect(() => {
    if (isClient) {
      updateTheme(theme);
    }
  }, [isClient, theme, updated]);

  const handleThemeChange = (newTheme: Theme) => {
    if (newTheme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", newTheme);
    }
    setTheme(newTheme);
    updateTheme(newTheme);
  };

  return (
    <>
      <SourcifyMenuTitle>Theme</SourcifyMenuTitle>
      <SourcifyMenuItem
        checked={theme === "light"}
        onClick={() => handleThemeChange("light")}
      >
        <FontAwesomeIcon icon={faSun} className="w-4 mr-0.5" /> Light
      </SourcifyMenuItem>
      <SourcifyMenuItem
        checked={theme === "dark"}
        onClick={() => handleThemeChange("dark")}
      >
        <FontAwesomeIcon icon={faMoon} className="w-4 mr-0.5" /> Dark
      </SourcifyMenuItem>
      <SourcifyMenuItem
        checked={theme === "system"}
        onClick={() => handleThemeChange("system")}
      >
        <FontAwesomeIcon icon={faDisplay} className="w-4 mr-0.5" /> System
      </SourcifyMenuItem>
    </>
  );
};

export default ThemeToggler;
```

**Step 2: Verify the change**

Run: `grep -n "useIsClient" src/components/ThemeToggler.tsx`
Expected: Import and usage of useIsClient appears

**Step 3: Commit**

```bash
git add src/components/ThemeToggler.tsx
git commit -m "fix(ssr): make ThemeToggler SSR-safe"
```

---

### Task 2.5: Fix useTitle.ts - Make SSR-Safe

**Files:**
- Modify: `src/useTitle.ts`

**Step 1: Read current useTitle.ts implementation**

Run: `cat src/useTitle.ts`
Expected: See current implementation

**Step 2: Update useTitle.ts to check for document**

Wrap any `document.title` access with a check:

```typescript
if (typeof document !== 'undefined') {
  document.title = newTitle;
}
```

**Step 3: Verify the change**

Run: `grep -n "typeof document" src/useTitle.ts`
Expected: Check appears

**Step 4: Commit**

```bash
git add src/useTitle.ts
git commit -m "fix(ssr): make useTitle SSR-safe"
```

---

### Task 2.6: Audit and Fix Remaining Browser API Usage

**Files:**
- Multiple files (identified by grep)

**Step 1: Find all window/document/localStorage usage**

Run:
```bash
grep -rn "window\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -30
grep -rn "document\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -30
grep -rn "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -30
```

Expected: List of files using browser APIs

**Step 2: For each file found, add appropriate guards**

Options:
- Wrap in `typeof window !== 'undefined'` check
- Use `useIsClient` hook
- Wrap component in `<ClientOnly>` wrapper

**Step 3: Commit all fixes**

```bash
git add -A
git commit -m "fix(ssr): add browser API guards throughout codebase"
```

---

## Phase 3: Routing & Data Hydration

### Task 3.1: Create SSR-Compatible Router Factory

**Files:**
- Create: `src/AppSSR.tsx`

**Step 1: Create AppSSR.tsx for server-side rendering**

```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { FC, lazy, Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, Routes, Route } from "react-router";
import ErrorFallback from "./components/ErrorFallback";
import Home from "./Home";
import Main from "./Main";
import { SourcifySource } from "./sourcify/useSourcify";
import { AppConfig, AppConfigContext } from "./useAppConfig";
import { queryClient } from "./queryClient";
import WarningHeader from "./WarningHeader";

// Lazy loaded components (same as App.tsx)
const Block = lazy(() => import("./execution/Block"));
const BlockTransactions = lazy(() => import("./execution/BlockTransactionsRest"));
const BlockTransactionByIndex = lazy(
  () => import("./execution/block/BlockTransactionByIndex"),
);
const Address = lazy(() => import("./execution/Address"));
const AddressTransactionResults = lazy(
  () => import("./execution/address/AddressTransactionResults"),
);
const AddressContract = lazy(
  () => import("./execution/address/AddressContract"),
);
const AddressReadContract = lazy(
  () => import("./execution/address/AddressReadContract"),
);
const AddressERC20Results = lazy(
  () => import("./execution/address/AddressERC20Results"),
);
const AddressERC721Results = lazy(
  () => import("./execution/address/AddressERC721Results"),
);
const AddressTokens = lazy(() => import("./execution/address/AddressTokens"));
const AddressWithdrawals = lazy(
  () => import("./execution/address/AddressWithdrawals"),
);
const BlocksRewarded = lazy(() => import("./execution/address/BlocksRewarded"));
const ProxyContract = lazy(() => import("./execution/address/ProxyContract"));
const ProxyReadContract = lazy(
  () => import("./execution/address/ProxyReadContract"),
);
const Transaction = lazy(() => import("./execution/Transaction"));
const AllContracts = lazy(() => import("./token/AllContracts"));
const AllERC20 = lazy(() => import("./token/AllERC20"));
const AllERC4626 = lazy(() => import("./token/AllERC4626"));
const AllERC721 = lazy(() => import("./token/AllERC721"));
const AllERC1155 = lazy(() => import("./token/AllERC1155"));
const AllERC1167 = lazy(() => import("./token/AllERC1167"));
const LiveBlocks = lazy(() => import("./special/london/LiveBlocks"));
const RecentBlocks = lazy(() => import("./pages/RecentBlocksRest"));
const RecentTransactions = lazy(() => import("./pages/RecentTransactionsRest"));
const PageNotFound = lazy(() => import("./PageNotFound"));
const BroadcastTransactionPage = lazy(
  () => import("./execution/BroadcastTransactionPage"),
);

const AppConfigProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourcifySource, setSourcifySource] = useState<SourcifySource>(
    SourcifySource.CENTRAL_SERVER,
  );
  const appConfig = useMemo((): AppConfig => {
    return {
      sourcifySource,
      setSourcifySource,
    };
  }, [sourcifySource, setSourcifySource]);

  return (
    <AppConfigContext.Provider value={appConfig}>
      {children}
    </AppConfigContext.Provider>
  );
};

/**
 * SSR-compatible App component.
 * Uses Routes instead of createBrowserRouter for server compatibility.
 * Note: Provider/runtime initialization happens only on client after hydration.
 */
const AppSSR: FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AppConfigProvider>
          <div className="flex h-screen flex-col">
            <WarningHeader />
            <Suspense fallback={<div className="flex-1" />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/special/liveBlocks" element={<LiveBlocks />} />
                <Route path="/*" element={<Main />}>
                  <Route path="block/:blockNumberOrHash" element={<Block />} />
                  <Route path="block/:blockNumber/txs" element={<BlockTransactions />} />
                  <Route
                    path="block/:blockNumberOrHash/tx/:txIndex"
                    element={<BlockTransactionByIndex />}
                  />
                  <Route path="tx/:txhash/*" element={<Transaction />} />
                  <Route path="address/:addressOrName/" element={<Address />}>
                    <Route index element={<AddressTransactionResults />} />
                    <Route path="txs/:direction" element={<AddressTransactionResults />} />
                    <Route path="erc20" element={<AddressERC20Results />} />
                    <Route path="erc721" element={<AddressERC721Results />} />
                    <Route path="tokens" element={<AddressTokens />} />
                    <Route path="withdrawals" element={<AddressWithdrawals />} />
                    <Route path="blocksRewarded" element={<BlocksRewarded />} />
                    <Route path="contract" element={<AddressContract />} />
                    <Route path="readContract" element={<AddressReadContract />} />
                    <Route path="proxyLogicContract" element={<ProxyContract />} />
                    <Route path="readContractAsProxy" element={<ProxyReadContract />} />
                    <Route path="*" element={null} />
                  </Route>
                  <Route path="contracts/*" element={<AllContracts />} />
                  <Route path="contracts/erc20/*" element={<AllERC20 />} />
                  <Route path="contracts/erc4626/*" element={<AllERC4626 />} />
                  <Route path="contracts/erc721/*" element={<AllERC721 />} />
                  <Route path="contracts/erc1155/*" element={<AllERC1155 />} />
                  <Route path="contracts/erc1167/*" element={<AllERC1167 />} />
                  <Route path="blocks/recent" element={<RecentBlocks />} />
                  <Route path="tx/recent" element={<RecentTransactions />} />
                  <Route path="broadcastTx" element={<BroadcastTransactionPage />} />
                  <Route path="*" element={<PageNotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </div>
        </AppConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default AppSSR;
```

**Step 2: Verify file exists**

Run: `ls -la src/AppSSR.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add src/AppSSR.tsx
git commit -m "feat(ssr): add SSR-compatible App component"
```

---

### Task 3.2: Setup React Query Dehydration on Server

**Files:**
- Already done in `src/entry-server.tsx` (Task 1.4)

**Step 1: Verify dehydration is set up**

Run: `grep -n "dehydrate" src/entry-server.tsx`
Expected: dehydrate function is called

---

### Task 3.3: Setup React Query Hydration on Client

**Files:**
- Already done in `src/index.tsx` (Task 1.5)

**Step 1: Verify hydration is set up**

Run: `grep -n "HydrationBoundary" src/index.tsx`
Expected: HydrationBoundary component is used

---

### Task 3.4: Update App.tsx for SSR Compatibility

**Files:**
- Modify: `src/App.tsx`

**Step 1: Move QueryClientProvider to entry point**

The QueryClientProvider is now in `src/index.tsx`, so we need to remove it from the Layout component and ensure it's not duplicated.

**Step 2: Ensure App.tsx works with both SSR and CSR**

The current App.tsx uses `createBrowserRouter` which is fine for CSR. The SSR path uses AppSSR.tsx with StaticRouter.

**Step 3: Verify both entry points work**

Run: `grep -n "QueryClientProvider" src/App.tsx src/index.tsx src/AppSSR.tsx`
Expected: Should appear in index.tsx and AppSSR.tsx, check for duplicates in App.tsx

---

## Phase 4: SEO & Meta Tags

### Task 4.1: Setup react-helmet-async for SSR

**Files:**
- Already done in `src/entry-server.tsx` (Task 1.4)

**Step 1: Verify helmet is set up**

Run: `grep -n "HelmetProvider\|helmet" src/entry-server.tsx`
Expected: HelmetProvider and helmet context extraction appear

---

### Task 4.2: Extract Head Tags on Server Render

**Files:**
- Already done in `src/entry-server.tsx` (Task 1.4)

**Step 1: Verify head extraction**

Run: `grep -n "helmet?.title\|helmet?.meta" src/entry-server.tsx`
Expected: Head tag extraction code appears

---

## Phase 5: Testing & Verification

### Task 5.1: Test SSR Build Locally

**Files:**
- None (testing only)

**Step 1: Build client and server**

```bash
npm run build:client
npm run build:server
```

Expected: Both builds complete without errors

**Step 2: Start production server**

```bash
npm run preview
```

Expected: Server starts on port 3000

**Step 3: Test in browser**

Open http://localhost:3000 and view page source
Expected: HTML content is pre-rendered (not empty `<div id="root"></div>`)

---

### Task 5.2: Verify Hydration Works Correctly

**Files:**
- None (testing only)

**Step 1: Open browser dev tools**

Open http://localhost:3000 with DevTools open

**Step 2: Check for hydration errors**

Look in Console for:
- "Text content did not match"
- "Hydration failed"
- Any React hydration warnings

Expected: No hydration errors

**Step 3: Test interactivity**

- Click navigation links
- Use search form
- Toggle theme

Expected: All interactive features work after hydration

---

### Task 5.3: Test All Routes Render on Server

**Files:**
- None (testing only)

**Step 1: Test each major route**

```bash
curl -s http://localhost:3000/ | grep -o '<title>.*</title>'
curl -s http://localhost:3000/blocks/recent | grep -o '<title>.*</title>'
curl -s http://localhost:3000/tx/recent | grep -o '<title>.*</title>'
```

Expected: Each route returns appropriate title tag with content

---

### Task 5.4: Performance Comparison

**Files:**
- None (testing only)

**Step 1: Measure Time to First Byte (TTFB)**

```bash
curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s http://localhost:3000/
```

**Step 2: Run Lighthouse audit**

Open Chrome DevTools > Lighthouse > Run audit

Expected:
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- SEO score > 90

---

## Rollback Plan

If SSR causes issues in production:

1. **Quick Rollback**: Set `SSR_ENABLED=false` environment variable
2. **Code Rollback**: Revert to CSR-only builds by using original `npm run start` script
3. **Full Rollback**: `git revert` the SSR commits

---

## Notes for Implementation

1. **StaticRouter vs BrowserRouter**: SSR uses `StaticRouter` from `react-router-dom/server`, client uses `BrowserRouter`

2. **Ethers.js Provider**: The provider cannot be initialized on the server as it requires browser APIs. Components using the provider must:
   - Check `useIsClient()` before accessing provider
   - Show loading state during SSR
   - Initialize provider client-side only

3. **localStorage**: Theme and custom labels stored in localStorage are not available on server. Use default values during SSR.

4. **Lazy Loading**: `React.lazy()` works with SSR but requires `<Suspense>` boundaries. The server will render the fallback.

5. **react-helmet-async**: This is already used in the project and supports SSR via context extraction.
