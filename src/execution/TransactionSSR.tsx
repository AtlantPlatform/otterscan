import { FC } from "react";
import { useParams, Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther, formatUnits } from "ethers";
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TabGroup, TabList } from "@headlessui/react";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "../components/ContentFrame";
import InfoRow from "../components/InfoRow";
import BlockLink from "../components/BlockLink";
import HexValue from "../components/HexValue";
import FormattedBalance from "../components/FormattedBalance";
import PercentageBar from "../components/PercentageBar";
import RelativePosition from "../components/RelativePosition";
import Timestamp from "../components/Timestamp";
import TransactionType from "../components/TransactionType";
import Copy from "../components/Copy";
import NavTab from "../components/NavTab";
import { useSingleTransaction } from "../api/useRestTransactions";
import { commify } from "../utils/utils";

/**
 * SSR-safe Transaction page component.
 * Uses REST API hooks instead of RuntimeContext/provider.
 * Shows basic transaction details for SEO purposes.
 */
const TransactionSSR: FC = () => {
  const { txhash: txHash } = useParams();
  const { transaction: tx, isLoading, error } = useSingleTransaction(txHash);

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

  const description = `View full details of Ethereum transaction ${txHash}. Track status, block, addresses, value, gas fees, and execution data on Ethscan.`;

  // FAQ content for both schema and UI display
  const faqItems = [
    {
      question: "What is an Ethereum transaction?",
      answer: "An Ethereum transaction is a cryptographically signed instruction from an account to transfer ETH or interact with a smart contract on the Ethereum blockchain."
    },
    {
      question: "How can I track my Ethereum transaction?",
      answer: "Enter your transaction hash in the Ethscan search bar to view real-time status, confirmation count, gas fees, and all transaction details."
    },
    {
      question: "What does transaction status mean?",
      answer: "Transaction status indicates whether the transaction was successful (Success) or failed (Reverted). Failed transactions still consume gas but don't execute the intended action."
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
        "name": `Ethereum Transaction ${txHash}`,
        "description": "Detailed dataset for a single Ethereum transaction including transaction hash, status, block number, sender and receiver addresses, ETH value, gas usage, and timestamp.",
        "url": `https://ethscan.org/tx/${txHash}`,
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
            "name": "Transaction Status"
          },
          {
            "@type": "PropertyValue",
            "name": "Block Number"
          },
          {
            "@type": "PropertyValue",
            "name": "From Address"
          },
          {
            "@type": "PropertyValue",
            "name": "To Address"
          },
          {
            "@type": "PropertyValue",
            "name": "Value (ETH)"
          },
          {
            "@type": "PropertyValue",
            "name": "Gas Used"
          },
          {
            "@type": "PropertyValue",
            "name": "Transaction Fee"
          },
          {
            "@type": "PropertyValue",
            "name": "Timestamp"
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
            "name": "Recent Ethereum Transactions",
            "item": "https://ethscan.org/tx/recent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": `Transaction ${txHash}`,
            "item": `https://ethscan.org/tx/${txHash}`
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>Ethereum Transaction {txHash} - Transaction Details | Ethscan</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={`https://ethscan.org/tx/${txHash}`} />

          {/* OpenGraph */}
          <meta property="og:title" content={`Ethereum Transaction ${txHash} - Transaction Details | Ethscan`} />
          <meta property="og:description" content={`Explore Ethereum transaction ${txHash}. View status, block, addresses, value, gas fees, and execution details.`} />
          <meta property="og:url" content={`https://ethscan.org/tx/${txHash}`} />

          {/* Twitter */}
          <meta name="twitter:title" content={`Ethereum Transaction ${txHash} - Transaction Details | Ethscan`} />
          <meta name="twitter:description" content={`Explore Ethereum transaction ${txHash}. View status, block, addresses, value, and gas fees on Ethscan.`} />

          <script type="application/ld+json">{payloadSchemaGraph}</script>
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="px-3 lg:px-9">
            <StandardSubtitle>
              <h1 className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 space-y-1 sm:space-y-0">
                <span>Transaction</span>
                <span className="text-base text-gray-500 font-hash break-all" data-test="transaction-hash">
                  {txHash}
                </span>
              </h1>
            </StandardSubtitle>
          </div>

          {error && (
            <ContentFrame>
              <div className="py-4 text-sm">
                Transaction <span className="font-hash">{txHash}</span> not found.
              </div>
            </ContentFrame>
          )}

          {isLoading && !tx && (
            <ContentFrame>
              <InfoRow title="Status">Loading transaction data...</InfoRow>
            </ContentFrame>
          )}

          {tx && (
            <>
              <TabGroup>
                <TabList className="flex space-x-2 rounded-t-lg border-l border-r border-t bg-white dark:bg-gray-800 dark:border-gray-700 mx-3 lg:mx-9">
                  <NavTab href={`/tx/${txHash}`}>Overview</NavTab>
                  <NavTab href={`/tx/${txHash}/logs`}>
                    Logs
                    {tx.logs ? ` (${tx.logs.length})` : ""}
                  </NavTab>
                  <NavTab href={`/tx/${txHash}/trace`}>Trace</NavTab>
                  <NavTab href={`/tx/${txHash}/statediff`}>State Diff</NavTab>
                </TabList>
              </TabGroup>
              <ContentFrame isLoading={isLoading}>
              <InfoRow title="Transaction Hash">
                <div className="flex items-baseline space-x-2 break-all">
                  <span className="font-hash" data-test="tx-hash">
                    {tx.hash}
                  </span>
                  <Copy value={tx.hash} />
                </div>
              </InfoRow>
              <InfoRow title="Status">
                {tx.status === null ? (
                  <span className="italic text-gray-400">Pending</span>
                ) : tx.status ? (
                  <span className="flex w-min items-baseline space-x-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs text-emerald-500">
                    <FontAwesomeIcon className="self-center" icon={faCheckCircle} size="1x" />
                    <span data-test="status">Success</span>
                  </span>
                ) : (
                  <div className="flex items-baseline space-x-1 rounded-lg bg-red-50 px-3 py-1 text-xs text-red-500">
                    <FontAwesomeIcon className="self-center" icon={faTimesCircle} size="1x" />
                    <span>Failed</span>
                  </div>
                )}
              </InfoRow>
              <InfoRow title="Block / Position">
                <div className="flex flex-wrap gap-y-2 items-baseline divide-x-2 divide-dotted divide-gray-300">
                  <div className="flex items-baseline space-x-1">
                    <BlockLink blockTag={tx.blockNumber} />
                    {tx.confirmations > 0 && (
                      <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {commify(tx.confirmations)} confirmations
                      </span>
                    )}
                  </div>
                  {tx.blockTransactionCount && tx.transactionIndex !== undefined && (
                    <div className="ml-3 flex items-baseline space-x-2 pl-3">
                      <RelativePosition
                        pos={tx.transactionIndex}
                        total={tx.blockTransactionCount - 1}
                      />
                    </div>
                  )}
                </div>
              </InfoRow>
              {tx.timestamp && (
                <InfoRow title="Timestamp">
                  <Timestamp value={tx.timestamp} />
                </InfoRow>
              )}
              <InfoRow title="From / Nonce">
                <div className="flex flex-wrap gap-y-2 divide-x-2 divide-dotted divide-gray-300">
                  <div className="flex items-baseline space-x-2">
                    <Link
                      className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                      to={`/address/${tx.from}`}
                    >
                      {tx.from}
                    </Link>
                    <Copy value={tx.from} />
                  </div>
                  <div className="ml-3 flex items-baseline pl-3">
                    <span className="text-sm text-gray-500">Nonce: </span>
                    <span className="ml-1 font-bold">{tx.nonce}</span>
                  </div>
                </div>
              </InfoRow>
              <InfoRow title={tx.to ? "Interacted With (To)" : "Contract Created"}>
                {tx.to ? (
                  <div className="flex items-baseline space-x-2">
                    <Link
                      className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                      to={`/address/${tx.to}`}
                    >
                      {tx.to}
                    </Link>
                    <Copy value={tx.to} />
                  </div>
                ) : tx.contractAddress ? (
                  <div className="flex items-baseline space-x-2">
                    <Link
                      className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                      to={`/address/${tx.contractAddress}`}
                    >
                      {tx.contractAddress}
                    </Link>
                    <Copy value={tx.contractAddress} />
                  </div>
                ) : (
                  <span className="italic text-gray-400">Pending contract creation</span>
                )}
              </InfoRow>
              <InfoRow title="Value">
                <span className="font-bold">
                  {formatEther(tx.value)} ETH
                </span>
              </InfoRow>
              <InfoRow title="Type (EIP-2718)">
                <TransactionType type={tx.type} />
              </InfoRow>
              {(tx.type === 2 || tx.type === 3) && tx.maxPriorityFeePerGas && (
                <InfoRow title="Max Priority Fee Per Gas">
                  <FormattedBalance
                    value={BigInt(tx.maxPriorityFeePerGas)}
                    decimals={9}
                    symbol="Gwei"
                  />
                </InfoRow>
              )}
              {(tx.type === 2 || tx.type === 3) && tx.maxFeePerGas && (
                <InfoRow title="Max Fee Per Gas">
                  <FormattedBalance
                    value={BigInt(tx.maxFeePerGas)}
                    decimals={9}
                    symbol="Gwei"
                  />
                </InfoRow>
              )}
              <InfoRow title="Gas Price">
                <span>
                  <FormattedBalance value={BigInt(tx.gasPrice)} symbol="ETH" /> (
                  <FormattedBalance value={BigInt(tx.gasPrice)} decimals={9} symbol="Gwei" />)
                </span>
              </InfoRow>
              <InfoRow title="Gas Used / Limit">
                <div className="flex items-baseline space-x-3">
                  <div>
                    <RelativePosition
                      pos={commify(formatUnits(tx.gasUsed, 0))}
                      total={commify(formatUnits(tx.gasLimit, 0))}
                    />
                  </div>
                  <PercentageBar
                    perc={Number((BigInt(tx.gasUsed) * 10000n) / BigInt(tx.gasLimit)) / 100}
                  />
                </div>
              </InfoRow>
              {tx.baseFeePerGas && (
                <InfoRow title="Block Base Fee">
                  <FormattedBalance
                    value={BigInt(tx.baseFeePerGas)}
                    decimals={9}
                    symbol="Gwei"
                  />{" "}
                  (<FormattedBalance
                    value={BigInt(tx.baseFeePerGas)}
                    decimals={0}
                    symbol="wei"
                  />)
                </InfoRow>
              )}
              {tx.maxFeePerBlobGas && (
                <InfoRow title="Max Fee Per Blob Gas">
                  <FormattedBalance
                    value={BigInt(tx.maxFeePerBlobGas)}
                    decimals={9}
                    symbol="Gwei"
                  />
                </InfoRow>
              )}
              {tx.blobVersionedHashes && tx.blobVersionedHashes.length > 0 && (
                <InfoRow title="Blob Versioned Hashes">
                  <div className="space-y-1">
                    {tx.blobVersionedHashes.map((hash: string, i: number) => (
                      <div key={i} className="flex items-baseline space-x-2">
                        <span className="font-hash break-all">{hash}</span>
                        <Copy value={hash} />
                      </div>
                    ))}
                  </div>
                </InfoRow>
              )}
              <InfoRow title="Transaction Fee">
                <span>
                  {formatEther(tx.fee)} ETH
                </span>
              </InfoRow>
              <InfoRow title="Input Data">
                <div className="max-h-40 overflow-auto rounded bg-gray-50 dark:bg-gray-800 p-2 font-mono text-xs break-all">
                  {tx.data === "0x" ? (
                    <span className="text-gray-400">No input data</span>
                  ) : (
                    tx.data
                  )}
                </div>
              </InfoRow>
            </ContentFrame>
            </>
          )}

          {/* SEO Summary Section */}
          {tx && (
            <div className="px-3 lg:px-9 mt-4">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Transaction Summary</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  This Ethereum transaction was sent from {tx.from} to {tx.to || 'create a new contract'} in block #{tx.blockNumber}.
                  The transaction {tx.status ? 'completed successfully' : 'failed'} and transferred {formatEther(tx.value)} ETH.
                  The total fee paid was {formatEther(tx.fee)} ETH with a gas price of {formatUnits(tx.gasPrice, 9)} Gwei.
                </p>
              </div>
            </div>
          )}

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
  );
};

export default TransactionSSR;
