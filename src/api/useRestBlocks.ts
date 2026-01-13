/**
 * React hooks for fetching block data using REST API instead of JSON-RPC
 */
import { useEffect, useMemo, useState } from "react";
import { blocksAPI } from "./client";

/**
 * Block data structure matching REST API response
 */
export interface RestBlock {
  number: number;
  hash: string;
  timestamp: number;
  miner: string;
  transactionCount: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGas: number | null;
  size: number;
  parentHash: string;
}

/**
 * Hook to get the latest block number with auto-refresh via polling
 * Replaces provider.on("block", callback)
 */
export const useLatestBlockNumber = (pollInterval: number = 4000) => {
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;

    const fetchLatestBlock = async () => {
      try {
        const { blockNumber } = await blocksAPI.getLatest();
        if (isMounted) {
          setLatestBlockNumber(blockNumber);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    // Initial fetch
    fetchLatestBlock();

    // Poll for updates
    const interval = setInterval(fetchLatestBlock, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollInterval]);

  return { latestBlockNumber, error };
};

/**
 * Hook to get full block details with auto-refresh via polling
 * Replaces useLatestBlockHeader(provider)
 */
export const useLatestBlock = (pollInterval: number = 4000) => {
  const [latestBlock, setLatestBlock] = useState<RestBlock>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;

    const fetchLatestBlock = async () => {
      try {
        // First get the latest block number
        const { blockNumber } = await blocksAPI.getLatest();

        // Then fetch the full block details
        const block = await blocksAPI.getBlock(blockNumber);

        if (isMounted) {
          setLatestBlock(block);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    // Initial fetch
    fetchLatestBlock();

    // Poll for updates
    const interval = setInterval(fetchLatestBlock, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollInterval]);

  return { latestBlock, error };
};

/**
 * Hook to fetch a specific block by number or hash
 */
export const useBlock = (numberOrHash: number | string | undefined) => {
  const [block, setBlock] = useState<RestBlock | null>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (numberOrHash === undefined) {
      setBlock(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchBlock = async () => {
      try {
        const blockData = await blocksAPI.getBlock(numberOrHash);
        if (isMounted) {
          setBlock(blockData);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setBlock(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBlock();

    return () => {
      isMounted = false;
    };
  }, [numberOrHash]);

  return { block, isLoading, error };
};

/**
 * Hook to get recent blocks (static snapshot, no auto-refresh)
 * Used by RecentBlocksSection component
 * Now uses batched API for efficient loading
 */
export const useRecentBlocks = (count: number = 5) => {
  const [blocks, setBlocks] = useState<RestBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchRecentBlocks = async () => {
      try {
        // Use batched API endpoint to fetch recent blocks
        const data = await blocksAPI.getRecent(1, count);

        if (isMounted) {
          setBlocks(data.blocks);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRecentBlocks();

    return () => {
      isMounted = false;
    };
  }, [count]);

  return { blocks, isLoading, error };
};
