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
    "@type": "WebSite",
    "url": "https://ethscan.org",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ethscan.org/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Helmet>
        <title>Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan</title>
        <meta name="description" content="Explore Ethereum blockchain data in real-time. Search transactions, blocks, addresses, and smart contracts with Ethscan's comprehensive blockchain explorer." />
        <link rel="canonical" href="https://ethscan.org/" />
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
