import { faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router";
import { Helmet } from "react-helmet-async";
import StandardFrame from "../components/StandardFrame";
import SimplePageControl from "../search/SimplePageControl";
import StandardSelectionBoundary from "../selection/StandardSelectionBoundary";
import TransactionItem from "../search/TransactionItem";
import TransactionLink from "../components/TransactionLink";
import { FeeDisplay } from "../search/useFeeToggler";
import { ProcessedTransaction } from "../types";
import { useBlockTransactions } from "../useErigonHooks";
import { useLatestBlockHeader } from "../useLatestBlock";
import { RuntimeContext } from "../useRuntime";
import { usePageTitle } from "../useTitle";

const TRANSACTIONS_PER_PAGE = 30;

const RecentTransactions: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  
  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) {}
  }

  const latestBlock = useLatestBlockHeader(provider);
  
  // Calculate starting block based on page number
  const startingBlockOffset = (pageNumber - 1) * 2; // Skip 2 blocks per page
  const targetBlockNumber = latestBlock && latestBlock.number > startingBlockOffset
    ? latestBlock.number - startingBlockOffset 
    : latestBlock?.number;
  
  // Fetch from current and previous block to ensure we have enough transactions
  const { data: primaryBlockTxs, isLoading: isLoadingPrimary } = useBlockTransactions(
    provider,
    targetBlockNumber,
    0,
    50 // Fetch more transactions to ensure we have enough
  );
  
  // Always fetch from previous block as fallback
  const secondaryBlockNumber = targetBlockNumber && targetBlockNumber > 1 ? targetBlockNumber - 1 : undefined;
  const { data: secondaryBlockTxs, isLoading: isLoadingSecondary } = useBlockTransactions(
    provider,
    secondaryBlockNumber,
    0,
    50
  );
  
  // Combine transactions from both blocks
  const allTxs = [
    ...(primaryBlockTxs?.txs || []),
    ...(secondaryBlockTxs?.txs || [])
  ];
  
  // Sort by block number and transaction index to maintain proper order
  const sortedTxs = allTxs.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return b.blockNumber - a.blockNumber; // Newer blocks first
    }
    return a.idx - b.idx; // Same block, sort by transaction index
  });
  
  const transactions = sortedTxs.slice(0, TRANSACTIONS_PER_PAGE);
  const isLoadingAll = isLoadingPrimary || isLoadingSecondary;
  
  // Estimate total transactions (approximate)
  const estimatedTotal = latestBlock ? latestBlock.number * 50 : 1000;

  usePageTitle("Recent Transactions");

  return (
    <StandardFrame>
      <Helmet>
        <title>Recent Transactions | Ethereum Explorer</title>
        <meta name="description" content="Browse the latest Ethereum transactions with detailed information about transfers, fees, and methods." />
      </Helmet>
      
      <div className="px-9 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center space-x-3">
            <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-500" />
            <span>Recent Transactions</span>
          </h1>
          {!isLoadingAll && transactions.length > 0 && (
            <SimplePageControl
              pageNumber={pageNumber}
              pageSize={TRANSACTIONS_PER_PAGE}
              total={estimatedTotal}
            />
          )}
        </div>

        {isLoadingAll ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading transactions...</div>
          </div>
        ) : transactions.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <StandardSelectionBoundary>
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-scroll">
                    <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
                      <thead>
                        <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                          <th>Transaction Hash</th>
                          <th>Method</th>
                          <th className="w-28">Block</th>
                          <th className="w-36">Date/Time</th>
                          <th>Value</th>
                          <th>Fee</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200 hover:[&>tr]:bg-skin-table-hover">
                        {transactions.map((tx) => (
                          <TransactionItem
                            key={tx.hash}
                            tx={tx}
                            feeDisplay={FeeDisplay.TX_FEE}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </StandardSelectionBoundary>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {transactions.map((tx) => {
                const timestamp = new Date(tx.timestamp * 1000);
                const formattedTime = timestamp.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
                
                return (
                  <div key={tx.hash} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Transaction Hash</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-1 py-0.5 rounded ${tx.status === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {tx.status === 0 ? 'Failed' : 'Success'}
                        </span>
                        <NavLink 
                          to={`/tx/${tx.hash}`}
                          className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {tx.hash.substring(0, 10)}...
                        </NavLink>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Method</span>
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tx.to ? 'Contract Call' : 'Transfer'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Block</span>
                      <NavLink 
                        to={`/block/${tx.blockNumber}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        {tx.blockNumber}
                      </NavLink>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Date/Time</span>
                      <span className="text-sm text-gray-800" title={formattedTime}>{formattedTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Value</span>
                      <span className="text-sm text-gray-800">
                        {tx.value && tx.value > 0n ? (
                          <span>{(Number(tx.value) / 1e18).toFixed(6)} ETH</span>
                        ) : (
                          <span className="text-gray-400">0 ETH</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fee</span>
                      <span className="text-sm text-gray-800">
                        {tx.fee ? (
                          <span>{(Number(tx.fee) / 1e18).toFixed(6)} ETH</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center mt-6">
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={TRANSACTIONS_PER_PAGE}
                total={estimatedTotal}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">No transactions found.</div>
          </div>
        )}
      </div>
    </StandardFrame>
  );
};

export default RecentTransactions;