import { FC, lazy, Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Routes, Route } from "react-router";
import ErrorFallback from "./components/ErrorFallback";
import Home from "./Home";
import Main from "./Main";
import { SourcifySource } from "./sourcify/useSourcify";
import { AppConfig, AppConfigContext } from "./useAppConfig";
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
 * QueryClientProvider is wrapped in entry-server.tsx and index.tsx
 */
const AppSSR: FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
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
    </ErrorBoundary>
  );
};

export default AppSSR;
