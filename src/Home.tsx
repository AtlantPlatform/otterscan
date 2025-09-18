import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, lazy, memo, useContext, useState } from "react";
import { Link, NavLink } from "react-router";
import SourcifyMenu from "./SourcifyMenu";
import ETHScanLogoSingle from "./ethscanlogosingle.png";
import ETHScanLogoSingleText from "./LogoText.png";
import ETHScanLogoSingleTextDark from "./LogoTextDark.png";
import RecentBlocksSection from "./components/RecentBlocksSection";
import RecentTransactionsSection from "./components/RecentTransactionsSection";
import { useGenericSearch } from "./search/search";
import { RuntimeContext } from "./useRuntime";
import { Helmet } from 'react-helmet-async';
import PriceBox from "./PriceBox";
import BTCIcon from './icons/btc-icon.svg'
import ETHIcon from './icons/eth-icon.svg'
import XMRIcon from './icons/xmr-icon.svg'
import MempoolIcon from './icons/mempool-icon.svg'

const CameraScanner = lazy(() => import("./search/CameraScanner"));

const Home: FC = () => {
  const { provider, config } = useContext(RuntimeContext);
  const [searchRef, handleChange, handleSubmit] = useGenericSearch();
  const [isScanning, setScanning] = useState<boolean>(false);
  const structuredJSON = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://ethscan.org",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ethscan.org/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
  );


  return (
    <>
      <Helmet>
        <meta name="description" content="Explore Ethereum blockchain data in real-time. Search transactions, blocks, addresses, logs, and more with Ethscan's user-friendly explorer" />
        <title>Ethereum Explorer - Search Ethereum Transactions, Blocks, and Addresses | Ethscan</title>
        <link rel="canonical" href="https://ethscan.org/" />


        <script type="application/ld+json">{structuredJSON}</script>
      </Helmet>
      {/* Responsive header with conditional element display */}
      <div className="flex items-center justify-between px-3 lg:px-9 py-2 lg:py-4 gap-x-2">
        {/* Logo */}
        <Link className="flex items-center space-x-2 font-title text-lg sm:text-xl font-bold flex-shrink-0 self-center" to="/">
          <img
            className="rounded-full logo-main"
            src={ETHScanLogoSingle}
            alt="Ethscan logo"
            title="Ethscan logo"
          />
          <img
            className="logo-text-dark hidden sm:block logo-text"
            src={ETHScanLogoSingleText}
            alt="Ethscan logo text"
            title="Ethscan logo text"
          />
          <img
            className="logo-text-white hidden sm:block logo-text"
            src={ETHScanLogoSingleTextDark}
            alt="Ethscan logo text"
            title="Ethscan logo text"
          />
        </Link>

        {/* Navigation Links - desktop only */}
        <div className="hidden lg:flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">
            Dashboard
          </Link>
          <Link to="/blocks/recent" className="text-gray-700 hover:text-blue-600 font-medium text-base">
            Blocks
          </Link>
          <Link to="/tx/recent" className="text-gray-700 hover:text-blue-600 font-medium text-base">
            Transactions
          </Link>
        </div>

        {/* ETH Price - only on larger screens */}
        {(provider._network.chainId === 1n ||
          config.priceOracleInfo?.nativeTokenPrice?.ethUSDOracleAddress) && (
            <div className="hidden xl:block">
              <PriceBox />
            </div>
          )}

        {/* Search Bar - adaptive width */}
        <form
          className="flex flex-1 max-w-md mx-2"
          onSubmit={handleSubmit}
          autoComplete="off"
          spellCheck={false}
        >
          <input
            className="flex-1 min-w-0 rounded-l border-b border-l border-t px-2 py-1 text-sm focus:outline-none"
            type="text"
            placeholder={`Search by address / txn hash / block${provider._network.getPlugin(
              "org.ethers.plugins.network.Ens",
            ) !== null
              ? " / ENS"
              : ""
              }`}
            onChange={handleChange}
            ref={searchRef}
          />
          <button
            className="border bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none"
            type="button"
            onClick={() => setScanning(true)}
            title="Scan an ETH address using your camera"
          >
            <FontAwesomeIcon icon={faQrcode} />
          </button>
          <button
            className="rounded-r border-b border-r border-t bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none"
            type="submit"
          >
            Search
          </button>
        </form>

        {/* External Site Icons - desktop only */}
        <div className="hidden lg:flex items-center gap-x-2">
          <a className="flex items-center" href="https://btcscan.org/" rel="external" target="_blank">
            <img
              src={BTCIcon}
              className="w-[32px] h-[32px]"
              alt="btcscan icon"
              title="btcscan icon"
            />
          </a>
          <a className="flex items-center" href="https://ethscan.org/" rel="external" target="_blank">
            <img
              src={ETHIcon}
              className="w-[32px] h-[32px]"
              alt="ethscan icon"
              title="ethscan icon"
            />
          </a>
          <a className="flex items-center" href="https://xmrscan.org/" rel="external" target="_blank">
            <img
              src={XMRIcon}
              className="w-[32px] h-[32px]"
              alt="xmrscan icon"
              title="xmrscan icon"
            />
          </a>
          <a className="flex items-center" href="https://btcmempool.org/" rel="external" target="_blank">
            <img
              src={MempoolIcon}
              className="w-[32px] h-[32px]"
              alt="btcmempool icon"
              title="btcmempool icon"
            />
          </a>
        </div>

        {/* Menu - contains nav/external links on mobile, settings on all screens */}
        <div>
          <SourcifyMenu />
        </div>
      </div>

      {isScanning && <CameraScanner turnOffScan={() => setScanning(false)} />}

      <div className="px-3 lg:px-9 py-6">
        {!(config.branding?.hideAnnouncements ?? false) &&
          config.experimental && (
            <div className="flex justify-center mb-6">
              <NavLink
                className="text-md font-bold text-green-600 hover:text-green-800"
                to="contracts/all"
              >
                🧪 EXPERIMENTAL CONTRACT BROWSER 🧪
              </NavLink>
            </div>
          )}

        {/* Recent Blocks and Transactions Sections */}
        <div className="space-y-6">
          <RecentBlocksSection />
          <RecentTransactionsSection />
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-6">
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h1>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is Ethereum?</h2>
            <p>Ethereum is a decentralized blockchain platform that enables smart contracts and decentralized applications (DApps) to be built and operated without downtime, fraud, control, or interference from a third party.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is a blockchain explorer?</h2>
            <p>A blockchain explorer is a web application that allows users to search and navigate blockchain data, including transactions, blocks, addresses, and smart contracts. Ethscan provides real-time access to Ethereum blockchain data.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How do I search for a transaction?</h2>
            <p>Enter the transaction hash (a 66-character string starting with '0x') in the search bar above. You can also search by block number, address, or ENS name to find related transactions.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is a transaction hash?</h2>
            <p>A transaction hash is a unique identifier for each transaction on the blockchain. It's a 66-character hexadecimal string that starts with '0x' and serves as a digital fingerprint for the transaction.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What is gas in Ethereum?</h2>
            <p>Gas is the unit that measures the computational effort required to execute operations on Ethereum. Users pay gas fees to compensate validators for the computing energy required to process and validate transactions.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What's the difference between an EOA and a smart contract?</h2>
            <p>An Externally Owned Account (EOA) is controlled by a private key and can initiate transactions. A smart contract is a program deployed on the blockchain that executes automatically when certain conditions are met.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">How can I verify a smart contract?</h2>
            <p>Smart contract verification involves submitting the source code to match the deployed bytecode on the blockchain. This allows users to read and verify the contract's functionality. Use the contract page to access verification options.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">What are internal transactions?</h2>
            <p>Internal transactions are value transfers or contract calls that occur within the execution of a smart contract. They are not recorded directly on the blockchain but can be traced through transaction execution.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(Home);
