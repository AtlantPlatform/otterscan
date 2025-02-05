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
  const description = `Broadcast raw Ethereum transactions to the network easily with EthScan's secure broadcasting tool.`

  const payloadSchemaFaqPageAdditionalInfo = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "url": "https://ethscan.org/broadcast",
      "name": "How to Broadcast Ethereum Transactions",
      "description": "Follow these steps to broadcast raw Ethereum transactions to the network using EthScan.",
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
          "text": "Once the transaction is successfully broadcasted, you’ll receive a confirmation with the transaction hash. Use the transaction hash to track the status on EthScan."
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
          "name": "What are the security benefits of using EthScan to broadcast transactions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The tool processes raw transaction data securely, minimizing exposure to third parties. No private keys are required, ensuring your wallet's safety."
          }
        },
        {
          "@type": "Question",
          "name": "How fast are Ethereum transactions broadcasted on EthScan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Transactions are directly sent to the Ethereum network, ensuring fast propagation. Ideal for time-sensitive transactions."
          }
        },
        {
          "@type": "Question",
          "name": "Is EthScan's broadcasting tool easy to use?",
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
            "text": "After submitting the transaction, you will receive a confirmation with the transaction hash, which you can use to track the status on EthScan."
          }
        }
      ]
    }
  )

  return (
    <StandardFrame>
      <Helmet>
        <meta name="description" content={description}/>
        <script type="application/ld+json">{payloadSchemaFaqPageAdditionalInfo}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>
      <h1 className="pb-2 text-xl text-gray-700">Broadcast Transaction</h1>
      <ContentFrame>
        <div className="space-y-3 py-4">
          <div>
          This page lets you broadcast a raw signed transaction to the
            network. Enter the transaction in hexadecimal format below:
          </div>
          <StandardTextarea
            onChange={(e) => setRawTx(e.target.value)}
            readOnly={false}
            placeholder={"0x..."}
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
      <div className="faq-section">
        <p><b>What are the security benefits of using the EthScan broadcasting tool?</b></p>
        <p>The tool processes raw transaction data securely, minimizing exposure to third parties.
          No private keys are required, ensuring your wallet's safety.
        </p>

        <br/>

        <p><b>How fast are Ethereum transactions broadcasted on EthScan?</b></p>
        <p>Transactions are directly sent to the Ethereum network, ensuring fast propagation.
          Ideal for time-sensitive transactions.
        </p>

        <br/>

        <p><b>Is EthScan's broadcasting tool easy to use?</b></p>
        <p>The tool is designed to be simple and user-friendly, ensuring that both beginners and experienced users can
          broadcast transactions with ease.</p>

        <br/>

        <p><b>How can I verify my broadcasted transaction?</b></p>
        <p>After submitting the transaction, you will receive a confirmation with the transaction hash, which you can
          use to track the status on EthScan</p>

      </div>
    </StandardFrame>
  );
};

export default BroadcastTransactionPage;
