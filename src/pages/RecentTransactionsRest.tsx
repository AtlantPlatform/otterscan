import { faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther } from "ethers";
import StandardFrame from "../components/StandardFrame";
import SimplePageControl from "../search/SimplePageControl";
import StandardSelectionBoundary from "../selection/StandardSelectionBoundary";
import TransactionItem from "../search/TransactionItem";
import { FeeDisplay } from "../search/useFeeToggler";
import { transactionsAPI } from "../api/client";
import { useChainInfo } from "../useChainInfo";
import MethodName from "../components/MethodName";

const TRANSACTIONS_PER_PAGE = 30;

interface RestTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  type: number;
  status: number;
  gasUsed: number;
  fee: string;
  index: number;
  blockNumber: number;
  timestamp: number;
  data: string;
}

const RecentTransactionsRest: React.FC = () => {
  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) { }
  }

  const [transactions, setTransactions] = useState<RestTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  const {
    nativeCurrency: { symbol },
  } = useChainInfo();

  // Fetch transactions for current page
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const data = await transactionsAPI.getRecent(pageNumber, TRANSACTIONS_PER_PAGE);
        setTransactions(data.transactions);
        setEstimatedTotal(data.total);
      } catch (error) {
        console.error("Failed to fetch recent transactions:", error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [pageNumber]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <title>Recent Transactions | Ethscan</title>
          <meta name="description" content="View the latest Ethereum transactions with real-time updates on transaction hashes, values, gas prices, and contract interactions." />
          <link rel="canonical" href="https://ethscan.org/tx/recent" />
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-3 lg:px-9">
            <h1 className="text-2xl font-bold flex items-center space-x-3">
              <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-500" />
              <span>Recent Ethereum Transactions</span>
            </h1>
            {!isLoading && transactions.length > 0 && (
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={TRANSACTIONS_PER_PAGE}
                total={estimatedTotal}
              />
            )}
          </div>

          {isLoading ? (
            <>
              {/* Desktop Skeleton */}
              <div className="hidden sm:block mx-3 lg:mx-9">
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-scroll">
                    <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm">
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
                      <tbody>
                        {[...Array(TRANSACTIONS_PER_PAGE)].map((_, i) => (
                          <tr key={i} className="border-t border-gray-200">
                            <td className="px-1 py-3 pl-2">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                            </td>
                            <td className="px-1 py-3">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                            </td>
                            <td className="px-1 py-3">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                            </td>
                            <td className="px-1 py-3">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                            </td>
                            <td className="px-1 py-3">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                            </td>
                            <td className="px-1 py-3 pr-2">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mobile Skeleton */}
              <div className="block sm:hidden space-y-3 px-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                ))}
              </div>
            </>
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
                          {transactions.map((tx) => {
                            // Convert REST API format to ProcessedTransaction format for TransactionItem
                            const processedTx = {
                              blockNumber: tx.blockNumber,
                              timestamp: tx.timestamp,
                              miner: "",
                              idx: tx.index,
                              hash: tx.hash,
                              from: tx.from,
                              to: tx.to,
                              value: BigInt(tx.value),
                              type: tx.type,
                              fee: BigInt(tx.fee),
                              gasPrice: 0n,
                              data: tx.data,
                              status: tx.status,
                            };
                            return (
                              <TransactionItem
                                key={tx.hash}
                                tx={processedTx}
                                feeDisplay={FeeDisplay.TX_FEE}
                              />
                            );
                          })}
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

                  // Convert hex strings to BigInt for ethers.js formatEther
                  const valueBigInt = BigInt(tx.value);
                  const feeBigInt = BigInt(tx.fee);

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
                          {tx.to && <MethodName data={tx.data} to={tx.to} />}
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
                          {valueBigInt > 0n ? (
                            <span>{formatEther(valueBigInt).substring(0, 8)} {symbol}</span>
                          ) : (
                            <span className="text-gray-400">0 {symbol}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Fee</span>
                        <span className="text-sm text-gray-800">
                          {feeBigInt > 0n ? (
                            <span>{formatEther(feeBigInt).substring(0, 8)} {symbol}</span>
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

          {/* SEO Content Section - Fixed height to prevent layout shift */}
          <div className="mt-12 px-3 lg:px-9 min-h-[600px]">
            <div className="h-96 overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ethereum Transactions</h2>
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

export default RecentTransactionsRest;
