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
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <title>Ethereum Block {blockNumberOrHash} - Transactions, Gas Used, and Miner Details | Ethscan</title>
          <meta name="description" content={`View details for Ethereum block ${blockNumberOrHash} including all transactions, gas used, miner address, base fee, and timestamp information.`} />
          <link rel="canonical" href={`https://ethscan.org/block/${blockNumberOrHash}`} />
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
                <NavBlock
                  entityNum={blockNumber}
                  latestEntityNum={latestBlockNumber}
                  urlBuilder={blockURL}
                />
              </h1>
            </StandardSubtitle>
          </div>
          <BlockDetails blockNumberOrHash={blockNumberOrHash} />
        </div>
      </StandardFrame>
    </div>
  );
};

export default Block;
