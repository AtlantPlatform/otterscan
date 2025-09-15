import { faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import StandardFrame from "../components/StandardFrame";
import SimplePageControl from "../search/SimplePageControl";
import StandardSelectionBoundary from "../selection/StandardSelectionBoundary";
import TransactionItem from "../search/TransactionItem";
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
  
  // State to hold combined transactions from multiple blocks
  const [allTransactions, setAllTransactions] = useState<ProcessedTransaction[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const blocksToCheck = 10; // Check more blocks to have enough transactions for pagination
  
  // Calculate starting block based on page number
  const startingBlockOffset = (pageNumber - 1) * 3; // Skip blocks for previous pages
  const blockNumber = latestBlock ? latestBlock.number - startingBlockOffset - currentBlockIndex : undefined;
  
  const { data: currentBlockTxs, isLoading: isLoadingBlock } = useBlockTransactions(
    provider,
    blockNumber,
    0,
    30 // Load 30 transactions per block
  );
  
  // Collect transactions from multiple blocks
  useEffect(() => {
    if (!latestBlock) return;
    
    if (currentBlockTxs && currentBlockTxs.txs) {
      setAllTransactions(prev => [...prev, ...currentBlockTxs.txs]);
    }
    
    if (currentBlockIndex < blocksToCheck - 1 && !isLoadingBlock) {
      // Fetch next block
      setCurrentBlockIndex(prev => prev + 1);
    } else if (currentBlockIndex >= blocksToCheck - 1) {
      // Done fetching all blocks
      setIsLoadingAll(false);
    }
  }, [currentBlockTxs, currentBlockIndex, isLoadingBlock, latestBlock, blocksToCheck]);
  
  // Reset when latest block or page changes
  useEffect(() => {
    setAllTransactions([]);
    setCurrentBlockIndex(0);
    setIsLoadingAll(true);
  }, [latestBlock?.number, pageNumber]);
  
  // Paginate the collected transactions
  const totalTxs = allTransactions.length;
  const startIdx = 0; // Always show from start since we're fetching different blocks per page
  const endIdx = Math.min(TRANSACTIONS_PER_PAGE, allTransactions.length);
  const transactions = allTransactions.slice(startIdx, endIdx);
  
  // Estimate total transactions (approximate)
  const estimatedTotal = latestBlock ? latestBlock.number * 10 : 1000;

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
                        <span className="text-sm text-blue-600 font-mono">{tx.hash.substring(0, 10)}...</span>
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
                      <span className="text-sm text-blue-600">{tx.blockNumber}</span>
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