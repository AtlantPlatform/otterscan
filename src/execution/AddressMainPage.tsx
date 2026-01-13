import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TabGroup, TabList, TabPanels } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useContext } from "react";
import { Outlet, useNavigate, useParams, useSearchParams } from "react-router";
import AddressOrENSNameNotFound from "../components/AddressOrENSNameNotFound";
import NavTab from "../components/NavTab";
import StandardFrame from "../components/StandardFrame";
import { useProxyAttributes } from "../ots2/usePrototypeTransferHooks";
import SourcifyLogo from "../sourcify/SourcifyLogo";
import { Match, useSourcifyMetadata } from "../sourcify/useSourcify";
import { useWhatsabiMetadata } from "../sourcify/useWhatsabi";
import { ChecksummedAddress } from "../types";
import { hasCodeQuery, getBalanceQuery } from "../useErigonHooks";
import { formatEther } from "ethers";
import { useAddressOrENS } from "../useResolvedAddresses";
import { RuntimeContext } from "../useRuntime";
import AddressSubtitle from "./address/AddressSubtitle";
import { AddressAwareComponentProps } from "./types";
import { Helmet } from 'react-helmet-async';

const ProxyTabs: React.FC<AddressAwareComponentProps> = ({ address }) => {
  const { addressOrName } = useParams();
  const { provider } = useContext(RuntimeContext);
  const proxyAttrs = useProxyAttributes(provider, address);
  return (
    <>
      {proxyAttrs.proxyHasCode && proxyAttrs.proxyMatch && (
        <NavTab href={`/address/${addressOrName}/proxyLogicContract`}>
          <span className={`flex items-baseline space-x-2`}>
            <span>Logic Contract</span>
            <SourcifyLogo />
          </span>
        </NavTab>
      )}
      {proxyAttrs.logicAddress && proxyAttrs.proxyMatch && (
        <NavTab href={`/address/${addressOrName}/readContractAsProxy`}>
          <span>Read as Proxy</span>
        </NavTab>
      )}
    </>
  );
};

export type AddressOutletContext = {
  address: string;
  hasCode: boolean | undefined;
  match: Match | null | undefined;
  whatsabiMatch: Match | null | undefined;
};

const AddressMainPage: React.FC = () => {
  const { addressOrName, direction } = useParams();
  if (addressOrName === undefined) {
    throw new Error("addressOrName couldn't be undefined here");
  }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFixer = useCallback(
    (address: ChecksummedAddress) => {
      navigate(
        `/address/${address}${
          direction ? "/" + direction : ""
        }?${searchParams.toString()}`,
        { replace: true },
      );
    },
    [navigate, direction, searchParams],
  );
  const [checksummedAddress, isENS, error] = useAddressOrENS(
    addressOrName,
    urlFixer,
  );

  const { config, provider } = useContext(RuntimeContext);
  const { data: hasCode } = useQuery(
    hasCodeQuery(provider, checksummedAddress, "latest"),
  );
  const { data: balance } = useQuery(
    checksummedAddress ? getBalanceQuery(provider, checksummedAddress) : { queryKey: [], queryFn: () => null, enabled: false },
  );

  const match = useSourcifyMetadata(
    hasCode ? checksummedAddress : undefined,
    provider._network.chainId,
  );
  const whatsabiMatch = useWhatsabiMetadata(
    match === null && hasCode ? checksummedAddress : undefined,
    provider._network.chainId,
    provider,
    config.assetsURLPrefix,
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <title>Ethereum Address {addressOrName} | Balance and Transactions</title>
          <meta name="description" content={`View Ethereum address ${addressOrName} details including current balance${balance ? ` (${formatEther(balance)} ETH)` : ''}, transaction history, token holdings, and smart contract information.`} />
          <link rel="canonical" href={`https://ethscan.org/address/${addressOrName}`} />
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          {error ? (
            <div className="px-3 lg:px-9">
              <AddressOrENSNameNotFound
                addressOrENSName={addressOrName}
                supportsENS={
                  provider._network.getPlugin("org.ethers.plugins.network.Ens") !==
                  null
                }
              />
            </div>
          ) : (
            checksummedAddress && (
              <>
                <div className="px-3 lg:px-9">
                  <AddressSubtitle
                    addressOrName={addressOrName}
                    address={checksummedAddress}
                    isENS={isENS}
                  />
                </div>
                <div className="mx-3 lg:mx-9">
                  <TabGroup>
                    <TabList className="flex space-x-2 rounded-t-lg border-l border-r border-t bg-white">
                      <NavTab href={`/address/${addressOrName}`}>Overview</NavTab>
                      {config?.experimental && (
                        <>
                          <NavTab href={`/address/${addressOrName}/erc20`}>
                            ERC20 Transfers
                          </NavTab>
                          <NavTab href={`/address/${addressOrName}/erc721`}>
                            ERC721 Transfers
                          </NavTab>
                          <NavTab href={`/address/${addressOrName}/tokens`}>
                            Token Balances
                          </NavTab>
                          <NavTab href={`/address/${addressOrName}/withdrawals`}>
                            Withdrawals
                          </NavTab>
                          <NavTab href={`/address/${addressOrName}/blocksRewarded`}>
                            Blocks Rewarded
                          </NavTab>
                        </>
                      )}
                      {hasCode && (
                        <>
                          <NavTab href={`/address/${addressOrName}/contract`}>
                            <span
                              className={`flex items-baseline space-x-2 ${
                                match === undefined ? "italic opacity-50" : ""
                              }`}
                            >
                              <span>Contract</span>
                              {match === undefined ? (
                                <span className="self-center">
                                  <FontAwesomeIcon
                                    className="animate-spin"
                                    icon={faCircleNotch}
                                  />
                                </span>
                              ) : match === null ? (
                                <span className="self-center text-red-500">
                                  <FontAwesomeIcon icon={faQuestionCircle} />
                                </span>
                              ) : (
                                <span className="self-center">
                                  <SourcifyLogo />
                                </span>
                              )}
                            </span>
                          </NavTab>
                          {(match || whatsabiMatch) && (
                            <NavTab href={`/address/${addressOrName}/readContract`}>
                              <span className={`flex items-baseline space-x-2`}>
                                <span>Read Contract</span>
                              </span>
                            </NavTab>
                          )}
                        </>
                      )}
                      {config?.experimental && (
                        <ProxyTabs address={checksummedAddress} />
                      )}
                    </TabList>
                    <TabPanels>
                      <Outlet
                        context={{
                          address: checksummedAddress,
                          hasCode,
                          match,
                          whatsabiMatch,
                        }}
                      />
                    </TabPanels>
                  </TabGroup>
                </div>
                {/* SEO Summary Section */}
                <div className="px-3 lg:px-9 mt-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Address Summary</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Ethereum address {checksummedAddress}
                      {balance !== undefined && balance !== null ? ` has a balance of ${formatEther(balance)} ETH` : ''}
                      {hasCode ? ' and is a smart contract' : ' and is an externally owned account (EOA)'}.
                      This page displays the address balance, transaction history, token transfers, and {hasCode ? 'contract information including source code, ABI, and read/write functions' : 'all associated blockchain activities'}.
                      View detailed analytics including ERC20/ERC721 token transfers, withdrawals, and blocks rewarded for this address.
                    </p>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      </StandardFrame>
    </div>
  );
};

export default AddressMainPage;
