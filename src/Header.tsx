import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, lazy, memo, useContext, useState } from "react";
import { Link } from "react-router";
import PriceBox from "./PriceBox";
import SourcifyMenu from "./SourcifyMenu";
import { useGenericSearch } from "./search/search";
import { RuntimeContext } from "./useRuntime";

import ETHScanLogoSingle from "./ethscanlogosingle.png";
import ETHScanLogoSingleText from "./LogoText.png";
import ETHScanLogoSingleTextDark from "./LogoTextDark.png";
import BTCIcon from './icons/btc-icon.svg'
import ETHIcon from './icons/eth-icon.svg'
import XMRIcon from './icons/xmr-icon.svg'
import MempoolIcon from './icons/mempool-icon.svg'

const CameraScanner = lazy(() => import("./search/CameraScanner"));

const Header: FC = () => {
  const { config, provider } = useContext(RuntimeContext);
  const [searchRef, handleChange, handleSubmit] = useGenericSearch();
  const [isScanning, setScanning] = useState<boolean>(false);

  return (
    <>
      {isScanning && <CameraScanner turnOffScan={() => setScanning(false)} />}

      {/* Full width background wrapper */}
      <div className="w-full bg-white border-b border-gray-200">
        {/* Responsive header with conditional element display */}
        <div className="px-3 lg:px-9 py-2 lg:py-4 max-w-7xl mx-auto">
        {/* Mobile Header Layout */}
        <div className="flex flex-col space-y-3 lg:hidden">
          {/* Top row: Logo and Menu */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link className="flex items-center space-x-2 font-title text-lg font-bold flex-shrink-0" to="/">
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

            {/* Menu */}
            <div className="flex-shrink-0">
              <SourcifyMenu />
            </div>
          </div>

          {/* Bottom row: Search Bar */}
          <form
            className="flex w-full"
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
              className="border bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none flex-shrink-0"
              type="button"
              onClick={() => setScanning(true)}
              title="Scan an ETH address using your camera"
            >
              <FontAwesomeIcon icon={faQrcode} />
            </button>
            <button
              className="rounded-r border-b border-r border-t bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none flex-shrink-0"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>

        {/* Desktop Header Layout */}
        <div className="hidden lg:flex items-center justify-between gap-x-4">
          {/* Logo */}
          <Link className="flex items-center space-x-2 font-title text-xl font-bold flex-shrink-0 self-center" to="/">
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

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
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

          {/* ETH Price */}
          {(provider._network.chainId === 1n ||
            config.priceOracleInfo?.nativeTokenPrice?.ethUSDOracleAddress) && (
              <div className="hidden xl:block">
                <PriceBox />
              </div>
            )}

          {/* Search Bar */}
          <form
            className="flex flex-1 max-w-md"
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

          {/* External Site Icons */}
          <div className="flex items-center gap-x-2">
            <a className="flex items-center" href="https://btcscan.org/" rel="external" target="_blank">
              <img
                src={BTCIcon}
                className="w-[32px] h-[32px] hover:scale-110 transition-transform duration-200"
                alt="BTC Explorer"
                title="BTC Explorer"
              />
            </a>
            <a className="flex items-center" href="https://ethscan.org/" rel="external" target="_blank">
              <img
                src={ETHIcon}
                className="w-[32px] h-[32px] hover:scale-110 transition-transform duration-200"
                alt="ETH Explorer"
                title="ETH Explorer"
              />
            </a>
            <a className="flex items-center" href="https://xmrscan.org/" rel="external" target="_blank">
              <img
                src={XMRIcon}
                className="w-[32px] h-[32px] hover:scale-110 transition-transform duration-200"
                alt="XMR Explorer"
                title="XMR Explorer"
              />
            </a>
            <a className="flex items-center" href="https://btcmempool.org/" rel="external" target="_blank">
              <img
                src={MempoolIcon}
                className="w-[32px] h-[32px] hover:scale-110 transition-transform duration-200"
                alt="BTC Mempool"
                title="BTC Mempool"
              />
            </a>
          </div>

          {/* Menu */}
          <div>
            <SourcifyMenu />
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default memo(Header);
