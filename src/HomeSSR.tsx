import { FC, memo } from "react";
import { Helmet } from 'react-helmet-async';
import HeaderSSR from "./components/HeaderSSR";
import RecentBlocksSectionSSR from "./components/RecentBlocksSectionSSR";
import RecentTransactionsSectionSSR from "./components/RecentTransactionsSectionSSR";

/**
 * SSR-safe Home page component.
 * Does not use RuntimeContext, so it can render on the server.
 * Search functionality and interactive features are disabled during SSR.
 */
const HomeSSR: FC = () => {
  const structuredJSON = JSON.stringify({
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
        "name": "Ethereum Blockchain Real-Time Data",
        "description": "Real-time listing of Ethereum blocks and transactions including block number, timestamps, transaction counts, gas usage and more.",
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
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Ethereum?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ethereum is a decentralized blockchain platform that enables smart contracts and decentralized applications (DApps)."
            }
          },
          {
            "@type": "Question",
            "name": "How do I search for a transaction?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Enter the transaction hash (a 66-character string starting with '0x') in the search bar to find related transactions, blocks, or addresses."
            }
          },
          {
            "@type": "Question",
            "name": "What is a transaction hash?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A transaction hash is a unique identifier for each blockchain transaction — a 66-character hexadecimal string starting with '0x'."
            }
          },
          {
            "@type": "Question",
            "name": "What is gas in Ethereum?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Gas measures the computational effort required to execute operations on Ethereum; users pay gas fees to process transactions."
            }
          },
          {
            "@type": "Question",
            "name": "What's the difference between an EOA and a smart contract?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An Externally Owned Account (EOA) is controlled by a private key and initiates transactions, while a smart contract is code deployed on the blockchain that executes automatically."
            }
          },
          {
            "@type": "Question",
            "name": "How can I verify a smart contract?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Smart contract verification involves submitting source code to match deployed bytecode on the blockchain so users can read and verify contract logic."
            }
          },
          {
            "@type": "Question",
            "name": "What are internal transactions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Internal transactions are value transfers or contract calls inside a smart contract execution that aren't recorded directly on the blockchain but can be traced."
            }
          }
        ]
      }
    ]
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Helmet>
        <title>Ethereum Block Explorer - Search Blocks, Transactions & Addresses | Ethscan</title>
        <meta name="description" content="Explore the Ethereum blockchain with Ethscan - real-time access to blocks, transactions, wallet addresses, smart contracts and on-chain data." />
        <link rel="canonical" href="https://ethscan.org/" />
        {/* OpenGraph */}
        <meta property="og:title" content="Ethereum Block Explorer - Search Blocks, Transactions & Addresses | Ethscan" />
        <meta property="og:description" content="Explore the Ethereum blockchain with Ethscan - real-time access to blocks, transactions, wallet addresses, and smart contracts." />
        {/* Twitter */}
        <meta name="twitter:title" content="Ethereum Block Explorer - Search Blocks, Transactions & Addresses | Ethscan" />
        <meta name="twitter:description" content="Explore the Ethereum blockchain with Ethscan - real-time access to blocks, transactions, wallet addresses, and smart contracts." />
        <script type="application/ld+json">{structuredJSON}</script>
      </Helmet>

      <HeaderSSR />

      <div className="py-6 max-w-7xl mx-auto">
        {/* Recent Blocks and Transactions Sections */}
        <div className="space-y-6">
          <RecentBlocksSectionSSR />
          <RecentTransactionsSectionSSR />
        </div>

        {/* Main Content Section - Fixed height to prevent layout shift */}
        <div className="mt-12 px-3 lg:px-9 min-h-[600px]">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ethereum Blockchain Explorer</h1>
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mb-8">
            <p>Ethscan is a powerful blockchain explorer that provides real-time access to Ethereum blockchain data. Search and navigate through transactions, blocks, addresses, and smart contracts with ease. Our explorer allows you to track ETH transactions, monitor DeFi positions, verify smart contracts, and investigate any address on the Ethereum network. Whether you're a developer, trader, or blockchain enthusiast, Ethscan offers comprehensive tools to explore and understand the Ethereum ecosystem.</p>
          </div>

          <div className="h-96 overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
              <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">What is Ethereum?</h3>
              <p>Ethereum is a decentralized blockchain platform that enables smart contracts and decentralized applications (DApps) to be built and operated without downtime, fraud, control, or interference from a third party.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How do I search for a transaction?</h3>
              <p>Enter the transaction hash (a 66-character string starting with '0x') in the search bar above. You can also search by block number, address, or ENS name to find related transactions.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is a transaction hash?</h3>
              <p>A transaction hash is a unique identifier for each transaction on the blockchain. It's a 66-character hexadecimal string that starts with '0x' and serves as a digital fingerprint for the transaction.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is gas in Ethereum?</h3>
              <p>Gas is the unit that measures the computational effort required to execute operations on Ethereum. Users pay gas fees to compensate validators for the computing energy required to process and validate transactions.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What's the difference between an EOA and a smart contract?</h3>
              <p>An Externally Owned Account (EOA) is controlled by a private key and can initiate transactions. A smart contract is a program deployed on the blockchain that executes automatically when certain conditions are met.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How can I verify a smart contract?</h3>
              <p>Smart contract verification involves submitting the source code to match the deployed bytecode on the blockchain. This allows users to read and verify the contract's functionality. Use the contract page to access verification options.</p>

              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What are internal transactions?</h3>
              <p>Internal transactions are value transfers or contract calls that occur within the execution of a smart contract. They are not recorded directly on the blockchain but can be traced through transaction execution.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(HomeSSR);
