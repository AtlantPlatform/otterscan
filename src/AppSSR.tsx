import { FC, lazy, Suspense, useMemo, useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Routes, Route } from "react-router";
import ErrorFallback from "./components/ErrorFallback";
import ClientOnly from "./components/ClientOnly";
import { SourcifySource } from "./sourcify/useSourcify";
import { AppConfig, AppConfigContext } from "./useAppConfig";
import { ChainInfoContext, populateChainInfo } from "./useChainInfo";
import { loadOtterscanConfig } from "./useConfig";
import { createRuntime, RuntimeContext, OtterscanRuntime } from "./useRuntime";
import WarningHeader from "./WarningHeader";
import HomeSSR from "./HomeSSR";
// SSR-safe pages - imported directly (not lazy) so they render during SSR
import RecentBlocksRest from "./pages/RecentBlocksRest";
import RecentTransactionsRest from "./pages/RecentTransactionsRest";
import BlockSSR from "./execution/BlockSSR";
import TransactionSSR from "./execution/TransactionSSR";
import TransactionLogsSSR from "./execution/TransactionLogsSSR";
import TransactionTraceSSR from "./execution/TransactionTraceSSR";
import TransactionStateDiffSSR from "./execution/TransactionStateDiffSSR";
import BlockTransactionsSSR from "./execution/BlockTransactionsSSR";
import AddressSSR from "./execution/AddressSSR";
import BroadcastTransactionSSR from "./execution/BroadcastTransactionSSR";

// Lazy loaded components - all require RuntimeContext so are client-only
const Home = lazy(() => import("./Home"));
const Main = lazy(() => import("./Main"));
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
 * RuntimeProvider for client-only routes.
 * Loads config and creates runtime on the client side, then provides the contexts.
 */
const RuntimeProvider: FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = <SSRSkeleton />
}) => {
  const [runtime, setRuntime] = useState<OtterscanRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initRuntime = async () => {
      try {
        const config = loadOtterscanConfig();
        const rt = await populateChainInfo(createRuntime(config));
        if (!cancelled) {
          setRuntime(rt);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-red-500">Error loading application: {error.message}</div>
      </div>
    );
  }

  if (!runtime) {
    return <>{fallback}</>;
  }

  return (
    <RuntimeContext.Provider value={runtime}>
      <ChainInfoContext.Provider value={runtime.config.chainInfo}>
        {children}
      </ChainInfoContext.Provider>
    </RuntimeContext.Provider>
  );
};

/**
 * SSR loading skeleton - rendered during SSR while waiting for hydration.
 * This provides a basic page structure that gets replaced on the client.
 */
const SSRSkeleton: FC = () => (
  <div className="flex h-screen flex-col">
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  </div>
);

/**
 * SSR-compatible App component.
 * Uses Routes instead of createBrowserRouter for server compatibility.
 * Note: Provider/runtime initialization happens only on client after hydration.
 * QueryClientProvider is wrapped in entry-server.tsx and index.tsx
 *
 * SSR-safe routes (homepage, recent blocks, recent transactions) are rendered directly.
 * Other routes require RuntimeContext and are wrapped in ClientOnly.
 */
const AppSSR: FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppConfigProvider>
        <div className="flex h-screen flex-col">
          <Routes>
            {/* SSR-safe routes - render synchronously with prefetched data from QueryClient cache */}
            <Route path="/" element={<HomeSSR />} />
            <Route path="/blocks/recent" element={<RecentBlocksRest />} />
            <Route path="/tx/recent" element={<RecentTransactionsRest />} />
            <Route path="/block/:blockNumberOrHash" element={<BlockSSR />} />
            <Route path="/block/:blockNumber/txs" element={<BlockTransactionsSSR />} />
            <Route path="/tx/:txhash" element={<TransactionSSR />} />
            <Route path="/tx/:txhash/logs" element={<TransactionLogsSSR />} />
            <Route path="/tx/:txhash/trace" element={<TransactionTraceSSR />} />
            <Route path="/tx/:txhash/statediff" element={<TransactionStateDiffSSR />} />
            <Route path="/address/:addressOrName" element={<AddressSSR />}>
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
            <Route path="/broadcastTx" element={<BroadcastTransactionSSR />} />

            {/* All other routes require RuntimeContext and lazy loading, wrap in Suspense + ClientOnly + RuntimeProvider */}
            <Route path="/*" element={
              <Suspense fallback={<SSRSkeleton />}>
                <ClientOnly fallback={<SSRSkeleton />}>
                  <RuntimeProvider>
                    <WarningHeader />
                    <Routes>
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
                      <Route path="broadcastTx" element={<BroadcastTransactionPage />} />
                      <Route path="*" element={<PageNotFound />} />
                    </Route>
                    </Routes>
                  </RuntimeProvider>
                </ClientOnly>
              </Suspense>
            } />
          </Routes>
        </div>
      </AppConfigProvider>
    </ErrorBoundary>
  );
};

export default AppSSR;
