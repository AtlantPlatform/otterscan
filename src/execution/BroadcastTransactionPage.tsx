import React, { useContext, useRef, useState } from "react";
import ContentFrame from "../components/ContentFrame";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import StandardTextarea from "../components/StandardTextarea";
import TransactionLink from "../components/TransactionLink";
import { RuntimeContext } from "../useRuntime";
import {usePageTitle} from '../useTitle';
import {Helmet} from 'react-helmet-async';

const BroadcastTransactionPage: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const txFieldRef = useRef<HTMLTextAreaElement>(null);
  const [rawTx, setRawTx] = useState<string>("");
  const [resultState, setResultState] = useState<{
    success: boolean | null;
    result: string;
  }>({ success: null, result: "" });

  async function submitTx() {
    const trimmedRawTx = rawTx.trim();
    if (trimmedRawTx.length > 2) {
      try {
        const txHash = await provider.send("eth_sendRawTransaction", [
          trimmedRawTx,
        ]);
        setResultState({ success: true, result: txHash });
      } catch (e: any) {
        setResultState({ success: false, result: e.toString() });
      }
    } else {
      setResultState({
        success: false,
        result: "Please enter a raw signed transaction.",
      });
    }
  }

  usePageTitle(`Broadcast Ethereum Transactions`);
  const description = `Broadcast raw Ethereum transactions to the network easily with Ethscan's secure broadcasting tool.`

  const payloadSchemaFaqPageBaseInfo = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": "https://ethscan.org/broadcast",
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "Ethscan Broadcast Tool",
        "operatingSystem": "All",
        "applicationCategory": "Blockchain"
      }
    }

  )

  const payloadSchemaFaqPageAdditionalInfo = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "url": "https://ethscan.org/broadcast",
      "name": "How to Broadcast Ethereum Transactions",
      "description": "Follow these steps to broadcast raw Ethereum transactions to the network using Ethscan.",
      "steps": [
        {
          "@type": "HowToStep",
          "name": "Prepare the Raw Transaction Data",
          "text": "Generate the raw transaction data using your Ethereum wallet or development tools. Ensure the transaction data is encoded in hexadecimal format (hex)."
        },
        {
          "@type": "HowToStep",
          "name": "Paste the Raw Transaction Data",
          "text": "Copy the raw transaction data from your wallet or tool. Paste it into the provided input field labeled 'Raw Transaction Data.'"
        },
        {
          "@type": "HowToStep",
          "name": "Verify the Data",
          "text": "Double-check the data to ensure no extra spaces or incorrect characters are included. Review key parameters like recipient address, value, and gas limit if visible."
        },
        {
          "@type": "HowToStep",
          "name": "Click 'Broadcast'",
          "text": "Press the 'Broadcast' button to submit the transaction to the Ethereum network."
        },
        {
          "@type": "HowToStep",
          "name": "Confirm Submission",
          "text": "Once the transaction is successfully broadcasted, you’ll receive a confirmation with the transaction hash. Use the transaction hash to track the status on Ethscan."
        }
      ]
    }
  )

  const payloadSchemaFaqPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What are the security benefits of using Ethscan to broadcast transactions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The tool processes raw transaction data securely, minimizing exposure to third parties. No private keys are required, ensuring your wallet's safety."
          }
        },
        {
          "@type": "Question",
          "name": "How fast are Ethereum transactions broadcasted on Ethscan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Transactions are directly sent to the Ethereum network, ensuring fast propagation. Ideal for time-sensitive transactions."
          }
        },
        {
          "@type": "Question",
          "name": "Is Ethscan's broadcasting tool easy to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The tool is designed to be simple and user-friendly, ensuring that both beginners and experienced users can broadcast transactions with ease."
          }
        },
        {
          "@type": "Question",
          "name": "How can I verify my broadcasted transaction?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "After submitting the transaction, you will receive a confirmation with the transaction hash, which you can use to track the status on Ethscan."
          }
        }
      ]
    }
  )

  return (
    <StandardFrame>
      <Helmet>
        <meta name="description" content="Broadcast raw Ethereum transactions to the network securely. Submit signed transaction data and track transaction status on Ethscan." />
        <link rel="canonical" href="https://ethscan.org/broadcastTx" />
        <script type="application/ld+json">{payloadSchemaFaqPageBaseInfo}</script>
        <script type="application/ld+json">{payloadSchemaFaqPageAdditionalInfo}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>

      <div className="py-6 max-w-7xl mx-auto">
        <div className="px-3 lg:px-9">
          <h1 className="text-2xl font-bold mb-6">Broadcast Transaction</h1>
          <ContentFrame marginSize="none">
        <div className="space-y-3 py-4">
          <div>
          This page lets you broadcast a raw signed transaction to the
            network. Enter the transaction in hexadecimal format below:
          </div>
          <StandardTextarea
            onChange={(e) => setRawTx(e.target.value)}
            readOnly={false}
            placeholder={"Prepare the Raw Transaction Data:\n" +
              "Generate the raw transaction data using your Ethereum wallet or development tools.\n" +
              "Ensure the transaction data is encoded in hexadecimal format (hex).\n\n" +
              "Paste the Raw Transaction Data:\n" +
              "Copy the raw transaction data from your wallet or tool.\n" +
              "Paste it into the provided input field labeled \"Raw Transaction Data.\"\n\n" +
              "Verify the Data:\n" +
              "Double-check the data to ensure no extra spaces or incorrect characters are included.\n" +
              "Review the transaction's key parameters like recipient address, value, and gas limit if visible.\n\n" +
              "Click 'Broadcast':\n" +
              "Press the Broadcast button to submit the transaction to the Ethereum network.\n\n" +
              "Confirm Submission:\n" +
              "Once the transaction is successfully broadcasted, you’ll receive a confirmation with the transaction hash.\n" +
              "Use the transaction hash to track the status on Ethscan.\n"}
          ></StandardTextarea>
          <div>
            <button
              className="bg-skin-button-fill text-skin-button hover:bg-skin-button-hover-fill py-1 px-2 rounded border inline-flex items-center send-transaction"
              onClick={submitTx}
            >
              Send Transaction
            </button>
          </div>
          {resultState.success === false && (
            <div>
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-2.5 rounded relative break-words"
                role="alert"
              >
                <strong className="font-bold">Error!</strong> Failed to
                broadcast transaction:{" "}
                <div className="font-mono">{resultState.result}</div>
              </div>
            </div>
          )}
          {resultState.success && (
            <div
              className="bg-green-100 border border-green-300 text-green-700 px-4 py-2.5 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Success!</strong> Transaction hash:{" "}
              <span className="flex">
                <TransactionLink txHash={resultState.result}/>
              </span>
            </div>
          )}
        </div>
          </ContentFrame>

          {/* FAQ Section */}
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
            <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
                <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">What are the security benefits of using the Ethscan broadcasting tool?</h3>
                <p>The tool processes raw transaction data securely, minimizing exposure to third parties. No private keys are required, ensuring your wallet's safety.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How fast are Ethereum transactions broadcasted on Ethscan?</h3>
                <p>Transactions are directly sent to the Ethereum network, ensuring fast propagation. Ideal for time-sensitive transactions.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">Is Ethscan's broadcasting tool easy to use?</h3>
                <p>The tool is designed to be simple and user-friendly, ensuring that both beginners and experienced users can broadcast transactions with ease.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How can I verify my broadcasted transaction?</h3>
                <p>After submitting the transaction, you will receive a confirmation with the transaction hash, which you can use to track the status on Ethscan.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What format should the raw transaction be in?</h3>
                <p>The raw transaction must be in hexadecimal format (starting with '0x'). This is the standard format used by Ethereum wallets and development tools when signing transactions offline.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">Can I broadcast multiple transactions at once?</h3>
                <p>No, each transaction must be broadcast individually. This ensures proper nonce sequencing and allows you to verify each transaction's status separately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardFrame>
  );
};

export default BroadcastTransactionPage;
