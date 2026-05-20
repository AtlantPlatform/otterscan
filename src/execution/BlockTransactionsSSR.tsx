import { faCube } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { useParams, useSearchParams, Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther } from "ethers";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import BlockLink from "../components/BlockLink";
import NavBlock from "../components/NavBlock";
import SimplePageControl from "../search/SimplePageControl";
import { useBlockTransactionsSSR } from "../api/useRestTransactions";
import { useLatestBlockNumber } from "../api/useRestBlocks";
import { blockTxsURL } from "../url";
import { PAGE_SIZE } from "../params";
import { extract4Bytes } from "../use4Bytes";
import { useTimezone } from "../useTimezone";
import { formatTimestamp } from "../utils/timestamp";

/**
 * SSR-safe Block Transactions page component.
 * Uses REST API hooks instead of RuntimeContext/provider.
 */
const BlockTransactionsSSR: React.FC = () => {
  const params = useParams();
  if (params.blockNumber === undefined) {
    throw new Error("blockNumber couldn't be undefined here");
  }
  const blockNumber = parseInt(params.blockNumber);

  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) {}
  }

  const { transactions, total, isLoading } = useBlockTransactionsSSR(blockNumber, pageNumber, PAGE_SIZE);
  const { latestBlockNumber } = useLatestBlockNumber();
  const timeZone = useTimezone();

  // Transform REST API response to expected format
  const transformedTxs = transactions.map((tx: any) => ({
    blockNumber,
    timestamp: tx.timestamp || 0,
    idx: tx.index,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: BigInt(tx.value || '0'),
    type: tx.type,
    fee: BigInt(tx.fee || '0'),
    status: tx.status,
    data: tx.data || '0x',
  }));

  // FAQ content for both schema and UI display
  const faqItems = [
    {
      question: "What are Ethereum block transactions?",
      answer: "Ethereum block transactions are individual transactions that have been confirmed and included in a specific block on the Ethereum blockchain."
    },
    {
      question: "How many transactions can be included in an Ethereum block?",
      answer: "The number of transactions in an Ethereum block varies depending on gas usage and block gas limits rather than a fixed transaction count."
    },
    {
      question: "Why do some Ethereum blocks have more transactions than others?",
      answer: "Blocks differ in transaction count because each transaction consumes gas, and blocks are limited by total gas usage rather than the number of transactions."
    },
    {
      question: "How can I view details of a specific transaction?",
      answer: "Click on a transaction hash to open its transaction details page, where you can see gas fees, sender and receiver addresses, and execution status."
    }
  ];

  const payloadSchemaGraph = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Ethscan",
        "url": "https://ethscan.org/",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://ethscan.org/search?q={query}",
          "query-input": "required name=query"
        }
      },
      {
        "@type": "Organization",
        "name": "Ethscan",
        "url": "https://ethscan.org/"
      },
      {
        "@type": "Dataset",
        "name": `Transactions in Ethereum Block ${blockNumber}`,
        "description": `A dataset listing all transactions included in Ethereum block ${blockNumber}, including transaction hashes, sender and receiver addresses, ETH values, gas fees, and execution status.`,
        "url": `https://ethscan.org/block/${blockNumber}/txs`,
        "includedInDataCatalog": {
          "@type": "DataCatalog",
          "name": "Ethscan Ethereum Blockchain Data"
        },
        "variableMeasured": [
          {
            "@type": "PropertyValue",
            "name": "Transaction Hash"
          },
          {
            "@type": "PropertyValue",
            "name": "Value (ETH)"
          },
          {
            "@type": "PropertyValue",
            "name": "Gas Fee"
          },
          {
            "@type": "PropertyValue",
            "name": "Transaction Status"
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ethscan.org/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Recent Ethereum Blocks",
            "item": "https://ethscan.org/blocks/recent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": `Block ${blockNumber}`,
            "item": `https://ethscan.org/block/${blockNumber}`
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "Transactions",
            "item": `https://ethscan.org/block/${blockNumber}/txs`
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>{`Ethereum Block ${blockNumber} Transactions - Full Transaction List | Ethscan`}</title>
          <meta name="robots" content="noindex,follow" />
          <meta name="description" content={`View all transactions included in Ethereum block ${blockNumber}. Explore transaction hashes, wallet addresses, ETH values, gas fees, and execution details on Ethscan.`} />
          <link rel="canonical" href={`https://ethscan.org/block/${blockNumber}/txs`} />

          {/* OpenGraph */}
          <meta property="og:title" content={`Ethereum Block ${blockNumber} Transactions - Full Transaction List | Ethscan`} />
          <meta property="og:description" content={`Explore all transactions in Ethereum block ${blockNumber}. View transaction hashes, addresses, ETH values, gas fees, and execution details on Ethscan.`} />
          <meta property="og:url" content={`https://ethscan.org/block/${blockNumber}/txs`} />

          {/* Twitter */}
          <meta name="twitter:title" content={`Ethereum Block ${blockNumber} Transactions - Full Transaction List | Ethscan`} />
          <meta name="twitter:description" content={`Explore all transactions in Ethereum block ${blockNumber}. View transaction hashes, addresses, ETH values, gas fees, and execution details on Ethscan.`} />

          <script type="application/ld+json">{payloadSchemaGraph}</script>
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="px-3 lg:px-9">
            <StandardSubtitle>
              <h1 className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 space-y-1 sm:space-y-0">
                <span>Transactions</span>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <span>For Block</span>
                  <BlockLink blockTag={blockNumber} />
                  <NavBlock
                    entityNum={blockNumber}
                    latestEntityNum={latestBlockNumber}
                    urlBuilder={blockTxsURL}
                  />
                </div>
              </h1>
            </StandardSubtitle>
          </div>

          {/* Pagination Control - Top */}
          {!isLoading && total > PAGE_SIZE && (
            <div className="flex justify-between items-center mb-4 px-3 lg:px-9">
              <div className="text-sm text-gray-600">
                Showing {((pageNumber - 1) * PAGE_SIZE) + 1} to {Math.min(pageNumber * PAGE_SIZE, total)} of {total} transactions
              </div>
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={PAGE_SIZE}
                total={total}
              />
            </div>
          )}

          <div className="px-3 lg:px-9">
            {isLoading ? (
              <>
                {/* Desktop Skeleton */}
                <div className="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
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
                        {[...Array(PAGE_SIZE)].map((_, i) => (
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

                {/* Mobile Skeleton */}
                <div className="block sm:hidden space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
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
                        {transformedTxs.map((tx: any) => {
                          const fourBytes = extract4Bytes(tx.data);
                          const isSimpleTransfer = tx.data === "0x";
                          const methodLabel = isSimpleTransfer ? "transfer" : (fourBytes ?? "-");

                          return (
                            <tr key={tx.hash}>
                              <td className="max-w-[14.5rem]">
                                <Link
                                  to={`/tx/${tx.hash}`}
                                  className={`flex items-baseline space-x-1 font-hash text-link-blue hover:text-link-blue-hover ${tx.status === 0 ? 'line-through opacity-70' : ''}`}
                                >
                                  <span className="truncate">{tx.hash}</span>
                                </Link>
                              </td>
                              <td className="min-w-32 max-w-32">
                                <div className="method-badge flex min-h-full max-w-max items-baseline rounded-lg px-3 py-1 text-xs">
                                  <p className="truncate">{methodLabel}</p>
                                </div>
                              </td>
                              <td className="max-w-28">
                                <Link
                                  to={`/block/${tx.blockNumber}`}
                                  className="flex items-baseline space-x-1 text-link-blue hover:text-link-blue-hover font-blocknum whitespace-nowrap"
                                >
                                  <span className="text-orange-500">
                                    <FontAwesomeIcon className="self-center" icon={faCube} size="1x" />
                                  </span>
                                  <span>{tx.blockNumber.toLocaleString()}</span>
                                </Link>
                              </td>
                              <td className="min-w-36 max-w-36 text-gray-600" title={formatTimestamp(tx.timestamp, timeZone)}>
                                {formatTimestamp(tx.timestamp, timeZone)}
                              </td>
                              <td className="min-w-48 max-w-48">
                                {tx.value > 0n ? (
                                  <span>{formatEther(tx.value).substring(0, 10)} ETH</span>
                                ) : (
                                  <span className="text-gray-400">0 ETH</span>
                                )}
                              </td>
                              <td className="min-w-16 max-w-28">
                                <span className="truncate font-balance text-xs text-gray-500">
                                  {tx.fee > 0n ? formatEther(tx.fee).substring(0, 10) : "-"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="block sm:hidden space-y-3">
                  {transformedTxs.map((tx: any) => {
                    const fourBytes = extract4Bytes(tx.data);
                    const isSimpleTransfer = tx.data === "0x";
                    const methodLabel = isSimpleTransfer ? "transfer" : (fourBytes ?? "-");
                    const formattedTime = formatTimestamp(tx.timestamp, timeZone);

                    return (
                      <div key={tx.hash} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col space-y-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaction</span>
                            <span className={`text-xs px-1 py-0.5 rounded self-start ${
                              tx.status === 0
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              {tx.status === 0 ? 'Failed' : 'Success'}
                            </span>
                          </div>
                          <Link
                            to={`/tx/${tx.hash}`}
                            className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300 break-all max-w-[60%]"
                          >
                            {tx.hash}
                          </Link>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                          <div className="method-badge text-xs px-2 py-1 rounded">
                            {methodLabel}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Block</span>
                          <Link
                            to={`/block/${tx.blockNumber}`}
                            className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <span className="text-orange-500">
                              <FontAwesomeIcon icon={faCube} size="sm" />
                            </span>
                            <span>{tx.blockNumber.toLocaleString()}</span>
                          </Link>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Date/Time</span>
                          <span className="text-sm text-gray-800 dark:text-gray-200" title={formattedTime}>{formattedTime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Value</span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {tx.value > 0n ? (
                              <span>{formatEther(tx.value).substring(0, 8)} ETH</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">0 ETH</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fee</span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {tx.fee > 0n ? (
                              <span>{formatEther(tx.fee).substring(0, 8)} ETH</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">-</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pagination Control - Bottom */}
          {!isLoading && total > PAGE_SIZE && (
            <div className="flex justify-center mt-6 px-3 lg:px-9">
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={PAGE_SIZE}
                total={total}
              />
            </div>
          )}

          {/* Description Text */}
          <div className="px-3 lg:px-9 mt-6">
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                This page lists all transactions included in Ethereum block {blockNumber.toLocaleString()}. Each transaction is confirmed on the Ethereum mainnet and can be explored in detail.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="px-3 lg:px-9 mt-6">
            <div className="h-64 overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
                {faqItems.map((item, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">{item.question}</h3>
                    <p>{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default BlockTransactionsSSR;
