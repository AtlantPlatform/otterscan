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
import MempoolLogo from "./icons/BTCMempool-menu-logo.svg";
import BTCLogo from "./icons/Bitcoin-menu-logo.svg";
import ETHLogo from "./icons/Ethereum2-menu-logo.svg";
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
      
      {/* Responsive header with conditional element display */}
      <div className="flex items-center justify-between px-3 lg:px-9 py-2 gap-x-2">
        {/* Logo */}
        <Link className="flex items-center space-x-2 font-title text-lg sm:text-xl font-bold" to="/">
          <img
            className="rounded-full"
            src={ETHScanLogoSingle}
            width={24}
            height={24}
            alt="Ethscan logo"
            title="Ethscan logo"
          />
          <img
            className="logo-text-dark hidden sm:block"
            src={ETHScanLogoSingleText}
            width={75}
            alt="Ethscan logo text"
            title="Ethscan logo text"
          />
          <img
            className="logo-text-white hidden sm:block"
            src={ETHScanLogoSingleTextDark}
            width={75}
            alt="Ethscan logo text"
            title="Ethscan logo text"
          />
        </Link>
        
        {/* Navigation Links - desktop only */}
        <div className="hidden lg:flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium text-sm">
            Dashboard
          </Link>
          <Link to="/blocks/recent" className="text-gray-700 hover:text-blue-600 font-medium text-sm">
            Blocks
          </Link>
          <Link to="/tx/recent" className="text-gray-700 hover:text-blue-600 font-medium text-sm">
            Transactions
          </Link>
        </div>
        
        {/* ETH Price - only on larger screens */}
        {(provider._network.chainId === 1n ||
          config.priceOracleInfo?.nativeTokenPrice?.ethUSDOracleAddress) && (
          <div className="hidden xl:block">
            <PriceBox/>
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
            placeholder={`Search by address / txn hash / block${
              provider._network.getPlugin(
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
            <FontAwesomeIcon icon={faQrcode}/>
          </button>
          <button
            className="rounded-r border-b border-r border-t bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none"
            type="submit"
          >
            Search
          </button>
        </form>
        
        {/* External Site Icons - desktop only */}
        <div className="hidden lg:flex align-middle gap-x-1">
          <a className="p-1" href="https://btcscan.org/" rel="external" target="_blank">
            <img
              src={BTCIcon}
              width={20}
              alt="btcscan icon"
              title="btcscan icon"
            />
          </a>
          <a className="p-1" href="https://ethscan.org/" rel="external" target="_blank">
            <img
              src={ETHIcon}
              width={20}
              alt="ethscan icon"
              title="ethscan icon"
            />
          </a>
          <a className="p-1" href="https://xmrscan.org/" rel="external" target="_blank">
            <img
              src={XMRIcon}
              width={20}
              alt="xmrscan icon"
              title="xmrscan icon"
            />
          </a>
          <a className="p-1" href="https://btcmempool.org/" rel="external" target="_blank">
            <img
              src={MempoolIcon}
              width={20}
              alt="btcmempool icon"
              title="btcmempool icon"
            />
          </a>
        </div>
        
        {/* Menu - contains nav/external links on mobile, settings on all screens */}
        <div>
          <SourcifyMenu/>
        </div>
      </div>
    </>
  );
};

export default memo(Header);
