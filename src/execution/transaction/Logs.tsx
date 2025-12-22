import { Log } from "ethers";
import React, { FC, memo, useEffect } from "react";
import { useLocation } from "react-router";
import ContentFrame from "../../components/ContentFrame";
import LogEntry from "./LogEntry";
import {usePageTitle} from '../../useTitle';
import {Helmet} from 'react-helmet-async';

type LogsProps = {
  logs: Log[] | undefined;
  txHash: string;
};

const Logs: FC<LogsProps> = ({ logs, txHash }) => {
  const location = useLocation();

  useEffect(() => {
    setTimeout(() => {
      if (location.hash) {
        // Scroll to fragment, e.g. "#3"
        let foundElement = document.getElementById(location.hash.slice(1));
        if (foundElement) {
          foundElement.scrollIntoView({
            behavior: "smooth",
          });
        }
      }
    }, 200);
  }, [logs]);

  usePageTitle(`Ethereum Transaction Logs ${txHash} | Smart Contract Events | Ethscan`);

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
    <ContentFrame tabs>
      <Helmet>
        <title>{title}</title>
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
      {logs && (
        <>
          {logs.length > 0 ? (
            <>
              {logs.map((l, i) => (
                <LogEntry key={i} log={l} />
              ))}
            </>
          ) : (
            <div className="py-4 text-sm">Transaction didn't emit any logs</div>
          )}
        </>
      )}

      {/* SEO Description */}
      <div className="mt-6 p-4 text-sm text-gray-700 dark:text-gray-300">
        <p>
          Ethereum transaction logs record smart contract events emitted during transaction execution.
          This page shows all event logs generated by transaction {txHash} on the Ethereum mainnet.
        </p>
      </div>
    </ContentFrame>
  );
};

export default memo(Logs);
