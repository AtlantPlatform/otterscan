import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import React, { PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router";
import ThemeToggler from "./components/ThemeToggler";
import { SourcifySource } from "./sourcify/useSourcify";
import { useAppConfigContext } from "./useAppConfig";
import BTCIcon from './icons/btc-icon.svg'
import ETHIcon from './icons/eth-icon.svg'
import XMRIcon from './icons/xmr-icon.svg'
import MempoolIcon from './icons/mempool-icon.svg'
import MoneroIcon from './icons/monero-icon.svg'
import BTCFeeIcon from './icons/btc-fee-icon.svg'
import BTCFeesIcon from './icons/btc-fees-icon-action.svg'

const SourcifyMenu: React.FC = () => {
  const { sourcifySource, setSourcifySource } = useAppConfigContext() ?? {
    sourcifySource: null,
    setSourcifySource: (s: SourcifySource) => {},
  };
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Menu>
      <div className="relative self-stretch h-full">
        <MenuButton className="flex h-full w-full items-center justify-center space-x-2 rounded border px-2 py-1 text-sm">
          <FontAwesomeIcon icon={faBars} size="1x" />
        </MenuButton>
        <MenuItems className="absolute right-0 mt-1 flex min-w-max flex-col rounded-b border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 text-sm z-50">
          {/* Navigation Links - mobile and tablet */}
          <div className="block lg:hidden">
            <SourcifyMenuTitle>Navigation</SourcifyMenuTitle>
            <div className="flex flex-col">
              <SourcifyMenuItem
                checked={location.pathname === "/"}
                onClick={() => navigate("/")}
              >
                Dashboard
              </SourcifyMenuItem>
              <SourcifyMenuItem
                checked={location.pathname === "/blocks/recent"}
                onClick={() => navigate("/blocks/recent")}
              >
                Blocks
              </SourcifyMenuItem>
              <SourcifyMenuItem
                checked={location.pathname === "/tx/recent"}
                onClick={() => navigate("/tx/recent")}
              >
                Transactions
              </SourcifyMenuItem>
            </div>
            <div className="my-1 border-b border-gray-300" />
          </div>
          
          {/* Explorers - desktop and mobile */}
          <div>
            <SourcifyMenuTitle>Explorers</SourcifyMenuTitle>
            <ExternalMenuItem
              icon={BTCIcon}
              url="https://btcscan.org/"
            >
              BTC Explorer
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={ETHIcon}
              url="https://ethscan.org/"
            >
              ETH Explorer
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={XMRIcon}
              url="https://xmrscan.org/"
            >
              XMR Explorer
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={MoneroIcon}
              url="https://moneroexplorer.org/#/"
            >
              Monero Explorer
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={MempoolIcon}
              url="https://btcmempool.org/"
            >
              BTC Mempool
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={BTCFeeIcon}
              url="https://btcfee.org/"
            >
              BTC Fee
            </ExternalMenuItem>
            <ExternalMenuItem
              icon={BTCFeesIcon}
              url="https://btcfees.org/"
            >
              BTC Fees
            </ExternalMenuItem>
            <div className="my-1 border-b border-gray-300" />
          </div>
          
          <ThemeToggler />
          <div className="my-1 border-b border-gray-300" />
          <SourcifyMenuItem
            checked={location.pathname !== "/broadcastTx"}
            onClick={() => {
              navigate("/broadcastTx");
            }}
          >
            Broadcast Transaction
          </SourcifyMenuItem>
        </MenuItems>
      </div>
    </Menu>
  );
};

type SourcifyMenuItemProps = {
  checked?: boolean;
  onClick: (event?: any) => void;
};

export const SourcifyMenuItem: React.FC<
  PropsWithChildren<SourcifyMenuItemProps>
> = ({ checked = false, onClick, children }) => (
  <MenuItem>
    {({ focus }) => (
      <button
        className={`px-2 py-1 text-left text-sm ${
          focus ? "border-orange-200 text-gray-500" : "text-gray-400"
        } transition-colors transition-transform duration-75 ${
          checked ? "text-gray-900" : ""
        }`}
        onClick={onClick}
      >
        {children}
      </button>
    )}
  </MenuItem>
);

export const SourcifyMenuTitle: React.FC<PropsWithChildren> = ({
  children,
}) => (
  <div className="border-b border-gray-300 px-2 py-1 text-xs select-none">
    {children}
  </div>
);

type ExternalMenuItemProps = {
  icon: string;
  url: string;
};

export const ExternalMenuItem: React.FC<PropsWithChildren<ExternalMenuItemProps>> = ({ 
  icon, 
  url, 
  children 
}) => (
  <MenuItem>
    {({ focus }) => (
      <a
        href={url}
        rel="external"
        target="_blank"
        className={`flex items-center space-x-2 px-2 py-1 text-left text-sm ${
          focus ? "border-orange-200 text-gray-500" : "text-gray-400"
        } transition-colors transition-transform duration-75 hover:text-gray-900`}
      >
        <img src={icon} width={16} height={16} alt="" />
        <span>{children}</span>
      </a>
    )}
  </MenuItem>
);

export default React.memo(SourcifyMenu);
