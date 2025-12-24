import React, { useContext, useState } from "react";
import ContentFrame from "../components/ContentFrame";
import StandardFrame from "../components/StandardFrame";
import StandardTextarea from "../components/StandardTextarea";
import TransactionLink from "../components/TransactionLink";
import { RuntimeContext } from "../useRuntime";
import {usePageTitle} from '../useTitle';
import {Helmet} from 'react-helmet-async';

const BroadcastTransactionPage: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
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

  usePageTitle(`Broadcast Ethereum Transaction | Send Raw Signed TX – Ethscan`, true);

  // FAQ content for both schema and UI display
  const faqItems = [
    {
      question: "What are the security benefits of using Ethscan to broadcast transactions?",
      answer: "The tool processes raw transaction data securely, minimizing exposure to third parties. No private keys are required, ensuring your wallet's safety."
    },
    {
      question: "How fast are Ethereum transactions broadcasted on Ethscan?",
      answer: "Transactions are directly sent to the Ethereum network, ensuring fast propagation. Ideal for time-sensitive transactions."
    },
    {
      question: "Is Ethscan's broadcasting tool easy to use?",
      answer: "The tool is designed to be simple and user-friendly, ensuring that both beginners and experienced users can broadcast transactions with ease."
    },
    {
      question: "How can I verify my broadcasted transaction?",
      answer: "After submitting the transaction, you will receive a confirmation with the transaction hash, which you can use to track the status on Ethscan."
    },
    {
      question: "What format should the raw transaction be in?",
      answer: "The raw transaction must be in hexadecimal format (starting with '0x'). This is the standard format used by Ethereum wallets and development tools when signing transactions offline."
    },
    {
      question: "Can I broadcast multiple transactions at once?",
      answer: "No, each transaction must be broadcast individually. This ensures proper nonce sequencing and allows you to verify each transaction's status separately."
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
            "name": "Broadcast Transaction",
            "item": "https://ethscan.org/broadcastTx"
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
  })

  return (
    <StandardFrame>
      <Helmet>
        <title>Broadcast Ethereum Transaction | Send Raw Signed TX – Ethscan</title>
        <meta name="description" content="Broadcast a raw signed Ethereum transaction to the network using Ethscan. Submit and propagate Ethereum transactions securely with this developer tool." />
        <link rel="canonical" href="https://ethscan.org/broadcastTx" />

        {/* OpenGraph */}
        <meta property="og:title" content="Broadcast Ethereum Transaction | Send Raw Signed TX – Ethscan" />
        <meta property="og:description" content="Use Ethscan to broadcast a raw signed Ethereum transaction to the network. A simple tool for submitting Ethereum transactions." />
        <meta property="og:url" content="https://ethscan.org/broadcastTx" />

        {/* Twitter */}
        <meta name="twitter:title" content="Broadcast Ethereum Transaction | Send Raw Signed TX – Ethscan" />
        <meta name="twitter:description" content="Broadcast a raw signed Ethereum transaction to the network using Ethscan's transaction broadcasting tool." />

        <script type="application/ld+json">{payloadSchemaGraph}</script>
      </Helmet>

      <div className="py-6 max-w-7xl mx-auto">
        <div className="px-3 lg:px-9">
          <h1 className="text-2xl font-bold mb-6">Broadcast Transaction</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Use this tool to broadcast a raw signed Ethereum transaction directly to the Ethereum network. Paste your signed transaction to submit and propagate it for inclusion in a block.
          </p>
          <ContentFrame marginSize="none">
        <div className="space-y-3 py-4">
          <div>
          Enter the transaction in hexadecimal format below:
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
          <div className="mt-6">
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
      </div>
    </StandardFrame>
  );
};

export default BroadcastTransactionPage;
