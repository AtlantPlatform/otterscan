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

  usePageTitle(`Trace - Transaction ${txHash}`);

  const description = `Detailed execution trace for Ethereum transaction ${txHash}, including call stack and gas consumption.`

  const schemaData: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `https://ethscan.org/tx/${txData.transactionHash}/trace`,
    "name": `Transaction Trace ${txData.transactionHash}`,
    "description": description,
  };

  // Only include mainEntity for transactions with value > 0 ETH
  if (txData && txData.value && txData.value > 0n) {
    schemaData.mainEntity = {
      "@type": "DigitalDocument",
      "identifier": `${txData.transactionHash}`,
      "name": `Transaction Trace ${txData.transactionHash}`,
      "description": "Detailed execution trace including call stack and gas consumption"
    };
  }

  const payloadSchemaWebPage = JSON.stringify(schemaData);

  return (
    <ContentFrame tabs>
      <Helmet>
        <meta name="description" content={description}/>
        <link rel="canonical" href={`https://ethscan.org/tx/${txHash}/trace`} />
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
      </Helmet>
      <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto font-code text-sm">
        {traces ? (
          <>
            <div className="rounded border px-1 py-0.5 hover:border-gray-500 font-sans">
              <TransactionAddress address={txData.from} />
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
