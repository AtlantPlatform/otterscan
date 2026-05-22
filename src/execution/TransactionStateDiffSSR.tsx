import React, { FC, useState, useEffect } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { TabGroup, TabList } from "@headlessui/react";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "../components/ContentFrame";
import NavTab from "../components/NavTab";
import ClientOnly from "../components/ClientOnly";
import { useSingleTransaction } from "../api/useRestTransactions";
import { RuntimeContext, createRuntime, OtterscanRuntime } from "../useRuntime";
import { ChainInfoContext, populateChainInfo } from "../useChainInfo";
import { loadOtterscanConfig } from "../useConfig";
import StateDiffClient from "./transaction/StateDiffClient";
import { buildTxMetaDescription } from "./transaction/txMetaDescription";

/**
 * RuntimeProvider for client-only content.
 * Loads config and creates runtime on the client side.
 */
const RuntimeProvider: FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => {
  const [runtime, setRuntime] = useState<OtterscanRuntime | null>(null);

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
        console.error('Error initializing runtime:', err);
      }
    };

    initRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!runtime) {
    return <>{fallback}</>;
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
 * SSR-safe Transaction State Diff page component.
 * Renders proper SEO meta tags during server-side rendering.
 * The actual state diff data requires RuntimeContext and is loaded client-side.
 */
const TransactionStateDiffSSR: FC = () => {
  const { txhash: txHash } = useParams();
  const { transaction: tx } = useSingleTransaction(txHash);

  if (!txHash) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <HeaderSSR />
        <StandardFrame>
          <ContentFrame>
            <div className="py-4 text-sm">Transaction hash is required.</div>
          </ContentFrame>
        </StandardFrame>
      </div>
    );
  }

  const title = `Ethereum Transaction State Diff ${txHash} | State Changes | Ethscan`;
  const fallbackDescription = `View state changes caused by Ethereum transaction ${txHash}. Analyze balance updates, storage changes, and contract state differences on Ethscan.`;
  const description = tx
    ? buildTxMetaDescription({
        hash: tx.hash,
        from: tx.from,
        status: tx.status,
        timestamp: tx.timestamp,
        resolvedAction: tx.resolvedAction,
      })
    : fallbackDescription;
  const pageUrl = `https://ethscan.org/tx/${txHash}/statediff`;

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
        "name": `Ethereum Transaction State Diff for ${txHash}`,
        "description": "A dataset describing Ethereum blockchain state changes caused by a single transaction, including balance updates, storage slot modifications, and contract state differences.",
        "url": pageUrl,
        "includedInDataCatalog": {
          "@type": "DataCatalog",
          "name": "Ethscan Ethereum Blockchain Data"
        },
        "variableMeasured": [
          {
            "@type": "PropertyValue",
            "name": "Transaction Hash",
            "value": txHash
          },
          {
            "@type": "PropertyValue",
            "name": "Account Balance Change"
          },
          {
            "@type": "PropertyValue",
            "name": "Storage Slot Change"
          },
          {
            "@type": "PropertyValue",
            "name": "Contract State Change"
          },
          {
            "@type": "PropertyValue",
            "name": "Nonce Change"
          },
          {
            "@type": "PropertyValue",
            "name": "Code Change"
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
            "name": "Transactions",
            "item": "https://ethscan.org/tx/recent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": `Transaction ${txHash}`,
            "item": `https://ethscan.org/tx/${txHash}`
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "State Diff",
            "item": pageUrl
          }
        ]
      }
    ]
  });

  const logs = tx?.logs;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>{title}</title>
          <meta name="robots" content="noindex,follow" />
          <meta name="description" content={description} />
          <link rel="canonical" href={pageUrl} />

          {/* OpenGraph */}
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={pageUrl} />

          {/* Twitter */}
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />

          <script type="application/ld+json">{payloadSchemaGraph}</script>
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="px-3 lg:px-9">
            <StandardSubtitle>
              <h1 className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 space-y-1 sm:space-y-0">
                <span>Transaction</span>
                <span className="text-base text-gray-500 font-hash break-all">
                  {txHash}
                </span>
              </h1>
            </StandardSubtitle>
          </div>

          <TabGroup>
            <TabList className="flex space-x-2 rounded-t-lg border-l border-r border-t bg-white dark:bg-gray-800 dark:border-gray-700 mx-3 lg:mx-9">
              <NavTab href={`/tx/${txHash}`}>Overview</NavTab>
              <NavTab href={`/tx/${txHash}/logs`}>
                Logs
                {logs ? ` (${logs.length})` : ""}
              </NavTab>
              <NavTab href={`/tx/${txHash}/trace`}>Trace</NavTab>
              <NavTab href={`/tx/${txHash}/statediff`}>State Diff</NavTab>
            </TabList>
          </TabGroup>

          <ContentFrame tabs>
            <ClientOnly
              fallback={
                <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto text-sm">
                  <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
                    <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
                  </div>
                </div>
              }
            >
              <RuntimeProvider
                fallback={
                  <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto text-sm">
                    <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
                      <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                }
              >
                <StateDiffClient txHash={txHash} />
              </RuntimeProvider>
            </ClientOnly>
          </ContentFrame>

          {/* SEO Description */}
          <div className="px-3 lg:px-9 mt-4">
            <div className="p-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Ethereum state diffs show how a transaction changes blockchain state, including balances and smart contract storage.
                This view helps analyze transaction side effects for transaction {txHash}.
              </p>
            </div>
          </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default TransactionStateDiffSSR;
