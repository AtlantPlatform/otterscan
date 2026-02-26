import { Block, JsonRpcApiProvider } from "ethers";
import { useEffect, useState } from "react";
import { formatter } from "./utils/formatter";

/**
 * Returns the latest block header with a one-time fetch on mount.
 */
export const useLatestBlockHeader = (provider: JsonRpcApiProvider) => {
  const [latestBlock, setLatestBlock] = useState<Block>();

  useEffect(() => {
    const readLatestBlock = async () => {
      const blockNum = await provider.getBlockNumber();
      const _raw = await provider.send("erigon_getHeaderByNumber", [
        blockNum,
      ]);
      const _block = new Block(formatter.blockParams(_raw), provider);
      setLatestBlock(_block);
    };
    readLatestBlock();
  }, [provider]);

  return latestBlock;
};

/**
 * Returns the latest block number with a one-time fetch on mount.
 */
export const useLatestBlockNumber = (provider: JsonRpcApiProvider) => {
  const [latestBlock, setLatestBlock] = useState<number>();

  useEffect(() => {
    const readLatestBlock = async () => {
      const blockNum = await provider.getBlockNumber();
      setLatestBlock(blockNum);
    };
    readLatestBlock();
  }, [provider]);

  return latestBlock;
};
