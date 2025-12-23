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
          <title>Ethereum Address {addressOrName} | Wallet & Transactions | Ethscan</title>
          <meta name="description" content={`View details for Ethereum address ${addressOrName}. Explore wallet balance, transactions, token transfers, and on-chain activity using Ethscan.`} />
          <link rel="canonical" href={`https://ethscan.org/address/${addressOrName}`} />

          {/* OpenGraph */}
          <meta property="og:title" content={`Ethereum Address ${addressOrName} | Wallet & Transactions | Ethscan`} />
          <meta property="og:description" content={`Explore Ethereum address ${addressOrName}. View wallet balance, transactions, token transfers, and on-chain activity on Ethscan.`} />
          <meta property="og:url" content={`https://ethscan.org/address/${addressOrName}`} />

          {/* Twitter */}
          <meta name="twitter:title" content={`Ethereum Address ${addressOrName} | Wallet & Transactions | Ethscan`} />
          <meta name="twitter:description" content={`Explore Ethereum address ${addressOrName}. View wallet balance, transactions, and token transfers on Ethscan.`} />
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

                {/* FAQ Section */}
                <div className="px-3 lg:px-9 mt-6">
                  <div className="h-64 overflow-y-auto p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
                    <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">What is an Ethereum address?</h3>
                        <p>An Ethereum address is a unique 42-character hexadecimal identifier (starting with '0x') used to send and receive ETH and interact with smart contracts on the Ethereum blockchain.</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">How can I check the balance of an Ethereum address?</h3>
                        <p>You can view the balance of any Ethereum address on Ethscan by entering the address in the search bar. The balance shows the amount of ETH held by the address.</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mt-0 mb-3 text-gray-900 dark:text-gray-100">What is the difference between an EOA and a smart contract?</h3>
                        <p>An Externally Owned Account (EOA) is controlled by a private key and can initiate transactions. A smart contract is code deployed on the blockchain that executes automatically when triggered by transactions.</p>
                      </div>
                    </div>
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
