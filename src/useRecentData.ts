import { JsonRpcApiProvider } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { ExtendedBlock, readBlock, useBlockTransactions } from "./useErigonHooks";
import { useLatestBlockHeader } from "./useLatestBlock";
import { ProcessedTransaction } from "./types";

/**
 * Hook to get recent blocks (latest N blocks)
 */
export const useRecentBlocks = (
  provider: JsonRpcApiProvider,
  count: number = 5
): ExtendedBlock[] => {
  const latestBlock = useLatestBlockHeader(provider);
  
  const blockNumbers = useMemo(() => {
    if (!latestBlock) return [];
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(latestBlock.number - i);
    }
    return numbers;
  }, [latestBlock, count]);

  const [blocks, setBlocks] = useState<ExtendedBlock[]>([]);

  useEffect(() => {
    if (blockNumbers.length === 0) return;

    const fetchBlocks = async () => {
      const blockPromises = blockNumbers.map(num => readBlock(provider, num.toString()));
      const fetchedBlocks = await Promise.all(blockPromises);
      const validBlocks = fetchedBlocks.filter((block): block is ExtendedBlock => block !== null);
      setBlocks(validBlocks);
    };

    fetchBlocks();
  }, [provider, blockNumbers]);

  return blocks;
};

/**
 * Hook to get recent transactions from the latest blocks
 */
export const useRecentTransactions = (
  provider: JsonRpcApiProvider,
  count: number = 5
): ProcessedTransaction[] => {
  const latestBlock = useLatestBlockHeader(provider);
  
  // Get transactions from the latest block
  const { data: txData } = useBlockTransactions(
    provider,
    latestBlock?.number,
    0,
    count
  );

  return useMemo(() => {
    return txData?.txs?.slice(0, count) || [];
  }, [txData, count]);
};