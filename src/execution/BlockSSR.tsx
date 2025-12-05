import { FC, useMemo } from "react";
import { useParams, Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatUnits, Utf8ErrorFuncs, toUtf8String } from "ethers";
import { faBurn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "../components/ContentFrame";
import InfoRow from "../components/InfoRow";
import BlockLink from "../components/BlockLink";
import BlockNotFound from "../components/BlockNotFound";
import HexValue from "../components/HexValue";
import PercentageBar from "../components/PercentageBar";
import RelativePosition from "../components/RelativePosition";
import NavBlock from "../components/NavBlock";
import FormattedBalance from "../components/FormattedBalance";
import { useSingleBlock, useLatestBlockNumber } from "../api/useRestBlocks";
import { blockURL, blockTxsURL } from "../url";
import { commify } from "../utils/utils";

/**
 * SSR-safe Block page component.
 * Uses REST API hooks instead of RuntimeContext/provider.
 */
const BlockSSR: FC = () => {
  const { blockNumberOrHash } = useParams();
  const { block, isLoading, error } = useSingleBlock(blockNumberOrHash);
  const { latestBlockNumber } = useLatestBlockNumber();

  if (!blockNumberOrHash) {
    return <BlockNotFound blockNumberOrHash="" />;
  }

  const blockNumber = block?.number ?? (
    /^\d+$/.test(blockNumberOrHash) ? parseInt(blockNumberOrHash) : undefined
  );

  const gasUsedPerc = block
    ? Number((BigInt(block.gasUsed) * 10000n) / BigInt(block.gasLimit)) / 100
    : 0;

  // Decode extraData to UTF-8 string
  const extraStr = useMemo(() => {
    return block?.extraData ? toUtf8String(block.extraData, Utf8ErrorFuncs.replace) : "";
  }, [block?.extraData]);

  // Calculate burnt fees
  const burntFees = block?.baseFeePerGas !== null && block?.baseFeePerGas !== undefined
    ? BigInt(block.baseFeePerGas) * BigInt(block.gasUsed)
    : null;

  const description = `Details for Ethereum block ${blockNumberOrHash}, including transaction count, miner address, gas used, and timestamp.`;

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
      "dateCreated": block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : '',
      "creator": {
        "@type": "Organization",
        "identifier": block?.miner || ''
      }
    }
  });

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
  });

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeaderSSR />
      <StandardFrame>
        <Helmet>
          <title>Ethereum Block {blockNumberOrHash} - Transactions, Gas Used, and Miner Details | Ethscan</title>
          <meta name="description" content={`View details for Ethereum block ${blockNumberOrHash} including all transactions, gas used, miner address, base fee, and timestamp information.`} />
          <link rel="canonical" href={`https://ethscan.org/block/${blockNumberOrHash}`} />
          <script type="application/ld+json">{payloadSchemaWebPage}</script>
          <script type="application/ld+json">{payloadSchemaFaqPage}</script>
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="px-3 lg:px-9">
            <StandardSubtitle>
              <h1 className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 space-y-1 sm:space-y-0">
                <div className="flex items-baseline space-x-1">
                  <span>Block</span>
                  <span className="text-base text-gray-500 break-all" data-test="block-number">
                    #{blockNumberOrHash}
                  </span>
                </div>
                {blockNumber !== undefined && (
                  <NavBlock
                    entityNum={blockNumber}
                    latestEntityNum={latestBlockNumber}
                    urlBuilder={blockURL}
                  />
                )}
              </h1>
            </StandardSubtitle>
          </div>

          {error && (
            <BlockNotFound blockNumberOrHash={blockNumberOrHash} />
          )}

          {isLoading && !block && (
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
                  <span>
                    {new Date(block.timestamp * 1000).toLocaleString()}
                  </span>
                </InfoRow>
                <InfoRow title="Transactions">
                  <Link
                    className="rounded-lg bg-link-blue/10 px-2 py-1 text-xs text-link-blue hover:bg-link-blue/100 hover:text-white"
                    to={blockTxsURL(block.number)}
                  >
                    {block.transactionCount} transaction
                    {block.transactionCount !== 1 ? "s" : ""}
                  </Link>{" "}
                  in this block
                </InfoRow>
                <InfoRow title="Mined by">
                  <Link
                    className="text-link-blue hover:text-link-blue-hover font-mono text-sm"
                    to={`/address/${block.miner}`}
                  >
                    {block.miner}
                  </Link>
                </InfoRow>
                <InfoRow title="Size">{commify(block.size)} bytes</InfoRow>
                {block.baseFeePerGas !== null && (
                  <InfoRow title="Base Fee">
                    <span>
                      <FormattedBalance
                        value={BigInt(block.baseFeePerGas)}
                        decimals={9}
                        symbol="Gwei"
                      />{" "}
                      (
                      <FormattedBalance
                        value={BigInt(block.baseFeePerGas)}
                        decimals={0}
                        symbol="wei"
                      />
                      )
                    </span>
                  </InfoRow>
                )}
                {burntFees !== null && (
                  <InfoRow title="Burnt Fees">
                    <div className="flex items-baseline space-x-1">
                      <span className="flex space-x-1 text-orange-500">
                        <span title="Burnt fees">
                          <FontAwesomeIcon icon={faBurn} size="1x" />
                        </span>
                        <span>
                          <span className="line-through">
                            <FormattedBalance value={burntFees} />
                          </span>{" "}
                          ETH
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
                    <PercentageBar perc={gasUsedPerc} />
                  </div>
                </InfoRow>
                {block.blobGasUsed != null && (
                  <InfoRow title="Blob Gas Used">
                    {commify(block.blobGasUsed)}
                  </InfoRow>
                )}
                {block.excessBlobGas != null && (
                  <InfoRow title="Excess Blob Gas">
                    {commify(block.excessBlobGas)}
                  </InfoRow>
                )}
                {block.extraData && (
                  <InfoRow title="Extra Data">
                    {extraStr} (Hex:{" "}
                    <span className="break-all font-data">{block.extraData}</span>)
                  </InfoRow>
                )}
                <InfoRow title="Difficulty">
                  {commify((block.difficulty ?? 0).toString())}
                </InfoRow>
                <InfoRow title="Total Difficulty">
                  {block.totalDifficulty != null
                    ? commify(block.totalDifficulty.toString())
                    : "N/A"}
                </InfoRow>
                <InfoRow title="Hash">
                  <HexValue value={block.hash} />
                </InfoRow>
                <InfoRow title="Parent Hash">
                  <BlockLink blockTag={block.parentHash} />
                </InfoRow>
                {block.parentBeaconBlockRoot && (
                  <InfoRow title="Parent Beacon Block Root">
                    <HexValue value={block.parentBeaconBlockRoot} />
                  </InfoRow>
                )}
                {block.sha3Uncles && (
                  <InfoRow title="Sha3Uncles">
                    <HexValue value={block.sha3Uncles} />
                  </InfoRow>
                )}
                {block.stateRoot && (
                  <InfoRow title="State Root">
                    <HexValue value={block.stateRoot} />
                  </InfoRow>
                )}
                {block.receiptsRoot && (
                  <InfoRow title="Receipts Root">
                    <HexValue value={block.receiptsRoot} />
                  </InfoRow>
                )}
                {block.nonce && (
                  <InfoRow title="Nonce">
                    <span className="font-data">{block.nonce}</span>
                  </InfoRow>
                )}
              </ContentFrame>

              {/* SEO Summary Section */}
              <div className="px-3 lg:px-9 mt-4">
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Block Summary</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Ethereum block #{commify(block.number)} was mined on {new Date(block.timestamp * 1000).toLocaleString()} by {block.miner}.
                    This block contains {block.transactionCount} transaction{block.transactionCount !== 1 ? 's' : ''} with a total gas usage of {commify(formatUnits(block.gasUsed, 0))} out of {commify(formatUnits(block.gasLimit, 0))} gas limit.
                    {block.baseFeePerGas !== null && ` The base fee was ${(block.baseFeePerGas / 1e9).toFixed(9)} Gwei.`}
                    {' '}The block hash is {block.hash} and the parent block is #{block.number - 1}.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </StandardFrame>
    </div>
  );
};

export default BlockSSR;
