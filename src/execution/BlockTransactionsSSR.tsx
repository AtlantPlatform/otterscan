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

  const titleToSet = `Transactions in Ethereum Block ${blockNumber}`;
  const description = `Explore all ${total} transactions in Ethereum block ${blockNumber}. View transaction hashes, sender and recipient addresses, values, and gas fees.`;

  const payloadSchemaWebPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "url": `https://ethscan.org/block/${blockNumber}/txs`,
    "name": titleToSet,
    "description": description,
    "numberOfItems": total,
    "itemListElement": transformedTxs.slice(0, 10).map((item: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "DigitalDocument",
        "identifier": item.hash,
        "name": `Transaction ${item.hash.substring(0, 10)}...`,
        "description": `Ethereum transaction with value ${formatEther(item.value || 0n)} ETH`
      }
    }))
  });

  const payloadSchemaFaqPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an Ethereum transaction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Ethereum transaction is a transfer of data or value between addresses on the Ethereum blockchain, often including smart contract interactions."
        }
      },
      {
        "@type": "Question",
        "name": "How can I check the details of a transaction on Ethscan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Enter the transaction hash in the Ethscan search bar to view details like sender, recipient, and gas fees."
        }
      },
      {
        "@type": "Question",
        "name": "What do gas fees in a transaction mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gas fees are the costs paid to execute a transaction on the Ethereum network. They compensate validators for the computing energy required to process and validate transactions."
        }
      }
    ]
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>{titleToSet} | Ethscan</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={`https://ethscan.org/block/${blockNumber}/txs`} />
          <script type="application/ld+json">{payloadSchemaWebPage}</script>
          <script type="application/ld+json">{payloadSchemaFaqPage}</script>
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
                          <th>From</th>
                          <th>To</th>
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
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                            </td>
                            <td className="px-1 py-3">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
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
                          <th>From</th>
                          <th>To</th>
                          <th>Value</th>
                          <th>Fee</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
                        {transformedTxs.map((tx: any) => (
                          <tr key={tx.hash}>
                            <td>
                              <Link
                                className="text-link-blue hover:text-link-blue-hover font-mono text-sm"
                                to={`/tx/${tx.hash}`}
                              >
                                {tx.hash.substring(0, 10)}...
                              </Link>
                            </td>
                            <td>
                              <Link
                                className="text-link-blue hover:text-link-blue-hover font-mono text-sm"
                                to={`/address/${tx.from}`}
                              >
                                {tx.from.substring(0, 10)}...
                              </Link>
                            </td>
                            <td>
                              {tx.to ? (
                                <Link
                                  className="text-link-blue hover:text-link-blue-hover font-mono text-sm"
                                  to={`/address/${tx.to}`}
                                >
                                  {tx.to.substring(0, 10)}...
                                </Link>
                              ) : (
                                <span className="text-gray-500 text-sm">Contract</span>
                              )}
                            </td>
                            <td>
                              <span className="text-sm">
                                {formatEther(tx.value).substring(0, 8)} ETH
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-600">
                                {formatEther(tx.fee).substring(0, 10)} ETH
                              </span>
                            </td>
                            <td>
                              <span className={`text-xs px-1 py-0.5 rounded ${
                                tx.status === 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {tx.status === 0 ? 'Failed' : 'Success'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="block sm:hidden space-y-3">
                  {transformedTxs.map((tx: any) => (
                    <div key={tx.hash} className="bg-white rounded-lg shadow-sm border p-4 space-y-3 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-gray-700">Transaction</span>
                        <Link
                          to={`/tx/${tx.hash}`}
                          className="text-sm text-link-blue font-mono break-all max-w-[60%]"
                        >
                          {tx.hash.substring(0, 16)}...
                        </Link>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">From</span>
                        <Link
                          to={`/address/${tx.from}`}
                          className="text-sm text-link-blue font-mono"
                        >
                          {tx.from.substring(0, 12)}...
                        </Link>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">To</span>
                        {tx.to ? (
                          <Link
                            to={`/address/${tx.to}`}
                            className="text-sm text-link-blue font-mono"
                          >
                            {tx.to.substring(0, 12)}...
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500">Contract Creation</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Value</span>
                        <span className="text-sm">{formatEther(tx.value).substring(0, 8)} ETH</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          tx.status === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {tx.status === 0 ? 'Failed' : 'Success'}
                        </span>
                      </div>
                    </div>
                  ))}
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
        </div>

        {/* FAQ Section */}
        <div className="px-3 lg:px-9 py-6 max-w-7xl mx-auto">
          <div className="mt-12 space-y-6 min-h-[600px]">
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is an Ethereum transaction?</h3>
              <p>An Ethereum transaction is a transfer of data or value between addresses on the Ethereum blockchain, often including smart contract interactions.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How can I check the details of a transaction on Ethscan?</h3>
              <p>Enter the transaction hash in the Ethscan search bar to view details like sender, recipient, and gas fees.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What do gas fees in a transaction mean?</h3>
              <p>Gas fees are the costs paid to execute a transaction on the Ethereum network. They compensate validators for the computing energy required to process and validate transactions.</p>
            </div>
          </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default BlockTransactionsSSR;
