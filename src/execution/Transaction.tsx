import { TabGroup, TabList } from "@headlessui/react";
import React, { FC, Suspense, lazy, useContext } from "react";
import { Route, Routes, useParams } from "react-router";
import ContentFrame from "../components/ContentFrame";
import NavTab from "../components/NavTab";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import StandardSelectionBoundary from "../selection/StandardSelectionBoundary";
import { BlockNumberContext } from "../useBlockTagContext";
import { useTxData } from "../useErigonHooks";
import { RuntimeContext } from "../useRuntime";
import { SelectedTransactionContext } from "../useSelectedTransaction";
import {Helmet} from 'react-helmet-async';

const Details = lazy(() => import("./transaction/Details"));
const Logs = lazy(() => import("./transaction/Logs"));
const Trace = lazy(() => import("./transaction/Trace"));
const StateDiff = lazy(() => import("./transaction/StateDiff"));

const Transaction: FC = () => {
  const { txhash: txHash } = useParams();
  if (txHash === undefined) {
    throw new Error("txhash couldn't be undefined here");
  }

  const { provider } = useContext(RuntimeContext);
  const txData = useTxData(provider, txHash);

  return (
    <SelectedTransactionContext.Provider value={txData}>
      <BlockNumberContext.Provider value={txData?.confirmedData?.blockNumber}>
        <Helmet>
          <title>Transaction {txHash.slice(0, 10)}... | Ethscan</title>
          <meta name="description" content={`View details for Ethereum transaction ${txHash} including gas fees, input data, logs, and trace information.`} />
          <link rel="canonical" href={`https://ethscan.org/tx/${txHash}`} />

          {/* Open Graph meta tags */}
          <meta property="og:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
          <meta property="og:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`https://ethscan.org/tx/${txHash}`} />
          <meta property="og:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
          <meta property="og:image:width" content="1280" />
          <meta property="og:image:height" content="640" />
          <meta property="og:site_name" content="Ethscan" />

          {/* Twitter Card meta tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
          <meta name="twitter:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
          <meta name="twitter:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
          <meta name="twitter:site" content="@ethscan" />
        </Helmet>
        <StandardFrame>
          <StandardSubtitle>
            <h1 className="flex items-baseline space-x-1">
              <span>Transaction</span>
              <span className="text-base text-gray-500 font-hash" data-test="transaction-hash">
                {txHash}
              </span>
            </h1>
          </StandardSubtitle>
          {txData === null && (
            <ContentFrame>
              <div className="py-4 text-sm">
                Transaction <span className="font-hash">{txHash}</span> not
                found.
              </div>
            </ContentFrame>
          )}
          {txData && (
            <>
            <StandardSelectionBoundary>
              <TabGroup>
                <TabList className="flex space-x-2 rounded-t-lg border-l border-r border-t bg-white">
                  <NavTab href="..">Overview</NavTab>
                  {txData.confirmedData?.blockNumber !== undefined && (
                    <NavTab href="../logs">
                      Logs
                      {` (${txData.confirmedData?.logs?.length ?? 0})`}
                    </NavTab>
                  )}
                  <NavTab href="../trace">Trace</NavTab>
                  <NavTab href="../statediff">State Diff</NavTab>
                </TabList>
              </TabGroup>
              <Suspense fallback={null}>
                <Routes>
                  <Route index element={<Details txData={txData} />} />
                  <Route
                    path="logs"
                    element={<Logs logs={txData.confirmedData?.logs} txHash={txHash} />}
                  />
                  <Route path="trace" element={<Trace txData={txData} txHash={txHash} />} />
                  <Route
                    path="statediff"
                    element={<StateDiff txData={txData} txHash={txHash} />}
                  />
                </Routes>
              </Suspense>
            </StandardSelectionBoundary>
            </>
          )}
        </StandardFrame>
      </BlockNumberContext.Provider>
    </SelectedTransactionContext.Provider>
  );
};

export default Transaction;
