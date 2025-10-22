import { faBurn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Utf8ErrorFuncs, formatUnits, formatEther, toUtf8String } from "ethers";
import { FC, useContext, useMemo } from "react";
import { NavLink } from "react-router";
import BlockLink from "../components/BlockLink";
import BlockNotFound from "../components/BlockNotFound";
import ContentFrame from "../components/ContentFrame";
import ExternalBlockLink from "../components/ExternalBlockLink";
import FormattedBalance from "../components/FormattedBalance";
import HexValue from "../components/HexValue";
import InfoRow from "../components/InfoRow";
import NativeTokenPrice from "../components/NativeTokenPrice";
import PercentageBar from "../components/PercentageBar";
import RelativePosition from "../components/RelativePosition";
import Timestamp from "../components/Timestamp";
import { blockTxsURL } from "../url";
import { useChainInfo } from "../useChainInfo";
import { useBlockData, useL1Epoch } from "../useErigonHooks";
import { RuntimeContext } from "../useRuntime";
import { commify } from "../utils/utils";
import DecoratedAddressLink from "./components/DecoratedAddressLink";
import {Helmet} from 'react-helmet-async';
import {useFiatValue, formatFiatValue} from '../usePriceOracle';

interface BlockDetailsProps {
  blockNumberOrHash: undefined | string;
}

const BlockDetails: FC<BlockDetailsProps> = ({ blockNumberOrHash }) => {
  const { config, provider } = useContext(RuntimeContext);
  if (blockNumberOrHash === undefined) {
    throw new Error("blockNumberOrHash couldn't be undefined here");
  }
  const {
    nativeCurrency: { name, symbol },
  } = useChainInfo();

  const { data: block, isLoading } = useBlockData(provider, blockNumberOrHash);
  // useBlockPageTitle(blockNumberOrHash);


  const extraStr = useMemo(() => {
    return block && toUtf8String(block.extraData, Utf8ErrorFuncs.replace);
  }, [block]);
  const burntFees =
    block?.baseFeePerGas && block.baseFeePerGas * block.gasUsed;
  const gasUsedPerc =
    block && Number((block.gasUsed * 10000n) / block.gasLimit) / 100;

  const l1Epoch = useL1Epoch(provider, block ? block.number : null);
  const l1ExplorerUrl: string | undefined =
    config.opChainSettings?.l1ExplorerURL;
  const description = `Details for Ethereum block ${blockNumberOrHash}, including transaction count, miner address, gas used, and timestamp.`

  // Get ETH/USD price
  const ethPriceUSD = useFiatValue(10n ** 18n, block?.number);

  const payloadSchemaWebPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": `https://ethscan.org/block/${blockNumberOrHash}`,
      "name": `Ethereum Block ${blockNumberOrHash}`,
      "description": description,
      "mainEntity": {
        "@type": "DigitalDocument",
        "identifier": `${blockNumberOrHash}`,
        "name": `Ethereum Block ${blockNumberOrHash}`,
        "description": `Ethereum blockchain block containing ${block?.transactionCount || 0} transactions`,
        "dateCreated": `${block?.timestamp ? (new Date(block.timestamp * 1000)).toISOString() : ''}`,
        "creator": {
          "@type": "Organization",
          "identifier": `${block?.miner}`
        },
        ...(block && {
          "blockBaseFee": block.baseFeePerGas?.toString() || "0",
          "gasUsed": block.gasUsed.toString(),
          "gasLimit": block.gasLimit.toString(),
          "etherPriceUSD": ethPriceUSD ? formatFiatValue(ethPriceUSD) : "N/A",
          "burntFees": burntFees?.toString() || "0"
        })
      }
    }
  )
  const payloadSchemaFaqPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is a block in the Ethereum blockchain?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A block is a package of data that contains a list of transactions, a timestamp, and other metadata, secured and added to the Ethereum blockchain."
          }
        },
        {
          "@type": "Question",
          "name": "How can I find details about a specific Ethereum block?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Enter the block number or hash in the Ethscan search bar to view detailed information, including transactions and miner data."
          }
        },
        {
          "@type": "Question",
          "name": "What is the role of the miner in a block?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miners validate and confirm transactions, grouping them into blocks and securing the Ethereum blockchain by solving computational challenges."
          }
        }
      ]
    }
  )

  return (
    <>
      <Helmet>
        <title>Ethereum Block {blockNumberOrHash} - Transactions, Gas Used, and Miner Details</title>
        <meta name="description" content={`Comprehensive details for Ethereum block ${blockNumberOrHash} including transaction list, gas metrics, base fee, miner rewards, and block timestamp.`} />
        <link rel="canonical" href={`https://ethscan.org/block/${blockNumberOrHash}`} />
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>
      {block === null && (
        <BlockNotFound blockNumberOrHash={blockNumberOrHash}/>
      )}
      {block === undefined && (
        <ContentFrame>
          <InfoRow title="Block Height">Loading block data...</InfoRow>
        </ContentFrame>
      )}
      {block && (
        <>
        <ContentFrame isLoading={isLoading}>
          <InfoRow title="Block Height">
            <span className="font-bold" data-test="block-height-text">
              {commify(block.number)}
            </span>
          </InfoRow>
          <InfoRow title="Timestamp">
            <Timestamp value={block.timestamp}/>
          </InfoRow>
          <InfoRow title="Transactions">
            <NavLink
              className="rounded-lg bg-link-blue/10 px-2 py-1 text-xs text-link-blue hover:bg-link-blue/100 hover:text-white"
              to={blockTxsURL(block.number)}
            >
              {block.transactionCount} transaction
              {block.transactionCount !== 1 ? "s" : ""}
            </NavLink>{" "}
            in this block
          </InfoRow>
          <InfoRow title="Mined by">
            <DecoratedAddressLink address={block.miner} miner/>
          </InfoRow>
          <InfoRow title="Size">{commify(block.size)} bytes</InfoRow>
          {block.baseFeePerGas !== null &&
            block.baseFeePerGas !== undefined && (
              <InfoRow title="Base Fee">
                <span>
                  <FormattedBalance
                    value={block.baseFeePerGas}
                    decimals={9}
                    symbol="Gwei"
                  />{" "}
                  (
                  <FormattedBalance
                    value={block.baseFeePerGas}
                    decimals={0}
                    symbol="wei"
                  />
                  )
                </span>
              </InfoRow>
            )}
          {burntFees !== null && burntFees !== undefined && (
            <InfoRow title="Burnt Fees">
              <div className="flex items-baseline space-x-1">
                <span className="flex space-x-1 text-orange-500">
                  <span title="Burnt fees">
                    <FontAwesomeIcon icon={faBurn} size="1x"/>
                  </span>
                  <span>
                    <span className="line-through">
                      <FormattedBalance value={burntFees}/>
                    </span>{" "}
                    {symbol}
                  </span>
                </span>
              </div>
            </InfoRow>
          )}
          <InfoRow title="Gas Used/Limit">
            <div className="flex items-baseline space-x-3">
              <div>
                <RelativePosition
                  pos={commify(formatUnits(block.gasUsed, 0))}
                  total={commify(formatUnits(block.gasLimit, 0))}
                />
              </div>
              <PercentageBar perc={gasUsedPerc!}/>
            </div>
          </InfoRow>
          {block.blobGasUsed !== null && block.blobGasUsed !== undefined && (
            <InfoRow title="Blob Gas Used">
              {commify(block.blobGasUsed)}
            </InfoRow>
          )}
          {block.excessBlobGas !== null &&
            block.excessBlobGas !== undefined && (
              <InfoRow title="Excess Blob Gas">
                {commify(block.excessBlobGas)}
              </InfoRow>
            )}
          <InfoRow title="Extra Data">
            {extraStr} (Hex:{" "}
            <span className="break-all font-data">{block.extraData}</span>)
          </InfoRow>
          <InfoRow title={`${name} Price`}>
            <NativeTokenPrice blockTag={block.number}/>
          </InfoRow>
          <InfoRow title="Difficulty">
            {commify(block.difficulty.toString())}
          </InfoRow>
          <InfoRow title="Total Difficulty">
            {block.totalDifficulty !== undefined
              ? commify(block.totalDifficulty.toString())
              : "N/A"}
          </InfoRow>
          <InfoRow title="Hash">
            <HexValue value={block.hash ?? "<unknown>"}/>
          </InfoRow>
          <InfoRow title="Parent Hash">
            <BlockLink blockTag={block.parentHash}/>
          </InfoRow>
          {block.parentBeaconBlockRoot && (
            <InfoRow title="Parent Beacon Block Root">
              <HexValue value={block.parentBeaconBlockRoot}/>
            </InfoRow>
          )}
          {l1Epoch !== undefined && l1Epoch !== null && (
            <InfoRow title="L1 Epoch">
              <ExternalBlockLink
                blockTag={l1Epoch}
                explorerUrl={l1ExplorerUrl}
              />
            </InfoRow>
          )}
          <InfoRow title="Sha3Uncles">
            <HexValue value={block.sha3Uncles}/>
          </InfoRow>
          <InfoRow title="State Root">
            <HexValue value={block.stateRoot}/>
          </InfoRow>
          {block.receiptsRoot !== null && block.receiptsRoot !== undefined && (
            <InfoRow title="Receipts Root">
              <HexValue value={block.receiptsRoot}/>
            </InfoRow>
          )}
          <InfoRow title="Nonce">
            <span className="font-data">{block.nonce}</span>
          </InfoRow>
        </ContentFrame>
        {/* SEO Summary Section */}
        <div className="px-3 lg:px-9 mt-4">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Block Summary</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Ethereum block #{commify(block.number)} was mined on {new Date(block.timestamp * 1000).toLocaleString()} by {block.miner}.
              This block contains {block.transactionCount} transaction{block.transactionCount !== 1 ? 's' : ''} with a total gas usage of {commify(formatUnits(block.gasUsed, 0))} out of {commify(formatUnits(block.gasLimit, 0))} gas limit.
              The base fee was {block.baseFeePerGas ? formatUnits(block.baseFeePerGas, 9) : '0'} Gwei.
              The block hash is {block.hash} and the parent block is #{block.number - 1}.
            </p>
          </div>
        </div>
        </>
      )}
    </>
  );
};

export default BlockDetails;
