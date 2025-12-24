import React, { useContext } from "react";
import ContentFrame from "../../components/ContentFrame";
import { TransactionData } from "../../types";
import { useTraceTransaction } from "../../useErigonHooks";
import { RuntimeContext } from "../../useRuntime";
import TransactionAddress from "../components/TransactionAddress";
import TraceItem from "./TraceItem";
import {usePageTitle} from '../../useTitle';
import {Helmet} from 'react-helmet-async';

type TraceProps = {
  txData: TransactionData;
  txHash: string;
};

const Trace: React.FC<TraceProps> = ({ txData, txHash }) => {
  const { provider } = useContext(RuntimeContext);
  const traces = useTraceTransaction(provider, txData.transactionHash);

  usePageTitle(`Ethereum Transaction Trace ${txHash} | Internal Calls | Ethscan`, true);

  const title = `Ethereum Transaction Trace ${txHash} | Internal Calls | Ethscan`;
  const description = `View the full execution trace for Ethereum transaction ${txHash}. Analyze internal calls, contract interactions, and value transfers on Ethscan.`;
  const ogDescription = `Analyze the execution trace of Ethereum transaction ${txHash}. View internal calls, contract interactions, and value transfers.`;
  const twitterDescription = `Analyze the execution trace of Ethereum transaction ${txHash}. View internal calls and contract interactions.`;
  const pageUrl = `https://ethscan.org/tx/${txHash}/trace`;

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
        "name": `Ethereum Transaction Execution Trace for ${txHash}`,
        "description": "A dataset representing the execution trace of an Ethereum transaction, including internal calls, call types, contract interactions, value transfers, and execution order.",
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
            "name": "Call Type"
          },
          {
            "@type": "PropertyValue",
            "name": "Caller Address"
          },
          {
            "@type": "PropertyValue",
            "name": "Callee Address"
          },
          {
            "@type": "PropertyValue",
            "name": "Value Transferred"
          },
          {
            "@type": "PropertyValue",
            "name": "Call Depth"
          },
          {
            "@type": "PropertyValue",
            "name": "Execution Status"
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
            "name": "Trace",
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
      <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto font-code text-sm">
        {traces ? (
          <>
            <div className="rounded border px-1 py-0.5 hover:border-gray-500 font-sans">
              <TransactionAddress address={txData.from} miner={false} />
            </div>
            <div className="ml-5 space-y-3 self-stretch">
              {traces.map((t, i, a) => (
                <TraceItem key={i} t={t} last={i === a.length - 1} />
              ))}
            </div>
          </>
        ) : (
          <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
            <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
          </div>
        )}
      </div>

    </ContentFrame>
  );
};

export default React.memo(Trace);
