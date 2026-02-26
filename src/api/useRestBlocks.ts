/**
 * React hooks for fetching block data using REST API instead of JSON-RPC
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { blocksAPI } from "./client";

// Check if running on server
const isServer = typeof window === 'undefined';

/**
 * Block data structure matching REST API response
 * Core fields are required; detailed fields are optional (present in single block query)
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
  // Additional fields for detailed block view (optional, present in /blocks/:numberOrHash)
  extraData?: string;
  difficulty?: number;
  totalDifficulty?: string | null;
  sha3Uncles?: string;
  stateRoot?: string;
  receiptsRoot?: string;
  nonce?: string;
  // Post-Cancun fields (may be null/undefined for older blocks)
  blobGasUsed?: number | null;
  excessBlobGas?: number | null;
  parentBeaconBlockRoot?: string | null;
}

/**
 * Hook to get the latest block number with a one-time fetch on mount.
 */
export const useLatestBlockNumber = () => {
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

    fetchLatestBlock();

    return () => {
      isMounted = false;
    };
  }, []);

  return { latestBlockNumber, error };
};

/**
 * Hook to get full block details with a one-time fetch on mount.
 */
export const useLatestBlock = () => {
  const [latestBlock, setLatestBlock] = useState<RestBlock>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;

    const fetchLatestBlock = async () => {
      try {
        const { blockNumber } = await blocksAPI.getLatest();
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

    fetchLatestBlock();

    return () => {
      isMounted = false;
    };
  }, []);

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
 * Query options for recent blocks - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching
 */
export const recentBlocksQueryOptions = (count: number = 5) =>
  queryOptions({
    queryKey: ['recentBlocks', count],
    queryFn: () => blocksAPI.getRecent(1, count),
    staleTime: 15000, // 15 seconds
  });

/**
 * Query options for paginated recent blocks - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching for the recent blocks page
 */
export const paginatedBlocksQueryOptions = (page: number = 1, limit: number = 30) =>
  queryOptions({
    queryKey: ['paginatedBlocks', page, limit],
    queryFn: () => blocksAPI.getRecent(page, limit),
    staleTime: 15000, // 15 seconds
  });

/**
 * Hook to get paginated blocks using React Query (SSR-compatible)
 * On server: reads from QueryClient cache (synchronous, set by prefetchQuery), query disabled
 * On client: uses useQuery for data fetching and updates (hydrated from SSR state)
 * Used by RecentBlocksRest page component
 */
export const usePaginatedBlocks = (page: number = 1, limit: number = 30) => {
  const queryClient = useQueryClient();
  const queryKey = ['paginatedBlocks', page, limit];

  // On server, directly read from cache (synchronous)
  // This works because prefetchQuery populates the cache before renderToString
  const cachedData = queryClient.getQueryData<{ blocks: RestBlock[]; total: number }>(queryKey);

  // Use useQuery for client-side fetching and updates
  // On server, disable the query - we just use the cached data directly
  // On client, HydrationBoundary restores the cache before this runs,
  // so useQuery will find the prefetched data in the cache
  const { data, isLoading, isFetching } = useQuery({
    ...paginatedBlocksQueryOptions(page, limit),
    // Disable query on server - prevents any async operations during renderToString
    enabled: !isServer,
  });

  // CRITICAL: Use same data source for both server and client initial render
  // to avoid hydration mismatch. On server, cachedData is from prefetchQuery.
  // On client during hydration, cachedData is from HydrationBoundary (same data).
  // After hydration, data from useQuery takes over for reactivity.
  const resultData = cachedData ?? data;

  return {
    blocks: resultData?.blocks ?? [],
    total: resultData?.total ?? 0,
    // Loading if no data available from either source
    isLoading: !resultData && (isServer ? true : (isLoading || isFetching)),
  };
};

/**
 * Hook to get recent blocks using React Query (SSR-compatible)
 * Used by RecentBlocksSection component
 * Now uses batched API for efficient loading
 */
export const useRecentBlocks = (count: number = 5) => {
  const { data, isLoading, error } = useQuery(recentBlocksQueryOptions(count));

  return {
    blocks: data?.blocks ?? [],
    isLoading,
    error: error as Error | undefined,
  };
};

/**
 * Query options for single block - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching for block pages
 */
export const singleBlockQueryOptions = (blockNumberOrHash: string) =>
  queryOptions({
    queryKey: ['block', blockNumberOrHash],
    queryFn: () => blocksAPI.getBlock(blockNumberOrHash),
    staleTime: 60000, // 1 minute - blocks are immutable
  });

/**
 * Hook to get a single block using React Query (SSR-compatible)
 * On server: reads from QueryClient cache (synchronous, set by prefetchQuery), query disabled
 * On client: uses useQuery for data fetching and updates (hydrated from SSR state)
 * Used by BlockSSR page component
 */
export const useSingleBlock = (blockNumberOrHash: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['block', blockNumberOrHash];

  // On server, directly read from cache (synchronous)
  const cachedData = blockNumberOrHash
    ? queryClient.getQueryData<RestBlock>(queryKey)
    : undefined;

  // Use useQuery for client-side fetching and updates
  const { data, isLoading, isFetching, error } = useQuery({
    ...singleBlockQueryOptions(blockNumberOrHash ?? ''),
    enabled: !isServer && !!blockNumberOrHash,
  });

  // Use same data source for both server and client initial render
  const resultData = cachedData ?? data;

  return {
    block: resultData ?? null,
    isLoading: !resultData && (isServer ? true : (isLoading || isFetching)),
    error: error as Error | undefined,
  };
};
