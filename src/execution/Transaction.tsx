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
import { usePageTitle } from "../useTitle";
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
        <StandardFrame>
          <h1 className="pb-2 text-xl text-gray-700">Transaction Details</h1>
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
              {/* SEO Summary Section */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Transaction Summary</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Ethereum transaction {txHash} {txData.confirmedData ? 
                    `was confirmed in block #${txData.confirmedData.blockNumber} with status ${txData.confirmedData.status ? 'success' : 'failed'}. 
                    The transaction was sent from ${txData.from} to ${txData.to || 'contract creation'} with a value of ${txData.value} wei. 
                    Gas used was ${txData.confirmedData.gasUsed} out of ${txData.gasLimit} gas limit, with a gas price of ${txData.gasPrice} wei. 
                    The transaction includes ${txData.confirmedData.logs?.length || 0} log events.` :
                    'is pending confirmation.'}
                </p>
              </div>
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
