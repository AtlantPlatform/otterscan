import { FC } from "react";
import { useParams, Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther, formatUnits } from "ethers";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "../components/ContentFrame";
import InfoRow from "../components/InfoRow";
import BlockLink from "../components/BlockLink";
import HexValue from "../components/HexValue";
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

  const description = `View details for Ethereum transaction ${txHash} including gas fees, sender, recipient, value transferred, and execution status.`;

  const payloadSchemaWebPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `https://ethscan.org/tx/${txHash}`,
    "name": `Ethereum Transaction ${txHash.substring(0, 16)}...`,
    "description": description,
    "mainEntity": {
      "@type": "DigitalDocument",
      "identifier": txHash,
      "name": `Ethereum Transaction`,
      "description": tx ? `Transaction from ${tx.from} to ${tx.to || 'Contract Creation'}` : 'Ethereum blockchain transaction',
    }
  });

  const payloadSchemaFaqPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an Ethereum transaction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Ethereum transaction is a cryptographically signed instruction from an account to transfer ETH or interact with a smart contract on the Ethereum blockchain."
        }
      },
      {
        "@type": "Question",
        "name": "How can I track my Ethereum transaction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Enter your transaction hash in the Ethscan search bar to view real-time status, confirmation count, gas fees, and all transaction details."
        }
      },
      {
        "@type": "Question",
        "name": "What does transaction status mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Transaction status indicates whether the transaction was successful (Success) or failed (Reverted). Failed transactions still consume gas but don't execute the intended action."
        }
      }
    ]
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>Transaction {txHash} | Ethscan</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={`https://ethscan.org/tx/${txHash}`} />
          <script type="application/ld+json">{payloadSchemaWebPage}</script>
          <script type="application/ld+json">{payloadSchemaFaqPage}</script>
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
            <ContentFrame isLoading={isLoading}>
              <InfoRow title="Status">
                <span className={tx.status ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                  {tx.status ? "Success" : "Failed"}
                </span>
              </InfoRow>
              <InfoRow title="Block">
                <BlockLink blockTag={tx.blockNumber} />
              </InfoRow>
              <InfoRow title="From">
                <Link
                  className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                  to={`/address/${tx.from}`}
                >
                  {tx.from}
                </Link>
              </InfoRow>
              <InfoRow title="To">
                {tx.to ? (
                  <Link
                    className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                    to={`/address/${tx.to}`}
                  >
                    {tx.to}
                  </Link>
                ) : (
                  <span className="text-gray-500">Contract Creation</span>
                )}
              </InfoRow>
              <InfoRow title="Value">
                <span className="font-bold">
                  {formatEther(tx.value)} ETH
                </span>
              </InfoRow>
              <InfoRow title="Transaction Fee">
                <span>
                  {formatEther(tx.fee)} ETH
                </span>
              </InfoRow>
              <InfoRow title="Gas Price">
                <span>
                  {formatUnits(tx.gasPrice, 9)} Gwei
                </span>
              </InfoRow>
              <InfoRow title="Gas Used">
                <span>
                  {commify(tx.gasUsed)}
                </span>
              </InfoRow>
              <InfoRow title="Nonce">
                <span>{tx.nonce}</span>
              </InfoRow>
              <InfoRow title="Transaction Hash">
                <HexValue value={tx.hash} />
              </InfoRow>
              {tx.contractAddress && (
                <InfoRow title="Contract Created">
                  <Link
                    className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
                    to={`/address/${tx.contractAddress}`}
                  >
                    {tx.contractAddress}
                  </Link>
                </InfoRow>
              )}
            </ContentFrame>
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
        </div>
      </StandardFrame>
    </div>
  );
};

export default TransactionSSR;
