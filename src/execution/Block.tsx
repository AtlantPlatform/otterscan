import { isHexString } from "ethers";
import React, { useContext } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import NavBlock from "../components/NavBlock";
import StandardFrame from "../components/StandardFrame";
import StandardSubtitle from "../components/StandardSubtitle";
import { blockURL } from "../url";
import { useBlockData } from "../useErigonHooks";
import { useLatestBlockNumber } from "../useLatestBlock";
import { RuntimeContext } from "../useRuntime";
import {useBlockPageTitle, usePageTitle} from "../useTitle";
import BlockDetails from "./BlockDetails";

const Block: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const { blockNumberOrHash } = useParams();
  if (blockNumberOrHash === undefined) {
    throw new Error("blockNumberOrHash couldn't be undefined here");
  }
  const { data: block, isLoading } = useBlockData(provider, blockNumberOrHash);
  let blockNumber = isHexString(blockNumberOrHash)
    ? block && block.number !== undefined
      ? block.number
      : undefined
    : parseInt(blockNumberOrHash);
  let latestBlockNumber = useLatestBlockNumber(provider);
  if (blockNumber === undefined) {
    // Disable navigation while the block hash's block number is unknown
    blockNumber = 0;
    latestBlockNumber = undefined;
  }

  const titleToSet = `Ethereum Block ${blockNumberOrHash} - Transactions, Gas Used, and Miner Details`

  usePageTitle(titleToSet);

  // useBlockPageTitle(blockNumberOrHash);

  return (
    <StandardFrame>
      <Helmet>
        <link rel="canonical" href={`https://ethscan.org/block/${blockNumberOrHash}`} />

        {/* Open Graph meta tags */}
        <meta property="og:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
        <meta property="og:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://ethscan.org/block/${blockNumberOrHash}`} />
        <meta property="og:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="640" />
        <meta property="og:site_name" content="Ethscan" />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
        <meta name="twitter:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
        <meta name="twitter:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
        <meta name="twitter:site" content="@ethscan" />
      </Helmet>
      <StandardSubtitle>
        <h1 className="flex items-baseline space-x-1">
          <span>Block</span>
          <span className="text-base text-gray-500" data-test="block-number">
            #{blockNumberOrHash}
          </span>
          <NavBlock
            entityNum={blockNumber}
            latestEntityNum={latestBlockNumber}
            urlBuilder={blockURL}
          />
        </h1>
      </StandardSubtitle>
      <BlockDetails blockNumberOrHash={blockNumberOrHash} />
    </StandardFrame>
  );
};

export default Block;
