import React, { useContext } from "react";
import { useParams, useSearchParams } from "react-router";
import StandardFrame from "../components/StandardFrame";
import { PAGE_SIZE } from "../params";
import { useBlockTransactions } from "../useErigonHooks";
import { RuntimeContext } from "../useRuntime";
import {useBlockTransactionsPageTitle, usePageTitle} from "../useTitle";
import BlockTransactionHeader from "./block/BlockTransactionHeader";
import BlockTransactionResults from "./block/BlockTransactionResults";
import {Helmet} from 'react-helmet-async';
import {formatValue} from '../components/formatter';
import {useChainInfo} from '../useChainInfo';

const BlockTransactions: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
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

  const { data, isLoading } = useBlockTransactions(
    provider,
    blockNumber,
    pageNumber - 1,
    PAGE_SIZE,
  );
  const txs = data?.txs;
  const totalTxs = data?.total;

  const titleToSet = `Transactions in Ethereum Block ${blockNumber}`
  const description = `Explore all transactions in Ethereum block ${blockNumber}. View transaction hashes, sender and recipient addresses, and gas fees.`

  usePageTitle(titleToSet)
  // useBlockTransactionsPageTitle(
  //   blockNumber,
  //   pageNumber,
  //   totalTxs === undefined ? undefined : Math.ceil(totalTxs / PAGE_SIZE),
  // );

  const {
    nativeCurrency: { symbol, decimals },
  } = useChainInfo();

  const schemaWebPageItems = txs?.map((item, index) => {
    return {
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "DigitalDocument",
        "identifier": item.hash,
        "name": `Transaction ${item.hash.substring(0, 10)}...`,
        "description": `Ethereum transaction with value ${formatValue(item.value || 0, decimals)} ETH`
      }
    }
  }) || []
  const payloadSchemaWebPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "url": `https://ethscan.org/block/${blockNumber}/txs`,
      "itemListElement": schemaWebPageItems
    }
  )
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
            "text": "Gas fees are the costs paid to execute a transaction on the Ethereum network. They compensate miners for their work and secure the network."
          }
        }
      ]
    }
  )

  return (
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <meta name="description" content={`Explore all transactions in Ethereum block ${blockNumber}. View transaction hashes, sender and recipient addresses, values, and gas fees.`} />
          <link rel="canonical" href={`https://ethscan.org/block/${blockNumber}/txs`} />
          <script type="application/ld+json">{payloadSchemaWebPage}</script>
          <script type="application/ld+json">{payloadSchemaFaqPage}</script>
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="px-3 lg:px-9">
            <BlockTransactionHeader blockTag={blockNumber}/>
          </div>
          <BlockTransactionResults
            page={txs}
            total={totalTxs ?? 0}
            pageNumber={pageNumber}
            isLoading={isLoading}
          />
        </div>

        {/* FAQ Section */}
        <div className="px-3 lg:px-9 py-6 max-w-7xl mx-auto">
        <div className="mt-12 space-y-6">
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

export default BlockTransactions;
