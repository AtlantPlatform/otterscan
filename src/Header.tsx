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
import MoneroLogo from "./icons/Monero-menu-logo.svg";
import BTCIcon from './icons/btc-icon.svg'
import ETHIcon from './icons/eth-icon.svg'
import XMRIcon from './icons/xmr-icon.svg'
import MoneroIcon from './icons/monero-icon.svg'
import MempoolIcon from './icons/mempool-icon.svg'
import BTCFeeIcon from './icons/btc-fee-icon.svg'
import BTCFeesIcon from './icons/btc-fees-icon-action.svg'

const CameraScanner = lazy(() => import("./search/CameraScanner"));

const Header: FC = () => {
  const { config, provider } = useContext(RuntimeContext);
  const [searchRef, handleChange, handleSubmit] = useGenericSearch();
  const [isScanning, setScanning] = useState<boolean>(false);

  return (
    <>
      {isScanning && <CameraScanner turnOffScan={() => setScanning(false)} />}
      <div className="flex flex-col sm:flex-row items-baseline space-y-1 sm:space-y-0 justify-between px-3 lg:px-9 py-2">
        <div className="flex flex-row justify-between sm:self-center items-center w-full sm:w-auto shrink-0 mr-2">
          <Link className="self-center" to="/">
            <div className="flex items-center space-x-2 font-title text-2xl font-bold">
              <img
                className="rounded-full"
                src={ETHScanLogoSingle}
                width={32}
                height={32}
                alt="Ethscan logo"
                title="Ethscan logo"
              />
              <img
                className="logo-text-dark"
                src={ETHScanLogoSingleText}
                width={95}
                alt="Ethscan logo text"
                title="Ethscan logo text"
              />
              <img
                className="logo-text-white"
                src={ETHScanLogoSingleTextDark}
                width={95}
                alt="Ethscan logo text"
                title="Ethscan logo text"
              />
            </div>
          </Link>
          <div className="inline sm:hidden">
            <SourcifyMenu/>
          </div>
        </div>
        <div className="flex items-baseline gap-x-3">
          <div className="flex align-middle gap-x-1">
            <a className="p-1" href="https://btcscan.org/" rel="external" target="_blank">
              <img
                src={BTCIcon}
                width={32}
                alt="btcmempool icon"
                title="btcmempool icon"
              />
            </a>
            <a className="p-1" href="https://ethscan.org/" rel="external" target="_blank">
              <img
                src={ETHIcon}
                width={32}
                alt="ethscan icon"
                title="ethscan icon"
              />
            </a>
            <a className="p-1" href="https://xmrscan.org/" rel="external" target="_blank">
              <img
                src={XMRIcon}
                width={32}
                alt="xmrscan icon"
                title="xmrscan icon"
              />
            </a>
            <a className="p-1" href="https://moneroexplorer.org/" rel="external" target="_blank">
              <img
                src={MoneroIcon}
                width={32}
                alt="moneroexplorer icon"
                title="moneroexplorer icon"
              />
            </a>
            <a className="p-1" href="https://btcmempool.org/" rel="external" target="_blank">
              <img
                src={MempoolIcon}
                width={32}
                alt="btcmempool icon"
                title="btcmempool icon"
              />
            </a>
            <a className="p-1" href="https://btcfee.org/" rel="external" target="_blank">
              <img
                src={BTCFeeIcon}
                width={32}
                alt="btcfee icon"
                title="btcfee icon"
              />
            </a>
            <a className="p-1" href="https://btcfees.org/" rel="external" target="_blank">
              <img
                src={BTCFeesIcon}
                width={32}
                alt="btcfees icon"
                title="btcfees icon"
              />
            </a>
          </div>
          <div className="hidden sm:inline self-stretch">
            <SourcifyMenu/>
          </div>
        </div>
      </div>
      <div
        className="flex flex-col sm:flex-row items-baseline space-y-1 sm:space-y-0 justify-between px-3 lg:px-9 py-2">
        <div className="flex grow justify-end items-baseline gap-x-3">
          {(provider._network.chainId === 1n ||
            config.priceOracleInfo?.nativeTokenPrice?.ethUSDOracleAddress) && (
            <div className="hidden lg:inline">
              <PriceBox/>
            </div>
          )}
          <form
            className="flex"
            onSubmit={handleSubmit}
            autoComplete="off"
            spellCheck={false}
          >
            <input
              className="w-full rounded-l border-b border-l border-t px-2 py-1 text-sm focus:outline-none"
              type="text"
              size={60}
              placeholder={`Type "/" to search by address / txn hash / block number${
                provider._network.getPlugin(
                  "org.ethers.plugins.network.Ens",
                ) !== null
                  ? " / ENS name"
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
        </div>
      </div>
    </>
  );
};

export default memo(Header);
