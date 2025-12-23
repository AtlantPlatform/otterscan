import { FC, Suspense, lazy, useState, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther } from "ethers";
import HeaderSSR from "../components/HeaderSSR";

// Module-level log to confirm code is loaded
console.log('[AddressSSR] Module loaded');
import StandardFrame from "../components/StandardFrame";
import ClientOnly from "../components/ClientOnly";
import { useSingleAddress, useAddressTransactions, AddressTransaction } from "../api/useRestAddresses";
import { Link } from "react-router";
import { commify } from "../utils/utils";
import { SourcifySource } from "../sourcify/useSourcify";
import { AppConfig, AppConfigContext } from "../useAppConfig";
import { ChainInfoContext, populateChainInfo } from "../useChainInfo";
import { loadOtterscanConfig } from "../useConfig";
import { createRuntime, RuntimeContext, OtterscanRuntime } from "../useRuntime";
import { ProcessedTransaction, TransactionChunk } from "../types";
import { queryClient } from "../queryClient";

// Lazy load the full Address component for client-side
const AddressMainPage = lazy(() => import("./AddressMainPage"));

/**
 * Convert REST API transactions to ProcessedTransaction format
 * This allows priming the SearchController cache from SSR data
 */
const convertToProcessedTransactions = (
  transactions: AddressTransaction[]
): ProcessedTransaction[] => {
  return transactions.map((tx) => {
    const value = BigInt(tx.value);
    const fee = BigInt(tx.fee);
    const gasUsed = BigInt(tx.gasUsed || 1);
    // Compute gasPrice from fee and gasUsed
    const gasPrice = gasUsed > 0n ? fee / gasUsed : 0n;

    return {
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      idx: tx.index,
      hash: tx.hash,
      from: tx.from,
      to: tx.to || null,
      value,
      type: tx.type,
      fee,
      gasPrice,
      data: tx.data,
      status: tx.status ?? 1, // Default to success if null
    };
  });
};

/**
 * Prime the SearchController RPC cache with REST API data
 * This prevents duplicate fetches after hydration.
 * Must be called synchronously before SearchController runs.
 */
const primeSearchControllerCache = (
  address: string,
  transactions: AddressTransaction[],
  hasMore: boolean
): void => {
  if (transactions.length === 0) return;

  // Convert REST transactions to ProcessedTransaction format
  const processedTxs = convertToProcessedTransactions(transactions);

  // Create the TransactionChunk format expected by SearchController
  const chunk: TransactionChunk = {
    txs: processedTxs,
    firstPage: true,
    lastPage: !hasMore,
  };

  // Prime cache for BOTH lowercase and original case addresses
  // SearchController uses original case, but we don't know which case user entered
  const addresses = [address, address.toLowerCase()];

  for (const addr of addresses) {
    const cacheKey = ['ots_searchTransactionsBefore', addr, 0];
    const existing = queryClient.getQueryData(cacheKey);
    if (!existing) {
      queryClient.setQueryData(cacheKey, chunk);
      console.log('[CachePrimer] Primed RPC cache with', processedTxs.length, 'transactions for', addr);
    }
  }
};

/**
 * Wrapper component that primes the cache synchronously before rendering children.
 * Uses useMemo to run the priming during render (before children mount).
 */
const CachePrimerWrapper: FC<{
  address: string;
  transactions: AddressTransaction[];
  hasMore: boolean;
  children: React.ReactNode;
}> = ({ address, transactions, hasMore, children }) => {
  // Debug: log what we receive
  console.log('[CachePrimerWrapper] address:', address, 'transactions:', transactions.length, 'hasMore:', hasMore);

  // useMemo runs synchronously during render, before children mount
  useMemo(() => {
    if (address && transactions.length > 0) {
      primeSearchControllerCache(address, transactions, hasMore);
    } else {
      console.log('[CachePrimerWrapper] Skipping cache prime - no data');
    }
  }, [address, transactions, hasMore]);

  return <>{children}</>;
};

/**
 * SSR loading skeleton for address page
 */
const AddressLoadingSkeleton: FC = () => (
  <div className="py-6 max-w-7xl mx-auto">
    <div className="px-3 lg:px-9">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mx-3 lg:mx-9 mt-4">
      <div className="bg-white rounded-lg border p-4 animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

/**
 * AppConfig provider for the address page
 */
const AddressAppConfigProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourcifySource, setSourcifySource] = useState<SourcifySource>(
    SourcifySource.CENTRAL_SERVER,
  );
  const appConfig = useMemo((): AppConfig => ({
    sourcifySource,
    setSourcifySource,
  }), [sourcifySource, setSourcifySource]);

  return (
    <AppConfigContext.Provider value={appConfig}>
      {children}
    </AppConfigContext.Provider>
  );
};

/**
 * RuntimeProvider for the address page.
 * Loads config and creates runtime on the client side.
 */
const AddressRuntimeProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <div className="py-6 max-w-7xl mx-auto px-3 lg:px-9">
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">
          Error loading application: {error.message}
        </div>
      </div>
    );
  }

  if (!runtime) {
    return <AddressLoadingSkeleton />;
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
 * SSR-safe Address page component.
 * - During SSR: Shows SEO metadata + loading skeleton
 * - After hydration: Loads full AddressMainPage with transactions
 */
const AddressSSR: FC = () => {
  const { addressOrName } = useParams();
  const { address: addressData } = useSingleAddress(addressOrName);
  const { transactions, total: txTotal, hasMore } = useAddressTransactions(addressOrName, 1, 25);

  if (!addressOrName) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <HeaderSSR />
        <StandardFrame>
          <div className="py-6 max-w-7xl mx-auto px-3 lg:px-9">
            <div className="py-4 text-sm">Address is required.</div>
          </div>
        </StandardFrame>
      </div>
    );
  }

  const balance = addressData?.balance ? BigInt(addressData.balance) : 0n;
  const formattedBalance = formatEther(balance);
  const isContract = addressData?.isContract ?? false;
  const txCount = addressData?.transactionCount ?? 0;

  const title = `Ethereum Address ${addressOrName} | Wallet & Transactions | Ethscan`;
  const description = `View details for Ethereum address ${addressOrName}. Explore wallet balance, transactions, token transfers, and on-chain activity using Ethscan.`;
  const ogDescription = `Explore Ethereum address ${addressOrName}. View wallet balance, transactions, token transfers, and on-chain activity on Ethscan.`;
  const twitterDescription = `Explore Ethereum address ${addressOrName}. View wallet balance, transactions, and token transfers on Ethscan.`;
  const canonicalUrl = `https://ethscan.org/address/${addressOrName}`;

  // FAQ content for UI display
  const faqItems = [
    {
      question: "What is an Ethereum address?",
      answer: "An Ethereum address is a unique 42-character hexadecimal identifier (starting with '0x') used to send and receive ETH and interact with smart contracts on the Ethereum blockchain."
    },
    {
      question: "How can I check the balance of an Ethereum address?",
      answer: "You can view the balance of any Ethereum address on Ethscan by entering the address in the search bar. The balance shows the amount of ETH held by the address."
    },
    {
      question: "What is the difference between an EOA and a smart contract?",
      answer: "An Externally Owned Account (EOA) is controlled by a private key and can initiate transactions. A smart contract is code deployed on the blockchain that executes automatically when triggered by transactions."
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
        "name": `Ethereum Address ${addressOrName}`,
        "description": "A dataset representing on-chain activity for a specific Ethereum address, including wallet balance, transactions, token transfers, and smart contract interactions.",
        "url": canonicalUrl,
        "includedInDataCatalog": {
          "@type": "DataCatalog",
          "name": "Ethscan Ethereum Blockchain Data"
        },
        "variableMeasured": [
          {
            "@type": "PropertyValue",
            "name": "Address",
            "value": addressOrName
          },
          {
            "@type": "PropertyValue",
            "name": "ETH Balance"
          },
          {
            "@type": "PropertyValue",
            "name": "Transaction Count"
          },
          {
            "@type": "PropertyValue",
            "name": "Token Transfers"
          },
          {
            "@type": "PropertyValue",
            "name": "Internal Transactions"
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
            "name": addressOrName,
            "item": canonicalUrl
          }
        ]
      }
    ]
  });

  return (
    <>
      {/* SEO metadata - rendered during SSR */}
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter */}
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={twitterDescription} />

        <script type="application/ld+json">{payloadSchemaGraph}</script>
      </Helmet>

      {/* Client-side: Full AddressMainPage with RuntimeProvider */}
      <ClientOnly
        fallback={
          <div className="min-h-screen overflow-x-hidden">
            <HeaderSSR />
            <StandardFrame>
              <div className="py-6 max-w-7xl mx-auto">
                {/* Address Header */}
                <div className="px-3 lg:px-9">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Address</span>
                    <span className="text-base font-mono">{addressOrName}</span>
                  </h1>
                </div>

                {/* Address Info */}
                {addressData && (
                  <div className="px-3 lg:px-9 mt-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Balance:</span>
                          <div className="text-lg font-semibold">{formattedBalance} ETH</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Transactions:</span>
                          <div className="text-lg font-semibold">{commify(txCount.toString())}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction List */}
                <div className="px-3 lg:px-9 mt-4">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Transactions</h2>
                  {transactions.length > 0 ? (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto text-left text-sm">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 [&>th]:px-2 [&>th]:py-2">
                                <th>Transaction</th>
                                <th>Block</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Value</th>
                              </tr>
                            </thead>
                            <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200 dark:[&>tr]:border-gray-700">
                              {transactions.map((tx) => (
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
                                      className="text-link-blue hover:text-link-blue-hover"
                                      to={`/block/${tx.blockNumber}`}
                                    >
                                      {tx.blockNumber.toLocaleString()}
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
                                      {formatEther(BigInt(tx.value)).substring(0, 10)} ETH
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
                        {transactions.map((tx) => (
                          <div key={tx.hash} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Tx Hash</span>
                              <Link to={`/tx/${tx.hash}`} className="text-sm text-link-blue font-mono">
                                {tx.hash.substring(0, 16)}...
                              </Link>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Block</span>
                              <Link to={`/block/${tx.blockNumber}`} className="text-sm text-link-blue">
                                {tx.blockNumber.toLocaleString()}
                              </Link>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Value</span>
                              <span className="text-sm">{formatEther(BigInt(tx.value)).substring(0, 10)} ETH</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Loading transactions...</div>
                  )}
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
        }
      >
        <CachePrimerWrapper
          address={addressOrName}
          transactions={transactions}
          hasMore={hasMore}
        >
          <div className="min-h-screen overflow-x-hidden">
            <HeaderSSR />
            <AddressAppConfigProvider>
            <Suspense fallback={
              <StandardFrame>
                <AddressLoadingSkeleton />
              </StandardFrame>
            }>
              <AddressRuntimeProvider>
                <AddressMainPage />
              </AddressRuntimeProvider>
            </Suspense>
          </AddressAppConfigProvider>
          </div>
        </CachePrimerWrapper>
      </ClientOnly>
    </>
  );
};

export default AddressSSR;
