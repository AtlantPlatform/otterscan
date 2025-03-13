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

  const schemaWebPageItems = txs?.map((item) => {
    return {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "BlockchainTransaction",
        "transactionHash": item.hash,
        "value": `${formatValue(item.value || 0, decimals)} ETH`,
        "gasFee": `${formatValue(item.fee, 18)} ETH`
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
          "name": "How can I check the details of a transaction on EthScan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Enter the transaction hash in the EthScan search bar to view details like sender, recipient, and gas fees."
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
    <StandardFrame>
      <Helmet>
        <meta name="description" content={description}/>
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>
      <BlockTransactionHeader blockTag={blockNumber}/>
      <BlockTransactionResults
        page={txs}
        total={totalTxs ?? 0}
        pageNumber={pageNumber}
        isLoading={isLoading}
      />
      <div className="faq-section">
        <p>1. What is an Ethereum transaction?<br/>
          An Ethereum transaction is a transfer of data or value between addresses on the Ethereum blockchain, often
          including smart contract interactions.
        </p>
        <br/>
        <p>2. How can I check the details of a transaction on EthScan?<br/>
          Enter the transaction hash in the EthScan search bar to view details like sender, recipient, and gas fees.</p>
        <br/>
        <p>3. What do gas fees in a transaction mean?
          Gas fees are the costs paid to execute a transaction on the Ethereum network. They compensate miners for their
          work and secure the network.</p>
      </div>
    </StandardFrame>
  );
};

export default BlockTransactions;
