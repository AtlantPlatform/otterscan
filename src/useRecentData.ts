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

/**
 * Hook to get recent blocks without auto-refresh (static snapshot)
 */
export const useRecentBlocksStatic = (
  provider: JsonRpcApiProvider,
  count: number = 5
): ExtendedBlock[] => {
  const [blocks, setBlocks] = useState<ExtendedBlock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) return; // Only fetch once

    const fetchBlocks = async () => {
      try {
        const latestBlockNumber = await provider.getBlockNumber();
        const blockNumbers = [];
        for (let i = 0; i < count; i++) {
          blockNumbers.push(latestBlockNumber - i);
        }

        const blockPromises = blockNumbers.map(num => readBlock(provider, num.toString()));
        const fetchedBlocks = await Promise.all(blockPromises);
        const validBlocks = fetchedBlocks.filter((block): block is ExtendedBlock => block !== null);
        setBlocks(validBlocks);
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to fetch recent blocks:", error);
      }
    };

    fetchBlocks();
  }, [provider, count, isLoaded]);

  return blocks;
};

/**
 * Hook to get recent transactions without auto-refresh (static snapshot)
 */
export const useRecentTransactionsStatic = (
  provider: JsonRpcApiProvider,
  count: number = 5
): ProcessedTransaction[] => {
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>();

  // Get latest block number once
  useEffect(() => {
    const fetchLatestBlock = async () => {
      try {
        const blockNum = await provider.getBlockNumber();
        setLatestBlockNumber(blockNum);
      } catch (error) {
        console.error("Failed to fetch latest block number:", error);
      }
    };

    fetchLatestBlock();
  }, [provider]);

  // Use the hook with the static block number
  const { data: txData } = useBlockTransactions(
    provider,
    latestBlockNumber,
    0,
    count
  );

  return useMemo(() => {
    return txData?.txs?.slice(0, count) || [];
  }, [txData, count]);
};