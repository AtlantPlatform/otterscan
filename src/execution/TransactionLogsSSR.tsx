import { FC } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { TabGroup, TabList } from "@headlessui/react";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "../components/ContentFrame";
import NavTab from "../components/NavTab";
import { useSingleTransaction } from "../api/useRestTransactions";
import LogEntrySSR from "./transaction/LogEntrySSR";

/**
 * SSR-safe Transaction Logs page component.
 * Renders proper SEO meta tags during server-side rendering.
 */
const TransactionLogsSSR: FC = () => {
  const { txhash: txHash } = useParams();
  const { transaction: tx } = useSingleTransaction(txHash);
  const logs = tx?.logs;

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

  const title = `Ethereum Transaction Logs ${txHash} | Smart Contract Events | Ethscan`;
  const description = `View smart contract event logs for Ethereum transaction ${txHash}. Explore emitted events, topics, and decoded log data on Ethscan.`;
  const ogDescription = `Explore smart contract event logs emitted by Ethereum transaction ${txHash}. View topics, events, and decoded log data on Ethscan.`;
  const twitterDescription = `Explore smart contract event logs emitted by Ethereum transaction ${txHash}. View topics and decoded event data.`;
  const pageUrl = `https://ethscan.org/tx/${txHash}/logs`;

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
        "name": `Ethereum Transaction Logs for ${txHash}`,
        "description": "A dataset of smart contract event logs emitted during execution of a specific Ethereum transaction, including event topics, contract addresses, and decoded log data.",
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
            "name": "Contract Address"
          },
          {
            "@type": "PropertyValue",
            "name": "Event Name"
          },
          {
            "@type": "PropertyValue",
            "name": "Event Topics"
          },
          {
            "@type": "PropertyValue",
            "name": "Decoded Event Parameters"
          },
          {
            "@type": "PropertyValue",
            "name": "Log Index"
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
            "name": "Logs",
            "item": pageUrl
          }
        ]
      }
    ]
  });

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
          <meta property="og:description" content={ogDescription} />
          <meta property="og:url" content={pageUrl} />

          {/* Twitter */}
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={twitterDescription} />

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
            {logs && logs.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log: any, i: number) => (
                  <LogEntrySSR
                    key={i}
                    log={{
                      index: log.logIndex ?? i,
                      address: log.address,
                      topics: log.topics,
                      data: log.data,
                    }}
                  />
                ))}
              </div>
            ) : logs && logs.length === 0 ? (
              <div className="py-4 text-sm">Transaction didn't emit any logs</div>
            ) : (
              <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto text-sm">
                <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
                  <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            )}
          </ContentFrame>

          {/* SEO Description */}
          <div className="px-3 lg:px-9 mt-4">
            <div className="p-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Ethereum transaction logs record smart contract events emitted during transaction execution.
                This page shows all event logs generated by transaction {txHash} on the Ethereum mainnet.
              </p>
            </div>
          </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default TransactionLogsSSR;
