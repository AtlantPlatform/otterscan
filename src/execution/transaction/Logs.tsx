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

  usePageTitle(`Ethereum Transaction Logs - ${txHash}`);

  const description = `View logs for Ethereum transaction ${txHash}, including emitted events and contract interactions.`
  const payloadSchemaWebPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": `https://ethscan.org/tx/{${txHash}/logs`,
      "mainEntity": {
        "@type": "BlockchainTransaction",
        "transactionHash": `${txHash}`,
      }
    }
  )

  return (
    <ContentFrame tabs>
      <Helmet>
        <meta name="description" content={description}/>
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
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
    </ContentFrame>
  );
};

export default memo(Logs);
