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

const TRANSACTIONS_PER_PAGE = 30;

const RecentTransactions: React.FC = () => {
  const { provider } = useContext(RuntimeContext);

  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) { }
  }

  const latestBlock = useLatestBlockHeader(provider);
  
  // Store the initial block number to prevent reloading when new blocks arrive
  const [initialBlockNumber, setInitialBlockNumber] = useState<number | undefined>(undefined);
  
  useEffect(() => {
    // Reset when page changes
    setInitialBlockNumber(undefined);
  }, [pageNumber]);
  
  useEffect(() => {
    // Set the initial block number once when latestBlock is first available
    if (latestBlock && initialBlockNumber === undefined) {
      setInitialBlockNumber(latestBlock.number);
    }
  }, [latestBlock, initialBlockNumber]);

  // Calculate starting block based on page number
  const startingBlockOffset = (pageNumber - 1) * 2; // Skip 2 blocks per page
  const targetBlockNumber = initialBlockNumber && initialBlockNumber > startingBlockOffset
    ? initialBlockNumber - startingBlockOffset
    : initialBlockNumber;

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
  const estimatedTotal = initialBlockNumber ? initialBlockNumber * 50 : 1000;


  return (
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <title>Recent Transactions | Ethscan</title>
          <meta name="description" content="Browse the latest Ethereum transactions with detailed information about transfers, fees, and methods." />
          <link rel="canonical" href="https://ethscan.org/tx/recent" />

          {/* Open Graph tags */}
          <meta property="og:title" content="Recent Transactions | Ethscan" />
          <meta property="og:description" content="Browse the latest Ethereum transactions with detailed information about transfers, fees, and methods." />
          <meta property="og:url" content="https://ethscan.org/tx/recent" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Ethscan" />

          {/* Twitter tags */}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content="Recent Transactions | Ethscan" />
          <meta name="twitter:description" content="Browse the latest Ethereum transactions with detailed information about transfers, fees, and methods." />
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-3 lg:px-9">
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
            <div className="text-center py-8 px-3 lg:px-9">
              <div className="text-gray-500">Loading transactions...</div>
            </div>
          ) : transactions.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block mx-3 lg:mx-9">
                <StandardSelectionBoundary>
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-scroll">
                    <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
                      <thead>
                        <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                          <th>Transaction</th>
                          <th>Method</th>
                          <th className="w-28">Block</th>
                          <th className="w-36">Date/Time</th>
                          <th>Value</th>
                          <th>Fee</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
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
            <div className="block sm:hidden space-y-3 px-3">
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
                  <div key={tx.hash} className="bg-white rounded-lg shadow-sm border p-4 space-y-3 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col space-y-2">
                        <span className="text-sm font-semibold text-gray-700">Transaction</span>
                        <span className={`text-xs px-1 py-0.5 rounded self-start ${tx.status === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {tx.status === 0 ? 'Failed' : 'Success'}
                        </span>
                      </div>
                      <NavLink
                        to={`/tx/${tx.hash}`}
                        className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300 break-all max-w-[60%]"
                      >
                        {tx.hash}
                      </NavLink>
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

            <div className="flex justify-center mt-6 px-3 lg:px-9">
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={TRANSACTIONS_PER_PAGE}
                total={estimatedTotal}
              />
            </div>
          </>
        ) : null}

        {/* SEO Content Section */}
        <div className="mt-12 px-3 lg:px-9">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ethereum Transactions</h2>
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-4">
              <p>Ethereum transactions are recorded on a public ledger called the blockchain. Transactions are verified by network validators through the Proof of Stake consensus mechanism, and every recorded transaction is immutable. Ethereum users engage with block explorers to track their ETH transactions, token transfers, and smart contract interactions.</p>

              <p>The sender of a transaction must pay a transaction fee, which consists of a base fee and a priority fee (tip). The base fee is algorithmically determined based on network demand and is burned, while the priority fee goes to the validator. The amount of the fee varies depending on network congestion and the complexity of the transaction. Smart contract interactions typically require more gas than simple ETH transfers.</p>

              <p>When making a transaction, you can choose to include a larger or smaller priority fee. A larger fee results in faster inclusion in a block, especially during periods of high network activity. A smaller fee may result in slower confirmation but can save costs during periods of low network usage.</p>

              <p>Merchants and DeFi protocols usually wait for multiple block confirmations before considering a transaction final, though the number varies based on the value and risk involved. Ethereum transactions are pseudonymous, with all activities linked to addresses rather than real-world identities, offering a degree of privacy while maintaining transparency.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What Is Ethereum Transaction Search?</h3>
              <p>Ethereum transaction search is a process by which you track ETH transactions, token transfers, and smart contract interactions on the blockchain. This can be useful for verifying payments, tracking DeFi positions, monitoring NFT transfers, or investigating specific addresses on the network.</p>

              <p>There are several ways to search for Ethereum transactions. The most popular method is to use a block explorer like Ethscan. These explorers maintain a comprehensive database of all Ethereum transactions and provide a search interface that allows you to query specific addresses, transaction hashes, blocks, or smart contracts.</p>

              <p>Ethscan is an Ethereum transaction search engine that allows users to check specific ETH transactions and their history by inputting various criteria, such as transaction hash, block number, address, or ENS name. Users can view detailed information including gas usage, input data, logs, and internal transactions generated by smart contract execution.</p>
            </div>
          </div>
        </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default RecentTransactions;
