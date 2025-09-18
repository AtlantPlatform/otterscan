import { useQuery } from "@tanstack/react-query";
import { formatEther } from "ethers";
import { FC, useContext, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router";
import ContentFrame from "../../components/ContentFrame";
import { balancePreset } from "../../components/FiatValue";
import InfoRow from "../../components/InfoRow";
import NativeTokenAmountAndFiat from "../../components/NativeTokenAmountAndFiat";
import StandardScrollableTable from "../../components/StandardScrollableTable";
import StandardTBody from "../../components/StandardTBody";
import TransactionLink from "../../components/TransactionLink";
import { useProxyAttributes } from "../../ots2/usePrototypeTransferHooks";
import ResultHeader from "../../search/ResultHeader";
import TransactionItem from "../../search/TransactionItem";
import UndefinedPageControl from "../../search/UndefinedPageControl";
import { SearchController } from "../../search/search";
import { useFeeToggler } from "../../search/useFeeToggler";
import StandardSelectionBoundary from "../../selection/StandardSelectionBoundary";
import { ProcessedTransaction } from "../../types";
import { BlockNumberContext } from "../../useBlockTagContext";
import {
  getBalanceQuery,
  useContractCreator,
  useTransactionCount,
} from "../../useErigonHooks";
import { useResolvedAddress } from "../../useResolvedAddresses";
import { RuntimeContext } from "../../useRuntime";
import { usePageTitle } from "../../useTitle";
import { commify } from "../../utils/utils";
import { type AddressOutletContext } from "../AddressMainPage";
import DecoratedAddressLink from "../components/DecoratedAddressLink";
import TransactionAddressWithCopy from "../components/TransactionAddressWithCopy";
import { AddressAwareComponentProps } from "../types";
import PendingItem from "./PendingItem";
import PendingPage from "./PendingPage";
import {Helmet} from 'react-helmet-async';
import {formatValue} from '../../components/formatter';
import {useChainInfo} from '../../useChainInfo';

const ProxyInfo: FC<AddressAwareComponentProps> = ({ address }) => {
  const { provider } = useContext(RuntimeContext);
  const proxyAttributes = useProxyAttributes(provider, address);
  return (
    <>
      {proxyAttributes && proxyAttributes.proxyType && (
        <InfoRow title="Proxy type">{proxyAttributes.proxyType}</InfoRow>
      )}
      {proxyAttributes && proxyAttributes.logicAddress && (
        <InfoRow title="Logic contract">
          <DecoratedAddressLink address={proxyAttributes.logicAddress} />
        </InfoRow>
      )}
    </>
  );
};

const AddressTransactionResults: FC = () => {
  const { address, hasCode } = useOutletContext() as AddressOutletContext;
  const { config, provider } = useContext(RuntimeContext);
  const [feeDisplay, feeDisplayToggler] = useFeeToggler();

  const { addressOrName, direction } = useParams();
  if (addressOrName === undefined) {
    throw new Error("addressOrName couldn't be undefined here");
  }

  const [searchParams] = useSearchParams();
  const hash = searchParams.get("h");

  const [controller, setController] = useState<SearchController>();

  const transactionCount = useTransactionCount(
    provider,
    hasCode === false ? address : undefined,
  );

  useEffect(() => {
    if (!address) {
      return;
    }

    const readFirstPage = async () => {
      const _controller = await SearchController.firstPage(provider, address);
      setController(_controller);
    };
    const readMiddlePage = async (next: boolean) => {
      const _controller = await SearchController.middlePage(
        provider,
        address,
        hash!,
        next,
      );
      setController(_controller);
    };
    const readLastPage = async () => {
      const _controller = await SearchController.lastPage(provider, address);
      setController(_controller);
    };
    const prevPage = async () => {
      const _controller = await controller!.prevPage(provider, hash!);
      setController(_controller);
    };
    const nextPage = async () => {
      const _controller = await controller!.nextPage(provider, hash!);
      setController(_controller);
    };

    // Page load from scratch
    if (direction === "first" || direction === undefined) {
      if (!controller?.isFirst || controller.address !== address) {
        readFirstPage();
      }
    } else if (direction === "prev") {
      if (controller && controller.address === address) {
        prevPage();
      } else {
        readMiddlePage(false);
      }
    } else if (direction === "next") {
      if (controller && controller.address === address) {
        nextPage();
      } else {
        readMiddlePage(true);
      }
    } else if (direction === "last") {
      if (!controller?.isLast || controller.address !== address) {
        readLastPage();
      }
    }
  }, [provider, address, direction, hash, controller]);

  const page = useMemo(() => controller?.getPage(), [controller]);

  const creator = useContractCreator(provider, address);
  const resolvedAddress = useResolvedAddress(provider, address);
  const resolvedName = resolvedAddress
    ? resolvedAddress[0].resolveToString(resolvedAddress[1])
    : undefined;
  const resolvedNameTrusted = resolvedAddress
    ? resolvedAddress[0].trusted(resolvedAddress[1])
    : undefined;

  usePageTitle(
    `Ethereum Address ${addressOrName} - Balance, Transactions, and Analytics`,
  );

  const { data: balance } = useQuery(getBalanceQuery(provider, address));
  const {
    nativeCurrency: { symbol, decimals },
  } = useChainInfo();
  const formattedValue = formatValue(balance || 0, decimals);

  const description = `Details for Ethereum address ${addressOrName} including current balance, transaction history, and analytics for activity.`
  const payloadSchemaWebPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `https://ethscan.org/address/${addressOrName}`,
    "name": "Ethereum Address Details",
    "mainEntity": {
      "@type": "Person",
      "identifier": `${addressOrName}`,
      "balance": {
        "@type": "MonetaryAmount",
        "currency": "ETH",
        "value": `${formattedValue}`
      }
    }
  })
  const payloadSchemaFaqPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an Ethereum address?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Ethereum address is a unique identifier used to send and receive transactions on the Ethereum blockchain. It starts with '0x' followed by 40 hexadecimal characters."
        }
      },
      {
        "@type": "Question",
        "name": "How can I check the balance of an Ethereum address?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can view the balance of an Ethereum address on Ethscan by searching for the address in the search bar."
        }
      },
      {
        "@type": "Question",
        "name": "What does the transaction history of an Ethereum address show?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The transaction history shows all incoming and outgoing transactions associated with the address, including amounts and timestamps."
        }
      }
    ]
  })

  return (
    <ContentFrame tabs>
      <Helmet>
        <meta name="description" content={description}/>
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>
      <StandardSelectionBoundary>
        <BlockNumberContext.Provider value="latest">
          <InfoRow title="Balance">
            <div className="grid grid-cols-3 flex divide-x-2 divide-dotted divide-gray-300 text-sm">
              <div
                className={`${transactionCount !== undefined ? "col-span-1" : "col-span-3"}`}
              >
                {balance === undefined ? (
                  <div className="w-80">
                    <PendingItem />
                  </div>
                ) : (
                  <NativeTokenAmountAndFiat
                    value={balance}
                    {...balancePreset}
                  />
                )}
              </div>
              {transactionCount !== undefined && (
                <div className="pl-4 col-span-2 grid grid-cols-2">
                  <div className="col-span-1">Transactions sent:</div>
                  <div className="col-span-1">
                    {commify(transactionCount.toString())}
                  </div>
                </div>
              )}
            </div>
          </InfoRow>
          {creator && (
            <InfoRow title="Contract creator">
              <div className="flex flex-col md:flex-row divide-x-2 divide-dotted divide-gray-300">
                <TransactionAddressWithCopy
                  address={creator.creator}
                  showCodeIndicator
                />
                <div className="md:ml-3 flex items-baseline pl-3 truncate">
                  <div className="truncate">
                    <TransactionLink txHash={creator.hash} />
                  </div>
                </div>
              </div>
            </InfoRow>
          )}
          {config.experimental && <ProxyInfo address={address} />}
        </BlockNumberContext.Provider>
        <NavBar address={address} page={page} controller={controller} />
        <StandardScrollableTable isAuto={true}>
          <ResultHeader
            feeDisplay={feeDisplay}
            feeDisplayToggler={feeDisplayToggler}
          />
          {page ? (
            <StandardTBody>
              {page.map((tx) => (
                <TransactionItem
                  key={tx.hash}
                  tx={tx}
                  selectedAddress={address}
                  feeDisplay={feeDisplay}
                />
              ))}
            </StandardTBody>
          ) : (
            <PendingPage rows={1} cols={8} />
          )}
        </StandardScrollableTable>
        <NavBar address={address} page={page} controller={controller} />
      </StandardSelectionBoundary>
      {/* SEO Summary Section */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Address Summary</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Ethereum address {address} {resolvedName && resolvedNameTrusted ? `(ENS: ${resolvedName})` : ''} 
          {hasCode ? ' is a smart contract' : ' is an externally owned account (EOA)'}
          {balance !== undefined && balance !== null ? ` with a balance of ${formatEther(balance)} ETH` : ''}.
          This page displays the address balance, transaction history, token transfers, and {hasCode ? 'contract information including source code, ABI, and read/write functions' : 'all associated blockchain activities'}.
          View detailed analytics including ERC20/ERC721 token transfers, withdrawals, and blocks rewarded for this address.
        </p>
      </div>
    </ContentFrame>
  );
};

type NavBarProps = AddressAwareComponentProps & {
  page: ProcessedTransaction[] | undefined;
  controller: SearchController | undefined;
};

const NavBar: FC<NavBarProps> = ({ address, page, controller }) => (
  <div className="flex items-baseline justify-between py-3">
    <div className="text-sm text-gray-500">
      {page === undefined ? (
        <>Waiting for search results...</>
      ) : (
        <>
          <span data-test="page-count">{page.length}</span> transaction
          {page.length !== 1 && "s"} on this page
        </>
      )}
    </div>
    <UndefinedPageControl
      address={address}
      isFirst={controller?.isFirst}
      isLast={controller?.isLast}
      prevHash={page?.[0]?.hash ?? ""}
      nextHash={page?.[page.length - 1]?.hash ?? ""}
      disabled={controller === undefined}
    />
  </div>
);

export default AddressTransactionResults;
